class LanguageChatController {
    constructor(languageChatService, usageService) {
        console.log('🔄 Inicializando LanguageChatController con Service...');
        this.languageChatService = languageChatService;
        this.usageService = usageService;
        this.processChat = this.processChat.bind(this);
        console.log('✅ LanguageChatController con Service inicializado');
    }
    
    /**
     * Procesa un mensaje de conversación de idiomas delegando al servicio.
     */
    async processChat(req, res) {
        try {
            const { message, languageCode = 'en-US', cefrLevel = 'B1', history = [] } = req.body;
            const userId = req.user.id;
            
            if (!message || message.trim() === '') {
                return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
            }
            
            const jsonResponse = await this.languageChatService.processChat(message, languageCode, cefrLevel, history);

            // 📉 ACTUALIZAR LÍMITES DE USO IA (Descontar vidas si es free/pending)
            try {
                if (req.usageType === 'usage_count') {
                    // Chat de Idiomas (gratuito) consume 1 vida
                    await this.usageService.checkAndIncrementUsage(userId, 'usage_count', 1);
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
}

module.exports = LanguageChatController;
