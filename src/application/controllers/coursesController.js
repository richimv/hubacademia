const GeminiService = require('../../domain/services/mlService');
const mediaController = require('./mediaController');
const DriveService = require('../../domain/services/driveService');
const { resolvePublicBaseUrl } = require('../../infrastructure/config/publicUrl');

/**
 * Parsea un identificador entero positivo estricto desde parámetros de ruta.
 * @param {string|number} rawId
 * @returns {number|null}
 */
function parsePositiveIntId(rawId) {
    const normalized = String(rawId ?? '').trim();
    if (!/^\d+$/.test(normalized)) return null;
    const parsed = Number.parseInt(normalized, 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

class CoursesController {
    constructor(searchService, adminService) {
        this.searchService = searchService;
        this.adminService = adminService;

        // ✅ SOLUCIÓN: Bindeo explícito de todos los métodos para mantener el contexto 'this'.
        this.getAllCourses = this.getAllCourses.bind(this);
        this.searchCourses = this.searchCourses.bind(this);
        this.getCareers = this.getCareers.bind(this);
        this.getCourses = this.getCourses.bind(this);

        this.getStudents = this.getStudents.bind(this);
        this.getTopics = this.getTopics.bind(this);
        this.getBooks = this.getBooks.bind(this);
        this.getMedicalBooks = this.getMedicalBooks.bind(this);
        this.getCourseDescription = this.getCourseDescription.bind(this);
        this.createEntity = this.createEntity.bind(this);
        this.updateEntity = this.updateEntity.bind(this);
        this.deleteEntity = this.deleteEntity.bind(this);
        this.getDataForML = this.getDataForML.bind(this);

        // ✅ FIX: Bind new detail methods
        this.getCareerById = this.getCareerById.bind(this);
        this.getCourseById = this.getCourseById.bind(this);
        this.getTopicById = this.getTopicById.bind(this);
        this.getResourceById = this.getResourceById.bind(this); // ✅ NUEVO
    }
    async getAllCourses(req, res) {
        // Este método sigue siendo útil para obtener la lista completa sin formato de búsqueda
        try {
            const courses = await this.searchService.getAllCourses();
            res.json(courses);
        } catch (error) {
            res.status(500).json({ error: 'Error al obtener los cursos' });
        }
    }

    async searchCourses(req, res) {
        try {
            const query = req.query.q;
            if (!query) {
                return res.status(400).json({ error: 'El parámetro de búsqueda "q" es requerido.' });
            }

            // ✅ PASAR EL USUARIO AL SERVICIO DE BÚSQUEDA
            // El servicio de búsqueda ahora orquesta todo: búsqueda, analytics y recomendaciones.
            const finalResponse = await this.searchService.searchCourses(query, req.user);
            res.json(finalResponse);
        } catch (error) {
            console.error('❌ Controlador Error búsqueda:', error);
            res.status(500).json({ error: 'Error al buscar cursos' });
        }
    }

    async getCareers(req, res) {
        try {
            const { domain } = req.query;
            const careers = await this.adminService.getAll('career', { domain });
            res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
            res.json(careers);
        } catch (error) {
            res.status(500).json({ error: 'Error al obtener las carreras' });
        }
    }

    async getCourses(req, res) {
        try {
            const { domain } = req.query;
            const courses = await this.adminService.getAll('course', { domain });
            res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
            res.json(courses);
        } catch (error) {
            if (error.code === 'ENOTFOUND' || error.syscall === 'getaddrinfo') {
                console.warn('⚠️ Fallo de conexión al obtener cursos: Red inestable.');
            } else {
                console.error('Error in getCourses:', error);
            }
            res.status(500).json({ error: 'Error al obtener los cursos base' });
        }
    }



    // ✅ NUEVO: Controlador para obtener alumnos.
    async getStudents(req, res) {
        try {
            const students = await this.adminService.getAll('student');
            res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
            res.json(students);
        } catch (error) {
            res.status(500).json({ error: 'Error al obtener los alumnos' });
        }
    }

    async getTopics(req, res) {
        try {
            const topics = await this.adminService.getAll('topic');
            res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
            res.json(topics);
        } catch (error) {
            res.status(500).json({ error: 'Error al obtener los temas' });
        }
    }

    // ✅ NUEVO: Métodos para obtener entidades por ID (para páginas de detalle)


    async getCareerById(req, res) {
        try {
            const id = parsePositiveIntId(req.params.id);
            if (!id) return res.status(400).json({ error: 'ID de carrera inválido' });

            const career = await this.adminService.getById('career', id);

            if (!career) return res.status(404).json({ error: 'Carrera no encontrada' });

            // ✅ FIX: Fetch courses related to this career
            // We use the search service or directly the repository to find courses by career name
            // Since we have searchService, let's use it or adminService's repo if accessible.
            // Accessing repo directly via adminService (a bit hacky but efficient for now)
            const courseRepo = this.adminService._getRepository('course');

            // We need a method to find by career. Using explicit ID search now.
            const courses = await courseRepo.findByCareerId(career.id);

            career.courses = courses;

            res.json(career);
        } catch (error) {
            console.error('Error in getCareerById:', error);
            res.status(500).json({ error: 'Error al obtener la carrera' });
        }
    }

    async getCourseById(req, res) {
        try {
            const id = parsePositiveIntId(req.params.id);
            if (!id) return res.status(400).json({ error: 'ID de curso inválido' });

            // 1. Obtener curso con temas y materiales (gracias al nuevo repositorio)
            const course = await this.adminService.getById('course', id);

            if (!course) return res.status(404).json({ error: 'Curso no encontrado' });



            res.json(course);
        } catch (error) {
            console.error('Error in getCourseById:', error);
            res.status(500).json({ error: 'Error al obtener el curso' });
        }
    }

    async getResourceById(req, res) {
        try {
            const id = parsePositiveIntId(req.params.id);
            if (!id) return res.status(400).json({ error: 'ID de recurso inválido' });

            const resource = await this.adminService.getById('book', id);
            if (!resource) return res.status(404).json({ error: 'Recurso no encontrado' });
            res.json(resource);
        } catch (error) {
            console.error('Error in getResourceById:', error);
            res.status(500).json({ error: 'Error al obtener el recurso' });
        }
    }

    async getTopicById(req, res) {
        try {
            const id = parsePositiveIntId(req.params.id);
            if (!id) return res.status(400).json({ error: 'ID de tema inválido' });

            const topic = await this.adminService.getById('topic', id);
            if (!topic) return res.status(404).json({ error: 'Tema no encontrado' });
            res.json(topic);
        } catch (error) {
            console.error('Error in getTopicById:', error);
            res.status(500).json({ error: 'Error al obtener el tema' });
        }
    }



    async getBooks(req, res) {
        try {
            const { type, includeHidden } = req.query;
            const isHiddenIncluded = includeHidden === 'true' && Boolean(req.user && req.user.role === 'admin');
            const books = await this.adminService.getAll('book', { type, includeHidden: isHiddenIncluded });

            if (isHiddenIncluded) {
                res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
            } else {
                res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
            }
            res.json(books);
        } catch (error) {
            if (error.code === 'ENOTFOUND' || error.syscall === 'getaddrinfo') {
                console.warn('⚠️ Fallo de conexión al obtener libros: Red inestable.');
            } else {
                console.error('❌ Error al obtener los libros:', error);
            }
            res.status(500).json({ message: 'Error al obtener los libros' });
        }
    }

    async getMedicalBooks(req, res) {
        try {
            const bookRepo = this.adminService._getRepository('book');
            const areaKeywords = ['Ciencias de la Salud'];
            const books = await bookRepo.findByArea(areaKeywords, 100);
            res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
            res.json(books);
        } catch (error) {
            console.error('❌ Error al obtener libros de medicina:', error);
            res.status(500).json({ message: 'Error al obtener libros de medicina' });
        }
    }

    async getCourseDescription(req, res) {
        try {
            const courseId = parsePositiveIntId(req.params.id);
            if (!courseId) {
                return res.status(400).json({ error: 'ID de curso inválido' });
            }
            // Usamos adminService que ya está instanciado y es consistente con getTopicDescription
            const course = await this.adminService.getById('course', courseId);
            if (!course) {
                return res.status(404).json({ error: 'Curso no encontrado' });
            }
            // Llamamos al servicio de ML para generar la descripción
            const description = await GeminiService.generateCourseDescription(course.name);
            res.json({ description });
        } catch (error) {
            res.status(500).json({ error: 'Error al generar la descripción del curso' });
        }
    }

    /**
     * Procesa una URL para detectar si es de Drive y extraer su miniatura de forma persistente.
     * @param {string} url - La URL del recurso.
     * @param {string} currentImageUrl - La imagen actual o recién subida manualmente.
     * @returns {Promise<string|null>} - La nueva URL de la imagen (GCS).
     */
    async _handleDriveThumbnail(url, currentImageUrl) {
        // 1. Si ya se subió una imagen manual en este request, NO sobreescribir.
        if (currentImageUrl) return currentImageUrl;
        if (!url) return null;

        // 2. Extraer ID de archivo de Drive
        const fileId = DriveService.extractFileId(url);
        if (!fileId) return null;

        try {
            console.log(`📡 [Drive] Detectado recurso de Drive (${fileId}). Intentando extraer miniatura...`);
            const thumbData = await DriveService.downloadThumbnailBuffer(fileId);

            if (thumbData && thumbData.buffer) {
                // Persistir en GCS (Optimizado a WebP)
                const persistentUrl = await mediaController.uploadBuffer(
                    thumbData.buffer,
                    `${fileId}.jpg`,
                    thumbData.mimeType,
                    'thumbnails'
                );
                console.log(`✅ [Drive] Miniatura extraída y persistida: ${persistentUrl}`);
                return persistentUrl;
            }
        } catch (error) {
            console.warn(`⚠️ [Drive] Error extrayendo miniatura para ${fileId}:`, error.message);
        }
        return null;
    }

    /**
     * Extrae todas las rutas de GCS de un bloque de HTML.
     */
    _extractGcsPaths(html) {
        if (!html || typeof html !== 'string') return [];
        const paths = [];
        const regex = /(?:file|path)=([^"&>\s]+)/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            try {
                paths.push(decodeURIComponent(match[1]));
            } catch {
                paths.push(match[1]);
            }
        }
        return [...new Set(paths)];
    }

    /**
     * Normaliza campos de FormData (arrays serializados, flags booleanos y URL de infografías).
     */
    _normalizeEntityFormData(body, entityType) {
        if (!body || typeof body !== 'object') return;

        for (const arrayKey of ['bookIds', 'careerIds', 'topicIds', 'courseIds']) {
            if (typeof body[arrayKey] === 'string') {
                try {
                    body[arrayKey] = JSON.parse(body[arrayKey]);
                } catch {
                    body[arrayKey] = [];
                }
            }
        }

        for (const boolKey of ['is_premium', 'visible', 'open_directly']) {
            if (body[boolKey] !== undefined && typeof body[boolKey] !== 'boolean') {
                body[boolKey] = body[boolKey] === 'true';
            }
        }

        if (entityType === 'book' && (!body.url || body.url.trim() === '') && body.image_url) {
            body.url = body.image_url;
        }
    }

    /**
     * ✅ Sanitizador Defensivo Backend:
     * Extrae imágenes en Base64 pegadas en TinyMCE y las sube a GCS exclusivamente al momento de Guardar.
     */
    async _sanitizeHtmlImages(html, folder = 'recursos') {
        if (!html || typeof html !== 'string') return html;

        const base64ImgRegex = /<img[^>]+src=["'](data:image\/([a-zA-Z0-9+]+);base64,([^"']+))["'][^>]*>/gi;
        let match;
        const matches = [];
        const backendDomain = resolvePublicBaseUrl();

        while ((match = base64ImgRegex.exec(html)) !== null) {
            if (matches.some(item => item.dataUri === match[1])) continue;
            matches.push({
                fullTag: match[0],
                dataUri: match[1],
                format: (match[2] || 'png').toLowerCase(),
                base64Data: match[3]
            });
        }

        if (matches.length === 0) return html;

        console.log(`🖼️ [Sanitizador Backend Recursos] Detectadas ${matches.length} imágenes Base64 en HTML. Convirtiendo a GCS (${folder})...`);
        let sanitized = html;

        for (let i = 0; i < matches.length; i++) {
            const item = matches[i];
            try {
                const buffer = Buffer.from(item.base64Data, 'base64');
                const ext = item.format === 'jpeg' ? 'jpg' : item.format;
                const originalname = `editor_img_${Date.now()}_${i}.${ext}`;
                const mimetype = `image/${item.format === 'jpg' ? 'jpeg' : item.format}`;

                const gcsPath = await mediaController.uploadFile({ buffer, originalname, mimetype }, folder);
                const location = `${backendDomain}/api/media/gcs?file=${encodeURIComponent(gcsPath)}`;

                sanitized = sanitized.split(item.dataUri).join(location);
                console.log(`🖼️ [Sanitizador Backend Recursos] Imagen convertida a URL: ${location}`);
            } catch (err) {
                console.error('[RESOURCE_IMAGE_UPLOAD_FAILED]', { code: err.code || 'UNKNOWN' });
                throw new Error('No se pudo guardar la imagen en Google Cloud. El recurso no se guardó; vuelve a intentarlo.');
            }
        }

        return sanitized;
    }

    // --- Métodos CRUD Genéricos para el Panel de Administración ---

    async createEntity(req, res, entityType) {
        try {
            // ✅ LÓGICA MEJORADA: Si se crea un usuario (alumno/admin), devolver la contraseña temporal.
            if (['student', 'admin'].includes(entityType)) {
                return this.createUserEntity(req, res, entityType);
            }

            // ✅ LÓGICA REHECHA: La creación de una entidad ahora solo se encarga de crearla.
            // Se ha eliminado por completo la llamada a GeminiService desde aquí, ya que era incorrecta.

            // ✅ MANEJO DE ARCHIVOS: SUBIDA CENTRALIZADA A GCS
            if (req.file) {
                const folderMap = {
                    'book': 'recursos',
                    'course': 'cursos',
                    'career': 'carreras',
                    'resource': 'recursos',
                    'other': 'recursos'
                };
                const subFolder = folderMap[entityType] || 'recursos';

                if (['book', 'course', 'career', 'resource', 'other'].includes(entityType)) {
                    req.body.image_url = await mediaController.uploadFile(req.file, subFolder);
                }
            }

            this._normalizeEntityFormData(req.body, entityType);

            // ✅ Sanitizar imágenes Base64 pegadas en TinyMCE -> subir a GCS exclusivamente al momento de guardar
            if (req.body.content_html) {
                req.body.content_html = await this._sanitizeHtmlImages(req.body.content_html, 'recursos');
            }

            const newItem = await this.adminService.create(entityType, req.body);
            res.status(201).json(newItem);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Método específico para manejar la creación de usuarios.
    async createUserEntity(req, res, role) {
        try {
            const newUser = await this.adminService.create(role, req.body);
            res.status(201).json(newUser);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Endpoint para proveer datos consolidados al servicio de ML.
    async getDataForML(req, res) {
        try {
            const [courses, topics] = await Promise.all([
                this.adminService.getAll('course'),
                this.adminService.getAll('topic')
            ]);
            res.json({ courses, topics });
        } catch (error) {
            console.error('❌ Error al obtener datos para el servicio de ML:', error);
            res.status(500).json({ error: 'No se pudieron obtener los datos para ML.' });
        }
    }

    async updateEntity(req, res, entityType) {
        try {
            const entityId = (['student', 'admin'].includes(entityType))
                ? req.params.id
                : parsePositiveIntId(req.params.id);
            if (!entityId) {
                return res.status(400).json({ error: 'ID de entidad inválido' });
            }

            const shouldDelete = req.body.deleteImage === 'true' || (req.body.image_url === '' && req.method === 'PUT');

            if (req.file || shouldDelete) {
                if (req.file) {
                    const folderMap = { book: 'recursos', course: 'cursos', career: 'carreras', resource: 'recursos' };
                    req.body.image_url = await mediaController.uploadFile(req.file, folderMap[entityType] || 'recursos');
                } else if (shouldDelete) {
                    req.body.image_url = null;
                }
            }

            this._normalizeEntityFormData(req.body, entityType);

            // EXTRACCIÓN AUTOMÁTICA DE MINIATURA (Drive Update)
            if (entityType === 'book' && req.body.url) {
                const driveThumb = await this._handleDriveThumbnail(req.body.url, req.body.image_url);
                if (driveThumb) req.body.image_url = driveThumb;
            }

            if (entityType === 'book' || entityType === 'course') {
                if (req.body.content_html) {
                    req.body.content_html = await this._sanitizeHtmlImages(req.body.content_html, 'recursos');
                }
                // Retain old shared assets; detaching editor content must not
                // delete files still referenced by another entity or saved note.
            }

            const updatedItem = await this.adminService.update(entityType, entityId, req.body);
            res.json(updatedItem);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async deleteEntity(req, res, entityType) {
        try {
            // ✅ SOLUCIÓN: El ID es un UUID para usuarios (admin/alumno) pero un número para otras entidades.
            const entityId = (['student', 'admin'].includes(entityType))
                ? req.params.id
                : parsePositiveIntId(req.params.id);
            if (!entityId) {
                return res.status(400).json({ error: 'ID de entidad inválido' });
            }

            // ✅ CLEANUP: Borrar imagen de GCS si existe
            const oldItem = await this.adminService.getById(entityType, entityId);
            if (oldItem) {
                // 1. Borrar portada (Cover)
                if (oldItem.image_url) {
                    try { await mediaController.deleteFile(oldItem.image_url); } 
                    catch (err) { console.error('Error deleting cover image:', err); }
                }

                // 2. Borrar todas las imágenes internas del editor (TinyMCE)
                if (oldItem.content_html) {
                    try {
                        const contentPaths = this._extractGcsPaths(oldItem.content_html);
                        for (const gcsPath of contentPaths) {
                            await mediaController.deleteFile(gcsPath);
                        }
                    } catch (err) { console.error('Error deleting editor images:', err); }
                }
            }

            await this.adminService.delete(entityType, entityId);
            res.status(204).send(); // 204 No Content
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = CoursesController;
