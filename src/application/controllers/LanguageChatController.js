class LanguageChatController {
    constructor(languageChatService, usageService) {
        console.log('🔄 Inicializando LanguageChatController con Service...');
        this.languageChatService = languageChatService;
        this.usageService = usageService;
        this.processChat = this.processChat.bind(this);
        this.getPracticeExercise = this.getPracticeExercise.bind(this);
        this.evaluatePracticeAnswer = this.evaluatePracticeAnswer.bind(this);
        console.log('✅ LanguageChatController con Service inicializado');
    }
    
    /**
     * Procesa un mensaje de conversación de idiomas delegando al servicio.
     */
    async processChat(req, res) {
        try {
            const { message, languageCode = 'en-US', cefrLevel = 'B1', history = [], listeningMode = false } = req.body;
            const userId = req.user.id;
            
            if (!message || message.trim() === '') {
                 return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
            }
            
            const jsonResponse = await this.languageChatService.processChat(message, languageCode, cefrLevel, history, listeningMode);

            // 📉 ACTUALIZAR LÍMITES DE USO IA (Descontar vidas si es free/pending)
            try {
                if (req.usageType === 'usage_count') {
                    // Chat de Idiomas (gratuito) consume 1 vida
                    await this.usageService.checkAndIncrementUsage(userId, 1);
                    console.log(`📉 Límite de usage_count incrementado (+1) para usuario ${userId} en Chat de Idiomas.`);
                } else if (req.usageType) {
                    const pool = require('../../infrastructure/database/db');
                    await pool.query(`UPDATE users SET ${req.usageType} = ${req.usageType} + 1 WHERE id = $1`, [userId]);
                }
            } catch (limitErr) {
                console.error("⚠️ No se pudo actualizar el límite del usuario en Chat de Idiomas:", limitErr.message);
            }

            return res.json(jsonResponse);
        } catch (error) {
            console.error("❌ Error en LanguageChatController.processChat:", error);
            if (error.message === 'AI_PARSE_ERROR') {
                return res.status(500).json({ error: 'Error al procesar la respuesta de la IA' });
            }
            return res.status(500).json({ error: 'Ocurrió un error inesperado al procesar la conversación' });
        }
    }

    async getPracticeExercise(req, res) {
        try {
            const { languageCode = 'en-US', cefrLevel = 'A1', caseType = 'random', inputMode = 'voice', excludeList = [] } = req.body;
            
            const exercise = await this.languageChatService.generatePracticeExercise(languageCode, cefrLevel, caseType, inputMode, excludeList);
            return res.json(exercise);
        } catch (error) {
            console.error("❌ Error en LanguageChatController.getPracticeExercise:", error);
            return res.status(500).json({ error: 'Ocurrió un error al obtener el ejercicio' });
        }
    }

    /**
     * Evalúa la respuesta de traducción/speaking del usuario.
     */
    async evaluatePracticeAnswer(req, res) {
        try {
            const { exercise, userAnswer, inputMode = 'text' } = req.body;
            
            if (!exercise || userAnswer === undefined) {
                return res.status(400).json({ error: 'Faltan parámetros requeridos para la evaluación' });
            }
            
            const evaluation = await this.languageChatService.evaluatePracticeAnswer(exercise, userAnswer, inputMode);

            // 📉 ACTUALIZAR LÍMITES DE USO IA (Descontar vidas si es free/pending)
            try {
                const userId = req.user.id;
                if (req.usageType === 'usage_count') {
                    await this.usageService.checkAndIncrementUsage(userId, 1);
                } else if (req.usageType) {
                    const pool = require('../../infrastructure/database/db');
                    await pool.query(`UPDATE users SET ${req.usageType} = ${req.usageType} + 1 WHERE id = $1`, [userId]);
                }
            } catch (limitErr) {
                console.error("⚠️ No se pudo actualizar el límite del usuario en Práctica de Speaking:", limitErr.message);
            }

            return res.json(evaluation);
        } catch (error) {
            console.error("❌ Error en LanguageChatController.evaluatePracticeAnswer:", error);
            if (error.message === 'AI_PARSE_ERROR') {
                return res.status(500).json({ error: 'Error al evaluar la respuesta' });
            }
            return res.status(500).json({ error: 'Ocurrió un error al procesar la evaluación' });
        }
    }
}

module.exports = LanguageChatController;
