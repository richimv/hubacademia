const AnalyticsService = require('../../domain/services/analyticsService');
const UserRepository = require('../../domain/repositories/userRepository'); // 1. Importar la CLASE del repositorio.
const { VertexAI } = require('@google-cloud/vertexai'); // ✅ NUEVO: Importar Vertex para el Analizador

// CONFIGURACIÓN VERTEX AI
const project = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GOOGLE_CLOUD_LOCATION;
const vertex_ai = new VertexAI({ project: project, location: location });

// Instancia Unificada LITE (Análisis Pro)
const modelLite = vertex_ai.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.3,
        responseMimeType: 'application/json'
    },
});

const modelPro = modelLite; // ✅ UNIFICADO A LITE (Costo $0.00)

class AnalyticsController {
    constructor(analyticsService, userRepository) { // 2. Recibir el repositorio en el constructor.
        this.analyticsService = analyticsService;
        this.userRepository = userRepository; // 3. Guardar la instancia del repositorio.

        // SOLUCIÓN DEFINITIVA: Bindeo explícito para mantener el contexto de 'this' en las rutas de Express.
        // Esto asegura que `this.analyticsService` siempre esté disponible.
        // BIND EXPLÍCITO para mantener el contexto de 'this' en las rutas de Express
        this.getAnalytics = this.getAnalytics.bind(this);
        this.getSearchTrends = this.getSearchTrends.bind(this);
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
    async recordFeedback(req, res) {
        try {
            const { query, response, isHelpful, messageId } = req.body;
            // ✅ OBTENER EL ID DEL USUARIO DESDE EL TOKEN
            // El middleware 'auth' ya nos da el usuario en req.user.
            // ✅ 4. Usar la instancia correcta del repositorio que fue inyectada.
            const userRecord = req.user ? await this.userRepository.findById(req.user.id) : null;
            await this.analyticsService.recordFeedback(query, response, isHelpful, userRecord ? userRecord.id : null, messageId);
            // Se cambia a 204 No Content, que es más apropiado para una acción que no necesita devolver datos.
            res.status(204).send();
        } catch (error) {
            console.error('❌ Error registrando feedback:', error);
            res.status(500).json({ error: 'Error al registrar el feedback.' });
        }
    }

    // Controlador para registrar una vista de página.
    async recordView(req, res) {
        try {
            const { entityType, entityId } = req.body;
            const userId = req.user ? req.user.id : null; // ✅ Soporte para invitados

            if (!entityType || !entityId) {
                return res.status(400).json({ error: 'entityType y entityId son requeridos.' });
            }
            await this.analyticsService.recordView(entityType, entityId, userId);
            res.status(202).send(); // 202 Accepted
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
            const heatmap = await this.analyticsService.getHeatmapData(userId);
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
            const { stats, context = 'MEDICINA' } = req.body; // Llega cacheado desde el front (radar_data, avg_score, accuracy)

            // Validación de datos estadísticos mínimos
            if (!stats || !stats.radar_data) {
                return res.status(400).json({ error: 'Faltan datos estadísticos para analizar.' });
            }

            // Retornar Diagnóstico Estático para cuentas no Premium (free, pending, etc.) o si se forzó el fallback
            if (tier !== 'advanced' && tier !== 'elite' && tier !== 'admin' || req.fallbackToStatic) {
                let strengths = "";
                let weaknesses = "";

                if (context === 'EDUCACION') {
                    strengths = `
                        <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Has demostrado destreza en los fundamentos pedagógicos del Currículo Nacional. Tu progreso muestra un inicio prometedor:</p>
                        <ul style='margin:0; padding:0; list-style:none;'>
                            <li style='display:flex; align-items:start; gap:0.75rem; margin-bottom:0.75rem; color:#cbd5e1; font-size:0.85rem; line-height:1.4;'>
                                <i class='fas fa-check-circle' style='color:#34d399; margin-top:2px;'></i>
                                <span>Comprensión inicial de la <strong>Planificación Curricular</strong> y el diseño de sesiones.</span>
                            </li>
                            <li style='display:flex; align-items:start; gap:0.75rem; margin-bottom:0.75rem; color:#cbd5e1; font-size:0.85rem; line-height:1.4;'>
                                <i class='fas fa-check-circle' style='color:#34d399; margin-top:2px;'></i>
                                <span>Reconocimiento de principios básicos de <strong>Convivencia Democrática</strong> y clima de aula.</span>
                            </li>
                        </ul>
                    `;
                    weaknesses = `
                        <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Es imperativo consolidar áreas críticas de evaluación formativa y casuística de especialidad:</p>
                        <ul style='margin:0; padding:0; list-style:none;'>
                            <li style='display:flex; align-items:start; gap:0.75rem; margin-bottom:0.75rem; color:#cbd5e1; font-size:0.85rem; line-height:1.4;'>
                                <i class='fas fa-exclamation-triangle' style='color:#fbbf24; margin-top:2px;'></i>
                                <span>Dificultad en la aplicación práctica de <strong>Rúbricas de Evaluación</strong> en situaciones complejas de aula.</span>
                            </li>
                            <li style='display:flex; align-items:start; gap:0.75rem; margin-bottom:0.75rem; color:#cbd5e1; font-size:0.85rem; line-height:1.4;'>
                                <i class='fas fa-exclamation-triangle' style='color:#fbbf24; margin-top:2px;'></i>
                                <span>Riesgo de confusión en la resolución de casuísticas de <strong>Retroalimentación Descriptiva vs Reflexiva</strong>.</span>
                            </li>
                        </ul>
                        <div style='margin-top:1.25rem; padding:1rem; background:rgba(139,92,246,0.06); border:1px dashed rgba(139,92,246,0.3); border-radius:10px;'>
                            <span style='font-weight:700; color:#c4b5fd; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.06em; display:block; margin-bottom:0.4rem;'>Estrategia de Intervención (Suscripción Avanzada)</span>
                            <p style='color:#cbd5e1; margin:0; font-size:0.85rem; line-height:1.5;'>Para desbloquear diagnósticos detallados en tiempo real generados por IA y analizar tus patrones de error específicos por competencia, adquiere una cuenta <strong>Premium Avanzada</strong>.</p>
                        </div>
                    `;
                } else if (context === 'IDIOMAS') {
                    strengths = `
                        <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Tu perfil lingüístico muestra competencias iniciales de recepción:</p>
                        <ul style='margin:0; padding:0; list-style:none;'>
                            <li style='display:flex; align-items:start; gap:0.75rem; margin-bottom:0.75rem; color:#cbd5e1; font-size:0.85rem; line-height:1.4;'>
                                <i class='fas fa-check-circle' style='color:#34d399; margin-top:2px;'></i>
                                <span>Comprensión general en ejercicios de <strong>Reading Comprehension</strong>.</span>
                            </li>
                            <li style='display:flex; align-items:start; gap:0.75rem; margin-bottom:0.75rem; color:#cbd5e1; font-size:0.85rem; line-height:1.4;'>
                                <i class='fas fa-check-circle' style='color:#34d399; margin-top:2px;'></i>
                                <span>Capacidad de identificar palabras clave en ejercicios de <strong>Listening Comprehension</strong>.</span>
                            </li>
                        </ul>
                    `;
                    weaknesses = `
                        <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Es clave potenciar el uso del idioma y la precisión estructural gramatical:</p>
                        <ul style='margin:0; padding:0; list-style:none;'>
                            <li style='display:flex; align-items:start; gap:0.75rem; margin-bottom:0.75rem; color:#cbd5e1; font-size:0.85rem; line-height:1.4;'>
                                <i class='fas fa-exclamation-triangle' style='color:#fbbf24; margin-top:2px;'></i>
                                <span>Falta de consistencia y precisión en estructuras gramaticales de <strong>Grammar & Use of English</strong>.</span>
                            </li>
                            <li style='display:flex; align-items:start; gap:0.75rem; margin-bottom:0.75rem; color:#cbd5e1; font-size:0.85rem; line-height:1.4;'>
                                <i class='fas fa-exclamation-triangle' style='color:#fbbf24; margin-top:2px;'></i>
                                <span>Vocabulario pasivo alto pero dificultades en su uso activo en <strong>Vocabulary & Context</strong>.</span>
                            </li>
                        </ul>
                        <div style='margin-top:1.25rem; padding:1rem; background:rgba(139,92,246,0.06); border:1px dashed rgba(139,92,246,0.3); border-radius:10px;'>
                            <span style='font-weight:700; color:#c4b5fd; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.06em; display:block; margin-bottom:0.4rem;'>Estrategia de Intervención (Suscripción Avanzada)</span>
                            <p style='color:#cbd5e1; margin:0; font-size:0.85rem; line-height:1.5;'>Para desbloquear diagnósticos detallados en tiempo real generados por IA y analizar tus patrones de error específicos por habilidad lingüística, adquiere una cuenta <strong>Premium Avanzada</strong>.</p>
                        </div>
                    `;
                } else { // MEDICINA (Default)
                    strengths = `
                        <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Tu perfil de rendimiento muestra fortalezas iniciales en áreas clave de la práctica médica:</p>
                        <ul style='margin:0; padding:0; list-style:none;'>
                            <li style='display:flex; align-items:start; gap:0.75rem; margin-bottom:0.75rem; color:#cbd5e1; font-size:0.85rem; line-height:1.4;'>
                                <i class='fas fa-check-circle' style='color:#34d399; margin-top:2px;'></i>
                                <span>Destreza en el diagnóstico diferencial inicial en <strong>Medicina Interna</strong>.</span>
                            </li>
                            <li style='display:flex; align-items:start; gap:0.75rem; margin-bottom:0.75rem; color:#cbd5e1; font-size:0.85rem; line-height:1.4;'>
                                <i class='fas fa-check-circle' style='color:#34d399; margin-top:2px;'></i>
                                <span>Reconocimiento rápido de guías de manejo clínico en <strong>Pediatría</strong>.</span>
                            </li>
                        </ul>
                    `;
                    weaknesses = `
                        <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Se requiere un refuerzo inmediato en áreas de alta carga de morbimortalidad y de salud pública:</p>
                        <ul style='margin:0; padding:0; list-style:none;'>
                            <li style='display:flex; align-items:start; gap:0.75rem; margin-bottom:0.75rem; color:#cbd5e1; font-size:0.85rem; line-height:1.4;'>
                                <i class='fas fa-exclamation-triangle' style='color:#fbbf24; margin-top:2px;'></i>
                                <span>Falta de precisión en la priorización de intervenciones preventivas en <strong>Salud Pública y Gestión</strong>.</span>
                            </li>
                            <li style='display:flex; align-items:start; gap:0.75rem; margin-bottom:0.75rem; color:#cbd5e1; font-size:0.85rem; line-height:1.4;'>
                                <i class='fas fa-exclamation-triangle' style='color:#fbbf24; margin-top:2px;'></i>
                                <span>Riesgo en la toma de decisiones críticas inmediatas en <strong>Ginecología y Obstetricia</strong>.</span>
                            </li>
                        </ul>
                        <div style='margin-top:1.25rem; padding:1rem; background:rgba(139,92,246,0.06); border:1px dashed rgba(139,92,246,0.3); border-radius:10px;'>
                            <span style='font-weight:700; color:#c4b5fd; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.06em; display:block; margin-bottom:0.4rem;'>Estrategia de Intervención (Suscripción Avanzada)</span>
                            <p style='color:#cbd5e1; margin:0; font-size:0.85rem; line-height:1.5;'>Para desbloquear diagnósticos detallados en tiempo real generados por IA y analizar tus patrones de error específicos por área clínica, adquiere una cuenta <strong>Premium Avanzada</strong>.</p>
                        </div>
                    `;
                }

                return res.json({ success: true, strengths, weaknesses });
            }

            console.log(`🧠 [IA MULTI-MÓDULO] Generando diagnóstico con IA para el usuario ${userId} en contexto ${context}...`);

            // Adaptar dinámicamente el prompt según el contexto
            let tutorRole = "Tutor Médico experto (Jefe de Residentes)";
            let examType = "estudiante de medicina preparando sus exámenes de titulación (ENAM, Residentado)";
            let areaLabel = "RENDIMIENTO POR ÁREAS CLÍNICAS";
            let strengthTextPrompt = "El análisis debe centrarse en el dominio clínico, razonamiento diagnóstico y precisión fisiopatológica. Las áreas van en <strong style='color:#f8fafc;'>.";
            let weaknessTextPrompt = "Centra el análisis en la urgencia y riesgo de ignorar estas áreas en la práctica clínica real.";
            let strategyTitle = "Estrategia de Intervención Recomendada";
            let strategyDescPrompt = "Tu consejo directo paramédico para subir los puntajes antes del examen final";

            if (context === 'EDUCACION') {
                tutorRole = "Asesor Pedagógico y Especialista en Currículo Nacional";
                examType = "docente preparando su examen de Nombramiento o Ascenso de Escala Magisterial";
                areaLabel = "RENDIMIENTO POR COMPETENCIAS PEDAGÓGICAS";
                strengthTextPrompt = "El análisis debe centrarse en la práctica pedagógica, teorías de aprendizaje, didáctica y resolución de casos en el aula. Las áreas van en <strong style='color:#f8fafc;'>.";
                weaknessTextPrompt = "Centra el análisis en la urgencia de dominar los procesos didácticos y normativas de evaluación formativa.";
                strategyTitle = "Estrategia Pedagógica Recomendada";
                strategyDescPrompt = "Tu consejo directo para mejorar la resolución de casos de casuística y rúbricas antes de la prueba nacional";
            } else if (context === 'IDIOMAS') {
                tutorRole = "Director de Idiomas y Evaluador Oficial del MCER";
                examType = "estudiante preparando su nivelación lingüística bajo el marco MCER";
                areaLabel = "RENDIMIENTO POR HABILIDADES LINGÜÍSTICAS (Vocabulary, Grammar, Reading, Listening)";
                strengthTextPrompt = "El análisis debe centrarse en la fluidez de lectura, precisión gramatical, rango de vocabulario y competencia auditiva. Las áreas van en <strong style='color:#f8fafc;'>.";
                weaknessTextPrompt = "Centra el análisis en las brechas gramaticales, errores de listening o vocabulario limitado según el nivel objetivo.";
                strategyTitle = "Estrategia de Aprendizaje de Idiomas";
                strategyDescPrompt = "Tu consejo directo para mejorar tus destrezas comunicativas y listening antes del simulacro oficial";
            }

            // Prompt analítico adaptado
            const prompt = `
            Actúa como un ${tutorRole}.
            Analiza el siguiente historial reciente de un ${examType}:
            
            Nota Promedio: ${stats.avg_score} / 20
            Precisión Global: ${stats.accuracy}%
            Tarjetas Repasadas y Dominadas: ${stats.mastered_cards}
            
            ${areaLabel}:
            ${JSON.stringify(stats.radar_data, null, 2)}
            
            TAREA:
            Genera un diagnóstico y análisis extremadamente detallado, analítico y profesional. Evalúa el conocimiento y destrezas demostradas. Usa un tono de mentor experimentado: alentador, estrictamente analítico, pero accionable. No hagas introducciones genéricas. Debes mencionar porcentajes reales y su impacto.
            
            JSON ESTRICTO:
            {
                "strengths": "HTML Premium sin Markdown. Usa <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'> para un resumen inicial de sus virtudes. Luego usa <ul style='margin:0; padding:0; list-style:none;'> con items <li style='display:flex; align-items:start; gap:0.75rem; margin-bottom:0.75rem; color:#cbd5e1; font-size:0.85rem; line-height:1.4;'>. Empieza cada <li...> con un div o span con el icono: <i class='fas fa-check-circle' style='color:#34d399; margin-top:2px;'></i> seguido de un span que envuelva el contenido. ${strengthTextPrompt} Menciona su precisión específica si existe.",
                "weaknesses": "Mismo formato HTML sin Markdown (Párrafo + Lista ul/li). El icono de la lista debe ser: <i class='fas fa-exclamation-triangle' style='color:#fbbf24; margin-top:2px;'></i>. ${weaknessTextPrompt} Al final de la lista de áreas, incluye OBLIGATORIAMENTE un bloque visual extra de acción así: <div style='margin-top:1.25rem; padding:1rem; background:rgba(245,158,11,0.06); border:1px dashed rgba(245,158,11,0.3); border-radius:10px;'><span style='font-weight:700; color:#fbbf24; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.06em; display:block; margin-bottom:0.4rem;'>${strategyTitle}</span><p style='color:#cbd5e1; margin:0; font-size:0.85rem; line-height:1.5;'>[${strategyDescPrompt}].</p></div>"
            }
            `;

            const activeModel = (tier === 'admin') ? modelPro : modelLite;
            console.log(`🧠 [IA MULTI-MÓDULO] Usando modelo ${ tier === 'admin' ? 'Pro/Estándar' : 'Lite' } para Tier: ${ tier } `);

            const result = await activeModel.generateContent(prompt);
            const text = result.response.candidates[0].content.parts[0].text;

            let diagnostic;
            try {
                diagnostic = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

                // 💸 DESCONTAR LÍMITE (Chat Standard Diario)
                try {
                    const db = require('../../infrastructure/database/db');
                    if (req.usageType) {
                        await db.query(
                            `UPDATE users SET ${req.usageType} = ${req.usageType} + 1 WHERE id = $1`,
                            [userId]
                        );
                        console.log(`📉 Límite de ${req.usageType} incrementado para usuario ${userId}. (DIAGNÓSTICO EXITOSO)`);
                    }
                } catch (limitErr) {
                    console.error("⚠️ No se pudo actualizar el límite. Continuando...", limitErr);
                }

            } catch(err) {
                console.error("❌ Fallo parseando el JSON del Diagnóstico", err);
                diagnostic = {
                    strengths: "Tus datos base son sólidos, sigue practicando.",
                    weaknesses: "Hubo un pequeño error procesando tus áreas débiles, intenta más tarde. (No se consumió cuota)"
                };
            }

            res.json({ success: true, ...diagnostic });

} catch (error) {
    console.error('❌ Error en getAIDiagnostic:', error);
    res.status(500).json({ error: 'Hubo un problema generando tu diagnóstico con IA.' });
}
    }

    // ==========================================
    // NUEVO: CONTROLADORES DE TRÁFICO REAL-TIME
    // ==========================================

    async recordPulse(req, res) {
    try {
        const { sessionId, isMobile } = req.body;
        const userId = req.user ? req.user.id : null;

        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId es requerido.' });
        }

        await this.analyticsService.logPulse(sessionId, userId, isMobile);
        res.status(204).send();
    } catch (error) {
        // ✅ CORRECCIÓN: Si es un error de red (DNS/Conexión), logeamos un warning silencioso
        // Esto evita que el servidor se llene de errores rojos por micro-cortes de internet.
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.syscall === 'getaddrinfo') {
            console.warn('⚠️ Pulso de tráfico omitido temporalmente por inestabilidad de red (DNS/Supabase).');
        } else {
            console.error('❌ Error registrando pulso:', error);
        }
        // Respondemos 200/204 de todos modos para no afectar al frontend
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