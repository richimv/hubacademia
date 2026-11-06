const path = require('path');
require('events').EventEmitter.defaultMaxListeners = 50;
// Local secrets stay outside tracked configuration; hosted environment values win.
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env.local'), quiet: true });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
const express = require('express');
const cors = require('cors');
const compression = require('compression');

const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://chatbot-tutor-uc.vercel.app',
    'https://hubacademia.vercel.app',
    'https://hubacademia.com',
    'https://www.hubacademia.com',
    'https://docentes.hubacademia.com'
];

function isServerlessRuntime() {
    return Boolean(
        process.env.VERCEL ||
        process.env.VERCEL_ENV ||
        process.env.AWS_LAMBDA_FUNCTION_NAME ||
        process.env.SERVERLESS === 'true'
    );
}

function isOriginAllowed(origin) {
    if (!origin) return true;

    const isLocal =
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/.test(origin);

    return isLocal || ALLOWED_ORIGINS.includes(origin);
}

let globalErrorHandlersRegistered = false;

class Server {
    constructor() {
        console.log('🚀 Inicializando Server...');
        this.app = express();
        this.port = process.env.PORT || 3000;
        this._setupPromise = null;
        this._isConfigured = false;
    }

    async setup() {
        if (this._isConfigured) {
            return this.app;
        }
        if (this._setupPromise) {
            return this._setupPromise;
        }

        this._setupPromise = (async () => {
            try {
                this.setupGlobalErrorHandlers();
                await this.testDBConnection();
                this.configureMiddleware();
                this.configureStaticFiles();
                this.configureRoutes();
                this._isConfigured = true;
                return this.app;
            } catch (error) {
                this._setupPromise = null;
                throw error;
            }
        })();

        return this._setupPromise;
    }

    async testDBConnection() {
        try {
            const db = require('../database/db');
            require('./googleCredentials').resolveGoogleAuthOptions('ServerAuth');

            const client = await db.query('SELECT NOW()');
            console.log('💾 PostgreSQL conectado exitosamente. Hora del servidor de BD:', client.rows[0].now);
        } catch (error) {
            console.error('❌ Error al conectar con la base de datos PostgreSQL:', error.message);
            if (isServerlessRuntime()) {
                throw error;
            }
            process.exit(1);
        }
    }

    setupGlobalErrorHandlers() {
        if (globalErrorHandlersRegistered) return;
        globalErrorHandlersRegistered = true;

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

        this.app.use(compression());
        this.app.set('trust proxy', 1);
        this.app.disable('x-powered-by');

        // CSP inicia en report-only para medir compatibilidad con scripts inline/CDN.
        this.app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'SAMEORIGIN');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
            res.setHeader('Content-Security-Policy-Report-Only', [
                "default-src 'self'",
                "base-uri 'self'",
                "object-src 'none'",
                "frame-ancestors 'self'",
                "form-action 'self' https://accounts.google.com",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://accounts.google.com",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://accounts.google.com",
                "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://accounts.google.com",
                "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://accounts.google.com",
                "img-src 'self' data: blob: https:",
                "connect-src 'self' https: wss:",
                "media-src 'self' blob: https:",
                "frame-src 'self' https://accounts.google.com https://*.google.com https://*.youtube.com https://www.youtube-nocookie.com",
                "worker-src 'self' blob:"
            ].join('; '));
            if (process.env.NODE_ENV === 'production' && (req.secure || req.headers['x-forwarded-proto'] === 'https')) {
                res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            }
            next();
        });

        // ✅ CORS CONFIGURADO PARA VERCEL, DOMINIO PROPIO, SUBDOMINIO DOCENTES Y APPS MÓVILES
        const corsOptions = {
            origin: (origin, callback) => {
                callback(null, isOriginAllowed(origin));
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization', 'x-client-info', 'apikey', 'X-Requested-With', 'Accept', 'Origin']
        };

        this.app.use(cors(corsOptions));
        this.app.options('*', cors(corsOptions));

        // ✅ Límite alineado con funciones Serverless de Vercel (4.5 MB máximo de payload)
        this.app.use(express.json({ limit: '4.5mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '4.5mb' }));

        // Logs de telemetría sin body, prompt, token ni rawBody.
        this.app.use((req, res, next) => {
            if (req.method === 'POST' && req.path === '/api/chat') {
                console.log('📥 CHAT REQUEST', { method: req.method, path: req.path });
            }
            next();
        });
    }

    configureStaticFiles() {
        const publicPath = path.join(__dirname, '../../presentation/public');

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
            immutable: true,
            setHeaders: (res, filePath) => {
                // This authoring asset is replaced in place; validate it on each visit.
                if (path.basename(filePath) === 'fondo_simulador.png') {
                    res.setHeader('Cache-Control', 'no-cache');
                }
            }
        }));

        this.app.get('/robots.txt', (req, res) => {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.sendFile(path.join(publicPath, 'robots.txt'));
        });

        this.app.get('/sitemap.xml', (req, res) => {
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.sendFile(path.join(publicPath, 'sitemap.xml'));
        });

        this.app.use(express.static(publicPath, {
            maxAge: 0,
            etag: true,
            lastModified: true
        }));

        this.app.get('/favicon.ico', (req, res) => {
            res.setHeader('Cache-Control', 'public, max-age=604800');
            res.sendFile(path.join(__dirname, '../../../favicon.ico'));
        });
    }

    configureRoutes() {
        console.log('🔧 Configurando rutas...');
        const { globalApiLimiter } = require('./rateLimiters');
        const apiRoutes = require('../routes/apiRoutes');

        this.app.get('/health', (req, res) => {
            res.status(200).json({ status: 'ok', runtime: isServerlessRuntime() ? 'vercel-serverless' : 'node-server', timestamp: new Date().toISOString() });
        });

        this.app.use('/api', globalApiLimiter);
        this.app.use('/api', apiRoutes);

        const pages = [
            'login', 'admin', 'chat', 'dashboard',
            'pricing', 'privacy', 'terms', 'quiz', 'course', 'career', 'category',
            'profile', 'deck-editor', 'flashcards', 'repaso', 'simulator-dashboard',
            'simulators', 'resource', 'library'
        ];

        pages.forEach(page => {
            this.app.get(`/${page}`, (req, res) => {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.sendFile(path.join(__dirname, `../../presentation/public/${page}.html`));
            });
            this.app.get(`/${page}.html`, (req, res) => {
                res.redirect(301, `/${page}`);
            });
        });

        this.app.get('/', (req, res) => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.sendFile(path.join(__dirname, '../../presentation/public/index.html'));
        });

        this.app.get('*', (req, res) => {
            res.status(404).json({ error: 'Ruta no encontrada' });
        });
    }

    start() {
        return this.app.listen(this.port, () => {
            console.log('🚀 Servidor iniciado');
            console.log(`📡 http://localhost:${this.port}`);
        });
    }
}

Server.ALLOWED_ORIGINS = ALLOWED_ORIGINS;
Server.isOriginAllowed = isOriginAllowed;
Server.isServerlessRuntime = isServerlessRuntime;

module.exports = Server;

if (require.main === module) {
    (async () => {
        try {
            const server = new Server();
            await server.setup();
            server.start();
        } catch (error) {
            console.error('❌ Fallo fatal en el arranque del servidor:', error);
            process.exit(1);
        }
    })();
}
