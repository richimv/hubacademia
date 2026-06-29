const supabase = require('../config/supabaseClient');
const UserRepository = require('../../domain/repositories/userRepository');
const userRepository = new UserRepository();
const jwt = require('jsonwebtoken');

// Caché en memoria para almacenar verificaciones exitosas de tokens (token -> { user, cachedAt, exp })
const tokenCache = new Map();

// Limpiar caché periódicamente para evitar fugas de memoria
setInterval(() => {
    const now = Date.now();
    for (const [token, entry] of tokenCache.entries()) {
        if (now > entry.cachedAt + 3 * 60 * 1000 || now / 1000 > entry.exp) {
            tokenCache.delete(token);
        }
    }
}, 60 * 1000);

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

async function getUserWithRetry(token, retries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (error) throw error; // Re-throw to cache if it's a supabase error (401, etc) - though 401 shouldn't be retried usually, but network errors will be caught below. 
            // Wait, supabase-js returns error object, doesn't throw for 401. 
            // We should only retry on NETWORK errors (detected via catch block) or 5xx.
            // But getUser failing with 401 is permanent. 
            return { user, error: null };
        } catch (err) {
            const isNetworkError = err.cause && (
                err.cause.code === 'ECONNRESET' || 
                err.cause.code === 'ETIMEDOUT' || 
                err.cause.code === 'UND_ERR_CONNECT_TIMEOUT' || 
                err.message.includes('fetch failed')
            );

            if (isNetworkError && attempt < retries) {
                console.warn(`⚠️ Supabase Auth Network Error (Attempt ${attempt}/${retries}): ${err.message}. Retrying in ${RETRY_DELAY_MS}ms...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                continue;
            }
            // If it's the last attempt or not a network error, return/throw
            if (attempt === retries) throw err;
            throw err;
        }
    }
}

async function auth(req, res, next) {
    const authHeader = req.header('Authorization');
    let token = authHeader ? authHeader.split(' ')[1] : req.query.token;

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no provisto.' });
    }

    try {
        // 1. Decodificar localmente el JWT para verificar expiración sin llamadas de red
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            return res.status(401).json({ error: 'Sesión inválida o expirada.' });
        }

        if (Date.now() / 1000 > decoded.exp) {
            console.warn('🕒 [AuthMiddleware] Token expirado detectado por validación local de JWT.');
            return res.status(401).json({ error: 'Sesión expirada. Por favor inicie sesión nuevamente.' });
        }

        // 2. Verificar caché en memoria
        let sbUser;
        const cached = tokenCache.get(token);
        const now = Date.now();
        if (cached && now < cached.cachedAt + 3 * 60 * 1000) {
            sbUser = cached.user;
        } else {
            // 3. Si no está en caché o expiró la caché de 3 min, validar con Supabase (con Retry)
            try {
                const result = await getUserWithRetry(token);
                sbUser = result.user;
                if (sbUser) {
                    tokenCache.set(token, {
                        user: sbUser,
                        cachedAt: now,
                        exp: decoded.exp
                    });
                }
            } catch (err) {
                const msg = err.message || '';
                const status = err.status || 0;
                
                const isClientError = msg.includes('invalid JWT') || 
                                      msg.includes('expired') || 
                                      msg.includes('invalid claim') || 
                                      msg.includes('Auth session missing') || 
                                      status === 400;

                if (isClientError) {
                    console.warn('⚠️ Sesión de usuario inválida:', msg);
                    tokenCache.delete(token);
                    return res.status(401).json({ error: 'Sesión expirada. Por favor inicie sesión nuevamente.' });
                }

                const isConnectionError = err.code === 'ENOTFOUND' || err.syscall === 'getaddrinfo' || msg.includes('fetch failed');
                if (isConnectionError) {
                    console.warn('⚠️ Supabase Auth Connectivity Warning (DNS/Network).');
                } else {
                    console.error('❌ Supabase Auth unexpected error:', err);
                }
                return res.status(503).json({ error: 'Error de conexión con servicio de autenticación. Intente nuevamente.' });
            }
        }

        if (!sbUser) {
            return res.status(401).json({ error: 'Sesión inválida o expirada.' });
        }

        // 4. Obtener usuario de nuestra Base de Datos (Roles, Usage, Subscription)
        const dbUser = await userRepository.findById(sbUser.id);

        if (!dbUser) {
            console.error(`❌ Usuario Auth ${sbUser.id} no encontrado en DB Local.`);
            return res.status(401).json({ error: 'Usuario no registrado en el sistema.' });
        }

        req.user = dbUser;
        next();

    } catch (ex) {
        console.error('❌ Error Auth Middleware:', ex.message);
        res.status(500).json({ error: 'Error interno de autenticación.' });
    }
}

async function optionalAuth(req, res, next) {
    const authHeader = req.header('Authorization');
    const token = authHeader ? authHeader.split(' ')[1] : req.query.token;
    if (!token) return next();

    try {
        // 1. Decodificar localmente el JWT
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp || Date.now() / 1000 > decoded.exp) {
            return next();
        }

        // 2. Verificar caché en memoria
        let sbUser;
        const cached = tokenCache.get(token);
        const now = Date.now();
        if (cached && now < cached.cachedAt + 3 * 60 * 1000) {
            sbUser = cached.user;
        } else {
            // 3. Validar con Supabase
            const result = await getUserWithRetry(token);
            sbUser = result.user;
            if (sbUser) {
                tokenCache.set(token, {
                    user: sbUser,
                    cachedAt: now,
                    exp: decoded.exp
                });
            }
        }

        if (sbUser) {
            const dbUser = await userRepository.findById(sbUser.id);
            if (dbUser) req.user = dbUser;
        }
    } catch (err) {
        if (err.message.includes('fetch failed') || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
            console.warn('⚠️ Supabase Auth (Optional) Timeout/Network Error. Ignorando...');
        }
    }
    next();
}

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
};

module.exports = { auth, optionalAuth, adminOnly };