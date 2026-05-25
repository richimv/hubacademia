const flashcardService = require('../../domain/services/flashcardService');
const flashcardRepository = require('../../domain/repositories/flashcardRepository');
const ttsService = require('../../domain/services/ttsService');
const mediaController = require('./mediaController');
const crypto = require('crypto');

class FlashcardController {

    /**
     * GET /api/flashcard/due
     * Obtiene flashcards pendientes.
     */
    async getDueFlashcards(req, res) {
        try {
            const cards = await flashcardService.getDueFlashcards(req.user.id);
            res.json({ success: true, cards });
        } catch (error) {
            console.error('Error getting flashcards:', error);
            res.status(500).json({ error: 'Error obteniendo flashcards.' });
        }
    }

    /**
     * POST /api/flashcard/review
     * Procesa el repaso (SM-2).
     */
    async reviewFlashcard(req, res) {
        try {
            const { cardId, quality, currentInterval, currentEf, currentReps } = req.body;

            const result = await flashcardService.processReview(cardId, quality, {
                interval_days: currentInterval,
                easiness_factor: currentEf,
                repetition_number: currentReps
            });

            res.json(result);
        } catch (error) {
            console.error('Error reviewing flashcard:', error);
            res.status(500).json({ error: 'Error procesando repaso.' });
        }
    }

    /**
     * POST /api/flashcard/check-saved
     * Comprueba si ciertas preguntas ya están guardadas como flashcards.
     */
    async checkSavedFlashcards(req, res) {
        try {
            const { questions, moduleName = 'MEDICINA' } = req.body;
            const userId = req.user.id;

            if (!questions || !Array.isArray(questions) || questions.length === 0) {
                return res.json({ success: true, savedFronts: [] });
            }

            const deckId = await flashcardRepository.ensureSystemDeck(userId, moduleName);

            const fronts = questions.map(q => q.question_text ? q.question_text.trim() : typeof q === 'string' ? q.trim() : '');

            const savedFronts = await flashcardRepository.checkExistingFlashcards(userId, deckId, fronts);

            res.json({ success: true, savedFronts });
        } catch (error) {
            console.error('Error checking saved flashcards:', error);
            res.status(500).json({ error: 'Error comprobando flashcards guardadas.' });
        }
    }

    /**
     * POST /api/flashcard/save-from-question
     * Guarda una o varias preguntas manualmente como flashcards.
     */
    async saveFlashcardFromQuestion(req, res) {
        try {
            const { question, topic, attemptId, moduleName = 'MEDICINA', career } = req.body;
            const userId = req.user.id;

            if (!question) {
                return res.status(400).json({ error: 'Faltan datos de la pregunta.' });
            }

            const questionsArray = Array.isArray(question) ? question : [question];
            
            // Procesar cada pregunta e inyectar el audio en GCS si es de tipo Listening
            const processedQuestions = [];
            for (const q of questionsArray) {
                let audioUrlFront = null;
                let ttsLangFront = null;
                
                if (q.audio_text && q.audio_text.trim() !== '') {
                    const lang = q.career || career || 'en-US';
                    try {
                        console.log(`🗣️ [flashcardController] Pre-sintetizando audio para flashcard de listening (idioma: ${lang}): "${q.audio_text.substring(0, 30)}..."`);
                        const audioBuffer = await ttsService.synthesize(q.audio_text, lang);
                        if (audioBuffer) {
                            const fileName = `tts_front_${Date.now()}.mp3`;
                            const gcsPath = await mediaController.uploadRawBuffer(audioBuffer, fileName, 'audio/mpeg', 'audio-cards');
                            audioUrlFront = gcsPath;
                            ttsLangFront = lang;
                        }
                    } catch (ttsErr) {
                        console.error('⚠️ [flashcardController] Falló pre-sintetizar audio para flashcard:', ttsErr.message);
                    }
                }
                
                processedQuestions.push({
                    ...q,
                    explanation_image_url: null, // Sin imagen en el dorso para evitar desbordes
                    audio_url_frente: audioUrlFront,
                    tts_lang_frente: ttsLangFront,
                    hide_text_frente: false
                });
            }

            await flashcardRepository.createFlashcardsBatch(userId, processedQuestions, topic || 'General', attemptId || null, moduleName);

            res.json({ success: true, message: 'Flashcard guardada exitosamente.' });
        } catch (error) {
            console.error('Error saving flashcard from question:', error);
            res.status(500).json({ error: 'Error guardando flashcard.' });
        }
    }
}

module.exports = new FlashcardController();
