const selfEvaluationService = require('../../domain/services/selfEvaluationService');
const selfEvaluationRepository = require('../../domain/repositories/selfEvaluationRepository');
const BookRepository = require('../../domain/repositories/bookRepository');
const bookRepo = new BookRepository();

class SelfEvaluationController {

    /**
     * POST /api/self-evaluation/start
     * Genera un quiz de aprendizaje activo dinámico, sin guardar en base de datos.
     */
    async startGame(req, res) {
        try {
            const { resourceId, topic, count = 5, difficulty = 'intermediate' } = req.body;
            const user = req.user;

            if (!user || !user.id) {
                return res.status(401).json({ error: 'Usuario no autenticado correctamente.' });
            }

            console.log(`⚔️ Iniciando Dynamic Quiz Autoevaluación para ${user.name} (ID: ${user.id}) | ResourceId: ${resourceId}`);

            let questions = [];

            if (resourceId) {
                // Modo Recurso: Obtener recurso y generar preguntas
                const resource = await bookRepo.findById(resourceId);
                if (!resource) {
                    return res.status(404).json({ error: 'Recurso no encontrado.' });
                }
                questions = await selfEvaluationService.generateQuizFromResource(
                    resource.title,
                    resource.content_html,
                    count,
                    difficulty,
                    resource.url,
                    resource.domain
                );
            } else {
                // Modo Fallback (Sin DB, solo AI pura)
                questions = await selfEvaluationService.generateGeneralQuestionsAI(
                    [topic || 'Cultura General'],
                    5,
                    user.subscriptionTier
                );
            }

            // Incrementar contadores en base de datos de forma segura usando el repositorio
            try {
                if (req.usageType === 'usage_count') {
                    // Para Free: descontar vida global Y aumentar contador diario de autoevaluación (15/día)
                    await selfEvaluationRepository.incrementUsageCountAndDailyEvaluation(user.id);
                    console.log(`📉 Cuotas actualizadas para Free User ${user.id} (+1 usage_count, +1 daily_arena_usage).`);
                } else if (req.usageType === 'daily_arena_usage') {
                    // Para Premium: solo aumentar contador diario de autoevaluación (15/día)
                    await selfEvaluationRepository.incrementDailyEvaluationOnly(user.id);
                    console.log(`📉 Cuotas actualizadas para Premium User ${user.id} (+1 daily_arena_usage).`);
                }
            } catch (limitErr) {
                console.error("⚠️ No se pudo actualizar el límite del usuario para autoevaluación:", limitErr.message);
            }

            res.json({
                success: true,
                gameId: Date.now().toString(),
                lives: 3,
                timePerQuestion: 20,
                questions: questions.map(q => {
                    const originalOptions = [...q.options];
                    const correctAnswerText = originalOptions[q.correct_option_index];
                    
                    // Mezclar de forma aleatoria (Fisher-Yates)
                    const shuffledOptions = [...originalOptions];
                    for (let i = shuffledOptions.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        const temp = shuffledOptions[i];
                        shuffledOptions[i] = shuffledOptions[j];
                        shuffledOptions[j] = temp;
                    }
                    
                    const newCorrectAnswerIdx = shuffledOptions.indexOf(correctAnswerText);
                    
                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        question: q.question_text,
                        options: shuffledOptions,
                        correctAnswer: newCorrectAnswerIdx !== -1 ? newCorrectAnswerIdx : q.correct_option_index,
                        explanation: q.explanation,
                        image_url: q.image_url,
                        explanation_image_url: q.explanation_image_url
                    };
                })
            });

        } catch (error) {
            console.error('❌ Error en SelfEvaluationController.startGame:', error);
            res.status(500).json({ error: 'Error iniciando desafío.' });
        }
    }

    /**
     * POST /api/self-evaluation/questions
     * Genera un lote de preguntas extra (Infinite Mode Dinámico).
     */
    async getQuestions(req, res) {
        try {
            await this.startGame(req, res);
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo preguntas extra.' });
        }
    }

    /**
     * POST /api/self-evaluation/submit
     * No guarda nada en base de datos.
     */
    async submitScore(req, res) {
        res.json({
            success: true,
            message: 'Score procesado (In-memory)',
            rank: 'N/A'
        });
    }

    /**
     * GET /api/self-evaluation/ranking
     * Devuelve una lista vacía ya que se ha eliminado el ranking global competitivo.
     */
    async getRanking(req, res) {
        res.json({
            success: true,
            leaderboard: []
        });
    }

    /**
     * GET /api/self-evaluation/stats
     * Devuelve estadísticas vacías al no existir persistencia.
     */
    async getUserStats(req, res) {
        res.json({
            success: true,
            stats: {
                highScore: 0,
                totalGames: 0
            }
        });
    }
}

module.exports = new SelfEvaluationController();
