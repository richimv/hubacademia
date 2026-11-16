const { Storage } = require('@google-cloud/storage');
const path = require('path');
const { resolveGoogleAuthOptions } = require('../config/googleCredentials');

let storageInstance = null;
try {
    storageInstance = new Storage(resolveGoogleAuthOptions('GcsMediaStorage'));
} catch (error) {
    console.warn('⚠️ [gcsMediaStorage] No se pudo inicializar GCS Storage:', error.message);
}

/**
 * Normaliza y extrae la ruta de objeto en GCS a partir de una URL o ruta relativa.
 * Rechaza URLs externas sin ?file=/?path=, assets locales y path traversal.
 * @param {string} gcsUrlOrPath
 * @returns {string|null}
 */
function resolveGcsPath(gcsUrlOrPath) {
    if (!gcsUrlOrPath || typeof gcsUrlOrPath !== 'string') return null;
    const trimmed = gcsUrlOrPath.trim();
    if (!trimmed) return null;

    let rawPath = null;
    if (trimmed.includes('?file=')) {
        rawPath = trimmed.split('?file=')[1].split('&')[0];
    } else if (trimmed.includes('?path=')) {
        rawPath = trimmed.split('?path=')[1].split('&')[0];
    } else if (
        !trimmed.startsWith('http://') &&
        !trimmed.startsWith('https://') &&
        !trimmed.startsWith('/') &&
        !trimmed.startsWith('assets/')
    ) {
        rawPath = trimmed;
    }

    if (!rawPath) return null;

    try {
        const decoded = decodeURIComponent(rawPath).replace(/\\/g, '/').trim();
        if (!decoded || decoded.startsWith('/') || decoded.includes('\0') || decoded.includes('..')) {
            return null;
        }
        const normalized = path.posix.normalize(decoded);
        if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) {
            return null;
        }
        return normalized;
    } catch (error) {
        return null;
    }
}

const gcsMediaStorage = {
    storage: storageInstance,
    bucketName: process.env.GCS_BUCKET_NAME || 'chatbot-tutor-medical-images',
    resolveGcsPath,

    /**
     * Descarga el buffer binario de una imagen almacenada en Google Cloud Storage.
     * @param {string} gcsUrlOrPath - URL con ?file=/?path= o ruta relativa del objeto en GCS.
     * @returns {Promise<Buffer|null>} Buffer de la imagen o null si no existe o falla la descarga.
     */
    async downloadImageBuffer(gcsUrlOrPath) {
        const gcsPath = resolveGcsPath(gcsUrlOrPath);
        if (!gcsPath) return null;

        try {
            if (!gcsMediaStorage.storage) {
                gcsMediaStorage.storage = new Storage(resolveGoogleAuthOptions('GcsMediaStorage'));
            }
            const bucket = gcsMediaStorage.storage.bucket(gcsMediaStorage.bucketName);
            const file = bucket.file(gcsPath);
            const [exists] = await file.exists();
            if (!exists) return null;

            const [buffer] = await file.download();
            if (!buffer || buffer.length === 0) return null;
            return buffer;
        } catch (error) {
            console.warn(`⚠️ [gcsMediaStorage] No se pudo descargar imagen de GCS (${gcsPath}):`, error.message);
            return null;
        }
    }
};

module.exports = gcsMediaStorage;
