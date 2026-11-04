// const db = require('../../infrastructure/database/db'); // ❌ REMOVED: Clean Architecture enforcement
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
// Removed trainingRepository import
const AnalyticsService = require('../../domain/services/analyticsService');
const adminService = require('../../domain/services/adminService'); // ✅ IMPORTANTE: Se inyecta capa de Negocio
const mediaController = require('./mediaController');

const os = require('os');
const { resolvePublicBaseUrl } = require('../../infrastructure/config/publicUrl');

// ==========================================
// 🛡️ CONFIGURACIÓN BLINDADA DE RUTAS
// ==========================================
const isWindows = process.platform === 'win32';
const ROOT_DIR = process.cwd();
const DATA_DIR = process.env.VERCEL ? path.join(os.tmpdir(), 'data_dump') : path.join(ROOT_DIR, 'data_dump');
const ML_SCRIPT = path.join(ROOT_DIR, 'ml_service', 'run_batch.py');
const PREDICTIONS_FILE = path.join(DATA_DIR, 'ai_predictions.json');
const PYTHON_PATH = isWindows ? 'C:/Python313/python.exe' : 'python3';

try {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
} catch (dirError) {
    console.warn('⚠️ [AdminController] No se pudo inicializar carpeta temporal data_dump:', dirError.message);
}

class AdminController {
    constructor() {
        this.analyticsService = new AnalyticsService();
    }

    async _exportTableToCSV(tableName, fileName, dataStr) {
        if (!dataStr) return;
        fs.writeFileSync(path.join(DATA_DIR, fileName), dataStr);
    }

    async runAiAnalysis(req, res) {
        try {
            console.log('🤖 Iniciando proceso Batch de IA...');

            // 1. Obtener CSVs preparados desde la capa de Dominio (AdminService)
            const exportData = await adminService.generateExportData();

            await this._exportTableToCSV('search_history', 'search_history.csv', exportData.search_history);
            await this._exportTableToCSV('courses', 'courses.csv', exportData.courses);
            await this._exportTableToCSV('resources', 'resources.csv', exportData.resources);

            console.log(`🐍 Ejecutando script: ${ML_SCRIPT}`);

            const pythonProcess = spawn(PYTHON_PATH, [ML_SCRIPT], { cwd: ROOT_DIR });

            pythonProcess.stdout.on('data', (data) => console.log(`[PY]: ${data}`));
            pythonProcess.stderr.on('data', (data) => console.error(`[PY ERROR]: ${data}`));

            pythonProcess.on('error', (err) => {
                console.error('❌ Error al iniciar el script de IA (spawn):', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'No se pudo iniciar el proceso de análisis de IA.' });
                }
            });

            pythonProcess.on('close', (code) => {
                if (res.headersSent) return;
                if (code === 0) {
                    res.json({ success: true, message: 'Análisis de tendencias actualizado.' });
                } else {
                    res.status(500).json({ error: 'El script de IA terminó con errores.' });
                }
            });
        } catch (error) {
            console.error('Error ejecutando IA:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error interno ejecutando IA' });
            }
        }
    }

    async getDashboardStats(req, res) {
        try {
            // Se invoca métricas robustamente abstraidas
            const dbStats = await adminService.getDashboardStats();
            const uniqueVisitorsCount = await this.analyticsService.getUniqueVisitorsCount(1);

            let aiTrends = null;
            if (fs.existsSync(PREDICTIONS_FILE)) {
                try {
                    const rawData = fs.readFileSync(PREDICTIONS_FILE, 'utf8');
                    aiTrends = JSON.parse(rawData);
                } catch (e) {
                    console.warn("No se pudo leer el JSON de IA:", e.message);
                }
            }

            const stats = {
                kpi: {
                    totalUsers: dbStats.usersCount,
                    premiumUsers: dbStats.premiumCount,
                    estimatedRevenue: dbStats.premiumCount * 9.90,
                    totalSearches: dbStats.searchesCount,
                    totalChatMessages: dbStats.chatsCount,
                    uniqueVisitors: uniqueVisitorsCount
                },
                charts: {
                    topCourses: dbStats.topCourses,
                    topResources: dbStats.topResources
                },
                ai: aiTrends
            };

            res.json(stats);
        } catch (error) {
            console.error('❌ Error crítico en Dashboard:', error);
            res.status(500).json({ error: 'Error interno.' });
        }
    }

    async bulkInjectQuestions(req, res) {
        try {
            const questions = req.body;
            if (!Array.isArray(questions)) {
                return res.status(400).json({ error: 'El cuerpo debe ser un array JSON.' });
            }

            console.log(`📥 Administrador subiendo lote de ${questions.length} preguntas masivas...`);

            // Sanitizar Base64 en lote antes de insertar
            for (let i = 0; i < questions.length; i++) {
                if (questions[i].question_text) {
                    questions[i].question_text = await this._sanitizeHtmlImages(questions[i].question_text, 'questions');
                }
                if (questions[i].explanation) {
                    questions[i].explanation = await this._sanitizeHtmlImages(questions[i].explanation, 'explanations');
                }
            }

            const result = await adminService.saveBulkQuestionBankAdmin(questions);

            if (result.success) {
                res.json({ success: true, message: `Lote inyectado con éxito: ${result.inserted} preguntas`, count: result.inserted });
            } else {
                res.status(500).json({ error: 'Fallo al inyectar el lote.' });
            }

        } catch (error) {
            console.error('❌ Error en inyección masiva:', error);
            res.status(500).json({ error: 'Error del servidor procesando el lote.' });
        }
    }

    async bulkInjectCases(req, res) {
        try {
            const cases = req.body;
            if (!Array.isArray(cases)) {
                return res.status(400).json({ error: 'El cuerpo debe ser un array JSON.' });
            }

            console.log(`📥 Administrador subiendo lote de ${cases.length} casuísticas masivas...`);

            // Sanitizar Base64 en lote antes de insertar
            for (let i = 0; i < cases.length; i++) {
                if (cases[i].description_text) {
                    cases[i].description_text = await this._sanitizeHtmlImages(cases[i].description_text, 'cases');
                } else if (cases[i].enunciado_caso) {
                    cases[i].enunciado_caso = await this._sanitizeHtmlImages(cases[i].enunciado_caso, 'cases');
                }
            }

            const result = await adminService.saveBulkCasesAdmin(cases);

            if (result.success) {
                res.json({ success: true, message: `Lote de casuísticas inyectado con éxito: ${result.inserted} casos`, count: result.inserted });
            } else {
                res.status(500).json({ error: 'Fallo al inyectar el lote de casuísticas.' });
            }

        } catch (error) {
            console.error('❌ Error en inyección masiva de casuísticas:', error);
            res.status(500).json({ error: 'Error del servidor procesando el lote de casuísticas.' });
        }
    }

    async getAllQuestions(req, res) {
        try {
            const { domain, search, page, limit, caseFilter } = req.query;
            const rows = await adminService.getAllQuestions(domain, search, page, limit, caseFilter);
            res.json(rows);
        } catch (error) {
            console.error('Error fetching questions:', error);
            res.status(500).json({ error: 'Error interno obteniendo preguntas.' });
        }
    }

    async getAllCases(req, res) {
        try {
            const { domain, search, page, limit } = req.query;
            const rows = await adminService.getAllCases(domain, search, page, limit);
            res.json(rows);
        } catch (error) {
            console.error('Error fetching cases:', error);
            res.status(500).json({ error: 'Error interno obteniendo casuísticas.' });
        }
    }

    async getCaseById(req, res) {
        try {
            const { id } = req.params;
            const caseData = await adminService.getCaseById(id);
            if (!caseData) {
                return res.status(404).json({ error: 'Casuística no encontrada.' });
            }
            res.json(caseData);
        } catch (error) {
            console.error('Error fetching case by ID:', error);
            res.status(500).json({ error: 'Error interno obteniendo la casuística.' });
        }
    }

    async createCase(req, res) {
        try {
            const body = req.body || {};
            const rawDescription = body.description_text || body.enunciado || body.situacion || body.text || '';
            const description_text = typeof rawDescription === 'string' ? rawDescription.trim() : '';

            const rawCode = body.code && body.code.trim() !== '' ? body.code.trim() : `CASO-${Date.now().toString().slice(-4)}`;
            // Si el usuario no especificó título, usar directamente el código del caso; nunca un extracto del texto/enunciado
            const rawTitle = body.title && body.title.trim() !== '' ? body.title.trim() : rawCode;

            let image_url = body.image_url && body.image_url.trim() !== '' ? body.image_url.trim() : null;
            if (req.file) {
                image_url = await mediaController.uploadFile(req.file, 'thumbnails');
            }

            const domain = body.domain || 'education';
            const target = body.target || 'N/A';
            const topic = body.topic || 'General';

            const sanitizedDescription = await this._sanitizeHtmlImages(description_text, 'editor-content');

            const created = await adminService.createCase({
                code: rawCode,
                title: rawTitle,
                description_text: sanitizedDescription,
                image_url,
                domain,
                target,
                topic
            });
            res.json({ success: true, case: created });
        } catch (error) {
            console.error('Error creating case:', error);
            res.status(500).json({ error: error.message || 'Error interno creando casuística.' });
        }
    }

    async updateCase(req, res) {
        try {
            const { id } = req.params;
            const body = req.body || {};
            const oldCase = await adminService.getCaseById(id);
            if (!oldCase) return res.status(404).json({ error: 'Casuística no encontrada.' });

            let image_url = body.image_url !== undefined ? (body.image_url.trim() || null) : undefined;
            if (req.file) {
                image_url = await mediaController.uploadFile(req.file, 'thumbnails');
            } else if (body.deleteImage === 'true') {
                image_url = null;
            }

            const rawDescription = body.description_text !== undefined ? body.description_text.trim() : undefined;
            const sanitizedDescription = rawDescription ? await this._sanitizeHtmlImages(rawDescription, 'editor-content') : rawDescription;

            // Shared/editor object versions are retained. Removing a reference
            // here does not prove that another case/question no longer uses it.

            const payload = {
                code: body.code !== undefined ? body.code.trim() : undefined,
                title: body.title !== undefined ? body.title.trim() : undefined,
                description_text: sanitizedDescription,
                image_url: image_url,
                domain: body.domain || undefined,
                target: body.target || undefined,
                topic: body.topic || undefined
            };

            const updated = await adminService.updateCase(id, payload);
            if (!updated) return res.status(404).json({ error: 'Casuística no encontrada.' });
            res.json({ success: true, case: updated });
        } catch (error) {
            console.error('Error updating case:', error);
            res.status(500).json({ error: error.message || 'Error interno actualizando casuística.' });
        }
    }

    async deleteCase(req, res) {
        try {
            const { id } = req.params;

            const oldCase = await adminService.getCaseById(id);
            if (oldCase) {
                if (oldCase.image_url) {
                    try { await mediaController.deleteFile(oldCase.image_url); } catch (e) { console.error('Error deleting case image:', e); }
                }
                const embeddedPaths = this._extractGcsPaths(oldCase.description_text);
                for (const gcsPath of embeddedPaths) {
                    try { await mediaController.deleteFile(gcsPath); } catch (e) { console.error('Error deleting case embedded image:', e); }
                }
            }

            const success = await adminService.deleteCase(id);
            res.json({ success });
        } catch (error) {
            console.error('Error deleting case:', error);
            res.status(500).json({ error: 'Error interno eliminando casuística.' });
        }
    }

    async linkQuestionsToCase(req, res) {
        try {
            const { caseId, questions } = req.body;
            if (!caseId || !Array.isArray(questions) || questions.length === 0) {
                return res.status(400).json({ error: 'caseId y un array de preguntas son requeridos.' });
            }
            const result = await adminService.linkQuestionsToCase(caseId, questions);
            res.json(result);
        } catch (error) {
            console.error('Error linking questions to case:', error);
            res.status(500).json({ error: error.message || 'Error interno vinculando preguntas al caso.' });
        }
    }

    async unlinkQuestionFromCase(req, res) {
        try {
            const { questionId } = req.params;
            const success = await adminService.unlinkQuestionFromCase(questionId);
            res.json({ success });
        } catch (error) {
            console.error('Error unlinking question from case:', error);
            res.status(500).json({ error: 'Error interno desvinculando la pregunta.' });
        }
    }

    async addSingleQuestion(req, res) {
        try {
            const sanitize = (val) => (val === 'null' || val === 'undefined' || val === '' || val === 'N/A') ? null : val;

            const q = {
                ...req.body,
                career: sanitize(req.body.career),
                subtopic: sanitize(req.body.subtopic),
                target: sanitize(req.body.target),
                topic: sanitize(req.body.topic) || 'General',
                explanation: sanitize(req.body.explanation) || '',
                case_id: sanitize(req.body.case_id),
                case_order: parseInt(req.body.case_order, 10) || 1
            };

            if (typeof q.options === 'string') {
                try { q.options = JSON.parse(q.options); } catch (e) { console.error('Error parsing options:', e); }
            }

            if (!q.question_text || !q.options || q.correct_answer === undefined || !q.domain) {
                return res.status(400).json({ error: 'Faltan campos obligatorios' });
            }

            q.question_text = await this._sanitizeHtmlImages(q.question_text, 'questions');
            if (q.explanation) {
                q.explanation = await this._sanitizeHtmlImages(q.explanation, 'explanations');
            }

            if (req.files) {
                if (req.files['questionImage'] && req.files['questionImage'][0]) {
                    q.image_url = await mediaController.uploadFile(req.files['questionImage'][0], 'questions');
                }

                if (req.files['explanationImage'] && req.files['explanationImage'][0]) {
                    q.explanation_image_url = await mediaController.uploadFile(req.files['explanationImage'][0], 'explanations');
                }
            }

            const rowId = await adminService.addSingleQuestion(q);
            res.json({ success: true, message: 'Pregunta añadida existosamente', id: rowId });
        } catch (error) {
            console.error('Error adding single question:', error);
            res.status(500).json({ error: error.message || 'Error del servidor al añadir pregunta.' });
        }
    }

    async updateSingleQuestion(req, res) {
        try {
            const { id } = req.params;
            const sanitize = (val) => (val === 'null' || val === 'undefined' || val === '' || val === 'N/A') ? null : val;

            const q = {
                ...req.body,
                career: sanitize(req.body.career),
                subtopic: sanitize(req.body.subtopic),
                target: sanitize(req.body.target),
                topic: sanitize(req.body.topic) || 'General',
                difficulty: sanitize(req.body.difficulty) || 'Senior',
                explanation: sanitize(req.body.explanation) || '',
                case_id: sanitize(req.body.case_id),
                case_order: parseInt(req.body.case_order, 10) || 1
            };

            if (typeof q.options === 'string') {
                try { q.options = JSON.parse(q.options); } catch (e) { console.error('Error parsing options:', e); }
            }

            if (!q.question_text || !q.options || q.correct_answer === undefined || !q.domain) {
                return res.status(400).json({ error: 'Faltan campos obligatorios para actualizar' });
            }

            q.question_text = await this._sanitizeHtmlImages(q.question_text, 'questions');
            if (q.explanation) {
                q.explanation = await this._sanitizeHtmlImages(q.explanation, 'explanations');
            }

            const shouldDeleteQ = q.deleteQuestionImage === 'true' || q.image_url === '';
            const shouldDeleteE = q.deleteExplanationImage === 'true' || q.explanation_image_url === '';

            const oldData = await adminService.getQuestionImages(id);
            const currentQuestionImg = oldData?.image_url;
            const currentExplanationImg = oldData?.explanation_image_url;

            if (!oldData) return res.status(404).json({ error: 'Pregunta no encontrada.' });
            // Keep both previous references when a client only edits the text.
            if (q.image_url === undefined) q.image_url = currentQuestionImg || null;
            if (q.explanation_image_url === undefined) q.explanation_image_url = currentExplanationImg || null;

            if (req.files?.questionImage?.[0]) {
                q.image_url = await mediaController.uploadFile(req.files.questionImage[0], 'questions');
            } else if (shouldDeleteQ) {
                q.image_url = null;
            }

            if (req.files?.explanationImage?.[0]) {
                q.explanation_image_url = await mediaController.uploadFile(req.files.explanationImage[0], 'explanations');
            } else if (shouldDeleteE) {
                q.explanation_image_url = null;
            }

            const isUpdated = await adminService.updateSingleQuestion(id, q);
            if (!isUpdated) return res.status(404).json({ error: 'Pregunta no encontrada.' });

            // Keep older objects: another question/case/note can reuse them.

            res.json({ success: true, message: 'Pregunta actualizada exitosamente.' });
        } catch (error) {
            console.error('Error updating single question:', error);
            res.status(500).json({ error: 'Error del servidor al actualizar pregunta.' });
        }
    }

    async deleteSingleQuestion(req, res) {
        try {
            const { id } = req.params;

            const qData = await adminService.getQuestionImages(id);
            if (qData) {
                const { image_url, explanation_image_url, career, question_text, explanation } = qData;
                if (image_url) await mediaController.deleteFile(image_url);
                if (explanation_image_url) await mediaController.deleteFile(explanation_image_url);
                
                // ✅ Borrar imágenes embebidas en el texto de la pregunta o explicación
                const embeddedPaths = [
                    ...this._extractGcsPaths(question_text),
                    ...this._extractGcsPaths(explanation)
                ];
                for (const gcsPath of embeddedPaths) {
                    try { await mediaController.deleteFile(gcsPath); } catch (e) { console.error('Error deleting question embedded image:', e); }
                }
            }

            const isDeleted = await adminService.deleteSingleQuestion(id);
            if (!isDeleted) return res.status(404).json({ error: 'Pregunta no encontrada.' });

            res.json({ success: true, message: 'Pregunta eliminada exitosamente.' });
        } catch (error) {
            console.error('Error deleting single question:', error);
            res.status(500).json({ error: 'Error del servidor al eliminar pregunta.' });
        }
    }

    async syncDriveFolder(req, res) {
        try {
            const { folderId, resourceType, author, domain, is_premium, visible, open_directly, topicIds } = req.body;

            if (!folderId || !resourceType) {
                return res.status(400).json({ error: 'Faltan parámetros: folderId y resourceType son obligatorios.' });
            }

            const resolvedDomain = domain || 'medicine';

            // Normalizar a booleanos nativos
            const isPremium = is_premium === true || String(is_premium).toLowerCase() === 'true' || is_premium === 1;
            const isVisible = visible !== false && String(visible).toLowerCase() !== 'false' && visible !== 0;
            const openDirectly = open_directly === true || String(open_directly).toLowerCase() === 'true' || open_directly === 1;

            // Normalizar temas asociados
            let parsedTopicIds = [];
            if (Array.isArray(topicIds)) {
                parsedTopicIds = topicIds.map(t => parseInt(t, 10)).filter(t => !isNaN(t));
            } else if (typeof topicIds === 'string' && topicIds.trim()) {
                try {
                    const parsed = JSON.parse(topicIds);
                    if (Array.isArray(parsed)) {
                        parsedTopicIds = parsed.map(t => parseInt(t, 10)).filter(t => !isNaN(t));
                    }
                } catch {
                    parsedTopicIds = [];
                }
            }

            console.log(`📂 [Admin] Iniciando sincronización de carpeta Drive: ${folderId} como ${resourceType} en dominio ${resolvedDomain} (Premium: ${isPremium}, Visible: ${isVisible}, Directo: ${openDirectly}, Temas: ${parsedTopicIds.length})`);

            const DriveService = require('../../domain/services/driveService');
            const files = await DriveService.getFilesFromFolder(folderId);

            if (!files || files.length === 0) {
                return res.json({ success: true, message: 'La carpeta está vacía o no se encontraron archivos.', inserted: 0 });
            }

            let insertedCount = 0;
            let updatedCount = 0;
            let failedCount = 0;
            const syncErrors = [];

            for (const file of files) {
                const driveUrl = `https://drive.google.com/open?id=${file.id}`;
                const cleanTitle = file.name.replace(/\.[^/.]+$/, "");

                // Lógica de Persistencia de Miniatura en GCS con Fallback
                let persistentThumbnailUrl = null;
                try {
                    const thumbData = await DriveService.downloadThumbnailBuffer(file.id);
                    if (thumbData && thumbData.buffer) {
                        persistentThumbnailUrl = await mediaController.uploadBuffer(
                            thumbData.buffer,
                            `${file.id}.jpg`,
                            thumbData.mimeType,
                            'thumbnails'
                        );
                    }
                } catch (thumbErr) {
                    console.warn(`⚠️ No se pudo persistir miniatura para ${file.name}:`, thumbErr.message);
                }

                if (!persistentThumbnailUrl) {
                    console.log(`✨ Sin miniatura para: ${file.name} (se usará diseño por defecto UI)`);
                }

                try {
                    const result = await adminService.syncResource(
                        driveUrl,
                        cleanTitle,
                        resourceType,
                        persistentThumbnailUrl,
                        author,
                        resolvedDomain,
                        isPremium,
                        isVisible,
                        openDirectly,
                        parsedTopicIds
                    );
                    if (result.action === 'updated') updatedCount++;
                    else insertedCount++;
                } catch (syncErr) {
                    console.error(`❌ Error sincronizando recurso para la URL ${driveUrl}:`, syncErr);
                    failedCount++;
                    syncErrors.push({
                        file: file.name,
                        url: driveUrl,
                        error: syncErr.message
                    });
                }
            }

            res.json({
                success: true,
                message: `Sincronización completada. ${insertedCount} nuevos recursos añadidos, ${updatedCount} actualizados.${failedCount > 0 ? ` ${failedCount} fallaron.` : ''}`,
                inserted: insertedCount,
                updated: updatedCount,
                failed: failedCount,
                errors: syncErrors.length > 0 ? syncErrors : undefined
            });

        } catch (error) {
            console.error('❌ Error en sincronización de Drive:', error);
            res.status(500).json({ error: 'Error del servidor al sincronizar carpeta de Drive.' });
        }
    }

    /**
     * ✅ NUEVO: Maneja la subida de imágenes desde el editor TinyMCE.
     * Sube a GCS y devuelve la URL para ser insertada en el HTML.
     */
    async uploadEditorImage(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
            }

            // Subir a GCS en una carpeta dedicada para contenido del editor
            const gcsPath = await mediaController.uploadFile(req.file, 'editor-content');

            // Construir la URL pública hacia el mismo dominio unificado en Vercel Serverless
            const backendDomain = resolvePublicBaseUrl();
            const location = `${backendDomain}/api/media/gcs?file=${encodeURIComponent(gcsPath)}`;

            console.log(`🖼️ Imagen de editor subida con éxito (Absoluta): ${location}`);

            // TinyMCE espera un JSON con la propiedad 'location'
            res.json({ location });
        } catch (error) {
            console.error('❌ Error en uploadEditorImage:', error);
            res.status(500).json({ error: 'Error al procesar la imagen del editor.' });
        }
    }

    /**
     * ✅ Sanitiza HTML extrayendo cualquier Base64 incrustado y subiéndolo automáticamente a GCS
     */
    async _sanitizeHtmlImages(html, folder = 'editor-content') {
        if (!html || typeof html !== 'string' || !html.includes('data:image/')) {
            return html;
        }

        const backendDomain = resolvePublicBaseUrl();
        let sanitized = html;

        // Limpiar etiquetas MSO/VML de Word
        sanitized = sanitized.replace(/<!--\s*\[if\s+gte\s+vml\s+1\][\s\S]*?<!\[endif\]-->/gi, '');
        sanitized = sanitized.replace(/<!--\s*\[if\s+!vml\]\s*-->/gi, '');
        sanitized = sanitized.replace(/<!--\s*\[endif\]\s*-->/gi, '');

        const base64Regex = /src=["'](data:image\/([a-zA-Z0-9+]+);base64,([^"']+))["']/g;
        let match;
        const matches = [];
        while ((match = base64Regex.exec(sanitized)) !== null) {
            if (matches.some(item => item.dataUri === match[1])) continue;
            matches.push({
                fullMatch: match[0],
                dataUri: match[1],
                format: match[2],
                base64Data: match[3]
            });
        }

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
                console.log(`🖼️ [Sanitizador Backend] Imagen Base64 convertida automáticamente a URL: ${location}`);
            } catch (err) {
                console.error('[EDITOR_IMAGE_UPLOAD_FAILED]', { code: err.code || 'UNKNOWN' });
                throw new Error('No se pudo guardar la imagen en Google Cloud. La pregunta no se guardó; vuelve a intentarlo.');
            }
        }

        return sanitized;
    }

    _extractGcsPaths(html) {
        if (!html || typeof html !== 'string') return [];
        const paths = [];
        const regex = /(?:file|path)=([^"&>\s]+)/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            paths.push(decodeURIComponent(match[1]));
        }
        return [...new Set(paths)];
    }

    async bulkDelete(req, res) {
        try {
            const { type, ids } = req.body;
            if (!type || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: 'Faltan parámetros: type e ids (Array) son requeridos.' });
            }

            console.log(`🗑️ [Admin] Eliminación masiva iniciada para ${ids.length} elementos de tipo: ${type}`);

            let successCount = 0;
            let errors = [];

            for (const id of ids) {
                try {
                    if (type === 'question') {
                        const qData = await adminService.getQuestionImages(id);
                        if (qData) {
                            const { image_url, explanation_image_url, question_text, explanation } = qData;
                            if (image_url) await mediaController.deleteFile(image_url);
                            if (explanation_image_url) await mediaController.deleteFile(explanation_image_url);
                            const embeddedPaths = [
                                ...this._extractGcsPaths(question_text),
                                ...this._extractGcsPaths(explanation)
                            ];
                            for (const gcsPath of embeddedPaths) {
                                try { await mediaController.deleteFile(gcsPath); } catch (e) {}
                            }
                        }
                        const isDeleted = await adminService.deleteSingleQuestion(id);
                        if (isDeleted) successCount++;
                    } else if (type === 'case') {
                        const oldCase = await adminService.getCaseById(id);
                        if (oldCase) {
                            if (oldCase.image_url) {
                                try { await mediaController.deleteFile(oldCase.image_url); } catch (e) {}
                            }
                            const embeddedPaths = this._extractGcsPaths(oldCase.description_text);
                            for (const gcsPath of embeddedPaths) {
                                try { await mediaController.deleteFile(gcsPath); } catch (e) {}
                            }
                        }
                        const isDeleted = await adminService.deleteCase(id);
                        if (isDeleted) successCount++;
                    } else {
                        const entityId = (['student', 'admin'].includes(type)) ? String(id) : parseInt(id, 10);
                        const oldItem = await adminService.getById(type, entityId);
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
                        await adminService.delete(type, entityId);
                        successCount++;
                    }
                } catch (err) {
                    console.error(`Error al eliminar ID ${id} de tipo ${type}:`, err);
                    errors.push({ id, error: err.message });
                }
            }

            res.json({
                success: true,
                message: `Se eliminaron ${successCount} de ${ids.length} elementos de tipo ${type}.`,
                deleted: successCount,
                failed: errors.length,
                errors: errors
            });
        } catch (error) {
            console.error('❌ Error en borrado masivo:', error);
            res.status(500).json({ error: 'Error del servidor al realizar el borrado masivo.' });
        }
    }
}

const controller = new AdminController();

module.exports = {
    getDashboardStats: controller.getDashboardStats.bind(controller),
    runAiAnalysis: controller.runAiAnalysis.bind(controller),
    bulkInjectQuestions: controller.bulkInjectQuestions.bind(controller),
    getAllQuestions: controller.getAllQuestions.bind(controller),
    addSingleQuestion: controller.addSingleQuestion.bind(controller),
    updateSingleQuestion: controller.updateSingleQuestion.bind(controller),
    deleteSingleQuestion: controller.deleteSingleQuestion.bind(controller),
    syncDriveFolder: controller.syncDriveFolder.bind(controller),
    uploadEditorImage: controller.uploadEditorImage.bind(controller),
    bulkDelete: controller.bulkDelete.bind(controller),
    getAllCases: controller.getAllCases.bind(controller),
    getCaseById: controller.getCaseById.bind(controller),
    createCase: controller.createCase.bind(controller),
    bulkInjectCases: controller.bulkInjectCases.bind(controller),
    updateCase: controller.updateCase.bind(controller),
    deleteCase: controller.deleteCase.bind(controller),
    linkQuestionsToCase: controller.linkQuestionsToCase.bind(controller),
    unlinkQuestionFromCase: controller.unlinkQuestionFromCase.bind(controller),
    _sanitizeHtmlImages: controller._sanitizeHtmlImages.bind(controller)
};
