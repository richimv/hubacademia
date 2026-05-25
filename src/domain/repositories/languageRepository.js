const db = require('../../infrastructure/database/db');

class LanguageRepository {
    /**
     * Obtiene el temario estructurado de un idioma y nivel.
     * Si se provee userId, incluye el progreso de completado del usuario.
     */
    async getSyllabus(userId, languageCode, level) {
        if (userId) {
            const query = `
                SELECT s.*, 
                       COALESCE(p.completed, false) as completed
                FROM public.languages_syllabus s
                LEFT JOIN public.user_language_progress p 
                    ON s.id = p.syllabus_id AND p.user_id = $1
                WHERE s.language_code = $2 AND s.level = $3
                ORDER BY s.unit_number ASC, s.id ASC;
            `;
            const { rows } = await db.query(query, [userId, languageCode, level]);
            return rows;
        } else {
            const query = `
                SELECT *, false as completed
                FROM public.languages_syllabus
                WHERE language_code = $1 AND level = $2
                ORDER BY unit_number ASC, id ASC;
            `;
            const { rows } = await db.query(query, [languageCode, level]);
            return rows;
        }
    }

    /**
     * Obtiene una fila del temario por su ID.
     */
    async getSyllabusById(id) {
        const query = `SELECT * FROM public.languages_syllabus WHERE id = $1`;
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }

    /**
     * Obtiene una fila del temario por su nombre de tema, código de idioma y nivel.
     */
    async getSyllabusByTopic(topicName, languageCode, level) {
        const query = `
            SELECT * FROM public.languages_syllabus 
            WHERE topic_name = $1 AND language_code = $2 AND level = $3
        `;
        const { rows } = await db.query(query, [topicName, languageCode, level]);
        return rows[0];
    }

    /**
     * Actualiza el contenido interactivo estructurado (JSON) de un tema en el temario.
     */
    async updateSyllabusContent(id, content) {
        const query = `UPDATE public.languages_syllabus SET content = $1 WHERE id = $2 RETURNING *`;
        const { rows } = await db.query(query, [JSON.stringify(content), id]);
        return rows[0];
    }

    /**
     * Marca o desmarca un tema del temario como completado para un usuario.
     */
    async toggleProgress(userId, syllabusId, completed) {
        if (completed) {
            const query = `
                INSERT INTO public.user_language_progress (user_id, syllabus_id, completed)
                VALUES ($1, $2, true)
                ON CONFLICT (user_id, syllabus_id) DO UPDATE SET completed = true;
            `;
            await db.query(query, [userId, syllabusId]);
        } else {
            const query = `
                DELETE FROM public.user_language_progress
                WHERE user_id = $1 AND syllabus_id = $2;
            `;
            await db.query(query, [userId, syllabusId]);
        }
        return completed;
    }

    /**
     * Obtiene el vocabulario privado del usuario filtrado por idioma.
     */
    async getVocabulary(userId, languageCode) {
        const query = `
            SELECT * FROM public.user_vocabularies
            WHERE user_id = $1 AND language_code = $2
            ORDER BY created_at DESC;
        `;
        const { rows } = await db.query(query, [userId, languageCode]);
        return rows;
    }

    /**
     * Agrega una palabra de vocabulario privada.
     */
    async addWord(userId, languageCode, level, word, translation, definition, exampleSentence, audioUrl) {
        const query = `
            INSERT INTO public.user_vocabularies (
                user_id, language_code, level, word, translation, definition, example_sentence, audio_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const { rows } = await db.query(query, [
            userId, languageCode, level, word, translation, definition, exampleSentence, audioUrl
        ]);
        return rows[0];
    }

    /**
     * Elimina una palabra de vocabulario de la colección del usuario.
     */
    async deleteWord(id, userId) {
        const query = `
            DELETE FROM public.user_vocabularies
            WHERE id = $1 AND user_id = $2
            RETURNING *;
        `;
        const { rows } = await db.query(query, [id, userId]);
        return rows[0];
    }

    /**
     * Obtiene una lista de palabras de vocabulario por ID para un usuario.
     */
    async getVocabularyWordsByIds(userId, ids) {
        if (!ids || ids.length === 0) return [];
        const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
        const query = `
            SELECT * FROM public.user_vocabularies
            WHERE user_id = $1 AND id IN (${placeholders})
        `;
        const { rows } = await db.query(query, [userId, ...ids]);
        return rows;
    }

    /**
     * Inserta una flashcard en la colección del usuario.
     */
    async insertFlashcard(userId, deckId, frontContent, backContent, topic, audioUrl, languageCode) {
        const query = `
            INSERT INTO public.user_flashcards (
                user_id, deck_id, front_content, back_content, topic, 
                audio_url_frente, tts_lang_frente
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;
        `;
        const { rows } = await db.query(query, [
            userId, deckId, frontContent, backContent, topic, audioUrl, languageCode
        ]);
        return rows[0];
    }

    async getVocabularyWordById(id, userId) {
        const query = `SELECT * FROM public.user_vocabularies WHERE id = $1 AND user_id = $2`;
        const { rows } = await db.query(query, [id, userId]);
        return rows[0] || null;
    }

    async countVocabulariesWithAudioUrl(audioUrl) {
        const query = `SELECT COUNT(*)::int as count FROM public.user_vocabularies WHERE audio_url = $1`;
        const { rows } = await db.query(query, [audioUrl]);
        return rows[0] ? rows[0].count : 0;
    }

    /**
     * Obtiene la voz TTS configurada para un código de idioma.
     */
    async getLanguageVoice(languageCode) {
        const query = `SELECT tts_voice FROM public.languages WHERE code = $1 AND is_active = TRUE`;
        const { rows } = await db.query(query, [languageCode]);
        return rows[0] ? rows[0].tts_voice : null;
    }
}

module.exports = LanguageRepository;
