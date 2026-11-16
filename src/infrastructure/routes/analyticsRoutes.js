const express = require('express');
const router = express.Router();
const { analyticsController } = require('../../application/controllers');
const { auth, optionalAuth, adminOnly } = require('../middleware/authMiddleware');
const checkAILimits = require('../../application/middlewares/checkLimitsMiddleware');

// Deduplicación ligera en memoria para pulsos de telemetría (sin timers en background)
// Evita tormentas de UPSERT en web_traffic y llamadas de autenticación en recargas MPA.
const PULSE_DEDUP_WINDOW_MS = 120 * 1000; // 2 minutos (ventana activa de BD es 5 minutos)
const MAX_PULSE_CACHE_ENTRIES = 1000;
const pulseSessionCache = new Map();

function prunePulseCache(now = Date.now()) {
    for (const [key, lastSeenAt] of pulseSessionCache.entries()) {
        if (now - lastSeenAt >= PULSE_DEDUP_WINDOW_MS) {
            pulseSessionCache.delete(key);
        }
    }
    while (pulseSessionCache.size > MAX_PULSE_CACHE_ENTRIES) {
        const oldestKey = pulseSessionCache.keys().next().value;
        if (oldestKey === undefined) break;
        pulseSessionCache.delete(oldestKey);
    }
}

function clearPulseSessionCache() {
    pulseSessionCache.clear();
}

function throttlePulseMiddleware(req, res, next) {
    try {
        const rawSessionId = req.body && req.body.sessionId ? String(req.body.sessionId).trim() : '';
        if (!rawSessionId) {
            return next();
        }

        const now = Date.now();
        prunePulseCache(now);

        const hasAuth = Boolean(typeof req.header === 'function' ? req.header('Authorization') : req.headers?.authorization);
        const cacheKey = `${rawSessionId}:${hasAuth ? 'auth' : 'anon'}`;
        const lastPulseAt = pulseSessionCache.get(cacheKey);

        if (lastPulseAt && (now - lastPulseAt < PULSE_DEDUP_WINDOW_MS)) {
            return res.status(204).send();
        }

        pulseSessionCache.set(cacheKey, now);
        return next();
    } catch (err) {
        return next();
    }
}

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
router.post('/pulse', throttlePulseMiddleware, optionalAuth, analyticsController.recordPulse);
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

router.throttlePulseMiddleware = throttlePulseMiddleware;
router.clearPulseSessionCache = clearPulseSessionCache;

module.exports = router;
