const express = require('express');
const router = express.Router();

// --- Importar Controladores ---
const { coursesController, analyticsController, authController, chatController, usageController, adminController, medicoController, docenteController, idiomasSimulatorController, flashcardController, selfEvaluationController, userPreferencesController, mediaController, speechController, languageChatController, languageSyllabusController, languageVocabularyController
} = require('../../application/controllers');

// --- Importar Middleware ---
const { auth, optionalAuth, adminOnly } = require('../middleware/authMiddleware');
const usageMiddleware = require('../middleware/usageMiddleware');
const checkAILimits = require('../../application/middlewares/checkLimitsMiddleware'); // ✅ NUEVO LÍMITE DE PRECIOS
const { authLimiter } = require('../config/rateLimiters');

// ======================
// 🔗 CONFIGURACIÓN DE CARGA (Multer)
// ======================
const multer = require('multer');
const path = require('path');
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Solo se permiten imágenes (JPG, PNG, WebP)'));
    }
});

// ======================
// 🔗 RUTAS API
// ======================

// ✅ NUEVO: Admin Dashboard (Stats Maestras)
router.get('/admin/dashboard-stats', auth, adminOnly, adminController.getDashboardStats);

router.post('/admin/run-ai', auth, adminOnly, adminController.runAiAnalysis);
router.post('/admin/questions/bulk', auth, adminOnly, adminController.bulkInjectQuestions); // ✅ NUEVO: Inyección Masiva
router.post('/admin/questions/generate-ai', auth, adminOnly, adminController.generateAiQuestions); // --- Gestión de Banco de Preguntas (Admin) ---
router.get('/admin/questions', auth, adminOnly, adminController.getAllQuestions);
router.post('/admin/question', auth, adminOnly, upload.fields([{ name: 'questionImage', maxCount: 1 }, { name: 'explanationImage', maxCount: 1 }]), adminController.addSingleQuestion);
router.put('/admin/question/:id', auth, adminOnly, upload.fields([{ name: 'questionImage', maxCount: 1 }, { name: 'explanationImage', maxCount: 1 }]), adminController.updateSingleQuestion);
router.delete('/admin/question/:id', auth, adminOnly, adminController.deleteSingleQuestion);
router.post('/admin/drive/sync-folder', auth, adminOnly, adminController.syncDriveFolder); // ✅ NUEVO: Scanner de Drive
router.post('/admin/upload-editor', auth, adminOnly, upload.single('file'), adminController.uploadEditorImage); // ✅ NUEVO: Carga para TinyMCE
router.delete('/admin/bulk-delete', auth, adminOnly, adminController.bulkDelete); // ✅ NUEVO: Borrado Masivo


// ✅ RUTAS DE PAGOS (Mercado Pago)
const paymentRoutes = require('./paymentRoutes');
router.use('/payment', paymentRoutes);

// ✅ NUEVO: PROXY DE MEDIOS (Google Drive & GCS)
router.get('/media/explanation/:id', optionalAuth, (req, res) => mediaController.serveExplanationImage(req, res));
router.get('/media/resource/:id', optionalAuth, (req, res) => mediaController.serveResourceImage(req, res));
router.get('/media/preview', auth, adminOnly, (req, res) => mediaController.serveGCSPreview(req, res));
router.get('/media/gcs', optionalAuth, (req, res) => mediaController.serveGCSGeneral(req, res));
router.delete('/media/delete', auth, (req, res) => mediaController.handleDeleteMedia(req, res));

// ✅ NUEVO: SÍNTESIS DE VOZ (Multi-idioma)
router.post('/tts', optionalAuth, speechController.synthesize);

// ✅ RUTAS DE BIBLIOTECA (Favoritos/Guardados)
const libraryRoutes = require('./libraryRoutes');
router.use('/library', libraryRoutes);

// --- Rutas de Control de Acceso (Uso Gratuito) ---
router.post('/usage/verify', auth, usageController.checkAccess); // ✅ NUEVO
router.get('/usage/check-ai-limits', auth, checkAILimits('monthly_flashcards'), (req, res) => {
    req.usageType = null;
    return res.json({ allowed: true });
}); // ✅ NUEVO: Validación pasiva de saldos sin gastarlos

// --- Rutas de Preferencias de Usuario (Multi-Simulador) ---
router.get('/users/preferences', auth, (req, res) => userPreferencesController.getPreferences(req, res));
router.post('/users/preferences', auth, (req, res) => userPreferencesController.savePreferences(req, res));

// --- Rutas de Autenticación (Exclusivo Google OAuth) ---
router.get('/auth/me', auth, authController.getMe);
router.post('/auth/sync', authLimiter, authController.syncUser); 
router.put('/auth/profile', auth, authController.updateProfile);
router.delete('/auth/delete-account', auth, authController.deleteAccount);

// --- Rutas de Chat (Prefijo /api/chat) ---
// SE AGREGA checkAILimits('chat_standard') ANTES DE PROCESS MESSAGE
router.post('/chat', auth, usageMiddleware, checkAILimits('chat_standard'), chatController.processMessage); // ✅ Middleware aplicado
router.get('/chat/conversations', auth, chatController.getUserConversations);
router.get('/chat/conversations/:id', auth, chatController.getConversationMessages);
router.put('/chat/conversations/:id', auth, chatController.updateConversationTitle);
router.delete('/chat/conversations/:id', auth, chatController.deleteConversation);
router.post('/chat/train-model', auth, adminOnly, chatController.trainModel);

// --- Rutas de Idiomas ---
router.post('/languages/chat', auth, checkAILimits('chat_standard'), languageChatController.processChat);

// Temario y Lecciones
router.get('/languages/syllabus', optionalAuth, languageSyllabusController.getSyllabus);
router.post('/languages/syllabus/lesson/learn', auth, languageSyllabusController.generateLesson);
router.post('/languages/syllabus/lesson/evaluate', auth, languageSyllabusController.evaluateLesson);
router.post('/languages/syllabus/progress', auth, languageSyllabusController.toggleProgress);

// Vocabulario Privado
router.get('/languages/vocabulary', auth, languageVocabularyController.getVocabulary);
router.post('/languages/vocabulary', auth, languageVocabularyController.addWord);
router.post('/languages/vocabulary/generate', auth, languageVocabularyController.generateWordDetails);
router.delete('/languages/vocabulary/:id', auth, languageVocabularyController.deleteWord);
router.post('/languages/vocabulary/export-flashcards', auth, languageVocabularyController.exportToFlashcards);

// --- Rutas Públicas ---
router.get('/buscar', optionalAuth, coursesController.searchCourses);
router.get('/careers', coursesController.getCareers);
router.get('/courses', coursesController.getCourses);

// --- Rutas de Demostración (Públicas) ---


router.get('/topics', coursesController.getTopics);
router.get('/books', coursesController.getBooks);
router.get('/resources', coursesController.getBooks); // ✅ Alias dinámico para todos los recursos (Categorías/Directorios)
router.get('/books/medical', coursesController.getMedicalBooks); // ✅ NUEVO: Libros de Medicina

// ✅ RUTAS DE CONTENIDO DESTACADO (Analytics)
router.get('/analytics/featured-books', analyticsController.getFeaturedBooks);
router.get('/analytics/featured-courses', analyticsController.getFeaturedCourses);

// ✅ NUEVO: Rutas para obtener detalles por ID
router.get('/careers/:id', coursesController.getCareerById);
router.get('/courses/:id', coursesController.getCourseById);
router.get('/topics/:id', coursesController.getTopicById);
router.get('/resources/:id', coursesController.getResourceById); // ✅ NUEVO

// --- Rutas CRUD Protegidas para el Panel de Administración ---
router.get('/students', auth, adminOnly, coursesController.getStudents);

// ✅ LÓGICA ESPECIAL PARA LIBROS, CARRERAS Y CURSOS (con subida de archivos)
const mediaEntities = ['book', 'career', 'course'];

mediaEntities.forEach(entity => {
    const plural = entity === 'career' ? 'careers' : `${entity}s`;
    router.post(`/${plural}`, auth, adminOnly, upload.single('coverImage'), (req, res) => coursesController.createEntity(req, res, entity));
    router.put(`/${plural}/:id`, auth, adminOnly, upload.single('coverImage'), (req, res) => coursesController.updateEntity(req, res, entity));
    router.delete(`/${plural}/:id`, auth, adminOnly, (req, res) => coursesController.deleteEntity(req, res, entity));
});

// Entidades simples (sin subida de archivos)
const simpleEntities = ['student', 'admin', 'topic'];
simpleEntities.forEach(entity => {
    const plural = `${entity}s`;
    router.post(`/${plural}`, auth, adminOnly, (req, res) => coursesController.createEntity(req, res, entity));
    router.put(`/${plural}/:id`, auth, adminOnly, (req, res) => coursesController.updateEntity(req, res, entity));
    router.delete(`/${plural}/:id`, auth, adminOnly, (req, res) => coursesController.deleteEntity(req, res, entity));
});

// --- Rutas de Analytics ---
router.get('/analytics', auth, adminOnly, analyticsController.getAnalytics);
// ✅ SOLUCIÓN DEFINITIVA: Gracias al bindeo en el controlador, ahora podemos pasar el método directamente. Es más limpio.
router.get('/analytics/trends', auth, adminOnly, analyticsController.getSearchTrends);
// ✅ SOLUCIÓN: Añadir la nueva ruta para las tendencias de interacción.
router.get('/analytics/interaction-trends', auth, adminOnly, (req, res) => analyticsController.analyticsService.getInteractionTrends(req.query.days).then(data => res.json(data)).catch(err => res.status(500).json({ error: err.message })));
router.get('/analytics/time-series', auth, adminOnly, analyticsController.getTimeSeriesData); // Deprecated generic
router.get('/analytics/courses-time-series', auth, adminOnly, analyticsController.getCourseTimeSeriesData); // ✅ NUEVO
router.get('/analytics/topics-time-series', auth, adminOnly, analyticsController.getTopicTimeSeriesData); // ✅ NUEVO
router.get('/analytics/predictions', auth, adminOnly, analyticsController.getPopularCoursePrediction);
router.get('/analytics/ai', auth, adminOnly, analyticsController.getAIAnalytics); // ✅ NUEVO: KPIs de IA
router.get('/analytics/feedback', auth, adminOnly, analyticsController.getFeedback);
router.post('/analytics/feedback', auth, analyticsController.recordFeedback);
// ✅ NUEVO: Ruta para registrar una vista de página. (Accesible para invitados y registrados)
router.post('/analytics/view', optionalAuth, analyticsController.recordView.bind(analyticsController));

// --- Rutas Internas (para servicios de ML) ---
router.get('/internal/analytics-data', analyticsController.getAnalyticsForML);
router.get('/internal/ml-data', coursesController.getDataForML);

// --- Rutas del Simulador Médico ---
router.post('/medico/start', auth, checkAILimits('simulator'), medicoController.startQuiz);
router.post('/medico/next-batch', auth, checkAILimits('simulator'), medicoController.getNextBatch);
router.get('/medico/demo', optionalAuth, medicoController.getDemoQuestions);
router.post('/medico/submit', auth, medicoController.submitScore);
router.get('/medico/stats', optionalAuth, medicoController.getStats);
router.get('/medico/evolution', optionalAuth, medicoController.getEvolution);
router.get('/medico/leaderboard', auth, medicoController.getLeaderboard);

// --- Rutas del Simulador Docente ---
router.post('/docente/start', auth, checkAILimits('simulator'), docenteController.startQuiz);
router.post('/docente/next-batch', auth, checkAILimits('simulator'), docenteController.getNextBatch);
router.get('/docente/demo', optionalAuth, docenteController.getDemoQuestions);
router.post('/docente/submit', auth, docenteController.submitScore);
router.get('/docente/stats', optionalAuth, docenteController.getStats);
router.get('/docente/evolution', optionalAuth, docenteController.getEvolution);
router.get('/docente/leaderboard', auth, docenteController.getLeaderboard);

// --- Rutas del Simulador de Idiomas ---
router.post('/idiomas-simulator/start', auth, checkAILimits('simulator'), idiomasSimulatorController.startQuiz);
router.post('/idiomas-simulator/next-batch', auth, checkAILimits('simulator'), idiomasSimulatorController.getNextBatch);
router.get('/idiomas-simulator/demo', optionalAuth, idiomasSimulatorController.getDemoQuestions);
router.post('/idiomas-simulator/submit', auth, idiomasSimulatorController.submitScore);
router.get('/idiomas-simulator/stats', optionalAuth, idiomasSimulatorController.getStats);
router.get('/idiomas-simulator/evolution', optionalAuth, idiomasSimulatorController.getEvolution);
router.get('/idiomas-simulator/leaderboard', auth, idiomasSimulatorController.getLeaderboard);

// --- DECKS & FLASHCARDS ---
const DeckController = require('../../application/controllers/deckController');

router.get('/decks/public', optionalAuth, DeckController.getPublicDecks); // ✅ NUEVO: Explorador de Comunidad
router.get('/decks/tree', optionalAuth, DeckController.getDeckTree); // 🚀 NUEVO: Fetch Completo del Árbol de Mazos sin recursividad
router.get('/decks', optionalAuth, DeckController.listDecks);
router.get('/decks/:deckId', optionalAuth, DeckController.getDeckById); // ✅ NUEVO: Fetch Single Deck
router.get('/decks/:deckId/guide', optionalAuth, DeckController.getDeckGuide); // 🚀 LAZY LOADING: Fetch Guide Only
router.put('/decks/:deckId/visibility', auth, DeckController.toggleVisibility); // ✅ NUEVO: Toggle Privacidad
router.post('/decks/:deckId/clone', auth, checkAILimits('monthly_flashcards'), DeckController.cloneDeck); 
router.post('/decks', auth, checkAILimits('monthly_flashcards'), DeckController.createDeck); // 🪙 COBRA VIDA (Crear Mazo)
router.get('/decks/:deckId/cards/due', auth, checkAILimits('monthly_flashcards'), DeckController.getDueCards); 
router.get('/decks/:deckId/cards/:cardId/study', auth, checkAILimits('monthly_flashcards'), DeckController.getStudyCard); // 🪙 COBRA VIDA (Botón Play pequeño)
router.get('/decks/:deckId/cards', optionalAuth, DeckController.listCards); 
router.post('/decks/:deckId/cards', auth, checkAILimits('monthly_flashcards'), DeckController.addCard); // 🪙 COBRA VIDA (Añadir Tarjeta)
router.post('/decks/:deckId/cards/batch', auth, checkAILimits('monthly_flashcards'), DeckController.addBulkCards); // 🛡️ BLOQUEO PREMIUM (Middleware)
router.post('/decks/:deckId/generate', auth, checkAILimits('monthly_flashcards'), DeckController.generateCards); 
router.put('/decks/:deckId', auth, DeckController.updateDeck); // 🛠️ GESTIÓN INTERNA (Controller decide si cobra Guía o no)
router.delete('/decks/:deckId', auth, DeckController.deleteDeck); 
router.put('/decks/:deckId/cards/reorder', auth, DeckController.reorderCards); 
router.delete('/cards/batch', auth, DeckController.deleteBulkCards); 
router.post('/cards/upload-image', auth, upload.single('file'), DeckController.uploadCardImage); 
router.put('/cards/:cardId', auth, DeckController.updateCard); 
router.delete('/cards/:cardId', auth, DeckController.deleteCard); 

// --- Rutas de Repaso de Flashcards ---
router.get('/flashcard/due', auth, flashcardController.getDueFlashcards);
router.post('/flashcard/review', auth, flashcardController.reviewFlashcard);
router.post('/flashcard/check-saved', auth, flashcardController.checkSavedFlashcards);
router.post('/flashcard/save-from-question', auth, flashcardController.saveFlashcardFromQuestion);

// --- Rutas del Módulo de Autoevaluación ---
router.post('/self-evaluation/start', auth, checkAILimits('self_evaluation'), selfEvaluationController.startGame);
router.post('/self-evaluation/questions', auth, selfEvaluationController.getQuestions);
router.post('/self-evaluation/submit', auth, selfEvaluationController.submitScore);
router.get('/self-evaluation/ranking', optionalAuth, selfEvaluationController.getRanking);
router.get('/self-evaluation/stats', auth, selfEvaluationController.getUserStats);

// --- Rutas de Analytics Personalizados (Heatmap, etc) ---
const customAnalyticsRoutes = require('./analyticsRoutes');
router.use('/analytics', customAnalyticsRoutes);

module.exports = router;
