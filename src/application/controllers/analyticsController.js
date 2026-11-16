const securityUtils = require('../../domain/utils/securityUtils');
const UsageService = require('../../domain/services/usageService');

// Ventana de deduplicación serverless para evitar escrituras redundantes a web_traffic y page_views
const PULSE_THROTTLE_MS = 2 * 60 * 1000; // 2 minutos (ventana active_now en BD es de 5 minutos)
const VIEW_THROTTLE_MS = 30 * 1000;      // 30 segundos por entidad/sesión
const MAX_CACHE_ENTRIES = 5000;
const BOT_USER_AGENT_REGEX = /bot|crawler|spider|crawling|uptimerobot|headlesschrome|lighthouse|pagespeed|gtmetrix|pingdom|curl|wget|python-requests/i;

class AnalyticsController {
    constructor(analyticsService, userRepository, usageService = null) {
        this.analyticsService = analyticsService;
        this.userRepository = userRepository;
        this.usageService = usageService || (userRepository ? new UsageService(userRepository) : new UsageService());
        this._pulseCache = new Map();
        this._viewCache = new Map();

        // BIND EXPLÍCITO para mantener el contexto de 'this' en las rutas de Express
        this.getAnalytics = this.getAnalytics.bind(this);
        this.getSearchTrends = this.getSearchTrends.bind(this);
        this.getInteractionTrends = this.getInteractionTrends.bind(this);
        this.getPopularCoursePrediction = this.getPopularCoursePrediction.bind(this);
        this.recordFeedback = this.recordFeedback.bind(this);
        this.getFeedback = this.getFeedback.bind(this);
        this.getAnalyticsForML = this.getAnalyticsForML.bind(this);
        this.recordView = this.recordView.bind(this);
        this.getTimeSeriesData = this.getTimeSeriesData.bind(this);
        this.getCourseTimeSeriesData = this.getCourseTimeSeriesData.bind(this); // NUEVO
        this.getTopicTimeSeriesData = this.getTopicTimeSeriesData.bind(this); // NUEVO
        this.getFeaturedBooks = this.getFeaturedBooks.bind(this); // NUEVO
        this.getFeaturedCourses = this.getFeaturedCourses.bind(this); // NUEVO
        this.getAIAnalytics = this.getAIAnalytics.bind(this); // ✅ NUEVO: Bindeo para método de IA
        this.getHeatmap = this.getHeatmap.bind(this); // ✅ NUEVO: Heatmap
        this.getAIDiagnostic = this.getAIDiagnostic.bind(this); // ✅ NUEVO: Diagnóstico Thinking
        this.recordPulse = this.recordPulse.bind(this); // ✅ NUEVO: Registro de pulso
        this.getRealTimeStats = this.getRealTimeStats.bind(this); // ✅ NUEVO: Estadísticas en vivo
    }

    async getAnalytics(req, res) {
        try {
            const days = parseInt(req.query.days, 10) || 30; // Filtro por defecto: 30 días
            const analytics = await this.analyticsService.getDashboardAnalytics(days);
            res.json(analytics);
        } catch (error) {
            console.error('❌ Error obteniendo analytics:', error);
            res.status(500).json({ error: 'Error al obtener las estadísticas.' });
        }
    }

    async getSearchTrends(req, res) {
        try {
            // SOLUCIÓN: Leer el parámetro 'days' de la URL y pasarlo al servicio.
            const days = parseInt(req.query.days, 10) || 30;
            const trends = await this.analyticsService.getSearchTrends(days);
            res.json(trends);
        } catch (error) {
            console.error('❌ Error obteniendo tendencias de búsqueda:', error);
            res.status(500).json({ error: 'Error al obtener las tendencias.' });
        }
    }

    async getInteractionTrends(req, res) {
        try {
            const days = parseInt(req.query.days, 10) || 30;
            const trends = await this.analyticsService.getInteractionTrends(days);
            res.json(trends);
        } catch (error) {
            console.error('❌ Error obteniendo tendencias de interacción:', error);
            res.status(500).json({ error: 'Error al obtener las tendencias de interacción.' });
        }
    }

    async getPopularCoursePrediction(req, res) {
        try {
            const days = parseInt(req.query.days, 10) || 30; // ✅ Acepta days
            const prediction = await this.analyticsService.predictPopularCourse(days);
            res.json(prediction);
        } catch (error) {
            console.error('❌ Error obteniendo predicción de curso:', error);
            res.status(500).json({ error: 'Error al obtener la predicción.' });
        }
    }

    // ... (recordFeedback, recordView, getFeedback, getAnalyticsForML remain the same)

    // Endpoint para series de tiempo de CURSOS
    async getCourseTimeSeriesData(req, res) {
        try {
            const days = parseInt(req.query.days, 10) || 30;
            const data = await this.analyticsService.getCourseTimeSeriesData(days);
            res.json(data);
        } catch (error) {
            console.error('❌ Error obteniendo series de tiempo de cursos:', error);
            res.status(500).json({ error: 'Error al obtener las series de tiempo de cursos.' });
        }
    }

    // Endpoint para series de tiempo de TEMAS
    async getTopicTimeSeriesData(req, res) {
        try {
            const days = parseInt(req.query.days, 10) || 30;
            const data = await this.analyticsService.getTopicTimeSeriesData(days);
            res.json(data);
        } catch (error) {
            console.error('❌ Error obteniendo series de tiempo de temas:', error);
            res.status(500).json({ error: 'Error al obtener las series de tiempo de temas.' });
        }
    }

    // DEPRECATED: El endpoint genérico anterior se mantiene por compatibilidad si es necesario, 
    // pero el frontend usará los específicos.
    async getTimeSeriesData(req, res) {
        try {
            const days = parseInt(req.query.days, 10) || 7;
            const data = await this.analyticsService.getTimeSeriesData(days);
            res.json(data);
        } catch (error) {
            console.error('❌ Error obteniendo series de tiempo:', error);
            res.status(500).json({ error: 'Error al obtener las series de tiempo.' });
        }
    }
    _pruneCacheIfNeeded(cache, ttlMs, now = Date.now()) {
        if (cache.size < MAX_CACHE_ENTRIES) return;
        for (const [key, entry] of cache.entries()) {
            const timestamp = typeof entry === 'number' ? entry : entry.lastWriteAt;
            if (now - timestamp >= ttlMs) {
                cache.delete(key);
            }
        }
        if (cache.size >= MAX_CACHE_ENTRIES) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey !== undefined) cache.delete(oldestKey);
        }
    }

    async recordFeedback(req, res) {
        try {
            const { query, response, isHelpful, messageId } = req.body || {};
            const userId = req.user ? req.user.id : null;
            await this.analyticsService.recordFeedback(query, response, isHelpful, userId, messageId);
            res.status(204).send();
        } catch (error) {
            console.error('❌ Error registrando feedback:', error);
            res.status(500).json({ error: 'Error al registrar el feedback.' });
        }
    }

    // Controlador para registrar una vista de página con deduplicación en ráfaga.
    async recordView(req, res) {
        try {
            const { entityType, entityId } = req.body || {};
            const userId = req.user ? req.user.id : null;

            if (!entityType || !entityId) {
                return res.status(400).json({ error: 'entityType y entityId son requeridos.' });
            }

            const normalizedType = String(entityType).trim();
            const normalizedId = String(entityId).trim();
            if (!normalizedType || !normalizedId) {
                return res.status(400).json({ error: 'entityType y entityId son requeridos.' });
            }

            const actorKey = userId || req.ip || 'anon';
            const viewKey = `${actorKey}:${normalizedType}:${normalizedId}`;
            const now = Date.now();
            const lastViewedAt = this._viewCache.get(viewKey);

            if (lastViewedAt && (now - lastViewedAt) < VIEW_THROTTLE_MS) {
                return res.status(202).send();
            }

            this._pruneCacheIfNeeded(this._viewCache, VIEW_THROTTLE_MS, now);
            await this.analyticsService.recordView(normalizedType, entityId, userId);
            this._viewCache.set(viewKey, now);
            res.status(202).send();
        } catch (error) {
            console.error('❌ Error registrando vista de página:', error);
            res.status(500).json({ error: 'Error al registrar la vista.' });
        }
    }

    // Controlador para obtener todos los feedbacks.
    async getFeedback(req, res) {
        try {
            const feedbackData = await this.analyticsService.getAllFeedback();
            res.json(feedbackData);
        } catch (error) {
            console.error('❌ Error obteniendo todos los feedbacks:', error);
            res.status(500).json({ error: 'Error al obtener los datos de feedback.' });
        }
    }

    async getFeaturedBooks(req, res) {
        try {
            const limit = parseInt(req.query.limit, 10) || 10;
            const books = await this.analyticsService.getFeaturedBooks(limit);
            res.json(books);
        } catch (error) {
            console.error('❌ Error obteniendo libros destacados:', error);
            res.status(500).json({ error: 'Error al obtener libros destacados.' });
        }
    }

    async getFeaturedCourses(req, res) {
        try {
            const limit = parseInt(req.query.limit, 10) || 10;
            const courses = await this.analyticsService.getFeaturedCourses(limit);
            res.json(courses);
        } catch (error) {
            console.error('❌ Error obteniendo cursos destacados:', error);
            res.status(500).json({ error: 'Error al obtener cursos destacados.' });
        }
    }

    async getAIAnalytics(req, res) {
        try {
            const days = parseInt(req.query.days, 10) || 30;
            const data = await this.analyticsService.getAIAnalytics(days);
            res.json(data);
        } catch (error) {
            console.error('❌ Error obteniendo analítica de IA:', error);
            res.status(500).json({ error: 'Error al obtener estadísticas de IA.' });
        }
    }

    async getAnalyticsForML(req, res) {
        try {
            // ✅ SOLUCIÓN: Aceptar parámetro de días (default 90 para ML si no se especifica)
            const days = parseInt(req.query.days, 10) || 90;
            const data = await this.analyticsService.getAnalyticsForML(days);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Error al obtener datos de analítica.' });
        }
    }

    async getHeatmap(req, res) {
        try {
            const userId = req.user.id;
            const { deckId } = req.query;
            const heatmap = await this.analyticsService.getHeatmapData(userId, deckId || null);
            res.json({ success: true, heatmap });
        } catch (error) {
            console.error('❌ Error in getHeatmap:', error);
            res.status(500).json({ error: 'Error fetching heatmap' });
        }
    }

    async getAIDiagnostic(req, res) {
        try {
            const userId = req.user.id;
            const tier = req.userTier || 'free';
            const { stats: rawStats, context: rawContext = 'MEDICINA' } = req.body || {};

            // Sanitizar/Validar entrada de contexto
            const context = typeof rawContext === 'string'
                ? (rawContext.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 20) || 'MEDICINA')
                : 'MEDICINA';

            // Validación de datos estadísticos mínimos y sanitización
            if (!rawStats || (context !== 'EDUCACION' && !rawStats.radar_data)) {
                return res.status(400).json({ error: 'Faltan datos estadísticos para analizar.' });
            }

            let stats;
            try {
                stats = securityUtils.validateDiagnosticStats(rawStats);
            } catch (err) {
                return res.status(400).json({ error: 'Datos estadísticos inválidos o corruptos.' });
            }

            // Propagar targetScale si fue enviado en body o en stats
            const targetScale = req.body.targetScale || rawStats.targetScale || stats.targetScale || 2;
            stats.targetScale = targetScale;
            if (context === 'EDUCACION') stats.radar_data = []; // Do not infer skills from retired classifications.
            if (req.body.target && !stats.target) stats.target = req.body.target;

            const diagnostic = await this.analyticsService.generateDiagnosticInsight({
                user: req.user,
                userTier: tier,
                stats,
                context,
                targetScale,
                target: req.body.target,
                fallbackToStatic: Boolean(req.fallbackToStatic)
            });

            if (diagnostic && context === 'EDUCACION' && diagnostic.hasHistory === false) {
                return res.json({ success: true, ...diagnostic });
            }

            // 💸 DESCONTAR CUOTA / VIDAS según el tipo definido por el middleware (usage_count para Free, daily_ai_usage para Advanced)
            if (req.usageType && tier !== 'admin') {
                try {
                    if (securityUtils.isValidUsageColumn(req.usageType)) {
                        await this.usageService.incrementUsageColumn(userId, req.usageType);
                        console.log(`📉 Cuota de ${req.usageType} incrementada para usuario ${userId} en Diagnóstico.`);
                    }
                } catch (limitErr) {
                    console.error('⚠️ No se pudo actualizar el límite en base de datos. Continuando...', limitErr);
                }
            }

            return res.json({ success: true, ...diagnostic });

        } catch (error) {
            console.error('❌ Error en getAIDiagnostic:', error);
            try {
                const fallbackStats = { ...(req.body?.stats || {}), targetScale: req.body?.targetScale || req.body?.stats?.targetScale || 2 };
                const fallback = this.analyticsService.generateHeuristicDiagnostic(fallbackStats, req.body?.context || 'MEDICINA');
                return res.json({ success: true, ...fallback });
            } catch (fallbackErr) {
                res.status(500).json({ error: 'Hubo un problema generando tu diagnóstico con IA.' });
            }
        }
    }

    // ==========================================
    // CONTROLADORES DE TRÁFICO REAL-TIME
    // ==========================================

    async recordPulse(req, res) {
        try {
            const { sessionId: rawSessionId, isMobile } = req.body || {};
            const userId = req.user ? req.user.id : null;
            const sessionId = typeof rawSessionId === 'string' ? rawSessionId.trim() : '';

            if (!sessionId || sessionId.length > 128) {
                return res.status(400).json({ error: 'sessionId es requerido.' });
            }

            // Ignorar crawlers, bots y sondas automatizadas para no inflar web_traffic
            const userAgent = String(req.headers?.['user-agent'] || '');
            if (userAgent && BOT_USER_AGENT_REGEX.test(userAgent)) {
                return res.status(204).send();
            }

            const now = Date.now();
            const cached = this._pulseCache.get(sessionId);
            const isFreshPulse = cached && (now - cached.lastWriteAt) < PULSE_THROTTLE_MS;
            const isUserPromoted = Boolean(userId && (!cached || cached.userId !== userId));

            // Si la misma sesión ya registró pulso dentro de la ventana de 2 min y no cambió de anónimo a autenticado,
            // evitamos escribir innecesariamente en Supabase (ON CONFLICT DO UPDATE).
            if (isFreshPulse && !isUserPromoted) {
                return res.status(204).send();
            }

            this._pruneCacheIfNeeded(this._pulseCache, PULSE_THROTTLE_MS, now);
            await this.analyticsService.logPulse(sessionId, userId, Boolean(isMobile));
            this._pulseCache.set(sessionId, {
                lastWriteAt: now,
                userId: userId || cached?.userId || null
            });
            res.status(204).send();
        } catch (error) {
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.syscall === 'getaddrinfo') {
                console.warn('⚠️ Pulso de tráfico omitido temporalmente por inestabilidad de red (DNS/Supabase).');
            } else {
                console.error('❌ Error registrando pulso:', error);
            }
            res.status(204).send();
        }
    }

    async getRealTimeStats(req, res) {
        try {
            const stats = await this.analyticsService.getRealTimeStats();
            res.json(stats);
        } catch (error) {
            console.error('❌ Error obteniendo tráfico real-time:', error);
            res.status(500).json({ error: 'Error al obtener estadísticas en vivo.' });
        }
    }
}

module.exports = AnalyticsController;
