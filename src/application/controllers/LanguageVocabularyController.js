class LanguageVocabularyController {
    constructor(languageService, usageService) {
        console.log('🔄 Inicializando LanguageVocabularyController con Service...');
        this.languageService = languageService;
        this.usageService = usageService;

        this.getVocabulary = this.getVocabulary.bind(this);
        this.addWord = this.addWord.bind(this);
        this.generateWordDetails = this.generateWordDetails.bind(this);
        this.deleteWord = this.deleteWord.bind(this);
        this.getChallenge = this.getChallenge.bind(this);
        this.practiceWord = this.practiceWord.bind(this);
        this.getConjugations = this.getConjugations.bind(this);
        this.getSearchSuggestions = this.getSearchSuggestions.bind(this);

        this.adminGetVocabularies = this.adminGetVocabularies.bind(this);
        this.adminAddVocabulary = this.adminAddVocabulary.bind(this);
        this.adminUpdateVocabulary = this.adminUpdateVocabulary.bind(this);
        this.adminDeleteVocabulary = this.adminDeleteVocabulary.bind(this);
        console.log('✅ LanguageVocabularyController con Service inicializado');
    }

    /**
     * Obtiene el vocabulario privado del usuario delegando al servicio.
     */
    async getVocabulary(req, res) {
        try {
            const { languageCode = 'en-US' } = req.query;
            const userId = req.user.id;

            const vocabulary = await this.languageService.getVocabulary(userId, languageCode);
            return res.json({ success: true, vocabulary });
        } catch (error) {
            console.error("❌ Error en LanguageVocabularyController.getVocabulary:", error);
            return res.status(500).json({ error: 'Ocurrió un error al cargar el vocabulario.' });
        }
    }

    /**
     * Agrega una palabra de vocabulario delegando al servicio.
     */
    async addWord(req, res) {
        try {
            const { word, translation, definition, example_sentence, languageCode = 'en-US', cefrLevel = null, part_of_speech = null } = req.body;
            const userId = req.user.id;

            if (!word || !translation) {
                return res.status(400).json({ error: 'La palabra y su traducción son obligatorias' });
            }

            const newWord = await this.languageService.addWord(userId, word, translation, definition, example_sentence, languageCode, cefrLevel, part_of_speech);
            return res.status(201).json({ success: true, word: newWord });
        } catch (error) {
            console.error("❌ Error en LanguageVocabularyController.addWord:", error);
            return res.status(500).json({ error: 'Ocurrió un error al agregar la palabra.' });
        }
    }

    /**
     * Completa los detalles de una palabra usando Gemini delegando al servicio.
     */
    async generateWordDetails(req, res) {
        try {
            const { word, languageCode = 'en-US', cefrLevel = 'A1', part_of_speech } = req.body;

            if (!word) {
                return res.status(400).json({ error: 'La palabra es obligatoria' });
            }

            const data = await this.languageService.generateWordDetails(word, languageCode, cefrLevel, part_of_speech);

            if (!data.is_suggested) {
                // 📉 ACTUALIZAR LÍMITES DE USO IA (Descontar vidas si es free/pending)
                try {
                    const userId = req.user.id;
                    if (req.usageType === 'usage_count') {
                        await this.usageService.checkAndIncrementUsage(userId, 1);
                        console.log(`📉 Límite de usage_count incrementado (+1) para usuario ${userId} en Completar Vocabulario con IA.`);
                    } else if (req.usageType) {
                        const pool = require('../../infrastructure/database/db');
                        await pool.query(`UPDATE users SET ${req.usageType} = ${req.usageType} + 1 WHERE id = $1`, [userId]);
                    }
                } catch (limitErr) {
                    console.error("⚠️ No se pudo actualizar el límite del usuario en Completar Vocabulario con IA:", limitErr.message);
                }
            } else {
                console.log(`💡 Palabra reutilizada del catálogo global. No se consumen límites de IA para el usuario ${req.user.id}.`);
            }

            return res.json({ success: true, data });
        } catch (error) {
            console.error("❌ Error en LanguageVocabularyController.generateWordDetails:", error);
            if (error.message === 'MALICIOUS_INPUT_DETECTED' || error.message === 'INVALID_INPUT') {
                return res.status(400).json({ error: 'Entrada inválida o sospechosa (intento de inyección de código o prompt detectado).' });
            }
            return res.status(500).json({ error: 'Ocurrió un error al autocompletar la palabra con IA.' });
        }
    }

    /**
     * Elimina una palabra delegando al servicio.
     */
    async deleteWord(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            if (!id) {
                return res.status(400).json({ error: 'ID de palabra es obligatorio' });
            }

            const result = await this.languageService.deleteWord(id, userId);
            if (!result) {
                return res.status(404).json({ error: 'No se encontró la palabra especificada o no tienes permiso' });
            }

            return res.json({ success: true, message: 'Palabra eliminada del vocabulario.' });
        } catch (error) {
            console.error("❌ Error en LanguageVocabularyController.deleteWord:", error);
            return res.status(500).json({ error: 'Ocurrió un error al eliminar la palabra.' });
        }
    }



    /**
     * Obtiene un reto de práctica en español para la palabra.
     */
    async getChallenge(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const challenge = await this.languageService.getChallenge(id, userId);
            return res.json({ success: true, challenge });
        } catch (error) {
            console.error("❌ Error en LanguageVocabularyController.getChallenge:", error);
            if (error.message === 'NOT_FOUND') {
                return res.status(404).json({ error: 'No se encontró la palabra especificada o no tienes permiso' });
            }
            return res.status(500).json({ error: 'Ocurrió un error al obtener el reto de práctica.' });
        }
    }

    /**
     * Evalúa la oración del usuario y actualiza parámetros SRS.
     */
    async practiceWord(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { userInput, inputMode = 'text', challengeType = '' } = req.body;

            if (!userInput) {
                return res.status(400).json({ error: 'La respuesta del usuario es obligatoria' });
            }

            const evaluation = await this.languageService.practiceWord(id, userId, userInput, inputMode, challengeType);

            // 📉 ACTUALIZAR LÍMITES DE USO IA (Descontar vidas si es free/pending)
            try {
                if (req.usageType === 'usage_count') {
                    await this.usageService.checkAndIncrementUsage(userId, 1);
                    console.log(`📉 Límite de usage_count incrementado (+1) para usuario ${userId} en Práctica de Vocabulario.`);
                } else if (req.usageType) {
                    const pool = require('../../infrastructure/database/db');
                    await pool.query(`UPDATE users SET ${req.usageType} = ${req.usageType} + 1 WHERE id = $1`, [userId]);
                }
            } catch (limitErr) {
                console.error("⚠️ No se pudo actualizar el límite del usuario en Práctica de Vocabulario:", limitErr.message);
            }

            return res.json({ success: true, evaluation });
        } catch (error) {
            console.error("❌ Error en LanguageVocabularyController.practiceWord:", error);
            if (error.message === 'NOT_FOUND') {
                return res.status(404).json({ error: 'No se encontró la palabra especificada o no tienes permiso' });
            }
            return res.status(500).json({ error: 'Ocurrió un error al procesar la práctica de vocabulario.' });
        }
    }

    /**
     * Obtiene conjugaciones de la palabra (o las genera con IA si no existen).
     */
    async getConjugations(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const conjugations = await this.languageService.getConjugations(id, userId);
            return res.json({ success: true, conjugations });
        } catch (error) {
            console.error("❌ Error en LanguageVocabularyController.getConjugations:", error);
            if (error.message === 'NOT_FOUND') {
                return res.status(404).json({ error: 'No se encontró la palabra especificada o no tienes permiso' });
            }
            return res.status(500).json({ error: 'Ocurrió un error al obtener las conjugaciones.' });
        }
    }

    /**
     * Busca sugerencias de palabras en el catálogo global.
     */
    async getSearchSuggestions(req, res) {
        try {
            const { q, languageCode = 'en-US' } = req.query;
            if (!q || q.trim().length < 1) {
                return res.json({ success: true, suggestions: [] });
            }
            const suggestions = await this.languageService.getSearchSuggestions(q.trim(), languageCode);
            return res.json({ success: true, suggestions });
        } catch (error) {
            console.error("❌ Error en LanguageVocabularyController.getSearchSuggestions:", error);
            return res.status(500).json({ error: 'Ocurrió un error al buscar sugerencias de palabras.' });
        }
    }

    /**
     * Obtiene todo el catálogo de palabras globales para administración.
     */
    async adminGetVocabularies(req, res) {
        try {
            const { languageCode } = req.query;
            const vocabularies = await this.languageService.adminGetVocabularies(languageCode);
            return res.json(vocabularies);
        } catch (error) {
            console.error("❌ Error en LanguageVocabularyController.adminGetVocabularies:", error);
            return res.status(500).json({ error: 'Error al obtener vocabulario administrativo' });
        }
    }

    /**
     * Crea un término global de manera manual.
     */
    async adminAddVocabulary(req, res) {
        try {
            const { word, language_code, part_of_speech, translation, definition, example_sentence, level } = req.body;
            if (!word || !language_code || !translation) {
                return res.status(400).json({ error: 'Palabra, Idioma y Traducción son obligatorios' });
            }

            const newWord = await this.languageService.adminAddVocabulary({
                word,
                language_code,
                part_of_speech,
                translation,
                definition,
                example_sentence,
                level
            });

            return res.status(201).json(newWord);
        } catch (error) {
            console.error("❌ Error en LanguageVocabularyController.adminAddVocabulary:", error);
            return res.status(500).json({ error: 'Error al crear palabra global' });
        }
    }

    /**
     * Actualiza una palabra global.
     */
    async adminUpdateVocabulary(req, res) {
        try {
            const { id } = req.params;
            const { word, language_code, part_of_speech, translation, definition, example_sentence, level } = req.body;

            if (!id || !word || !language_code || !translation) {
                return res.status(400).json({ error: 'Faltan parámetros obligatorios' });
            }

            const updatedWord = await this.languageService.adminUpdateVocabulary(id, {
                word,
                language_code,
                part_of_speech,
                translation,
                definition,
                example_sentence,
                level
            });

            return res.json(updatedWord);
        } catch (error) {
            console.error("❌ Error en LanguageVocabularyController.adminUpdateVocabulary:", error);
            if (error.message === 'NOT_FOUND') {
                return res.status(404).json({ error: 'No se encontró la palabra global especificada' });
            }
            return res.status(500).json({ error: 'Error al actualizar palabra global' });
        }
    }

    /**
     * Elimina permanentemente una palabra global y limpia sus audios en GCS.
     */
    async adminDeleteVocabulary(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ error: 'El ID es obligatorio' });
            }

            await this.languageService.adminDeleteVocabulary(id);
            return res.json({ success: true, message: 'Palabra global y audios purgados del sistema.' });
        } catch (error) {
            console.error("❌ Error en LanguageVocabularyController.adminDeleteVocabulary:", error);
            if (error.message === 'NOT_FOUND') {
                return res.status(404).json({ error: 'No se encontró la palabra especificada' });
            }
            return res.status(500).json({ error: 'Error al eliminar palabra global de forma completa' });
        }
    }
}

module.exports = LanguageVocabularyController;
