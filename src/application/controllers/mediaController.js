const axios = require('axios');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const sharp = require('sharp');
const { resolveGoogleAuthOptions } = require('../../infrastructure/config/googleCredentials');

const ALLOWED_MEDIA_PREFIXES = new Set([
    'cases',
    'questions',
    'explanations',
    'thumbnails',
    'editor-content',
    'recursos',
    'cursos',
    'carreras',
    'flashcards',
    'audio-cards',
    'audio',
    'tts_cache'
]);

function normalizeMediaPath(rawPath) {
    if (typeof rawPath !== 'string' || !rawPath.trim()) return null;

    let value = rawPath.trim();
    try {
        value = decodeURIComponent(value);
    } catch (error) {
        return null;
    }

    value = value.replace(/\\/g, '/');
    if (value.startsWith('/') || value.includes('\0') || value.includes('..')) return null;

    const normalized = path.posix.normalize(value);
    if (normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) return null;

    const prefix = normalized.split('/')[0];
    if (!ALLOWED_MEDIA_PREFIXES.has(prefix)) return null;
    return normalized;
}

function extractMediaPath(rawValue) {
    if (typeof rawValue !== 'string' || !rawValue.trim()) return null;

    let value = rawValue.trim();
    try {
        if (/^https?:\/\//i.test(value)) {
            const parsed = new URL(value);
            const fileParam = parsed.searchParams.get('file') || parsed.searchParams.get('path');
            if (fileParam) value = fileParam;
            else return null;
        } else if (value.includes('?file=')) {
            value = value.split('?file=')[1].split('&')[0];
        } else if (value.includes('?path=')) {
            value = value.split('?path=')[1].split('&')[0];
        }
    } catch (error) {
        return null;
    }

    return normalizeMediaPath(value);
}

class MediaController {
    constructor() {
        this.storage = new Storage(resolveGoogleAuthOptions('MediaController'));
        this.bucketName = process.env.GCS_BUCKET_NAME || 'chatbot-tutor-medical-images';
    }

    /**
     * ✅ NUEVO: Optimiza un buffer de imagen y lo convierte a WebP.
     */
    async _validateImageBuffer(buffer) {
        const image = sharp(buffer, { limitInputPixels: 40_000_000, failOn: 'warning' });
        const metadata = await image.metadata();
        if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
            throw new Error('El contenido del archivo no corresponde a una imagen JPG, PNG o WebP válida.');
        }
        return metadata;
    }

    async _optimizeImage(buffer) {
        await this._validateImageBuffer(buffer);
        return sharp(buffer, { limitInputPixels: 40_000_000, failOn: 'warning' })
            .rotate()
            .resize({ width: 1000, withoutEnlargement: true })
            .webp({ quality: 80, smartSubsampling: true })
            .toBuffer();
    }

    /**
     * Sube un archivo a GCS con optimización automática a WebP.
     * Retorna su ruta relativa (ej: 'explanations/nombre.webp')
     */
    async uploadFile(file, folder = 'explanations', optimize = true, ownerId = null) {
        try {
            if (!file?.buffer || !Buffer.isBuffer(file.buffer)) throw new Error('Archivo de imagen inválido.');
            if (!ALLOWED_MEDIA_PREFIXES.has(folder)) throw new Error('Carpeta de media no permitida.');
            const bucket = this.storage.bucket(this.bucketName);

            let buffer = file.buffer;
            let fileName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
            let contentType = file.mimetype;

            // ✅ OPTIMIZACIÓN A WEBP
            if (contentType.startsWith('image/')) {
                if (optimize) {
                    buffer = await this._optimizeImage(buffer);
                    const baseName = path.parse(fileName).name;
                    fileName = `${baseName}.webp`;
                    contentType = 'image/webp';
                } else {
                    await this._validateImageBuffer(buffer);
                }
            }

            const finalFileName = `${Date.now()}-${fileName}`;
            const gcsPath = `${folder}/${finalFileName}`;
            const gcsFile = bucket.file(gcsPath);

            const saveOptions = {
                metadata: {
                    contentType,
                    cacheControl: 'public, max-age=31536000'
                }
            };
            if (ownerId) saveOptions.metadata.metadata = { ownerId: String(ownerId) };
            await gcsFile.save(buffer, saveOptions);

            console.log(`✅ Archivo subido y optimizado a GCS: ${gcsPath}`);
            return gcsPath;
        } catch (error) {
            console.error('❌ Error subiendo a GCS:', error);
            throw new Error('Error al subir el archivo al almacenamiento en la nube.');
        }
    }

    /**
     * ✅ NUEVO: Elimina un archivo de GCS de forma segura.
     */
    async deleteFile(gcsPath, options = {}) {
        const normalizedPath = extractMediaPath(gcsPath);
        if (!normalizedPath) return false;

        try {
            const bucket = this.storage.bucket(this.bucketName);
            const file = bucket.file(normalizedPath);
            const [exists] = await file.exists();

            if (!exists) return false;

            if (options.requireAuthorization) {
                const isAdmin = options.isAdmin === true;
                if (!isAdmin) {
                    if (!options.actorId || !normalizedPath.startsWith('flashcards/')) return false;
                    const [metadata] = await file.getMetadata();
                    const ownerId = metadata?.metadata?.ownerId;
                    if (!ownerId || String(ownerId) !== String(options.actorId)) return false;
                }
            }

            await file.delete();
            console.log(`🗑️ Archivo eliminado de GCS: ${normalizedPath}`);
            return true;
        } catch (error) {
            console.error(`⚠️ Error eliminando archivo de GCS (${normalizedPath}):`, error.message);
            return false;
        }
    }

    /**
     * Proxy de previsualización para el Administrador.
     */
    async serveGCSPreview(req, res) {
        return this._serveGCSByPath(req, res, true);
    }

    /**
     * Proxy general para servir imágenes de GCS por ruta (Capa de Usuarios).
     * GET /api/media/gcs?path=...
     */
    async serveGCSGeneral(req, res) {
        return this._serveGCSByPath(req, res, false);
    }

    /**
     * Lógica interna compartida para servir archivos de GCS por ruta.
     */
    async _serveGCSByPath(req, res, isAdminOnly = false) {
        try {
            // Soportamos ?file= (Nuevo Estandar Seguro) y ?path= (Legacy)
            let gcsPath = req.query.file || req.query.path;
            
            // Si el servidor detecta que Vercel sobrescribió el path de la URL real
            // con el nombre del endpoint (media/gcs), abortar con error técnico claro.
            if (gcsPath === 'media/gcs' || gcsPath === 'media/explanation' || gcsPath === 'media/preview') {
                return res.status(502).send('Error de Enrutamiento en Producción: Conflicto de Vercel Route Parameter detectado. El parámetro query "path" fue sobrescrito. La plataforma ya fue parcheada, los nuevos archivos usarán "?file=".');
            }

            if (!gcsPath) return res.status(400).send('Falta el parámetro de archivo (file/path).');
            gcsPath = normalizeMediaPath(gcsPath);
            if (!gcsPath) return res.status(403).send('Ruta de media no permitida.');

            const bucket = this.storage.bucket(this.bucketName);
            const file = bucket.file(gcsPath);

            const [exists] = await file.exists();
            if (!exists) {
                // Silencioso o 404 estándar
                return res.status(404).send('Archivo no encontrado en GCS.');
            }

            const ext = path.extname(gcsPath).toLowerCase();
            const contentTypes = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.webp': 'image/webp',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.pdf': 'application/pdf',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.mov': 'video/quicktime',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            };

            const isDownload = req.query.download === 'true' || req.query.download === '1';
            const baseName = path.basename(gcsPath);

            res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
            const forceDownload = isDownload || ext === '.svg';
            res.setHeader('Content-Disposition', forceDownload ? `attachment; filename="${baseName}"` : 'inline');
            res.setHeader('Cache-Control', isAdminOnly ? 'no-cache' : 'public, max-age=31536000, immutable'); // Cache 1 año para usuarios

            file.createReadStream().pipe(res);
        } catch (error) {
            console.error('❌ Error sirviendo GCS por ruta:', error);
            res.status(500).send('Error interno.');
        }
    }

    /**
     * ✅ NUEVO: Recibe un Buffer de imagen, lo optimiza y lo sube a GCS.
     * Ideal para miniaturas descargadas de fuentes externas (Drive).
     */
    async uploadBuffer(buffer, originalName, mimeType, folder = 'thumbnails') {
        try {
            const bucket = this.storage.bucket(this.bucketName);

            // 1. Optimización forzada a WebP
            const optimizedBuffer = await this._optimizeImage(buffer);

            // 2. Preparar metadatos
            const baseName = path.parse(originalName).name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
            const fileName = `${Date.now()}-${baseName}.webp`;
            const gcsPath = `${folder}/${fileName}`;
            const gcsFile = bucket.file(gcsPath);

            // 3. Guardar en GCS con caché agresivo
            await gcsFile.save(optimizedBuffer, {
                metadata: {
                    contentType: 'image/webp',
                    cacheControl: 'public, max-age=31536000' // ✅ MEJORA: Caché de 1 año
                }
            });

            console.log(`✅ Buffer subido y optimizado a GCS: ${gcsPath}`);
            return gcsPath;
        } catch (error) {
            console.error('❌ Error subiendo buffer a GCS:', error.message);
            return null;
        }
    }

    /**
     * ✅ NUEVO: Sube un buffer crudo a GCS (ej: Audio, PDF, etc) sin optimización.
     */
    async uploadRawBuffer(buffer, fileName, contentType, folder = 'audio') {
        try {
            const bucket = this.storage.bucket(this.bucketName);
            const safeName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
            const finalPath = `${folder}/${Date.now()}-${safeName}`;
            const gcsFile = bucket.file(finalPath);

            await gcsFile.save(buffer, {
                metadata: {
                    contentType,
                    cacheControl: 'public, max-age=31536000'
                }
            });

            console.log(`✅ Buffer crudo subido a GCS: ${finalPath}`);
            return finalPath;
        } catch (error) {
            console.error('❌ Error subiendo raw buffer a GCS:', error);
            throw error;
        }
    }

    /**
     * Endpoint Handler: DELETE /api/media/delete
     * Permite a los usuarios borrar imágenes que subieron (ej: durante edición de guías)
     */
    async handleDeleteMedia(req, res) {
        try {
            const { url } = req.body;
            if (!url) return res.status(400).json({ error: 'Falta la URL de la imagen' });

            const gcsPath = extractMediaPath(url);
            if (!gcsPath) return res.status(400).json({ error: 'Ruta de media inválida.' });

            const deleted = await this.deleteFile(gcsPath, {
                requireAuthorization: true,
                actorId: req.user?.id,
                isAdmin: req.user?.role === 'admin'
            });

            if (!deleted) return res.status(403).json({ error: 'No autorizado para eliminar este archivo.' });
            res.json({ success: true });
        } catch (error) {
            console.error('Error in handleDeleteMedia:', error);
            res.status(500).json({ error: 'Error al eliminar el archivo' });
        }
    }
}

module.exports = new MediaController();
