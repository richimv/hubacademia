const fs = require('fs');
const path = require('path');

const LOCAL_KEY_PATH = path.resolve(__dirname, '../../../service-account-key.json');

function isLocalRuntime() {
    return !process.env.NODE_ENV || ['development', 'test'].includes(process.env.NODE_ENV);
}

/**
 * Intenta parsear credenciales de Service Account desde una cadena JSON directa
 * o codificada en Base64 (ideal para variables de entorno en Vercel Serverless).
 */
function parseInlineServiceAccount(rawValue, serviceName = 'GoogleCloud') {
    if (!rawValue || typeof rawValue !== 'string') return null;
    const trimmed = rawValue.trim();
    if (!trimmed) return null;

    try {
        const jsonString = trimmed.startsWith('{')
            ? trimmed
            : Buffer.from(trimmed, 'base64').toString('utf8');

        const parsed = JSON.parse(jsonString);
        if (parsed && parsed.client_email && parsed.private_key) {
            const normalizedPrivateKey = String(parsed.private_key).replace(/\\n/g, '\n');
            const options = {
                credentials: {
                    client_email: parsed.client_email,
                    private_key: normalizedPrivateKey
                }
            };
            if (parsed.project_id) {
                options.projectId = parsed.project_id;
                if (!process.env.GOOGLE_CLOUD_PROJECT) {
                    process.env.GOOGLE_CLOUD_PROJECT = parsed.project_id;
                }
            }
            return options;
        }
    } catch (error) {
        console.warn(`⚠️ [${serviceName}] No se pudo parsear credencial GCP en memoria: ${error.message}`);
    }

    return null;
}

/**
 * Resuelve credenciales de Google Cloud de forma compatible con:
 * 1. Vercel Serverless (GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_CREDENTIALS_BASE64 en memoria)
 * 2. Ruta de archivo explícita válida (GOOGLE_APPLICATION_CREDENTIALS)
 * 3. Archivo local de desarrollo (service-account-key.json)
 * 4. Application Default Credentials (ADC)
 */
function resolveGoogleAuthOptions(serviceName = 'GoogleCloud') {
    const inlineRaw =
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
        process.env.GOOGLE_CREDENTIALS_BASE64 ||
        '';

    const inlineOptions = parseInlineServiceAccount(inlineRaw, serviceName);
    if (inlineOptions) {
        // Evitar que librerías de Google intenten abrir una ruta local inexistente en Serverless
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
            delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
        }
        return inlineOptions;
    }

    const configuredPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
    if (configuredPath) {
        // Soporte defensivo si alguien colocó el JSON directamente en GOOGLE_APPLICATION_CREDENTIALS
        if (configuredPath.startsWith('{')) {
            const embeddedOptions = parseInlineServiceAccount(configuredPath, serviceName);
            delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
            if (embeddedOptions) return embeddedOptions;
        }

        if (fs.existsSync(configuredPath)) {
            return { keyFilename: configuredPath };
        }

        console.warn(`⚠️ [${serviceName}] GOOGLE_APPLICATION_CREDENTIALS apunta a una ruta inexistente; se usará ADC.`);
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }

    if (isLocalRuntime() && fs.existsSync(LOCAL_KEY_PATH)) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = LOCAL_KEY_PATH;
        return { keyFilename: LOCAL_KEY_PATH };
    }

    return {};
}

module.exports = {
    resolveGoogleAuthOptions,
    parseInlineServiceAccount,
    isLocalRuntime
};
