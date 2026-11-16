const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const GLOBAL_POOL_KEY = '__hubAcademiaPgPool';
let pool = globalThis[GLOBAL_POOL_KEY] || null;

// Patrones DDL y de mantenimiento pesado que nunca deben ejecutarse en runtime HTTP
const RUNTIME_DDL_REGEX = /^\s*(?:\/\*[\s\S]*?\*\/\s*|--[^\r\n]*[\r\n]+\s*)*(?:CREATE\s+EXTENSION|ALTER\s+TABLE|VACUUM\b|DROP\s+TABLE|CREATE\s+(?:UNIQUE\s+)?INDEX|DROP\s+INDEX)\b/i;

function isServerlessEnv() {
    return Boolean(
        process.env.VERCEL ||
        process.env.VERCEL_ENV ||
        process.env.AWS_LAMBDA_FUNCTION_NAME ||
        process.env.SERVERLESS === 'true'
    );
}

function isBlockedRuntimeDdl(text) {
    if (process.env.ALLOW_RUNTIME_DDL === 'true') {
        return false;
    }
    if (typeof text !== 'string' || !text.trim()) {
        return false;
    }
    return RUNTIME_DDL_REGEX.test(text);
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
    if (!pool && globalThis[GLOBAL_POOL_KEY]) {
        pool = globalThis[GLOBAL_POOL_KEY];
    }

    if (!pool) {
        if (!process.env.NODE_DATABASE_URL) {
            throw new Error('FATAL: NODE_DATABASE_URL no definida en .env');
        }

        const serverless = isServerlessEnv();
        // En Vercel Serverless cada instancia maneja concurrencia unitaria: max=1 evita
        // tormentas de conexiones en Promise.all y reduce drásticamente pgbouncer.get_auth($1).
        const maxConnections = Number(process.env.PG_POOL_MAX) || (serverless ? 1 : 5);
        // 30s de idleTimeoutMillis con allowExitOnIdle=true permite reutilizar la conexión cálida
        // entre interacciones del usuario sin bloquear el congelamiento del contenedor Serverless.
        const idleTimeoutMillis = Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000;
        const connectionTimeoutMillis = Number(process.env.PG_CONNECTION_TIMEOUT_MS) || (serverless ? 5000 : 10000);
        const queryTimeoutMillis = Number(process.env.PG_QUERY_TIMEOUT_MS) || 15000;

        console.log(`🔧 Creando pool de conexiones a PostgreSQL (max: ${maxConnections}, serverless: ${serverless})...`);
        pool = new Pool({
            connectionString: process.env.NODE_DATABASE_URL,
            ssl: getSslConfig(),
            max: maxConnections,
            idleTimeoutMillis,
            connectionTimeoutMillis,
            query_timeout: queryTimeoutMillis,
            allowExitOnIdle: serverless,
            keepAlive: !serverless,
            ...(serverless ? {} : { keepAliveInitialDelayMillis: 10000 }),
            application_name: serverless ? 'hubacademia-vercel' : 'hubacademia-server'
        });

        pool.on('error', (err) => {
            const isIdleDisconnect = err && (
                (err.message && (
                    err.message.includes('terminat') ||
                    err.message.includes('closed') ||
                    err.message.includes('DbHandler exited') ||
                    err.message.includes('Connection terminated')
                )) ||
                err.code === 'ECONNRESET' ||
                err.code === '57P01' ||
                err.code === 'XX000'
            );

            if (isIdleDisconnect) {
                console.warn('⚠️ [Postgres Pool] Cliente inactivo reciclado por Supavisor/PgBouncer bajo demanda.');
                return;
            }

            console.error('⚠️ [Postgres Pool] Error en cliente inactivo del pool:', err?.message || err);
        });

        globalThis[GLOBAL_POOL_KEY] = pool;
    }
    return pool;
}

async function closePool() {
    const activePool = pool || globalThis[GLOBAL_POOL_KEY];
    pool = null;
    delete globalThis[GLOBAL_POOL_KEY];
    if (activePool && typeof activePool.end === 'function') {
        try {
            await activePool.end();
        } catch (err) {
            console.warn('⚠️ [db.js] Error al cerrar el pool de conexiones:', err.message);
        }
    }
}

async function safeQuery(text, params) {
    if (isBlockedRuntimeDdl(text)) {
        const preview = String(text).trim().replace(/\s+/g, ' ').slice(0, 80);
        console.warn(`🛑 [db.js] DDL/mantenimiento en runtime omitido (${preview}). Ejecute migraciones vía SQL.`);
        return { rows: [], rowCount: 0, skippedRuntimeDdl: true };
    }

    try {
        return await getPool().query(text, params);
    } catch (err) {
        const isTerminated = err && (
            (err.message && (
                err.message.includes('terminat') ||
                err.message.includes('closed')
            )) ||
            err.code === 'ECONNRESET' ||
            err.code === '57P01' ||
            err.code === 'XX000'
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
    pool: () => getPool(),
    closePool,
    isServerlessEnv,
    isBlockedRuntimeDdl
};
