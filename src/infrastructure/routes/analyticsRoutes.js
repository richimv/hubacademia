const express = require('express');
const router = express.Router();
const { analyticsController } = require('../../application/controllers');
const { auth, optionalAuth, adminOnly } = require('../middleware/authMiddleware');
const checkAILimits = require('../../application/middlewares/checkLimitsMiddleware');

// ======================
// 📊 RUTAS DE ANALYTICS (Consolidadas)
// Montadas en /api/analytics por apiRoutes.js
// ======================

// --- Rutas Públicas / Semi-Públicas ---
router.get('/featured-books', analyticsController.getFeaturedBooks);
router.get('/featured-courses', analyticsController.getFeaturedCourses);
router.post('/view', optionalAuth, analyticsController.recordView.bind(analyticsController));
router.post('/feedback', auth, analyticsController.recordFeedback);

// --- Tráfico en Tiempo Real ---
router.post('/pulse', optionalAuth, analyticsController.recordPulse);
router.get('/real-time', auth, adminOnly, analyticsController.getRealTimeStats);

// --- Heatmap ---
router.get('/heatmap', auth, analyticsController.getHeatmap);

// --- Diagnóstico con IA (Requiere cuota de chat_standard) ---
router.post('/diagnostic', auth, checkAILimits('chat_standard'), analyticsController.getAIDiagnostic);

// --- Panel de Admin: Dashboard de Analytics ---
router.get('/', auth, adminOnly, analyticsController.getAnalytics);
router.get('/trends', auth, adminOnly, analyticsController.getSearchTrends);
router.get('/interaction-trends', auth, adminOnly, analyticsController.getInteractionTrends);
router.get('/time-series', auth, adminOnly, analyticsController.getTimeSeriesData);
router.get('/courses-time-series', auth, adminOnly, analyticsController.getCourseTimeSeriesData);
router.get('/topics-time-series', auth, adminOnly, analyticsController.getTopicTimeSeriesData);
router.get('/predictions', auth, adminOnly, analyticsController.getPopularCoursePrediction);
router.get('/ai', auth, adminOnly, analyticsController.getAIAnalytics);
router.get('/feedback', auth, adminOnly, analyticsController.getFeedback);

module.exports = router;
