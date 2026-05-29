const medicoService = require('../../domain/services/medicoService');
const UsageService = require('../../domain/services/usageService');
const usageService = new UsageService();

class MedicoController {

    async startQuiz(req, res) {
        try {
            const { target, areas, round = 1, limit = 5, topic, career, difficulty, mode } = req.body;
            const user = req.user;

            const finalTarget = target || 'SERUMS';
            const finalCareer = career || 'Medicina Humana';
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
            const quizData = await medicoService.generateQuiz(categoryOptions, user.id, limit, user.subscriptionTier);

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
            console.error('❌ [Error] startQuiz (Medico):', error);

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

            const result = await medicoService.submitQuizResult(userId, {
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
                    await medicoService.incrementUserSimulatorUsage(userId);
                    console.log(`📉 [Simulator Limit] +1 Simulator Usage (Culminación) para Premium: ${req.user.email}`);
                } catch (limitErr) {
                    console.error("⚠️ Error incrementando uso de simulador al culminar (Medico):", limitErr);
                }
            }

            res.json({
                success: true,
                message: 'Puntaje registrado exitosamente.',
                attemptId: result.attemptId,
                flashcardsCreated: result.flashcardsCreated
            });

        } catch (error) {
            console.error('Error en submitScore (Medico):', error);
            res.status(500).json({ error: 'Error guardando el puntaje.' });
        }
    }

    async getStats(req, res) {
        try {
            const { context, target, limit, days, areas } = req.query;
            const areaList = areas ? areas.split(',') : null;

            if (!req.user) {
                const exampleKpis = {
                    avg_score: "14.5",
                    accuracy: 72,
                    total_correct: 145,
                    total_incorrect: 55,
                    mastered_cards: 12,
                    strongest_topic: "Cardiología",
                    weakest_topic: "Nefrología",
                    radar_data: [
                        { subject: "Cardiología", accuracy: 85, correct: 40, total: 47 },
                        { subject: "Pediatría", accuracy: 70, correct: 35, total: 50 },
                        { subject: "Ginecología", accuracy: 65, correct: 30, total: 46 },
                        { subject: "Cirugía", accuracy: 60, correct: 25, total: 41 },
                        { subject: "Nefrología", accuracy: 40, correct: 15, total: 37 }
                    ],
                    system_deck_id: "example-deck",
                    isGuest: true
                };
                return res.json({ success: true, kpis: exampleKpis });
            }

            const kpis = await medicoService.getUserQuizStats(req.user.id, context || 'MEDICINA', target, limit, days, areaList);
            res.json({ success: true, kpis });
        } catch (error) {
            console.error('Error en getStats (Medico):', error);
            res.status(500).json({ error: 'Error obteniendo estadísticas.' });
        }
    }

    async getEvolution(req, res) {
        try {
            const { context, target, limit, days, areas } = req.query;
            const areaList = areas ? areas.split(',') : null;

            if (!req.user) {
                const exampleChart = {
                    labels: ["1 Mar", "2 Mar", "3 Mar", "4 Mar", "5 Mar"],
                    scores: ["12.0", "13.5", "12.8", "15.0", "14.5"]
                };
                return res.json({ success: true, chart: exampleChart });
            }

            const userId = req.user.id;
            const medicoRepository = require('../../domain/repositories/medicoRepository');

            let timeFilter = '';
            if (days) {
                timeFilter = ` AND created_at >= NOW() - INTERVAL '${parseInt(days)} days'`;
            }

            const data = await medicoRepository.getQuizEvolution(userId, target, limit, timeFilter, areaList);
            const chartData = {
                labels: data.map(d => d.date_label),
                scores10: data.map(d => d.total_questions === 10 ? parseFloat(d.score_20).toFixed(1) : null),
                scores20: data.map(d => d.total_questions === 20 ? parseFloat(d.score_20).toFixed(1) : null),
                scoresReal: data.map(d => (d.total_questions !== 10 && d.total_questions !== 20) ? parseFloat(d.score_20).toFixed(1) : null),
                scores: data.map(d => parseFloat(d.score_20).toFixed(1))
            };

            res.json({ success: true, chart: chartData });
        } catch (error) {
            console.error('Error fetching evolution (Medico):', error);
            res.status(500).json({ error: 'Error obteniendo evolución.' });
        }
    }

    async getLeaderboard(req, res) {
        try {
            const resultRows = await medicoService.getLeaderboard();
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

            const finalTarget = target || 'SERUMS';
            const finalCareer = career || 'Medicina Humana';
            let finalAreas = (areas && areas.length > 0) ? areas : (topic ? [topic] : []);

            if (!finalAreas || finalAreas.length === 0) {
                return res.status(400).json({ error: 'Configuración de áreas no encontrada.' });
            }

            const result = await medicoService.generateQuiz(
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
            console.error('❌ [Error] getNextBatch (Medico):', error);
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
            
            const medicoRepository = require('../../domain/repositories/medicoRepository');
            const questions = await medicoRepository.getRandomDemoQuestions(limit, excludeIds, 'SERUMS');

            res.json({
                success: true,
                questions: questions,
                topic: `DEMO: SERUMS`,
                isPremium: false,
                source: 'BANK'
            });
        } catch (error) {
            console.error('Error fetching demo questions (Medico):', error);
            res.status(500).json({ error: 'Error cargando preguntas de demostración.' });
        }
    }
}

module.exports = new MedicoController();
