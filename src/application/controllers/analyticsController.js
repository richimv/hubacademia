const { VertexAI } = require('@google-cloud/vertexai');
const securityUtils = require('../../domain/utils/securityUtils');
const mineduScoringService = require('../../domain/services/mineduScoringService');
const { generateEducationDiagnostic } = require('../../domain/services/educationDiagnosticService');
const { resolveGoogleAuthOptions } = require('../../infrastructure/config/googleCredentials');
const {
    getVertexCandidateModels,
    getVertexGenerativeEndpoint,
    buildVertexGenerationConfig,
    extractModelResponsePayload
} = require('../../infrastructure/config/vertexAiConfig');

// Ventana de deduplicación serverless para evitar escrituras redundantes a web_traffic y page_views
const PULSE_THROTTLE_MS = 2 * 60 * 1000; // 2 minutos (ventana active_now en BD es de 5 minutos)
const VIEW_THROTTLE_MS = 30 * 1000;      // 30 segundos por entidad/sesión
const MAX_CACHE_ENTRIES = 5000;
const BOT_USER_AGENT_REGEX = /bot|crawler|spider|crawling|uptimerobot|headlesschrome|lighthouse|pagespeed|gtmetrix|pingdom|curl|wget|python-requests/i;

// CONFIGURACIÓN VERTEX AI
const googleAuthOptions = resolveGoogleAuthOptions('AnalyticsController');
const project = process.env.GOOGLE_CLOUD_PROJECT || 'mock-gcp-project';
let vertex_ai = null;
try {
    vertex_ai = new VertexAI({
        project: project,
        ...getVertexGenerativeEndpoint(),
        ...(Object.keys(googleAuthOptions).length > 0 ? { googleAuthOptions } : {})
    });
} catch (e) {
    console.warn('⚠️ AnalyticsController: VertexAI no inicializado (Modo test o sin credenciales).');
}

class AnalyticsController {
    constructor(analyticsService, userRepository) {
        this.analyticsService = analyticsService;
        this.userRepository = userRepository;
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

    async _callGeminiDiagnostic(prompt) {
        if (!vertex_ai) {
            throw new Error('VertexAI no está inicializado en AnalyticsController');
        }

        // Canal Exclusivo: Google Cloud Vertex AI (GCP Enterprise) — Estándar Gemini 3.6
        const vertexCandidateModels = getVertexCandidateModels();
        const generationConfig = buildVertexGenerationConfig({
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
            thinkingLevel: process.env.VERTEX_DIAGNOSTIC_THINKING_LEVEL || null
        });
        console.log('📡 [VertexAI Analytics] Conectando a Vertex AI SDK (GCP Enterprise)...');
        let lastError = null;

        for (const modelName of vertexCandidateModels) {
            try {
                const vertexModel = vertex_ai.getGenerativeModel({
                    model: modelName,
                    generationConfig
                });
                const result = await vertexModel.generateContent(prompt);
                const payload = extractModelResponsePayload(result);
                if (payload && payload.text) {
                    console.log(`✅ [VertexAI Analytics Éxito] Diagnóstico generado con modelo: ${modelName}`);
                    return payload.text;
                }
            } catch (err) {
                lastError = err;
                console.warn(`⚠️ [VertexAI Analytics Fallo - ${modelName}]:`, err.message);
            }
        }

        throw (lastError || new Error('No se pudo conectar con Vertex AI en ningún modelo de la cascada.'));
    }

    async getAIDiagnostic(req, res) {
        try {
            const userId = req.user.id;
            const tier = req.userTier || 'free';
            const { stats: rawStats, context: rawContext = 'MEDICINA' } = req.body;

            // Sanitizar/Validar entrada de contexto
            const context = typeof rawContext === 'string' 
                ? rawContext.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 20)
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
            const educationSummary = context === 'EDUCACION' ? generateEducationDiagnostic(stats) : null;
            if (educationSummary && !educationSummary.hasHistory) {
                return res.json({ success: true, ...educationSummary });
            }

            // 💸 DESCONTAR CUOTA / VIDAS según el tipo definido por el middleware (usage_count para Free, daily_ai_usage para Advanced)
            if (req.usageType && tier !== 'admin') {
                try {
                    if (securityUtils.isValidUsageColumn(req.usageType)) {
                        const db = require('../../infrastructure/database/db');
                        await db.query(
                            `UPDATE users SET ${req.usageType} = ${req.usageType} + 1 WHERE id = $1`,
                            [userId]
                        );
                        console.log(`📉 Cuota de ${req.usageType} incrementada para usuario ${userId} en Diagnóstico.`);
                    }
                } catch (limitErr) {
                    console.error("⚠️ No se pudo actualizar el límite en base de datos. Continuando...", limitErr);
                }
            }

            // Retornar Diagnóstico Heurístico Inteligente para cuentas no Premium (free, basic, pending, etc.) o si se forzó el fallback
            if ((tier !== 'advanced' && tier !== 'admin') || req.fallbackToStatic) {
                const diagnostic = this.analyticsService.generateHeuristicDiagnostic(stats, context);
                return res.json({ success: true, ...diagnostic });
            }

            console.log(`🧠 [IA MULTI-MÓDULO] Generando diagnóstico cognitivo profundo con IA para el usuario ${userId} en contexto ${context}...`);

            // Adaptar dinámicamente el prompt según el contexto
            let tutorRole = "Tutor Médico experto y evaluador del Examen Nacional de Medicina (ENAM / SERUMS / Residentado)";
            let examType = "médico cirujano en preparación intensiva para sus exámenes oficiales nacionales";
            let areaLabel = "RENDIMIENTO Y MATRIZ POR ÁREAS CLÍNICAS";
            let scaleSectionPrompt = "";
            let strengthTextPrompt = "El análisis debe centrarse en el dominio clínico, razonamiento diagnóstico, correlación fisiopatológica y precisión terapéutica. Destaca sus áreas más sólidas con porcentajes reales de acierto.";
            let weaknessTextPrompt = "Identifica patrones de error sistemático, sesgos diagnósticos (ej. sesgo de anclaje, confusión en dosis críticas o no reconocer signos de alarma) y el riesgo real en el puntaje de la prueba oficial.";
            let highYieldPrompt = "Una 'Píldora Clínica High-Yield' de alto impacto que suelen preguntar en los exámenes oficiales sobre una de sus áreas débiles.";
            let step1Title = "Refuerzo Clínico y Guías Oficiales";
            let step2Title = "Entrenamiento en Descarte Rápido";
            let step3Title = "Simulacros de Alta Exigencia";

            if (context === 'EDUCACION') {
                const cutoff = mineduScoringService.getScaleCutoff(targetScale);
                const mineduScore = educationSummary?.mineduEvaluation?.mineduScore ?? ((stats.minedu_score !== undefined && !isNaN(parseFloat(stats.minedu_score)))
                    ? parseFloat(stats.minedu_score)
                    : Math.round(((stats.avg_score / 20) * 90) * 10) / 10);
                const gap = Math.round((mineduScore - cutoff.minPoints) * 10) / 10;
                const statusStr = gap >= 0
                    ? `+${gap.toFixed(1)} pts de margen (PROYECCIÓN APROBATORIA)`
                    : `-${Math.abs(gap).toFixed(1)} pts de déficit (BRECHA POR CUBRIR)`;

                tutorRole = "Asesor Pedagógico Especialista en Evaluación y Currículo Nacional (CNEB / Minedu)";
                examType = `docente en preparación para la Prueba Nacional de Ascenso de Escala Magisterial (Postula a: ${cutoff.name})`;
                areaLabel = "RENDIMIENTO GLOBAL SIN CLASIFICACIÓN TEMÁTICA";
                scaleSectionPrompt = `
                ESCALA OBJETIVO DEL POSTULANTE (MINEDU):
                - Meta Postulada: ${cutoff.name}
                - Puntaje Mínimo Requerido: ${cutoff.minPoints} / 90 puntos (equiv. ${cutoff.vigesimalEquivalent}/20)
                - Puntaje Actual Estimado: ${mineduScore} / 90 puntos
                - Estado frente al Corte: ${statusStr}
                `;
                strengthTextPrompt = 'Describe únicamente la nota, precisión y volumen de respuestas observados. No se dispone de ejes temáticos ni del contenido de las respuestas: no atribuyas competencias o fortalezas pedagógicas específicas.';
                weaknessTextPrompt = `Describe el margen o brecha frente al corte configurado de ${cutoff.minPoints} puntos. No inventes patrones de error, debilidades por área, velocidad ni tendencias temporales. La proyección de práctica no garantiza aprobación oficial.`;
                highYieldPrompt = 'Una sugerencia general de estudio, identificada como recomendación y no como una debilidad detectada en el usuario.';
                step1Title = 'Revisión de respuestas incorrectas';
                step2Title = "Casuísticas de Retroalimentación y Rúbricas";
                step3Title = "Simulacros Oficiales MINEDU (60q)";
            }

            // Prompt analítico adaptado para Plan Avanzado (Deep Reasoning)
            const prompt = `
            Actúa como un ${tutorRole}.
            Analiza el historial de rendimiento de un ${examType}:
            
            Nota Promedio: ${stats.avg_score} / 20
            Precisión Global: ${stats.accuracy}%
            ${context === 'EDUCACION' ? `Preguntas respondidas: ${stats.total_questions ?? 'Sin volumen disponible'}. No hay datos fiables de rendimiento por ejes temáticos.` : ''}
            Tarjetas Repasadas y Dominadas: ${stats.mastered_cards}
            ${scaleSectionPrompt}
            
            ${areaLabel}:
            ${JSON.stringify(stats.radar_data, null, 2)}
            
            TAREA:
            Genera una auditoría diagnóstica cognitiva profunda de alto nivel profesional y analítico. Detecta sesgos de razonamiento, patrones de error frente a distractores y oportunidades críticas de mejora antes de la prueba oficial. Usa un tono de mentor de élite: analítico, riguroso, pero altamente motivador y accionable.
            
            JSON ESTRICTO:
            {
                "readinessIndex": 82,
                "readinessLevel": "Nivel Competente Avanzado",
                "strengths": "HTML sin etiquetas <html> o <body>. Usa <p style='color:var(--text-secondary); font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'> para un resumen inicial. Luego usa <ul style='margin:0; padding:0; list-style:none;'> con items <li style='display:flex; align-items:start; gap:0.75rem; margin-bottom:0.75rem; color:var(--text-main); font-size:0.85rem; line-height:1.4;'><i class='fas fa-check-circle' style='color:var(--primary); margin-top:2px;'></i><span>...</span></li>. ${strengthTextPrompt} Menciona su precisión específica.",
                "weaknesses": "Mismo formato HTML (Párrafo + Lista ul/li). El icono de la lista debe ser: <i class='fas fa-crosshairs' style='color:var(--text-muted); margin-top:2px;'></i>. ${weaknessTextPrompt}",
                "strategy": "Texto conciso de 1 o 2 oraciones con la recomendación de estudio más importante para su próxima sesión.",
                "highYieldTip": "${highYieldPrompt}",
                "sprint": [
                    { "step": 1, "title": "${step1Title}", "desc": "Acción concreta de estudio y revisión teórica recomendada." },
                    { "step": 2, "title": "${step2Title}", "desc": "Acción de práctica focalizada en simuladores comentados." },
                    { "step": 3, "title": "${step3Title}", "desc": "Acción de consolidación y prueba de velocidad para la prueba oficial." }
                ]
            }
            `;

            let diagnostic;
            try {
                const rawText = await this._callGeminiDiagnostic(prompt);
                diagnostic = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
                if (!diagnostic || !['strengths', 'weaknesses', 'strategy'].every(key => typeof diagnostic[key] === 'string')) {
                    throw new Error('INVALID_DIAGNOSTIC_RESPONSE');
                }
                diagnostic.source = 'ai';
                if (educationSummary) {
                    // Keep measured indicators deterministic; the model supplies the narrative only.
                    diagnostic = { ...diagnostic, source: 'ai', hasHistory: true,
                        readinessIndex: educationSummary.readinessIndex,
                        readinessLevel: educationSummary.readinessLevel,
                        ...(educationSummary.mineduEvaluation ? { mineduEvaluation: educationSummary.mineduEvaluation } : {}) };
                }
            } catch(err) {
                console.warn("⚠️ [Diagnóstico IA Fallback] Usando motor heurístico enriquecido por:", err.message);
                diagnostic = this.analyticsService.generateHeuristicDiagnostic(stats, context);
            }

            return res.json({ success: true, ...diagnostic });

        } catch (error) {
            console.error('❌ Error en getAIDiagnostic:', error);
            try {
                const fallbackStats = { ...(req.body.stats || {}), targetScale: req.body.targetScale || req.body.stats?.targetScale || 2 };
                const fallback = this.analyticsService.generateHeuristicDiagnostic(fallbackStats, req.body.context || 'MEDICINA');
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
