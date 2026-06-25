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
     * Asegura la existencia de un término en el diccionario de vocabulario global compartido.
     */
    async ensureGlobalWord(word, languageCode, partOfSpeech, translation, definition, exampleSentence, audioUrl, level) {
        const wordClean = word.trim().toLowerCase();
        const posClean = partOfSpeech || 'noun';
        const isVariable = ['verb', 'noun', 'adjective', 'pronoun', 'determiner'].includes(posClean);
        
        // 1. Buscar si ya existe
        const findQuery = `
            SELECT * FROM public.global_vocabularies
            WHERE word = $1 AND language_code = $2 AND part_of_speech = $3
        `;
        const { rows: existing } = await db.query(findQuery, [wordClean, languageCode, posClean]);
        if (existing.length > 0) {
            return existing[0];
        }

        // 2. Si no existe, insertar (usando ON CONFLICT para tolerar concurrencia perfecta)
        const insertQuery = `
            INSERT INTO public.global_vocabularies (
                word, language_code, part_of_speech, is_variable, translation, definition, example_sentence, audio_url, level
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (word, language_code, part_of_speech) 
            DO UPDATE SET updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        `;
        const { rows: inserted } = await db.query(insertQuery, [
            wordClean, languageCode, posClean, isVariable, translation, definition, exampleSentence, audioUrl, level
        ]);
        return inserted[0];
    }

    /**
     * Obtiene el vocabulario privado del usuario filtrado por idioma con JOIN global.
     */
    async getVocabulary(userId, languageCode) {
        const query = `
            SELECT uv.id, 
                   uv.user_id, 
                   uv.vocabulary_id,
                   uv.translation, 
                   uv.srs_state, 
                   uv.next_review_at, 
                   uv.interval_days, 
                   uv.ease_factor, 
                   uv.practice_count, 
                   uv.metadata, 
                   uv.created_at, 
                   uv.updated_at,
                   gv.word, 
                   gv.language_code, 
                   gv.definition, 
                   gv.example_sentence, 
                   gv.audio_url, 
                   gv.part_of_speech, 
                   gv.is_variable,
                   gv.level
            FROM public.user_vocabularies uv
            JOIN public.global_vocabularies gv ON uv.vocabulary_id = gv.id
            WHERE uv.user_id = $1 AND gv.language_code = $2
            ORDER BY uv.created_at DESC;
        `;
        const { rows } = await db.query(query, [userId, languageCode]);
        return rows;
    }

    /**
     * Agrega una palabra de vocabulario privada o vincula a una global compartida existente.
     */
    async addWord(userId, languageCode, level, word, translation, definition, exampleSentence, audioUrl, partOfSpeech = null) {
        // Asegurar que exista la palabra global
        const globalWord = await this.ensureGlobalWord(word, languageCode, partOfSpeech, translation, definition, exampleSentence, audioUrl, level);

        // Crear o actualizar la relación en user_vocabularies
        const query = `
            INSERT INTO public.user_vocabularies (
                user_id, vocabulary_id, translation
            ) VALUES ($1, $2, $3)
            ON CONFLICT (user_id, vocabulary_id) DO UPDATE SET translation = EXCLUDED.translation
            RETURNING *;
        `;
        const { rows: userVocab } = await db.query(query, [userId, globalWord.id, translation]);
        
        // Devolver la palabra unida con los datos globales
        return {
            ...userVocab[0],
            word: globalWord.word,
            language_code: globalWord.language_code,
            definition: globalWord.definition,
            example_sentence: globalWord.example_sentence,
            audio_url: globalWord.audio_url,
            part_of_speech: globalWord.part_of_speech,
            is_variable: globalWord.is_variable,
            level: globalWord.level
        };
    }

    /**
     * Actualiza los parámetros del Algoritmo SRS (SuperMemo-2) para una palabra de vocabulario.
     */
    async updateSrsParameters(id, userId, srsState, nextReviewAt, intervalDays, easeFactor, practiceCount) {
        const query = `
            UPDATE public.user_vocabularies
            SET srs_state = $3,
                next_review_at = $4,
                interval_days = $5,
                ease_factor = $6,
                practice_count = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2
            RETURNING *;
        `;
        const { rows } = await db.query(query, [id, userId, srsState, nextReviewAt, intervalDays, easeFactor, practiceCount]);
        return rows[0];
    }

    /**
     * Registra un log histórico de práctica y retroalimentación didáctica.
     */
    async savePracticeLog(userId, vocabularyId, inputType, userInput, isValid, precisionScore, feedbackJson) {
        const query = `
            INSERT INTO public.vocabulary_practice_logs (
                user_id, vocabulary_id, input_type, user_input, is_valid, precision_score, feedback_json
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const { rows } = await db.query(query, [
            userId, vocabularyId, inputType, userInput, isValid, precisionScore, JSON.stringify(feedbackJson)
        ]);
        return rows[0];
    }

    /**
     * Obtiene la matriz de conjugaciones o flexiones para un término de vocabulario.
     */
    async getConjugations(vocabularyId) {
        const query = `
            SELECT * FROM public.vocabulary_conjugations
            WHERE vocabulary_id = $1
            ORDER BY created_at ASC, id ASC;
        `;
        const { rows } = await db.query(query, [vocabularyId]);
        return rows;
    }

    /**
     * Guarda un registro de conjugación o flexión individual.
     */
    async saveConjugation(vocabularyId, tense, mood, person, form, audioUrl) {
        // Recorte defensivo de longitud para evitar errores de base de datos (desbordamiento de caracteres)
        const tenseClean = tense ? tense.substring(0, 50) : null;
        const moodClean = mood ? mood.substring(0, 50) : null;
        const personClean = person ? person.substring(0, 100) : null;
        const formClean = form ? form.substring(0, 150) : '';
        const audioUrlClean = audioUrl ? audioUrl.substring(0, 255) : null;

        if (!formClean) {
            console.warn("⚠️ [LanguageRepository] Intento de guardar conjugación con forma vacía para vocabulario:", vocabularyId);
            return null;
        }

        const query = `
            INSERT INTO public.vocabulary_conjugations (
                vocabulary_id, tense, mood, person, form, audio_url
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const { rows } = await db.query(query, [vocabularyId, tenseClean, moodClean, personClean, formClean, audioUrlClean]);
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
     * Obtiene una palabra de vocabulario por su ID con JOIN global.
     */
    async getVocabularyWordById(id, userId) {
        const query = `
            SELECT uv.id, 
                   uv.user_id, 
                   uv.vocabulary_id,
                   uv.translation, 
                   uv.srs_state, 
                   uv.next_review_at, 
                   uv.interval_days, 
                   uv.ease_factor, 
                   uv.practice_count, 
                   uv.metadata, 
                   uv.created_at, 
                   uv.updated_at,
                   gv.word, 
                   gv.language_code, 
                   gv.definition, 
                   gv.example_sentence, 
                   gv.audio_url, 
                   gv.part_of_speech, 
                   gv.is_variable,
                   gv.level
            FROM public.user_vocabularies uv
            JOIN public.global_vocabularies gv ON uv.vocabulary_id = gv.id
            WHERE uv.id = $1 AND uv.user_id = $2;
        `;
        const { rows } = await db.query(query, [id, userId]);
        return rows[0] || null;
    }

    /**
     * Cuenta cuántas referencias activas a nivel de usuarios usan el audio de una palabra global.
     */
    async countVocabulariesWithAudioUrl(audioUrl) {
        const query = `
            SELECT COUNT(uv.id)::int as count 
            FROM public.user_vocabularies uv
            JOIN public.global_vocabularies gv ON uv.vocabulary_id = gv.id
            WHERE gv.audio_url = $1;
        `;
        const { rows } = await db.query(query, [audioUrl]);
        return rows[0] ? rows[0].count : 0;
    }

    /**
     * Cuenta cuántas referencias de user_vocabularies apuntan a una palabra global.
     */
    async countUserReferencesToGlobalWord(vocabularyId) {
        const query = `
            SELECT COUNT(id)::int as count 
            FROM public.user_vocabularies
            WHERE vocabulary_id = $1;
        `;
        const { rows } = await db.query(query, [vocabularyId]);
        return rows[0] ? rows[0].count : 0;
    }

    /**
     * Purga los registros de vocabulario globales compartidos que ya no tienen ningún usuario vinculado.
     */
    async purgeOrphanGlobalWords() {
        const query = `
            DELETE FROM public.global_vocabularies
            WHERE id NOT IN (SELECT DISTINCT vocabulary_id FROM public.user_vocabularies);
        `;
        await db.query(query);
    }

    /**
     * Busca una palabra en el diccionario de vocabulario global por su término, idioma y categoría.
     */
    async findGlobalWord(word, languageCode, partOfSpeech) {
        const query = `
            SELECT * FROM public.global_vocabularies
            WHERE word = $1 AND language_code = $2 AND part_of_speech = $3;
        `;
        const { rows } = await db.query(query, [
            word.trim().toLowerCase(), 
            languageCode, 
            partOfSpeech || 'noun'
        ]);
        return rows[0] || null;
    }

    /**
     * Obtiene la voz TTS configurada para un código de idioma.
     */
    async getLanguageVoice(languageCode) {
        const query = `SELECT tts_voice FROM public.languages WHERE code = $1 AND is_active = TRUE`;
        const { rows } = await db.query(query, [languageCode]);
        return rows[0] ? rows[0].tts_voice : null;
    }

    /**
     * Busca términos en el catálogo global que comiencen con la consulta especificada.
     */
    async searchGlobalSuggestions(queryStr, languageCode) {
        const query = `
            SELECT id, word, translation, definition, example_sentence, part_of_speech, level
            FROM public.global_vocabularies
            WHERE word ILIKE $1 AND language_code = $2
            ORDER BY word ASC
            LIMIT 10;
        `;
        const { rows } = await db.query(query, [`${queryStr.trim()}%`, languageCode]);
        return rows;
    }

    /**
     * Obtiene todos los registros globales de vocabulario.
     */
    async getAllGlobalVocabularies(languageCode = null) {
        let query = `
            SELECT * FROM public.global_vocabularies
        `;
        const params = [];
        if (languageCode && languageCode !== 'all') {
            query += ` WHERE language_code = $1`;
            params.push(languageCode);
        }
        query += ` ORDER BY created_at DESC;`;
        const { rows } = await db.query(query, params);
        return rows;
    }

    /**
     * Obtiene una palabra global específica por su ID.
     */
    async getGlobalVocabularyById(id) {
        const query = `
            SELECT * FROM public.global_vocabularies
            WHERE id = $1;
        `;
        const { rows } = await db.query(query, [id]);
        return rows[0] || null;
    }

    /**
     * Actualiza las propiedades de una palabra global de vocabulario.
     */
    async updateGlobalVocabulary(id, { word, language_code, part_of_speech, translation, definition, example_sentence, level, audio_url }) {
        const query = `
            UPDATE public.global_vocabularies
            SET word = $1,
                language_code = $2,
                part_of_speech = $3,
                translation = $4,
                definition = $5,
                example_sentence = $6,
                level = $7,
                audio_url = COALESCE($8, audio_url),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *;
        `;
        const { rows } = await db.query(query, [
            word.trim().toLowerCase(),
            language_code,
            part_of_speech || 'noun',
            translation,
            definition,
            example_sentence,
            level,
            audio_url,
            id
        ]);
        return rows[0];
    }

    /**
     * Elimina por completo una palabra global de la base de datos.
     */
    async deleteGlobalVocabulary(id) {
        const query = `
            DELETE FROM public.global_vocabularies
            WHERE id = $1
            RETURNING *;
        `;
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }
}

module.exports = LanguageRepository;
