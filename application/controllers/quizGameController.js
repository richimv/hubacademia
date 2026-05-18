const TrainingService = require('../../domain/services/trainingService');
const BookRepository = require('../../domain/repositories/bookRepository');
const bookRepo = new BookRepository();
const UsageService = require('../../domain/services/usageService');
const usageService = new UsageService();

class QuizGameController {

    /**
     * POST /api/arena/start
     * Genera un quiz de aprendizaje activo dinámico, sin guardar en base de datos.
     */
    async startGame(req, res) {
        try {
            const { resourceId, topic, count = 5, difficulty = 'intermediate' } = req.body;
            const user = req.user;

            if (!user || !user.id) {
                return res.status(401).json({ error: 'Usuario no autenticado correctamente.' });
            }

            // La validación de límites (tanto cuota de vidas de Free como el tope diario de 15)
            // ya fue realizada de forma centralizada por el middleware checkAILimits('self_evaluation')

            console.log(`⚔️ Iniciando Dynamic Quiz Arena para ${user.name} (ID: ${user.id}) | ResourceId: ${resourceId}`);

            let questions = [];

            if (resourceId) {
                // Modo Recurso: Obtener recurso y generar preguntas
                const resource = await bookRepo.findById(resourceId);
                if (!resource) {
                    return res.status(404).json({ error: 'Recurso no encontrado.' });
                }
                questions = await TrainingService.generateQuizFromResource(resource.title, resource.content_html, count, difficulty, resource.url, resource.domain);
            } else {
                // Modo Fallback (Sin DB, solo AI pura)
                questions = await TrainingService.generateGeneralQuestionsAI([topic || 'Cultura General'], 5, user.subscriptionTier);
            }

            // Incrementar contadores en base de datos de forma segura
            try {
                const pool = require('../../infrastructure/database/db');
                if (req.usageType === 'usage_count') {
                    // Para Free: descontar vida global Y aumentar contador diario de autoevaluación (15/día)
                    await pool.query(
                        `UPDATE users SET usage_count = usage_count + 1, daily_arena_usage = daily_arena_usage + 1 WHERE id = $1`, 
                        [user.id]
                    );
                    console.log(`📉 Cuotas actualizadas para Free User ${user.id} (+1 usage_count, +1 daily_arena_usage).`);
                } else if (req.usageType === 'daily_arena_usage') {
                    // Para Premium: solo aumentar contador diario de autoevaluación (15/día)
                    await pool.query(
                        `UPDATE users SET daily_arena_usage = daily_arena_usage + 1 WHERE id = $1`, 
                        [user.id]
                    );
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
            console.error('❌ Error en QuizGameController.startGame:', error);
            res.status(500).json({ error: 'Error iniciando desafío.' });
        }
    }

    /**
     * POST /api/arena/questions
     * Genera un lote de preguntas extra (Infinite Mode Dinámico).
     */
    async getQuestions(req, res) {
        try {
            // Reutilizamos la misma lógica de generación dinámica sin persistencia
            this.startGame(req, res);
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo preguntas extra.' });
        }
    }

    /**
     * POST /api/arena/submit
     * No guarda nada en base de datos.
     */
    async submitScore(req, res) {
        // Al no existir tabla persistente de "Arena", devolvemos un estado de éxito simulado
        res.json({
            success: true,
            message: 'Score procesado (In-memory)',
            rank: 'N/A'
        });
    }

    /**
     * GET /api/arena/ranking
     * Devuelve una lista vacía ya que se ha eliminado el ranking global competitivo.
     */
    async getRanking(req, res) {
        res.json({
            success: true,
            leaderboard: []
        });
    }

    /**
     * GET /api/arena/stats
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

module.exports = new QuizGameController();
