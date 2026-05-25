class LanguageVocabularyController {
    constructor(languageService, usageService) {
        console.log('🔄 Inicializando LanguageVocabularyController con Service...');
        this.languageService = languageService;
        this.usageService = usageService;

        this.getVocabulary = this.getVocabulary.bind(this);
        this.addWord = this.addWord.bind(this);
        this.generateWordDetails = this.generateWordDetails.bind(this);
        this.deleteWord = this.deleteWord.bind(this);
        this.exportToFlashcards = this.exportToFlashcards.bind(this);
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
            const { word, translation, definition, example_sentence, languageCode = 'en-US', cefrLevel = 'A1' } = req.body;
            const userId = req.user.id;

            if (!word || !translation) {
                return res.status(400).json({ error: 'La palabra y su traducción son obligatorias' });
            }

            const newWord = await this.languageService.addWord(userId, word, translation, definition, example_sentence, languageCode, cefrLevel);
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
            const { word, languageCode = 'en-US', cefrLevel = 'A1' } = req.body;

            if (!word) {
                return res.status(400).json({ error: 'La palabra es obligatoria' });
            }

            const data = await this.languageService.generateWordDetails(word, languageCode, cefrLevel);

            // 📉 ACTUALIZAR LÍMITES DE USO IA (Descontar vidas si es free/pending)
            try {
                const userId = req.user.id;
                if (req.usageType === 'usage_count') {
                    await this.usageService.checkAndIncrementUsage(userId, 'usage_count', 1);
                    console.log(`📉 Límite de usage_count incrementado (+1) para usuario ${userId} en Completar Vocabulario con IA.`);
                } else if (req.usageType) {
                    const pool = require('../../infrastructure/database/db');
                    await pool.query(`UPDATE users SET ${req.usageType} = ${req.usageType} + 1 WHERE id = $1`, [userId]);
                }
            } catch (limitErr) {
                console.error("⚠️ No se pudo actualizar el límite del usuario en Completar Vocabulario con IA:", limitErr.message);
            }

            return res.json({ success: true, data });
        } catch (error) {
            console.error("❌ Error en LanguageVocabularyController.generateWordDetails:", error);
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
     * Exporta palabras de vocabulario seleccionadas al mazo SRS delegando al servicio.
     */
    async exportToFlashcards(req, res) {
        try {
            const { ids, deckId } = req.body;
            const userId = req.user.id;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: 'Debes proporcionar al menos un ID de palabra a exportar' });
            }

            const count = await this.languageService.exportToFlashcards(userId, ids, deckId);
            return res.json({ success: true, count });
        } catch (error) {
            console.error("❌ Error en LanguageVocabularyController.exportToFlashcards:", error);
            if (error.message === 'NO_WORDS_FOUND') {
                return res.status(404).json({ error: 'No se encontraron las palabras especificadas' });
            }
            return res.status(500).json({ error: 'Ocurrió un error al exportar a flashcards.' });
        }
    }
}

module.exports = LanguageVocabularyController;
