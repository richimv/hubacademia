/**
 * Resuelve el dominio público base del ecosistema Hub Academia en entornos
 * locales y Vercel Serverless (sin depender de servicios externos legacy).
 */
function resolvePublicBaseUrl() {
    const explicit =
        process.env.BACKEND_PUBLIC_URL ||
        process.env.BACKEND_URL ||
        process.env.API_URL ||
        process.env.FRONTEND_URL;

    if (explicit && String(explicit).trim()) {
        return String(explicit).trim().replace(/\/+$/, '');
    }

    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        return `https://${String(process.env.VERCEL_PROJECT_PRODUCTION_URL).trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')}`;
    }

    if (process.env.VERCEL_URL) {
        return `https://${String(process.env.VERCEL_URL).trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')}`;
    }

    return 'https://www.hubacademia.com';
}

module.exports = { resolvePublicBaseUrl };
