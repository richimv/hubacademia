const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

let pool;

function isServerlessEnv() {
    return Boolean(
        process.env.VERCEL ||
        process.env.VERCEL_ENV ||
        process.env.AWS_LAMBDA_FUNCTION_NAME ||
        process.env.SERVERLESS === 'true'
    );
}

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
        if (!process.env.NODE_DATABASE_URL) {
            throw new Error('FATAL: NODE_DATABASE_URL no definida en .env');
        }

        const serverless = isServerlessEnv();
        const maxConnections = Number(process.env.PG_POOL_MAX) || (serverless ? 2 : 5);

        console.log(`🔧 Creando pool de conexiones a PostgreSQL (max: ${maxConnections}, serverless: ${serverless})...`);
        pool = new Pool({
            connectionString: process.env.NODE_DATABASE_URL,
            ssl: getSslConfig(),
            max: maxConnections,
            idleTimeoutMillis: serverless ? 10000 : 30000,
            connectionTimeoutMillis: 10000,
            allowExitOnIdle: serverless,
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000
        });

        pool.on('error', (err) => {
            const currentPool = pool;
            const isIdleDisconnect = err.message && (
                err.message.includes('terminat') ||
                err.message.includes('closed') ||
                err.code === 'ECONNRESET'
            );

            if (isIdleDisconnect) {
                console.warn('⚠️ [Postgres Pool] Cliente inactivo desconectado por Supavisor. El pool reciclará la conexión bajo demanda.');
                return;
            }

            if (currentPool && err.code === 'XX000') {
                console.error('❌ Error fatal detectado en el pool. Recreando...', err.message);
                pool = null;
                currentPool.end().catch(e => console.error('Error al cerrar pool:', e));
            }
        });
    }
    return pool;
}

async function safeQuery(text, params) {
    try {
        return await getPool().query(text, params);
    } catch (err) {
        const isTerminated = err.message && (
            err.message.includes('terminat') ||
            err.message.includes('closed') ||
            err.code === 'ECONNRESET' ||
            err.code === '57P01'
        );
        if (isTerminated) {
            console.warn(`🔄 [db.js] Conexión interrumpida (${err.message}). Reintentando consulta con conexión fresca...`);
            return await getPool().query(text, params);
        }
        throw err;
    }
}

module.exports = {
    query: safeQuery,
    pool: () => getPool()
};
