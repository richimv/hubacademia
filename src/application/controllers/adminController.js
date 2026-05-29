// const db = require('../../infrastructure/database/db'); // ❌ REMOVED: Clean Architecture enforcement
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
// Removed trainingRepository import
const AnalyticsService = require('../../domain/services/analyticsService');
const adminAiService = require('../../domain/services/adminAiService');
const adminService = require('../../domain/services/adminService'); // ✅ IMPORTANTE: Se inyecta capa de Negocio
const mediaController = require('./mediaController');

// ==========================================
// 🛡️ CONFIGURACIÓN BLINDADA DE RUTAS
// ==========================================
const isWindows = process.platform === 'win32';
const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data_dump');
const ML_SCRIPT = path.join(ROOT_DIR, 'ml_service', 'run_batch.py');
const PREDICTIONS_FILE = path.join(DATA_DIR, 'ai_predictions.json');
const PYTHON_PATH = isWindows ? 'C:/Python313/python.exe' : 'python3';

if (!fs.existsSync(DATA_DIR)) {
    console.log('📁 Creando carpeta data_dump en:', DATA_DIR);
    fs.mkdirSync(DATA_DIR, { recursive: true });
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

    async generateAiQuestions(req, res) {
        try {
            const { target, domain, studyAreas, career, difficulty } = req.body;
            if (!target || !studyAreas) {
                return res.status(400).json({ error: 'Faltan parámetros: target y studyAreas son requeridos.' });
            }

            const resolvedDomain = domain || 'medicine';
            const resolvedDifficulty = difficulty || (resolvedDomain === 'languages' ? 'B1' : 'Senior');
            console.log(`🧠 Admin solicitó lote RAG: ${target}, ${resolvedDifficulty}, Áreas: ${studyAreas}, Domain: ${resolvedDomain}, Carrera: ${career || 'N/A'}`);

            const generatedQuestions = await adminAiService.generateRAGQuestions(target, studyAreas, career, 5, false, resolvedDifficulty);

            if (!generatedQuestions || !Array.isArray(generatedQuestions)) {
                throw new Error("El formato devuelto por la IA no corresponde a un Array válido.");
            }

            const result = await adminService.saveBulkQuestionBankAdmin(generatedQuestions);

            if (result.success) {
                res.json({ success: true, message: `IA RAG ha Inyectado ${result.inserted} preguntas nuevas con éxito al Banco.`, count: result.inserted });
            } else {
                res.status(500).json({ error: 'Fallo al inyectar el lote generado por la IA en la BD.' });
            }
        } catch (error) {
            console.error('❌ Error en generador RAG Masivo Admin:', error);
            res.status(500).json({ error: error.message || 'Error del servidor procesando el RAG.' });
        }
    }

    async getAllQuestions(req, res) {
        try {
            const { domain, search } = req.query;
            const rows = await adminService.getAllQuestions(domain, search);
            res.json(rows);
        } catch (error) {
            console.error('Error fetching questions:', error);
            res.status(500).json({ error: 'Error interno obteniendo preguntas.' });
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
                explanation: sanitize(req.body.explanation) || ''
            };

            if (typeof q.options === 'string') {
                try { q.options = JSON.parse(q.options); } catch (e) { console.error('Error parsing options:', e); }
            }

            if (!q.question_text || !q.options || q.correct_answer === undefined || !q.domain) {
                return res.status(400).json({ error: 'Faltan campos obligatorios' });
            }

            if (req.files) {
                if (req.files['questionImage'] && req.files['questionImage'][0]) {
                    try { q.image_url = await mediaController.uploadFile(req.files['questionImage'][0], 'questions'); }
                    catch (err) { console.error('Error uploading question image:', err); }
                }

                if (req.files['explanationImage'] && req.files['explanationImage'][0]) {
                    try { q.explanation_image_url = await mediaController.uploadFile(req.files['explanationImage'][0], 'explanations'); }
                    catch (err) { console.error('Error uploading explanation image:', err); }
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
                explanation: sanitize(req.body.explanation) || ''
            };

            if (typeof q.options === 'string') {
                try { q.options = JSON.parse(q.options); } catch (e) { console.error('Error parsing options:', e); }
            }

            if (!q.question_text || !q.options || q.correct_answer === undefined || !q.domain) {
                return res.status(400).json({ error: 'Faltan campos obligatorios para actualizar' });
            }

            const shouldDeleteQ = q.deleteQuestionImage === 'true' || q.image_url === '';
            const shouldDeleteE = q.deleteExplanationImage === 'true' || q.explanation_image_url === '';

            if (req.files || shouldDeleteQ || shouldDeleteE) {
                const oldData = await adminService.getQuestionImages(id);
                const currentQuestionImg = oldData?.image_url;
                const currentExplanationImg = oldData?.explanation_image_url;

                if (req.files && req.files['questionImage'] && req.files['questionImage'][0]) {
                    try {
                        if (currentQuestionImg) await mediaController.deleteFile(currentQuestionImg);
                        q.image_url = await mediaController.uploadFile(req.files['questionImage'][0], 'questions');
                    } catch (err) { console.error('Error updating question image:', err); }
                } else if (shouldDeleteQ) {
                    if (currentQuestionImg) await mediaController.deleteFile(currentQuestionImg);
                    q.image_url = null;
                }

                if (req.files && req.files['explanationImage'] && req.files['explanationImage'][0]) {
                    try {
                        if (currentExplanationImg) await mediaController.deleteFile(currentExplanationImg);
                        q.explanation_image_url = await mediaController.uploadFile(req.files['explanationImage'][0], 'explanations');
                    } catch (err) { console.error('Error updating explanation image:', err); }
                } else if (shouldDeleteE) {
                    if (currentExplanationImg) await mediaController.deleteFile(currentExplanationImg);
                    q.explanation_image_url = null;
                }
            }

            const isUpdated = await adminService.updateSingleQuestion(id, q);
            if (!isUpdated) return res.status(404).json({ error: 'Pregunta no encontrada.' });

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
                const { image_url, explanation_image_url, audio_text, career } = qData;
                if (image_url) await mediaController.deleteFile(image_url);
                if (explanation_image_url) await mediaController.deleteFile(explanation_image_url);
                
                if (audio_text && audio_text.trim() !== '' && career) {
                    try {
                        const crypto = require('crypto');
                        const cleanText = audio_text.replace(/[*_#`]/g, '').trim();
                        const textHash = crypto.createHash('md5').update(`${cleanText}_${career}`).digest('hex');
                        const gcsAudioPath = `tts_cache/${career}_${textHash}.mp3`;
                        
                        const otherQuestionsCount = await adminService.countOtherQuestionsWithAudio(audio_text, career, id);
                        const vocabCount = await adminService.countVocabulariesWithAudioUrl(gcsAudioPath);
                        
                        if (otherQuestionsCount === 0 && vocabCount === 0) {
                            await mediaController.deleteFile(gcsAudioPath);
                        }
                    } catch (gcsErr) {
                        console.error('⚠️ [adminController] Falló saneamiento de audio al eliminar pregunta:', gcsErr.message);
                    }
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
            const { folderId, resourceType, author, domain, is_premium, visible, open_directly } = req.body;

            if (!folderId || !resourceType) {
                return res.status(400).json({ error: 'Faltan parámetros: folderId y resourceType son obligatorios.' });
            }

            const resolvedDomain = domain || 'medicine';

            // Normalizar a booleanos nativos
            const isPremium = is_premium === true || String(is_premium).toLowerCase() === 'true' || is_premium === 1;
            const isVisible = visible !== false && String(visible).toLowerCase() !== 'false' && visible !== 0;
            const openDirectly = open_directly === true || String(open_directly).toLowerCase() === 'true' || open_directly === 1;

            console.log(`📂 [Admin] Iniciando sincronización de carpeta Drive: ${folderId} como ${resourceType} en dominio ${resolvedDomain} (Premium: ${isPremium}, Visible: ${isVisible}, Directo: ${openDirectly})`);

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
                        openDirectly
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

            // Construir la URL completa absoluta que usará el frontend para cargar la imagen
            // NOTA CRÍTICA: Usamos la URL ABSOLUTA hacia el Backend (Render) en lugar de una ruta relativa "/api/media...".
            // Esto evita que TinyMCE la interprete usando el dominio frontal (Vercel) y caiga en bloqueos de proxy,
            // garantizando que todos los futuros artículos descarguen sus imágenes directamente del motor de máxima velocidad.
            const backendDomain = process.env.API_URL || 'https://tutor-ia-backend.onrender.com';
            const location = `${backendDomain}/api/media/gcs?file=${gcsPath}`;

            console.log(`🖼️ Imagen de editor subida con éxito (Absoluta): ${location}`);

            // TinyMCE espera un JSON con la propiedad 'location'
            res.json({ location });
        } catch (error) {
            console.error('❌ Error en uploadEditorImage:', error);
            res.status(500).json({ error: 'Error al procesar la imagen del editor.' });
        }
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
                            const { image_url, explanation_image_url } = qData;
                            if (image_url) await mediaController.deleteFile(image_url);
                            if (explanation_image_url) await mediaController.deleteFile(explanation_image_url);
                        }
                        const isDeleted = await adminService.deleteSingleQuestion(id);
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
    generateAiQuestions: controller.generateAiQuestions.bind(controller),
    getAllQuestions: controller.getAllQuestions.bind(controller),
    addSingleQuestion: controller.addSingleQuestion.bind(controller),
    updateSingleQuestion: controller.updateSingleQuestion.bind(controller),
    deleteSingleQuestion: controller.deleteSingleQuestion.bind(controller),
    syncDriveFolder: controller.syncDriveFolder.bind(controller),
    uploadEditorImage: controller.uploadEditorImage.bind(controller),
    bulkDelete: controller.bulkDelete.bind(controller)
};