const ttsService = require('../../domain/services/ttsService');

/**
 * SpeechController: Gestiona las peticiones de síntesis de voz.
 */
class SpeechController {
    constructor() {
        this.synthesize = this.synthesize.bind(this);
    }

    /**
     * POST /api/tts
     * Genera un audio MP3 a partir de texto.
     */
    async synthesize(req, res) {
        try {
            const { text, lang = 'es' } = req.body;

            if (!text) {
                return res.status(400).json({ error: 'El texto es requerido para la síntesis.' });
            }

            // Limitar longitud para evitar abusos (máximo de Google Cloud es aprox 5000)
            if (text.length > 3000) {
                return res.status(400).json({ error: 'El texto es demasiado largo (máx 3000 caracteres).' });
            }

            const audioBuffer = await ttsService.synthesize(text, lang);

            // Configuramos los headers para que el navegador lo reconozca como audio
            res.set({
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length,
                'Cache-Control': 'public, max-age=3600' // Cachear por 1 hora si es el mismo texto
            });

            res.send(audioBuffer);
        } catch (error) {
            console.error('❌ [SpeechController] Error fatal:', error.message);
            res.status(500).json({ error: 'No se pudo generar el audio.' });
        }
    }
}

module.exports = new SpeechController();
