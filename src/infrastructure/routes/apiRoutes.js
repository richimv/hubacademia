const express = require('express');
const router = express.Router();

// --- Importar Controladores ---
const { coursesController, analyticsController, authController, chatController, usageController, adminController, medicoController, docenteController, flashcardController, userPreferencesController, mediaController, speechController } = require('../../application/controllers');

// --- Importar Middleware ---
const { auth, optionalAuth, adminOnly, authIdentity, internalServiceAuth } = require('../middleware/authMiddleware');
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
    limits: {
        fileSize: 12 * 1024 * 1024,
        files: 2,
        fields: 50,
        parts: 52
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
        const allowedExtensions = new Set(['.jpeg', '.jpg', '.png', '.webp']);
        if (allowedMimeTypes.has(file.mimetype) && allowedExtensions.has(path.extname(file.originalname).toLowerCase())) {
            return cb(null, true);
        }
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

// ✅ NUEVO: Gestión de Casuísticas Agrupadas (Case Scenarios)
router.get('/admin/cases', auth, adminOnly, adminController.getAllCases);
router.get('/admin/cases/:id', auth, adminOnly, adminController.getCaseById);
router.post('/admin/cases', auth, adminOnly, upload.single('coverImage'), adminController.createCase);
router.post('/admin/cases/bulk', auth, adminOnly, adminController.bulkInjectCases); // ✅ Inyección Masiva de Casuísticas
router.put('/admin/cases/:id', auth, adminOnly, upload.single('coverImage'), adminController.updateCase);
router.delete('/admin/cases/:id', auth, adminOnly, adminController.deleteCase);
router.post('/admin/cases/link', auth, adminOnly, adminController.linkQuestionsToCase);
router.delete('/admin/cases/unlink/:questionId', auth, adminOnly, adminController.unlinkQuestionFromCase);

router.post('/admin/drive/sync-folder', auth, adminOnly, adminController.syncDriveFolder); // ✅ NUEVO: Scanner de Drive
router.post('/admin/upload-editor', auth, adminOnly, upload.single('file'), adminController.uploadEditorImage); // ✅ NUEVO: Carga para TinyMCE
router.delete('/admin/bulk-delete', auth, adminOnly, adminController.bulkDelete); // ✅ NUEVO: Borrado Masivo


// ✅ RUTAS DE PAGOS (Mercado Pago)
const paymentRoutes = require('./paymentRoutes');
router.use('/payment', paymentRoutes);

// ✅ NUEVO: PROXY DE MEDIOS (Google Drive & GCS)
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
router.post('/auth/sync', authLimiter, authIdentity, authController.syncUser);
router.put('/auth/profile', auth, authController.updateProfile);
router.delete('/auth/delete-account', auth, authController.deleteAccount);

// --- Rutas de Chat (Prefijo /api/chat) ---
// SE AGREGA checkAILimits('chat_standard') ANTES DE PROCESS MESSAGE
router.post('/chat', optionalAuth, checkAILimits('chat_standard'), chatController.processMessage); // ✅ Permite visitantes (Asistente Guía Efímero)
router.get('/chat/conversations', auth, chatController.getUserConversations);
router.get('/chat/conversations/:id', auth, chatController.getConversationMessages);
router.put('/chat/conversations/:id', auth, chatController.updateConversationTitle);
router.delete('/chat/conversations/:id', auth, chatController.deleteConversation);
router.post('/chat/train-model', auth, adminOnly, chatController.trainModel);

// --- Rutas Públicas ---
router.get('/buscar', optionalAuth, coursesController.searchCourses);
router.get('/careers', coursesController.getCareers);
router.get('/courses', coursesController.getCourses);

// --- Rutas de Demostración (Públicas) ---


router.get('/topics', coursesController.getTopics);
router.get('/books', coursesController.getBooks);
router.get('/resources', coursesController.getBooks); // ✅ Alias dinámico para todos los recursos (Categorías/Directorios)
router.get('/books/medical', coursesController.getMedicalBooks); // ✅ NUEVO: Libros de Medicina

// ✅ NUEVO: Rutas para obtener detalles por ID
router.get('/careers/:id', coursesController.getCareerById);
router.get('/courses/:id', coursesController.getCourseById);
router.get('/topics/:id', coursesController.getTopicById);
router.get('/resources/:id', coursesController.getResourceById);

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

// --- 📊 ANALYTICS: Rutas consolidadas en analyticsRoutes.js ---
const analyticsRoutes = require('./analyticsRoutes');
router.use('/analytics', analyticsRoutes);

// --- Rutas Internas (para servicios de ML) ---
router.get('/internal/analytics-data', internalServiceAuth, analyticsController.getAnalyticsForML);
router.get('/internal/ml-data', internalServiceAuth, coursesController.getDataForML);

// --- Rutas del Simulador Médico ---
router.post('/medico/start', auth, checkAILimits('simulator'), medicoController.startQuiz);
router.post('/medico/next-batch', auth, medicoController.getNextBatch);
router.get('/medico/demo', optionalAuth, medicoController.getDemoQuestions);
router.post('/medico/answer', optionalAuth, medicoController.answerQuestion);
router.post('/medico/submit', auth, medicoController.submitScore);
router.get('/medico/stats', optionalAuth, medicoController.getStats);
router.get('/medico/evolution', optionalAuth, medicoController.getEvolution);
router.get('/medico/leaderboard', auth, medicoController.getLeaderboard);

// --- Rutas del Simulador Docente ---
router.post('/docente/start', auth, checkAILimits('simulator'), docenteController.startQuiz);
router.post('/docente/next-batch', auth, docenteController.getNextBatch);
router.get('/docente/demo', optionalAuth, docenteController.getDemoQuestions);
router.post('/docente/answer', optionalAuth, docenteController.answerQuestion);
router.post('/docente/submit', auth, docenteController.submitScore);
router.get('/docente/stats', optionalAuth, docenteController.getStats);
router.get('/docente/evolution', optionalAuth, docenteController.getEvolution);
router.get('/docente/leaderboard', auth, docenteController.getLeaderboard);

// --- DECKS & FLASHCARDS ---
const DeckController = require('../../application/controllers/deckController');

router.get('/decks/public', optionalAuth, DeckController.getPublicDecks);
router.get('/decks/tree', optionalAuth, DeckController.getDeckTree);
router.get('/decks', optionalAuth, DeckController.listDecks);
router.get('/decks/:deckId', optionalAuth, DeckController.getDeckById);
router.get('/decks/:deckId/guide', optionalAuth, DeckController.getDeckGuide);
router.put('/decks/:deckId/visibility', auth, DeckController.toggleVisibility);
router.post('/decks/:deckId/clone', auth, checkAILimits('monthly_flashcards'), DeckController.cloneDeck); 
router.post('/decks', auth, checkAILimits('monthly_flashcards'), DeckController.createDeck);
router.get('/decks/:deckId/cards/due', auth, checkAILimits('monthly_flashcards'), DeckController.getDueCards); 
router.get('/decks/:deckId/cards/:cardId/study', auth, checkAILimits('monthly_flashcards'), DeckController.getStudyCard);
router.get('/decks/:deckId/cards', optionalAuth, DeckController.listCards); 
router.post('/decks/:deckId/cards', auth, checkAILimits('monthly_flashcards'), DeckController.addCard);
router.post('/decks/:deckId/cards/batch', auth, checkAILimits('monthly_flashcards'), DeckController.addBulkCards);
router.post('/decks/:deckId/generate', auth, checkAILimits('monthly_flashcards'), DeckController.generateCards); 
router.put('/decks/:deckId', auth, DeckController.updateDeck);
router.delete('/decks/:deckId', auth, DeckController.deleteDeck); 
router.put('/decks/:deckId/cards/reorder', auth, DeckController.reorderCards); 
router.delete('/cards/batch', auth, DeckController.deleteBulkCards); 
router.post('/cards/upload-image', auth, upload.single('file'), DeckController.uploadCardImage); 
router.put('/cards/:cardId', auth, DeckController.updateCard); 
router.delete('/cards/:cardId', auth, DeckController.deleteCard); 

// --- Rutas de Repaso de Flashcards ---
router.get('/flashcard/due', auth, flashcardController.getDueFlashcards);
router.post('/flashcard/review', auth, flashcardController.reviewFlashcard);

module.exports = router;
