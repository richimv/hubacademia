const supabase = require('../config/supabaseClient');
const UserRepository = require('../../domain/repositories/userRepository');
const userRepository = new UserRepository();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Caché en memoria para almacenar verificaciones exitosas de tokens (token -> { user, cachedAt, exp })
const tokenCache = new Map();

// Limpiar caché periódicamente para evitar fugas de memoria
const tokenCacheCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [token, entry] of tokenCache.entries()) {
        if (now > entry.cachedAt + 3 * 60 * 1000 || now / 1000 > entry.exp) {
            tokenCache.delete(token);
        }
    }
}, 60 * 1000);
tokenCacheCleanupTimer.unref?.();

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

function getAuthErrorMetadata(error = {}) {
    return {
        name: String(error.name || ''),
        message: String(error.message || ''),
        code: String(error.code || error.cause?.code || ''),
        status: Number(error.status || 0)
    };
}

function isRetryableAuthError(error) {
    const { name, message, code, status } = getAuthErrorMetadata(error);
    const normalized = `${name} ${message} ${code}`.toLowerCase();

    return name === 'AuthRetryableFetchError'
        || status === 0
        || status === 408
        || status === 429
        || status >= 500
        || normalized.includes('fetch failed')
        || normalized.includes('network')
        || normalized.includes('timeout')
        || normalized.includes('econnreset')
        || normalized.includes('enotfound')
        || normalized.includes('eai_again');
}

function isInvalidAuthError(error) {
    const { message, code, status } = getAuthErrorMetadata(error);
    const normalized = `${message} ${code}`.toLowerCase();

    if (isRetryableAuthError(error)) return false;

    return status === 400
        || status === 401
        || status === 403
        || normalized.includes('invalid jwt')
        || normalized.includes('bad_jwt')
        || normalized.includes('expired')
        || normalized.includes('auth session missing')
        || normalized.includes('invalid claim');
}

async function getUserWithRetry(token, retries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (error) throw error;
            return { user, error: null };
        } catch (err) {
            if (isRetryableAuthError(err) && attempt < retries) {
                const delay = RETRY_DELAY_MS * attempt;
                const meta = getAuthErrorMetadata(err);
                console.warn(`⚠️ Supabase Auth temporal (${attempt}/${retries}, ${meta.name || meta.code || meta.status}). Reintentando en ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw err;
        }
    }
}

function getBearerToken(req) {
    const header = req.header('Authorization');
    if (!header || !/^Bearer\s+/i.test(header)) return null;
    const token = header.replace(/^Bearer\s+/i, '').trim();
    return token || null;
}

async function getVerifiedIdentity(token) {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp || Date.now() / 1000 > decoded.exp) {
        const error = new Error('Sesión inválida o expirada.');
        error.status = 401;
        throw error;
    }

    const cached = tokenCache.get(token);
    const now = Date.now();
    if (cached && now < cached.cachedAt + 3 * 60 * 1000) return cached.user;

    const result = await getUserWithRetry(token);
    if (!result.user) {
        const error = new Error('Sesión inválida o expirada.');
        error.status = 401;
        throw error;
    }

    tokenCache.set(token, {
        user: result.user,
        cachedAt: now,
        exp: decoded.exp
    });
    return result.user;
}

async function auth(req, res, next) {
    const token = getBearerToken(req);

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
                if (isInvalidAuthError(err)) {
                    console.warn('⚠️ Sesión de usuario inválida:', err.message);
                    tokenCache.delete(token);
                    return res.status(401).json({ error: 'Sesión expirada. Por favor inicie sesión nuevamente.' });
                }

                if (isRetryableAuthError(err)) {
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
    const token = getBearerToken(req);
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

/**
 * Verifica solamente la identidad del proveedor Supabase para flujos como
 * /auth/sync, donde todavía no existe un usuario local en PostgreSQL.
 * No acepta tokens por query string ni confía en id/email del body.
 */
async function authIdentity(req, res, next) {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Acceso denegado. Token Bearer no provisto.' });

    try {
        req.authIdentity = await getVerifiedIdentity(token);
        return next();
    } catch (error) {
        if (isInvalidAuthError(error)) {
            return res.status(401).json({ error: 'Sesión inválida o expirada.' });
        }

        const meta = getAuthErrorMetadata(error);
        console.error('❌ Error verificando identidad Supabase:', meta);
        return res.status(503).json({ error: 'Servicio de autenticación no disponible.' });
    }
}

/**
 * Protege endpoints internos consumidos por jobs/servicios ML.
 * Requiere ML_SERVICE_TOKEN o INTERNAL_API_TOKEN en el entorno de ejecución.
 */
function internalServiceAuth(req, res, next) {
    const configuredToken = process.env.ML_SERVICE_TOKEN || process.env.INTERNAL_API_TOKEN;
    if (!configuredToken) {
        return res.status(503).json({ error: 'Servicio interno no configurado.' });
    }

    const presentedToken = req.get('x-internal-token') || getBearerToken(req);
    if (!presentedToken) return res.status(401).json({ error: 'Credencial de servicio requerida.' });

    const expected = Buffer.from(configuredToken);
    const actual = Buffer.from(presentedToken);
    const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    if (!matches) return res.status(403).json({ error: 'Credencial de servicio inválida.' });

    req.serviceIdentity = 'ml-service';
    return next();
}

module.exports = { auth, optionalAuth, adminOnly, authIdentity, internalServiceAuth };
