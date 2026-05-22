const textToSpeech = require('@google-cloud/text-to-speech');
const path = require('path');

/**
 * TtsService: Gestiona la síntesis de voz usando Google Cloud Text-to-Speech.
 * Soporta voces neuronales de alta calidad para Español, Inglés e Italiano.
 */
class TtsService {
    constructor() {
        console.log('📡 [TtsService] Inicializando motor de voz...');
        
        const options = {};
        
        // Reutilizamos la lógica de credenciales de DriveService
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            options.keyFilename = path.join(__dirname, '../../../service-account-key.json');
            // console.log('📁 [TtsService] Usando llave local:', options.keyFilename);
        } else {
            // console.log('🔑 [TtsService] Usando credenciales de variable de entorno.');
        }

        try {
            this.client = new textToSpeech.TextToSpeechClient(options);
            
            // 🎙️ Configuración de Voces Premium (Neural2)
            this.voiceMap = {
                'es-ES': { languageCode: 'es-ES', name: 'es-ES-Neural2-A', ssmlGender: 'FEMALE' },
                'es-US': { languageCode: 'es-US', name: 'es-US-Neural2-A', ssmlGender: 'FEMALE' },
                'en-US': { languageCode: 'en-US', name: 'en-US-Neural2-D', ssmlGender: 'MALE' },
                'en-GB': { languageCode: 'en-GB', name: 'en-GB-Neural2-B', ssmlGender: 'MALE' },
                'it-IT': { languageCode: 'it-IT', name: 'it-IT-Neural2-A', ssmlGender: 'FEMALE' },
                'fr-FR': { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A', ssmlGender: 'FEMALE' },
                'de-DE': { languageCode: 'de-DE', name: 'de-DE-Neural2-A', ssmlGender: 'FEMALE' }
            };
            
            console.log('✅ [TtsService] Motor listo (ES, EN, IT, FR, DE).');
        } catch (error) {
            console.error('❌ [TtsService] Error al inicializar cliente:', error.message);
        }
    }

    /**
     * Convierte texto a audio MP3
     * @param {string} text - El texto a sintetizar
     * @param {string} lang - Código de idioma (es-ES, en-GB, etc.)
     * @returns {Promise<Buffer>} Contenido binario del audio
     */
    async synthesize(text, lang = 'es-ES') {
        try {
            const cleanText = text.replace(/[*_#`]/g, '').trim();
            
            // Buscar voz exacta o por prefijo (es-MX -> es-ES) o default
            let voiceConfig = this.voiceMap[lang];
            
            if (!voiceConfig) {
                const prefix = lang.split('-')[0];
                voiceConfig = Object.values(this.voiceMap).find(v => v.languageCode.startsWith(prefix)) || this.voiceMap['es-ES'];
            }
            
            const request = {
                input: { text: cleanText },
                voice: voiceConfig,
                audioConfig: { 
                    audioEncoding: 'MP3',
                    pitch: 0,
                    speakingRate: 1.0 
                },
            };

            // console.log(`🗣️ [TtsService] Sintetizando (${lang}): "${cleanText.substring(0, 30)}..."`);
            const [response] = await this.client.synthesizeSpeech(request);
            
            return response.audioContent;
        } catch (error) {
            console.error('❌ [TtsService] Error en síntesis:', error.message);
            throw error;
        }
    }
}

module.exports = new TtsService();
