class LanguageChatController {
    constructor(languageChatService) {
        console.log('🔄 Inicializando LanguageChatController con Service...');
        this.languageChatService = languageChatService;
        this.processChat = this.processChat.bind(this);
        console.log('✅ LanguageChatController con Service inicializado');
    }
    
    /**
     * Procesa un mensaje de conversación de idiomas delegando al servicio.
     */
    async processChat(req, res) {
        try {
            const { message, languageCode = 'en-US', cefrLevel = 'B1', history = [] } = req.body;
            
            if (!message || message.trim() === '') {
                return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
            }
            
            const jsonResponse = await this.languageChatService.processChat(message, languageCode, cefrLevel, history);
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
