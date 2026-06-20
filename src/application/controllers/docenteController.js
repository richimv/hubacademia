const docenteService = require('../../domain/services/docenteService');
const UsageService = require('../../domain/services/usageService');
const usageService = new UsageService();

class DocenteController {

    async startQuiz(req, res) {
        try {
            const { target, areas, round = 1, limit = 5, topic, career, difficulty, mode } = req.body;
            const user = req.user;

            const finalTarget = target || 'ASCENSO';
            const finalCareer = career || 'EBR - Primaria';
            let finalAreas = (areas && areas.length > 0) ? areas : (topic ? [topic] : []);

            if (!finalAreas || finalAreas.length === 0) {
                return res.status(400).json({ error: 'Debes configurar tu examen (áreas y especialidad) antes de comenzar.' });
            }

            const tier = String(user.subscriptionTier || 'free').toLowerCase();
            const status = (user.subscriptionStatus || 'pending').toLowerCase();
            const isPremium = (['basic', 'advanced'].includes(tier) && status === 'active') || user.role === 'admin';

            if (round === 1 && !isPremium) {
                const usageCheck = await usageService.checkAndIncrementUsage(user.id);
                if (!usageCheck.allowed) {
                    return res.status(403).json({
                        error: 'Has alcanzado tu límite de acciones gratuitas.',
                        limitReached: true,
                        usage: usageCheck.usage,
                        limit: usageCheck.limit
                    });
                }
            }

            if (round > 2 && !isPremium) {
                return res.status(403).json({
                    error: 'Los niveles Profesional y Experto son exclusivos de usuarios Premium.',
                    premiumLock: true
                });
            }

            console.log(`🎮 Generando Ronda ${round} de ${finalTarget} para ${user.name}. Limit: ${limit}`);

            const categoryOptions = { target: finalTarget, areas: finalAreas, career: finalCareer, difficulty, mode };
            const quizData = await docenteService.generateQuiz(categoryOptions, user.id, limit, user.subscriptionTier);

            const returnedTopic = quizData.topic || finalAreas[0];
            const logTopic = finalAreas.length > 1 ? `Multi-Área (${finalAreas.length} áreas)` : returnedTopic;
            console.log(`✅ Quiz Generado. Tema Real: ${logTopic} en Target: ${finalTarget}`);

            res.json({
                success: true,
                topic: returnedTopic,
                areas: quizData.areas || finalAreas,
                round: round,
                questions: quizData.questions,
                isPremium: isPremium,
                source: quizData.source
            });

        } catch (error) {
            console.error('❌ [Error] startQuiz (Docente):', error);

            if (error.message === "AI_REPLENISHMENT_FAILED" || error.message === "AI_GENERATION_EMPTY") {
                return res.status(500).json({
                    success: false,
                    error: "Hubo un problema técnico al generar nuevas preguntas de IA. Por favor, intenta de nuevo en unos segundos.",
                    technicalError: true
                });
            }

            if (error.message === "BANK_EXHAUSTED_AND_IA_FAILED") {
                return res.status(404).json({
                    success: false,
                    error: "Has completado todas las preguntas disponibles para este tema.",
                    noQuestions: true
                });
            }

            return res.status(500).json({ success: false, error: error.message });
        }
    }

    async submitScore(req, res) {
        try {
            const { topic, areas, target, difficulty, career, score, correct_answers_count, total_questions, rounds_completed, questions } = req.body;
            const userId = req.user.id;

            if (score === undefined || !topic) {
                return res.status(400).json({ error: 'Datos de puntaje incompletos.' });
            }

            const result = await docenteService.submitQuizResult(userId, {
                topic,
                areas,
                target,
                career,
                difficulty,
                score,
                totalQuestions: total_questions || 10,
                questions: questions || []
            });

            const tier = String(req.user.subscriptionTier || 'free').toLowerCase();
            const isActiveAccount = req.user.subscriptionStatus === 'active';

            if (isActiveAccount && ['basic', 'advanced'].includes(tier)) {
                try {
                    await docenteService.incrementUserSimulatorUsage(userId);
                    console.log(`📉 [Simulator Limit] +1 Simulator Usage (Culminación) para Premium: ${req.user.email}`);
                } catch (limitErr) {
                    console.error("⚠️ Error incrementando uso de simulador al culminar (Docente):", limitErr);
                }
            }

            res.json({
                success: true,
                message: 'Puntaje registrado exitosamente.',
                attemptId: result.attemptId,
                flashcardsCreated: result.flashcardsCreated
            });

        } catch (error) {
            console.error('Error en submitScore (Docente):', error);
            res.status(500).json({ error: 'Error guardando el puntaje.' });
        }
    }

    async getStats(req, res) {
        try {
            const { context, target, limit, days, areas, career } = req.query;
            const areaList = areas ? areas.split(',') : null;

            if (!req.user) {
                const exampleKpis = {
                    avg_score: "14.5",
                    accuracy: 72,
                    total_correct: 145,
                    total_incorrect: 55,
                    mastered_cards: 12,
                    strongest_topic: "Enfoque por competencias",
                    weakest_topic: "Características y desarrollo del estudiante",
                    radar_data: [
                        { subject: "Enfoque por competencias", accuracy: 88, correct: 42, total: 48 },
                        { subject: "Constructivismo y socioconstructivismo", accuracy: 75, correct: 36, total: 48 },
                        { subject: "Planificación pedagógica", accuracy: 68, correct: 32, total: 47 },
                        { subject: "Evaluación formativa y retroalimentación", accuracy: 62, correct: 28, total: 45 },
                        { subject: "Convivencia democrática y clima de aula", accuracy: 55, correct: 22, total: 40 },
                        { subject: "Características y desarrollo del estudiante", accuracy: 50, correct: 20, total: 40 }
                    ],
                    system_deck_id: "example-deck",
                    isGuest: true
                };
                return res.json({ success: true, kpis: exampleKpis });
            }

            const kpis = await docenteService.getUserQuizStats(req.user.id, context || 'EDUCACION', target, limit, days, areaList, career);
            res.json({ success: true, kpis });
        } catch (error) {
            console.error('Error en getStats (Docente):', error);
            res.status(500).json({ error: 'Error obteniendo estadísticas.' });
        }
    }

    async getEvolution(req, res) {
        try {
            const { context, target, limit, days, areas, career } = req.query;
            const areaList = areas ? areas.split(',') : null;

            if (!req.user) {
                const exampleChart = {
                    labels: ["Sesión 1", "Sesión 2", "Sesión 3"],
                    scores: ["14.0", "15.5", "16.0"]
                };
                return res.json({ success: true, chart: exampleChart });
            }

            const userId = req.user.id;
            const docenteRepository = require('../../domain/repositories/docenteRepository');

            let timeFilter = '';
            if (days) {
                timeFilter = ` AND created_at >= NOW() - INTERVAL '${parseInt(days)} days'`;
            }

            const data = await docenteRepository.getQuizEvolution(userId, target, limit, timeFilter, areaList, career);
            const chartData = {
                labels: data.map(d => d.date_label),
                scores10: data.map(d => d.total_questions === 10 ? parseFloat(d.score_20).toFixed(1) : null),
                scores20: data.map(d => d.total_questions === 20 ? parseFloat(d.score_20).toFixed(1) : null),
                scoresReal: data.map(d => (d.total_questions !== 10 && d.total_questions !== 20) ? parseFloat(d.score_20).toFixed(1) : null),
                scores: data.map(d => parseFloat(d.score_20).toFixed(1))
            };

            res.json({ success: true, chart: chartData });
        } catch (error) {
            console.error('Error fetching evolution (Docente):', error);
            res.status(500).json({ error: 'Error obteniendo evolución.' });
        }
    }

    async getLeaderboard(req, res) {
        try {
            const resultRows = await docenteService.getLeaderboard();
            res.json({ success: true, leaderboard: resultRows });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error leaderboard' });
        }
    }

    async getNextBatch(req, res) {
        try {
            const { target, areas, difficulty, topic, career, seenIds, mode } = req.body;
            const userId = req.user.id;

            const finalTarget = target || 'ASCENSO';
            const finalCareer = career || 'EBR - Primaria';
            let finalAreas = (areas && areas.length > 0) ? areas : (topic ? [topic] : []);

            if (!finalAreas || finalAreas.length === 0) {
                return res.status(400).json({ error: 'Configuración de áreas no encontrada.' });
            }

            const result = await docenteService.generateQuiz(
                { target: finalTarget, areas: finalAreas, career: finalCareer, difficulty, mode },
                userId,
                5,
                req.user.subscriptionTier,
                seenIds || []
            );

            res.json({
                success: true,
                questions: result.questions,
                areas: result.areas || finalAreas,
                source: result.source
            });

        } catch (error) {
            console.error('❌ [Error] getNextBatch (Docente):', error);
            if (error.message && error.message.includes("No hay preguntas disponibles")) {
                return res.status(404).json({ error: error.message, noQuestions: true });
            }
            res.status(500).json({ error: 'Error cargando más preguntas.' });
        }
    }

    async getDemoQuestions(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const excludeIds = req.query.excludeIds 
                ? req.query.excludeIds.split(',').filter(id => id && id.length > 30)
                : [];
            
            const docenteRepository = require('../../domain/repositories/docenteRepository');
            const questions = await docenteRepository.getRandomDemoQuestions(limit, excludeIds, 'ASCENSO');

            res.json({
                success: true,
                questions: questions,
                topic: `DEMO: ASCENSO`,
                isPremium: false,
                source: 'BANK'
            });
        } catch (error) {
            console.error('Error fetching demo questions (Docente):', error);
            res.status(500).json({ error: 'Error cargando preguntas de demostración.' });
        }
    }
}

module.exports = new DocenteController();
