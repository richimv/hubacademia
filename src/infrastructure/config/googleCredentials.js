const fs = require('fs');
const path = require('path');

const LOCAL_KEY_PATH = path.resolve(__dirname, '../../../service-account-key.json');

function isLocalRuntime() {
    return !process.env.NODE_ENV || ['development', 'test'].includes(process.env.NODE_ENV);
}

/**
 * Resuelve credenciales de Google sin asumir que un archivo local existe en
 * producción. En Render/Google Cloud se usa ADC cuando no hay una ruta válida.
 * El archivo local nunca se modifica ni se elimina.
 */
function resolveGoogleAuthOptions(serviceName = 'GoogleCloud') {
    const configuredPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();

    if (configuredPath) {
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

module.exports = { resolveGoogleAuthOptions, isLocalRuntime };
