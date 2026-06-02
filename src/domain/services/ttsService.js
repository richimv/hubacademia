const textToSpeech = require('@google-cloud/text-to-speech');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const crypto = require('crypto');

/**
 * TtsService: Gestiona la síntesis de voz usando Google Cloud Text-to-Speech.
 * Soporta voces neuronales de alta calidad para Español, Inglés e Italiano con caché en GCS.
 */
class TtsService {
    constructor() {
        console.log('📡 [TtsService] Inicializando motor de voz...');
        
        const options = {};
        const storageOptions = {};
        
        // Reutilizamos la lógica de credenciales de DriveService
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            const keyPath = path.join(__dirname, '../../../service-account-key.json');
            options.keyFilename = keyPath;
            storageOptions.keyFilename = keyPath;
        } else {
            storageOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        }

        try {
            this.client = new textToSpeech.TextToSpeechClient(options);
            this.storage = new Storage(storageOptions);
            this.bucketName = process.env.GCS_BUCKET_NAME || 'chatbot-tutor-medical-images';
            
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
            
            console.log('✅ [TtsService] Motor listo con caché GCS (ES, EN, IT, FR, DE).');
        } catch (error) {
            console.error('❌ [TtsService] Error al inicializar cliente:', error.message);
        }
    }

    /**
     * Resuelve el nombre de la voz configurada para un idioma.
     * @param {string} lang - Código de idioma (es-ES, en-GB, etc.)
     * @returns {Promise<string>} Nombre de la voz neuronal configurada
     */
    async resolveVoiceName(lang) {
        try {
            const LanguageRepository = require('../repositories/languageRepository');
            const languageRepo = new LanguageRepository();
            const dbVoice = await languageRepo.getLanguageVoice(lang);
            if (dbVoice) {
                return dbVoice;
            }
        } catch (dbErr) {
            console.warn('⚠️ [TtsService] Error al consultar idiomas en BD, usando voiceMap:', dbErr.message);
        }

        let voiceConfig = this.voiceMap[lang];
        if (!voiceConfig) {
            const prefix = lang.split('-')[0];
            voiceConfig = Object.values(this.voiceMap).find(v => v.languageCode.startsWith(prefix)) || this.voiceMap['es-ES'];
        }
        return voiceConfig.name || 'default';
    }

    /**
     * Genera de forma centralizada la ruta de caché en GCS para evitar colisiones.
     * @param {string} text - El texto a sintetizar
     * @param {string} lang - Código de idioma
     * @returns {Promise<string>} Ruta relativa de GCS
     */
    async getCachePath(text, lang) {
        const cleanText = text.replace(/[*_#`]/g, '').trim();
        const voiceName = await this.resolveVoiceName(lang);
        const textHash = crypto.createHash('md5').update(`${cleanText}_${lang}_${voiceName}`).digest('hex');
        return `tts_cache/${lang}_${voiceName}_${textHash}.mp3`;
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
            const gcsPath = await this.getCachePath(cleanText, lang);
            const bucket = this.storage.bucket(this.bucketName);
            const file = bucket.file(gcsPath);

            try {
                const [exists] = await file.exists();
                if (exists) {
                    console.log(`🎯 [TtsService] Cache HIT en GCS para: ${gcsPath}`);
                    const [buffer] = await file.download();
                    return buffer;
                }
            } catch (gcsErr) {
                console.warn('⚠️ [TtsService] Error al consultar caché en GCS:', gcsErr.message);
            }

            const voiceName = await this.resolveVoiceName(lang);
            const voiceConfig = {
                languageCode: lang,
                name: voiceName,
                ssmlGender: voiceName.includes('-M') ? 'MALE' : 'FEMALE'
            };
            
            const request = {
                input: { text: cleanText },
                voice: voiceConfig,
                audioConfig: { 
                    audioEncoding: 'MP3',
                    pitch: 0,
                    speakingRate: 1.0 
                },
            };

            console.log(`🗣️ [TtsService] Sintetizando de forma remota (${lang} - ${voiceName}): "${cleanText.substring(0, 30)}..."`);
            const [response] = await this.client.synthesizeSpeech(request);
            const buffer = response.audioContent;

            // Guardar asíncronamente en el caché de GCS
            file.save(buffer, {
                metadata: {
                    contentType: 'audio/mpeg',
                    cacheControl: 'public, max-age=31536000' // Caché de 1 año
                }
            }).then(() => {
                console.log(`💾 [TtsService] Guardado en caché GCS: ${gcsPath}`);
            }).catch(saveErr => {
                console.error('⚠️ [TtsService] Error guardando caché en GCS:', saveErr.message);
            });
            
            return buffer;
        } catch (error) {
            console.error('❌ [TtsService] Error en síntesis:', error.message);
            throw error;
        }
    }
}

module.exports = new TtsService();
