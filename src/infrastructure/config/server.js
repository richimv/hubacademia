const express = require('express');
const cors = require('cors');
const path = require('path');

class Server {
    constructor() {
        console.log('🚀 Inicializando Server (Restauración de Servicio)...');
        // Restart Trigger: Heatmap Fix
        this.app = express();
        this.port = process.env.PORT || 3000;
    }

    async setup() {
        // ✅ AUTOMATIC CACHE BUSTING: Runs on startup to version JS and CSS files in all HTML pages
        try {
            console.log('🔄 Ejecutando Cache Busting Automático...');
            const fs = require('fs');
            const path = require('path');
            const crypto = require('crypto');
            
            const publicPath = path.join(__dirname, '../../presentation/public');
            const version = crypto.randomBytes(4).toString('hex');
            
            if (fs.existsSync(publicPath)) {
                fs.readdirSync(publicPath).filter(f => f.endsWith('.html')).forEach(f => {
                    const filePath = path.join(publicPath, f);
                    // Asegurar que no esté marcado como de solo lectura
                    try {
                        fs.chmodSync(filePath, 0o666);
                    } catch (e) {}

                    let content = fs.readFileSync(filePath, 'utf8');
                    
                    // 1. Cache bust all local CSS files (href="css/..." or href="/css/...")
                    const cssRegex = /(href="(?:\/)?css\/[^"]+\.css)(?:\?v=[^"]+)?(?=")/g;
                    content = content.replace(cssRegex, `$1?v=${version}`);
                    
                    // 2. Cache bust all local JS files (src="js/..." or src="/js/...")
                    const jsRegex = /(src="(?:\/)?js\/[^"]+\.js)(?:\?v=[^"]+)?(?=")/g;
                    content = content.replace(jsRegex, `$1?v=${version}`);
                    
                    fs.writeFileSync(filePath, content, 'utf8');
                });
                console.log(`✅ Cache Busting Completado. Nueva versión de assets: ${version}`);
            }
        } catch (cacheError) {
            console.warn('⚠️ No se pudo ejecutar el Cache Busting automático:', cacheError.message);
        }

        this.setupGlobalErrorHandlers();
        await this.testDBConnection();
        this.configureMiddleware();
        this.configureStaticFiles();
        this.configureRoutes();
    }

    async testDBConnection() {
        try {
            // ✅ CORRECCIÓN: Importar 'db' aquí para asegurar que .env se haya cargado.
            const db = require('../database/db');

            // ✅ SANITIZACIÓN GLOBAL DE CREDENCIALES DE GOOGLE CLOUD
            // Evita que rutas locales de Windows copiadas a producción (Render/Linux) causen fallos críticos ENOENT
            let keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
            if (keyPath) {
                const fs = require('fs');
                const isLocalWindowsPath = keyPath.startsWith('C:') || keyPath.includes('\\') || keyPath.includes('Users/');
                const fileExists = fs.existsSync(keyPath);
                if (isLocalWindowsPath || !fileExists) {
                    console.warn(`⚠️ [AuthSanitizer] La ruta GOOGLE_APPLICATION_CREDENTIALS (${keyPath}) es inválida o no existe en este servidor.`);
                    const fallbackRootKey = path.join(__dirname, '../../../service-account-key.json');
                    if (fs.existsSync(fallbackRootKey)) {
                        console.log(`✅ [AuthSanitizer] Cargando archivo de credenciales de respaldo de la raíz: ${fallbackRootKey}`);
                        process.env.GOOGLE_APPLICATION_CREDENTIALS = fallbackRootKey;
                    } else {
                        console.warn(`🚨 [AuthSanitizer] No se encontró service-account-key.json de respaldo. Limpiando variable para evitar fallos ENOENT.`);
                        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
                    }
                }
            }

            // Realizar una consulta simple para verificar la conexión
            const client = await db.query('SELECT NOW()'); // query() ahora llama a getPool() internamente

            // ✅ SOLUCIÓN DEFINITIVA: Asegurar que la extensión 'unaccent' exista.
            // Esto garantiza que la función esté disponible para todas las conexiones del pool.
            await db.query('CREATE EXTENSION IF NOT EXISTS "unaccent"');
            console.log('🔧 Extensión "unaccent" verificada.');
            // ✅ SOLUCIÓN CRÍTICA: Habilitar la extensión para búsquedas con tolerancia a errores (fuzzy search).
            await db.query('CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch"');
            console.log('🔧 Extensión "fuzzystrmatch" (para Levenshtein) verificada.');

            // ✅ CORRECCIÓN: Ahora que db.query devuelve el objeto de resultado completo, volvemos a usar client.rows[0].now
            console.log('💾 PostgreSQL conectado exitosamente. Hora del servidor de BD:', client.rows[0].now);
        } catch (error) {
            console.error('❌ Error al conectar con la base de datos PostgreSQL:', error.message);
            process.exit(1); // Detener la aplicación si no se puede conectar a la BD
        }
    }

    setupGlobalErrorHandlers() {
        // ✅ CATCH GLOBAL PARA ERRORES NO MANEJADOS
        process.on('uncaughtException', (error) => {
            console.error('💥 UNCAUGHT EXCEPTION:', error);
            console.error('💥 Stack:', error.stack);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
        });
    }

    configureMiddleware() {
        console.log('🔧 Configurando middleware...');

        // ✅ FIX: Habilitar trust proxy para Render (necesario para rate-limit)
        this.app.set('trust proxy', 1);
        this.app.disable('x-powered-by');

        // Basic security headers without a strict CSP, to avoid breaking OAuth/CDN flows.
        this.app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'SAMEORIGIN');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
            next();
        });

        // ✅ CORS CONFIGURADO PARA VERCEL, DOMINIO PROPIO Y PREVISUALIZACIONES MÓVILES (EXPO)
        this.app.use(cors({
            origin: (origin, callback) => {
                const allowedOrigins = [
                    'http://localhost:3000',
                    'https://chatbot-tutor-uc.vercel.app',
                    'https://hubacademia.vercel.app',
                    'https://hubacademia.com',
                    'https://www.hubacademia.com'
                ];
                
                // Las peticiones sin origen (ej. apps móviles nativas, curl, postman) se permiten
                if (!origin) return callback(null, true);
                
                // Permitir orígenes locales para desarrollo y pruebas (Expo, etc.)
                const isLocal = origin.startsWith('http://localhost:') || 
                                origin.startsWith('http://127.0.0.1:') || 
                                /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/.test(origin);
                                
                if (isLocal || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            },
            credentials: true
        }));

        // ✅ EXPRESS.JSON MÍNIMO Y SEGURO
        this.app.use(express.json({
            limit: '1mb',
            verify: (req, res, buf) => {
                req.rawBody = buf.toString();
            }
        }));

        // ✅ MIDDLEWARE DE LOG SIMPLIFICADO
        this.app.use((req, res, next) => {
            if (req.method === 'POST' && req.path === '/api/chat') {
                console.log('📥 CHAT REQUEST:', {
                    method: req.method,
                    path: req.path,
                    body: req.body,
                    rawBody: req.rawBody
                });
            }
            next();
        });
    }

    configureStaticFiles() {
        // ✅ Servir archivos estáticos con CACHÉ agresivo para assets inmutables
        const publicPath = path.join(__dirname, '../../presentation/public');

        // 1. Caché largo para recursos estáticos (CSS, JS, imágenes, fuentes) — 7 días
        this.app.use('/css', express.static(path.join(publicPath, 'css'), {
            maxAge: '7d',
            immutable: true
        }));
        this.app.use('/js', express.static(path.join(publicPath, 'js'), {
            maxAge: '7d',
            immutable: true
        }));
        this.app.use('/assets', express.static(path.join(publicPath, 'assets'), {
            maxAge: '30d',
            immutable: true
        }));

        // 2. Sin caché para HTML (siempre la versión más reciente)
        this.app.use(express.static(publicPath, {
            maxAge: 0,
            etag: true,
            lastModified: true
        }));

        // ✅ Servir favicon.ico desde la raíz del proyecto
        this.app.get('/favicon.ico', (req, res) => {
            res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 días
            res.sendFile(path.join(__dirname, '../../../favicon.ico'));
        });
    }

    configureRoutes() {
        console.log('🔧 Configurando rutas...');
        // Importar y usar los enrutadores modulares
        const { globalApiLimiter } = require('./rateLimiters');
        const apiRoutes = require('../routes/apiRoutes');

        // ✅ HEALTH CHECK (Anti Cold Start)
        // Este endpoint es ultraligero y NO toca la base de datos.
        // Se usa para mantener el servidor "despierto" o verificar que responde.
        this.app.get('/health', (req, res) => {
            res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // ======================
        // 🔗 RUTAS API
        // ======================
        // Aplicar el limitador global a todas las rutas que comiencen con /api
        this.app.use('/api', globalApiLimiter);
        // ✅ REFACTORIZACIÓN: Registrar un único enrutador principal para /api.
        // apiRoutes.js ahora se encarga de delegar a authRoutes y chatRoutes.
        this.app.use('/api', apiRoutes);

        // ======================
        // 🌐 RUTAS FRONTEND
        // ======================
        // ✅ MEJORA: Rutas con "Clean URLs" (sin .html)
        const pages = [
            'login', 'admin', 'chat', 'dashboard', 'self-evaluation',
            'pricing', 'privacy', 'terms', 'quiz', 'course', 'career', 'category',
            'profile', 'deck-editor', 'flashcards', 'repaso', 'simulator-dashboard',
            'simulators', 'resource', 'language-tutor', 'library', 'my-vocabulary'
        ];

        pages.forEach(page => {
            // Ruta Limpia (ej. /pricing)
            this.app.get(`/${page}`, (req, res) => {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.sendFile(path.join(__dirname, `../../presentation/public/${page}.html`));
            });
            // Soporte Legacy (ej. /pricing.html) - Opcional: Redirigir a limpia
            this.app.get(`/${page}.html`, (req, res) => {
                res.redirect(301, `/${page}`);
            });
        });

        // ✅ Ruta Raíz
        this.app.get('/', (req, res) => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.sendFile(path.join(__dirname, '../../presentation/public/index.html'));
        });

        // Manejar rutas no encontradas (DEBE IR AL FINAL)
        this.app.get('*', (req, res) => {
            res.status(404).json({ error: 'Ruta no encontrada' });
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log('🚀 Servidor iniciado - DEBUG MODE');
            console.log(`📡 http://localhost:${this.port}`);
        });
    }
}


module.exports = Server;
// Iniciar servidor de forma asíncrona
if (require.main === module) {
    (async () => {
        const server = new Server();
        await server.setup();
        server.start();
    })();
}
