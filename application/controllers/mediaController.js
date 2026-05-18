const axios = require('axios');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const sharp = require('sharp');
const db = require('../../infrastructure/database/db');
const driveService = require('../../domain/services/driveService');

class MediaController {
    constructor() {
        // ✅ MEJORA: Autenticación robusta (Usa variable de entorno o fallback local)
        const storageOptions = {};
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            storageOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        } else {
            storageOptions.keyFilename = path.join(__dirname, '../../service-account-key.json');
        }

        this.storage = new Storage(storageOptions);
        this.bucketName = process.env.GCS_BUCKET_NAME || 'chatbot-tutor-medical-images';
    }

    /**
     * ✅ NUEVO: Optimiza un buffer de imagen y lo convierte a WebP.
     */
    async _optimizeImage(buffer) {
        try {
            return await sharp(buffer)
                .resize({ width: 1000, withoutEnlargement: true }) // Reducido para evitar OOM (Out Of Memory) en Render
                .webp({
                    quality: 80,
                    smartSubsampling: true // ✅ MEJORA: Bordes más nítidos para texto y diagramas
                })
                .withMetadata() // ✅ MEJORA: Preservar perfiles de color y orientación
                .toBuffer();
        } catch (error) {
            console.error('❌ Error optimizando imagen con Sharp:', error);
            return buffer; // Fallback al original si falla
        }
    }

    /**
     * Sube un archivo a GCS con optimización automática a WebP.
     * Retorna su ruta relativa (ej: 'explanations/nombre.webp')
     */
    async uploadFile(file, folder = 'explanations', optimize = true) {
        try {
            const bucket = this.storage.bucket(this.bucketName);

            let buffer = file.buffer;
            let fileName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
            let contentType = file.mimetype;

            // ✅ OPTIMIZACIÓN A WEBP
            if (optimize && contentType.startsWith('image/')) {
                buffer = await this._optimizeImage(buffer);
                // Cambiar extensión a .webp
                const baseName = path.parse(fileName).name;
                fileName = `${baseName}.webp`;
                contentType = 'image/webp';
            }

            const finalFileName = `${Date.now()}-${fileName}`;
            const gcsPath = `${folder}/${finalFileName}`;
            const gcsFile = bucket.file(gcsPath);

            await gcsFile.save(buffer, {
                metadata: {
                    contentType,
                    cacheControl: 'public, max-age=31536000' // ✅ MEJORA: Caché de 1 año (Estilo Netflix)
                }
            });

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
    async deleteFile(gcsPath) {
        if (!gcsPath || gcsPath.startsWith('http')) return;

        try {
            const bucket = this.storage.bucket(this.bucketName);
            const file = bucket.file(gcsPath);
            const [exists] = await file.exists();

            if (exists) {
                await file.delete();
                console.log(`🗑️ Archivo eliminado de GCS: ${gcsPath}`);
            }
        } catch (error) {
            console.error(`⚠️ Error eliminando archivo de GCS (${gcsPath}):`, error.message);
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
            if (gcsPath.startsWith('http')) return res.redirect(gcsPath);

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
            res.setHeader('Content-Disposition', isDownload ? `attachment; filename="${baseName}"` : 'inline');
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

            // Extraer el path de GCS de la URL si es necesario
            // La URL suele ser algo como https://.../api/media/gcs?file=folder/image.webp
            let gcsPath = url;
            if (url.includes('?file=')) {
                gcsPath = url.split('?file=')[1];
            } else if (url.includes('?path=')) {
                gcsPath = url.split('?path=')[1];
            }

            await this.deleteFile(gcsPath);
            res.json({ success: true });
        } catch (error) {
            console.error('Error in handleDeleteMedia:', error);
            res.status(500).json({ error: 'Error al eliminar el archivo' });
        }
    }
}

module.exports = new MediaController();
