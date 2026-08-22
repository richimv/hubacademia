const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), override: true });

let pool;

function getSslConfig() {
    const caBase64 = String(process.env.NODE_DATABASE_SSL_CA_BASE64 || '').trim();
    const caText = String(process.env.NODE_DATABASE_SSL_CA || '').replace(/\\n/g, '\n').trim();
    const ca = caBase64 ? Buffer.from(caBase64, 'base64').toString('utf8') : caText;
    const rejectUnauthorized = String(process.env.NODE_DATABASE_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true';

    if (process.env.NODE_ENV === 'production' && !rejectUnauthorized) {
        console.warn('⚠️ PostgreSQL TLS cifra el tráfico, pero la verificación de CA está desactivada. Configure NODE_DATABASE_SSL_CA_BASE64 y NODE_DATABASE_SSL_REJECT_UNAUTHORIZED=true.');
    }

    return {
        rejectUnauthorized,
        ...(ca ? { ca } : {})
    };
}

function getPool() {
    if (!pool) {
        // ✅ CORRECCIÓN: Usar la variable específica para Node (Puerto 6543)
        if (!process.env.NODE_DATABASE_URL) {
            throw new Error('FATAL: NODE_DATABASE_URL no definida en .env');
        }

        console.log('🔧 Creando pool de conexiones a PostgreSQL...');
        pool = new Pool({
            connectionString: process.env.NODE_DATABASE_URL, // <--- AQUÍ
            ssl: getSslConfig(),
            max: 5,

            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            keepAlive: true,
        });

        // Manejador de errores (Tu lógica original se mantiene igual)
        pool.on('error', (err, client) => {
            const currentPool = pool;
            if (currentPool && (err.code === 'XX000' || err.message.includes('terminat'))) {
                console.error('❌ Error fatal detectado en el pool. Recreando...', err.message);
                console.log('🔥 Destruyendo el pool de conexiones defectuoso...');
                pool = null;
                currentPool.end().catch(e => console.error("Error al cerrar pool:", e));
            }
        });
    }
    return pool;
}

module.exports = {
    query: (text, params) => getPool().query(text, params),
    pool: () => getPool()
};
