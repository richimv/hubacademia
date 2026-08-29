const medicoService = require('../../domain/services/medicoService');
const quizSessionService = require('../../domain/services/quizSessionService');
const { secureQuizSessionsEnabled, sendQuizSessionError } = require('./quizSessionControllerSupport');
const UsageService = require('../../domain/services/usageService');
const usageService = new UsageService();
const { LIMITS } = require('../../infrastructure/config/limits');

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

            if (isPremium && user.role !== 'admin' && round === 1) {
                const userLimits = LIMITS[tier] || LIMITS.basic;
                const simCap = userLimits.simulator || 15;
                const dailySimUsage = user.dailySimulatorUsage || user.daily_simulator_usage || 0;
                if (dailySimUsage >= simCap) {
                    return res.status(403).json({
                        error: `Has alcanzado tu límite diario de simulacros (${simCap}/día). Vuelve mañana o mejora tu plan para continuar practicando.`,
                        limitReached: true,
                        paywall: tier === 'basic'
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
            const secureSession = secureQuizSessionsEnabled()
                ? await quizSessionService.createSession({ userId: user.id, domain: 'medicine', questions: quizData.questions })
                : null;

            const returnedTopic = quizData.topic || finalAreas[0];
            const logTopic = finalAreas.length > 1 ? `Multi-Área (${finalAreas.length} áreas)` : returnedTopic;
            console.log(`✅ Quiz Generado. Tema Real: ${logTopic} en Target: ${finalTarget}`);

            res.json({
                success: true,
                topic: returnedTopic,
                areas: quizData.areas || finalAreas,
                round: round,
                quizSessionId: secureSession?.quizSessionId || null,
                quizSessionExpiresAt: secureSession?.expiresAt || null,
                questions: secureSession?.questions || quizData.questions,
                isPremium: isPremium,
                source: quizData.source
            });

        } catch (error) {
            console.error('❌ [Error] startQuiz (Medico):', error);
            if (sendQuizSessionError(res, error)) return;
            if (error.cause) {
                console.error('🔍 [Causa Original]:', error.cause);
            }

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
            const { quizSessionId, topic, areas, target, difficulty, career, score, total_questions, questions } = req.body;
            const userId = req.user.id;

            if (!topic || (!quizSessionId && score === undefined)) {
                return res.status(400).json({ error: 'Datos de puntaje incompletos.' });
            }

            if (quizSessionId && !secureQuizSessionsEnabled()) {
                return res.status(409).json({ error: 'El flujo seguro del simulador aún no está habilitado.' });
            }

            const grading = quizSessionId
                ? await quizSessionService.gradeForSubmission({ sessionId: quizSessionId, userId, domain: 'medicine' })
                : null;

            const result = await medicoService.submitQuizResult(userId, {
                topic,
                areas,
                target,
                career,
                difficulty,
                score: grading?.score ?? score,
                totalQuestions: grading?.totalQuestions ?? total_questions ?? 10,
                questions: grading?.questions || questions || [],
                sourceSessionId: grading?.sessionId || null
            });

            if (grading) {
                await quizSessionService.markSubmitted(grading.sessionId, result.attemptId);
            }

            const tier = String(req.user.subscriptionTier || 'free').toLowerCase();
            const isActiveAccount = req.user.subscriptionStatus === 'active';

            if (result.wasCreated !== false && isActiveAccount && ['basic', 'advanced'].includes(tier)) {
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
                flashcardsCreated: result.flashcardsCreated,
                score: grading?.score ?? score,
                totalQuestions: grading?.totalQuestions ?? total_questions
            });

        } catch (error) {
            console.error('Error en submitScore (Medico):', error);
            if (sendQuizSessionError(res, error)) return;
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

            const kpis = await medicoService.getUserQuizStats(req.user.id, context || 'MEDICINA', target, limit, days, areaList, career);
            res.json({ success: true, kpis });
        } catch (error) {
            console.error('Error en getStats (Medico):', error);
            res.status(500).json({ error: 'Error obteniendo estadísticas.' });
        }
    }

    async getEvolution(req, res) {
        try {
            const { context, target, limit, days, areas, career } = req.query;
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

            const data = await medicoRepository.getQuizEvolution(userId, target, limit, timeFilter, areaList, career);
            const chartData = {
                labels: data.map(d => d.date_label),
                scores10: data.map(d => (d.total_questions <= 15) ? parseFloat(d.score_20).toFixed(1) : null),
                scores20: data.map(d => (d.total_questions > 15 && d.total_questions < 50) ? parseFloat(d.score_20).toFixed(1) : null),
                scoresReal: data.map(d => (d.total_questions >= 50) ? parseFloat(d.score_20).toFixed(1) : null),
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
            const { quizSessionId, target, areas, difficulty, topic, career, seenIds, mode } = req.body;
            const userId = req.user.id;

            if (secureQuizSessionsEnabled() && !quizSessionId) {
                return res.status(400).json({ error: 'Identificador de sesión requerido.' });
            }

            const finalTarget = target || 'SERUMS';
            const finalCareer = career || 'Medicina Humana';
            let finalAreas = (areas && areas.length > 0) ? areas : (topic ? [topic] : []);

            if (!finalAreas || finalAreas.length === 0) {
                return res.status(400).json({ error: 'Configuración de áreas no encontrada.' });
            }

            const batchLimit = parseInt(req.body.limit, 10) || 10;
            const result = await medicoService.generateQuiz(
                { target: finalTarget, areas: finalAreas, career: finalCareer, difficulty, mode, configType: req.body.configType },
                userId,
                batchLimit,
                req.user.subscriptionTier,
                seenIds || []
            );
            const secureQuestions = secureQuizSessionsEnabled() && quizSessionId
                ? await quizSessionService.appendQuestions({
                    sessionId: quizSessionId,
                    userId,
                    domain: 'medicine',
                    questions: result.questions
                })
                : null;

            res.json({
                success: true,
                quizSessionId: quizSessionId || null,
                questions: secureQuestions || result.questions,
                areas: result.areas || finalAreas,
                source: result.source
            });

        } catch (error) {
            console.error('❌ [Error] getNextBatch (Medico):', error);
            if (sendQuizSessionError(res, error)) return;
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
            
            const target = req.query.target || 'SERUMS';
            const career = req.query.career || null;
            const difficulty = req.query.difficulty || null;
            const areas = req.query.areas || null;

            const medicoRepository = require('../../domain/repositories/medicoRepository');
            const questions = await medicoRepository.getRandomDemoQuestions(limit, excludeIds, target, career, difficulty, areas);
            const secureSession = secureQuizSessionsEnabled()
                ? await quizSessionService.createSession({
                    userId: req.user?.id || null,
                    domain: 'medicine',
                    questions
                })
                : null;

            res.json({
                success: true,
                quizSessionId: secureSession?.quizSessionId || null,
                quizSessionExpiresAt: secureSession?.expiresAt || null,
                questions: secureSession?.questions || questions,
                topic: `DEMO: ${target}`,
                isPremium: false,
                source: 'BANK'
            });
        } catch (error) {
            console.error('Error fetching demo questions (Medico):', error);
            if (sendQuizSessionError(res, error)) return;
            res.status(500).json({ error: 'Error cargando preguntas de demostración.' });
        }
    }

    async answerQuestion(req, res) {
        try {
            if (!secureQuizSessionsEnabled()) {
                return res.status(404).json({ error: 'Flujo seguro no habilitado.' });
            }
            const { quizSessionId, sessionQuestionId, selectedOptionIndex } = req.body;
            const answer = await quizSessionService.recordAnswer({
                sessionId: quizSessionId,
                sessionQuestionId,
                selectedOptionIndex,
                userId: req.user?.id || null,
                domain: 'medicine'
            });
            res.json({ success: true, answer });
        } catch (error) {
            console.error('Error registrando respuesta (Medico):', error);
            if (sendQuizSessionError(res, error)) return;
            res.status(500).json({ error: 'Error registrando la respuesta.' });
        }
    }
}

module.exports = new MedicoController();
