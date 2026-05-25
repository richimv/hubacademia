const db = require('../../infrastructure/database/db');
const crypto = require('crypto');

class FlashcardRepository {

    async getDecks(userId, parentId = null) {
        if (userId === 'GUEST') {
            const query = `
                SELECT DISTINCT ON (d.name)
                    d.id, d.name, d.type, d.icon, d.source_module, d.parent_id,
                    0 as total_cards, 0 as due_cards, 
                    (SELECT COUNT(*) FROM decks children WHERE children.parent_id = d.id) as children_count,
                    0 as mastery_percentage
                FROM decks d
                WHERE d.type = 'SYSTEM' AND (d.parent_id = $1 OR ($1 IS NULL AND d.parent_id IS NULL))
                ORDER BY d.name, d.created_at ASC
            `;
            const result = await db.query(query, [parentId]);
            return result.rows;
        }

        let query = `
            SELECT 
                d.id, d.name, d.type, d.icon, d.color, d.source_module, d.parent_id,
                d.is_public, d.saves_count, d.likes_count, d.cloned_from_id,
                COUNT(uf.id) as total_cards,
                COUNT(uf.id) FILTER (WHERE uf.next_review_at <= NOW()) as due_cards,
                (SELECT COUNT(*) FROM decks children WHERE children.parent_id = d.id) as children_count,
                ROUND((COUNT(uf.id) FILTER (WHERE uf.interval_days > 21)::float / NULLIF(COUNT(uf.id), 0)) * 100) as mastery_percentage
            FROM decks d
            LEFT JOIN user_flashcards uf ON d.id = uf.deck_id
            WHERE d.user_id = $1
        `;

        const params = [userId];
        if (parentId) {
            query += ` AND d.parent_id = $2`;
            params.push(parentId);
        } else {
            query += ` AND d.parent_id IS NULL`;
        }

        query += ` GROUP BY d.id ORDER BY d.created_at ASC`;
        const result = await db.query(query, params);
        return result.rows;
    }

    async getAllUserDecks(userId) {
        if (userId === 'GUEST') {
            const query = `
                SELECT DISTINCT ON (d.name)
                    d.id, d.name, d.type, d.icon, d.source_module, d.parent_id,
                    0 as total_cards, 0 as due_cards, 
                    (SELECT COUNT(*) FROM decks children WHERE children.parent_id = d.id) as children_count,
                    0 as mastery_percentage
                FROM decks d
                WHERE d.type = 'SYSTEM'
                ORDER BY d.name, d.created_at ASC
            `;
            const result = await db.query(query);
            return result.rows;
        }

        const query = `
            SELECT 
                d.id, d.name, d.type, d.icon, d.color, d.source_module, d.parent_id,
                d.is_public, d.saves_count, d.likes_count, d.cloned_from_id,
                COUNT(uf.id) as total_cards,
                COUNT(uf.id) FILTER (WHERE uf.next_review_at <= NOW()) as due_cards,
                (SELECT COUNT(*) FROM decks children WHERE children.parent_id = d.id) as children_count,
                ROUND((COUNT(uf.id) FILTER (WHERE uf.interval_days > 21)::float / NULLIF(COUNT(uf.id), 0)) * 100) as mastery_percentage
            FROM decks d
            LEFT JOIN user_flashcards uf ON d.id = uf.deck_id
            WHERE d.user_id = $1
            GROUP BY d.id 
            ORDER BY d.created_at ASC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    async getDeckById(userId, deckId) {
        const query = `
            SELECT 
                d.id, d.name, d.type, d.icon, d.color, d.source_module, d.parent_id,
                d.is_public, d.saves_count, d.likes_count, d.cloned_from_id,
                COUNT(uf.id) as total_cards,
                COUNT(uf.id) FILTER (WHERE uf.next_review_at <= NOW()) as due_cards,
                (SELECT COUNT(*) FROM decks children WHERE children.parent_id = d.id) as children_count,
                ROUND((COUNT(uf.id) FILTER (WHERE uf.interval_days > 21)::float / NULLIF(COUNT(uf.id), 0)) * 100) as mastery_percentage
            FROM decks d
            LEFT JOIN user_flashcards uf ON d.id = uf.deck_id
            WHERE ${userId === 'GUEST' ? "(d.type = 'SYSTEM' OR d.is_public = true)" : "d.user_id = $1"} AND d.id = ${userId === 'GUEST' ? '$1' : '$2'}
            GROUP BY d.id
        `;
        const params = userId === 'GUEST' ? [deckId] : [userId, deckId];
        const result = await db.query(query, params);
        return result.rows[0];
    }

    async getDeckGuide(userId, deckId) {
        const query = `
            SELECT description FROM decks 
            WHERE (user_id = $1 OR type = 'SYSTEM' OR is_public = true) AND id = $2
        `;
        const result = await db.query(query, [userId, deckId]);
        return result.rows[0] ? result.rows[0].description : null;
    }

    async createDeck(userId, name, type = 'USER', sourceModule = 'MANUAL', icon = '📚', parentId = null, description = null, color = null) {
        const query = `
            INSERT INTO decks (user_id, name, type, source_module, icon, parent_id, description, color)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, icon, color, parent_id, description
        `;
        const result = await db.query(query, [userId, name, type, sourceModule, icon, parentId, description, color]);
        return result.rows[0];
    }

    async updateDeck(userId, deckId, name, icon, description = null, color = null) {
        const query = `
            UPDATE decks 
            SET name = $3, icon = $4, description = $5, color = $6
            WHERE id = $2 AND user_id = $1
            RETURNING id, name, icon, color, description
        `;
        const result = await db.query(query, [userId, deckId, name, icon, description, color]);

        if (result.rows.length > 0) {
            const updateCardsQuery = `
                UPDATE user_flashcards 
                SET topic = $1 
                WHERE deck_id = $2 AND user_id = $3
            `;
            await db.query(updateCardsQuery, [name, deckId, userId]);
        }

        return result.rows[0];
    }

    async updateDeckVisibility(userId, deckId, isPublic) {
        const query = `
            UPDATE decks 
            SET is_public = $3
            WHERE id = $2 AND user_id = $1
            RETURNING id, is_public
        `;
        const result = await db.query(query, [userId, deckId, isPublic]);
        return result.rows[0];
    }

    async getPublicDecks(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const query = `
            SELECT 
                d.id, d.name, d.icon, d.description, d.color, d.saves_count, d.likes_count, d.created_at,
                u.name as author_name,
                (SELECT COUNT(*) FROM user_flashcards uf WHERE uf.deck_id = d.id) as total_cards
            FROM decks d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.is_public = true
            ORDER BY d.saves_count DESC, d.created_at DESC
            LIMIT $1 OFFSET $2
        `;
        const result = await db.query(query, [limit, offset]);
        return result.rows;
    }

    async incrementDeckSaves(deckId) {
        const query = `UPDATE decks SET saves_count = saves_count + 1 WHERE id = $1`;
        await db.query(query, [deckId]);
    }

    async ensureSystemDeck(userId, moduleName) {
        let deckName = `Repaso ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1).toLowerCase()}`;
        let icon = 'fas fa-brain';

        if (moduleName === 'MEDICINA') icon = 'fas fa-stethoscope';
        if (moduleName === 'IDIOMAS') icon = 'fas fa-comments';

        const findQuery = `
            SELECT id FROM decks 
            WHERE user_id = $1 AND type = 'SYSTEM' AND source_module = $2
            LIMIT 1
        `;
        const findRes = await db.query(findQuery, [userId, moduleName]);

        if (findRes.rows.length > 0) return findRes.rows[0].id;

        return (await this.createDeck(userId, deckName, 'SYSTEM', moduleName, icon)).id;
    }

    async createFlashcardsBatch(userId, questions, topic, attemptId, moduleName = 'MEDICINA') {
        if (!questions || questions.length === 0) return;

        const deckId = await this.ensureSystemDeck(userId, moduleName);

        const existingQuery = `
            SELECT front_content FROM user_flashcards 
            WHERE user_id = $1 AND deck_id = $2
        `;
        const existingRes = await db.query(existingQuery, [userId, deckId]);
        const existingFronts = new Set(existingRes.rows.map(r => r.front_content.trim()));

        const values = [];
        const placeholders = [];
        let insertCount = 0;

        questions.forEach((q) => {
            const front = q.question_text.trim();

            if (existingFronts.has(front)) {
                return;
            }

            const correctOption = q.options[q.correct_option_index];
            const back = `💡 ${correctOption}`;

            const offset = insertCount * 14;
            placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`);
            values.push(
                userId, front, back, q.topic || topic, attemptId, deckId, 
                q.image_url || null, q.explanation_image_url || null, 
                q.audio_url_frente || null, q.audio_url_dorso || null,
                q.tts_lang_frente || null, q.tts_lang_dorso || null,
                q.hide_text_frente || false, q.hide_text_dorso || false
            );
            insertCount++;
        });

        if (insertCount === 0) {
            console.log("No new flashcards to insert (all were duplicates).");
            return;
        }

        const query = `
            INSERT INTO user_flashcards (user_id, front_content, back_content, topic, source_quiz_id, deck_id, image_url, explanation_image_url, audio_url_frente, audio_url_dorso, tts_lang_frente, tts_lang_dorso, hide_text_frente, hide_text_dorso)
            VALUES ${placeholders.join(', ')}
        `;

        await db.query(query, values);
        console.log(`✅ Saved ${insertCount} new UNIQUE flashcards with individual topics.`);
    }

    async createFlashcardsManualBatch(userId, deckId, cards) {
        if (!cards || cards.length === 0) return { inserted: 0 };

        const deckQuery = `SELECT name FROM decks WHERE id = $1`;
        const deckRes = await db.query(deckQuery, [deckId]);
        const deckName = deckRes.rows[0]?.name || 'Manual Import';

        const existingQuery = `
            SELECT front_content FROM user_flashcards 
            WHERE user_id = $1 AND deck_id = $2
        `;
        const existingRes = await db.query(existingQuery, [userId, deckId]);
        const existingFronts = new Set(existingRes.rows.map(r => r.front_content.trim()));

        const values = [];
        const placeholders = [];
        let insertCount = 0;

        cards.forEach((c) => {
            const front = c.front.trim();
            const back = c.back.trim();

            if (existingFronts.has(front)) return;

            const offset = insertCount * 10;
            placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`);
            values.push(userId, deckId, front, back, deckName, new Date(), c.image_url || null, c.explanation_image_url || null, c.audioUrlFront || null, c.audioUrlBack || null);
            insertCount++;
        });

        if (insertCount === 0) return { inserted: 0 };

        const query = `
            INSERT INTO user_flashcards (user_id, deck_id, front_content, back_content, topic, created_at, image_url, explanation_image_url, audio_url_frente, audio_url_dorso)
            VALUES ${placeholders.join(', ')}
        `;

        await db.query(query, values);
        return { inserted: insertCount };
    }

    async checkExistingFlashcards(userId, deckId, fronts = []) {
        if (!fronts || fronts.length === 0) return [];

        const query = `
            SELECT front_content FROM user_flashcards
            WHERE user_id = $1 AND deck_id = $2 AND front_content = ANY($3::text[])
        `;
        const result = await db.query(query, [userId, deckId, fronts]);
        return result.rows.map(r => r.front_content);
    }

    async getDueFlashcards(userId, deckId = null) {
        let query = `
            SELECT * FROM user_flashcards
            WHERE user_id = $1 
            AND next_review_at <= NOW()
        `;
        const params = [userId];

        if (deckId) {
            query += ` AND deck_id = $2`;
            params.push(deckId);
        }

        query += ` ORDER BY sort_order ASC, next_review_at ASC LIMIT 50`;

        const result = await db.query(query, params);
        return result.rows;
    }

    async updateFlashcard(cardId, interval, ef, reps, nextDate, lastQuality = 0) {
        const query = `
            UPDATE user_flashcards
            SET interval_days = $2, easiness_factor = $3, repetition_number = $4, 
                next_review_at = $5, last_reviewed_at = NOW(), last_quality = $6
            WHERE id = $1
        `;
        await db.query(query, [cardId, interval, ef, reps, nextDate, lastQuality]);
    }

    async getFlashcardById(cardId) {
        const query = `SELECT * FROM user_flashcards WHERE id = $1`;
        const result = await db.query(query, [cardId]);
        return result.rows[0];
    }

    async getDeckCards(deckId) {
        const query = `
            SELECT * FROM user_flashcards 
            WHERE deck_id = $1 
            ORDER BY sort_order ASC, created_at ASC
        `;
        const result = await db.query(query, [deckId]);
        return result.rows;
    }

    async createFlashcard(userId, deckId, front, back, imageUrl = null, backImageUrl = null, audioUrlFront = null, audioUrlBack = null, ttsLangFront = 'es-ES', ttsLangBack = 'es-ES', hideTextFront = false, hideTextBack = false) {
        const deckQuery = `SELECT name FROM decks WHERE id = $1`;
        const deckRes = await db.query(deckQuery, [deckId]);
        const topic = deckRes.rows[0]?.name || 'GENERAL';

        const query = `
            INSERT INTO user_flashcards (user_id, deck_id, front_content, back_content, topic, interval_days, easiness_factor, repetition_number, next_review_at, image_url, explanation_image_url, audio_url_frente, audio_url_dorso, tts_lang_frente, tts_lang_dorso, hide_text_frente, hide_text_dorso)
            VALUES ($1, $2, $3, $4, $5, 0, 2.5, 0, NOW(), $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, front_content, back_content, topic, image_url, explanation_image_url, audio_url_frente, audio_url_dorso, tts_lang_frente, tts_lang_dorso, hide_text_frente, hide_text_dorso
        `;
        const result = await db.query(query, [userId, deckId, front, back, topic, imageUrl, backImageUrl, audioUrlFront, audioUrlBack, ttsLangFront, ttsLangBack, hideTextFront, hideTextBack]);
        return result.rows[0];
    }

    async updateFlashcardContent(userId, cardId, front, back, imageUrl = null, backImageUrl = null, audioUrlFront = null, audioUrlBack = null, ttsLangFront = 'es-ES', ttsLangBack = 'es-ES', hideTextFront = false, hideTextBack = false) {
        const query = `
            UPDATE user_flashcards 
            SET front_content = $3, back_content = $4, image_url = $5, explanation_image_url = $6, audio_url_frente = $7, audio_url_dorso = $8, tts_lang_frente = $9, tts_lang_dorso = $10, hide_text_frente = $11, hide_text_dorso = $12
            WHERE id = $2 AND user_id = $1
            RETURNING id, front_content, back_content, image_url, explanation_image_url, audio_url_frente, audio_url_dorso, tts_lang_frente, tts_lang_dorso, hide_text_frente, hide_text_dorso
        `;
        const result = await db.query(query, [userId, cardId, front, back, imageUrl, backImageUrl, audioUrlFront, audioUrlBack, ttsLangFront, ttsLangBack, hideTextFront, hideTextBack]);
        return result.rows[0];
    }

    async deleteFlashcard(userId, cardId) {
        const query = `DELETE FROM user_flashcards WHERE id = $1 AND user_id = $2`;
        await db.query(query, [cardId, userId]);
    }

    async updateFlashcardsOrder(userId, deckId, sortedIds) {
        const checkQuery = `SELECT id FROM decks WHERE id = $1 AND user_id = $2`;
        const checkRes = await db.query(checkQuery, [deckId, userId]);
        if (checkRes.rows.length === 0) throw new Error("Deck not found or access denied");

        const client = await db.pool().connect();
        try {
            await client.query('BEGIN');
            const updateQuery = `
                UPDATE user_flashcards 
                SET sort_order = $1 
                WHERE id = $2 AND deck_id = $3 AND user_id = $4
            `;

            for (let i = 0; i < sortedIds.length; i++) {
                await client.query(updateQuery, [i, sortedIds[i], deckId, userId]);
            }

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async deleteBulkFlashcards(userId, cardIds) {
        if (!cardIds || cardIds.length === 0) return;
        const query = `DELETE FROM user_flashcards WHERE id = ANY($1::uuid[]) AND user_id = $2`;
        await db.query(query, [cardIds, userId]);
    }

    async deleteDeck(userId, deckId) {
        const fetchTreeQuery = `
            WITH RECURSIVE deck_tree AS (
                SELECT id, 1 as depth FROM decks WHERE id = $1 AND user_id = $2
                UNION ALL
                SELECT d.id, dt.depth + 1 FROM decks d
                INNER JOIN deck_tree dt ON d.parent_id = dt.id
            )
            SELECT id FROM deck_tree ORDER BY depth DESC;
        `;

        try {
            const { rows } = await db.query(fetchTreeQuery, [deckId, userId]);

            if (rows.length === 0) return;

            for (const row of rows) {
                await db.query('DELETE FROM decks WHERE id = $1', [row.id]);
            }
        } catch (error) {
            console.error("Error deleting deck tree:", error);
            throw error;
        }
    }

    async getCardsImages(userId, cardIds) {
        if (!cardIds || cardIds.length === 0) return [];
        const query = `
            SELECT image_url, explanation_image_url, audio_url_frente, audio_url_dorso 
            FROM user_flashcards 
            WHERE id = ANY($1::uuid[]) AND user_id = $2
            AND (image_url IS NOT NULL OR explanation_image_url IS NOT NULL OR audio_url_frente IS NOT NULL OR audio_url_dorso IS NOT NULL);
        `;
        const { rows } = await db.query(query, [cardIds, userId]);
        return rows;
    }

    async getDeckTreeImages(userId, deckId) {
        const query = `
            WITH RECURSIVE deck_tree AS (
                SELECT id, description FROM decks WHERE id = $1 AND user_id = $2
                UNION ALL
                SELECT d.id, d.description FROM decks d
                INNER JOIN deck_tree dt ON d.parent_id = dt.id
            )
            SELECT 
                uf.image_url, 
                uf.explanation_image_url,
                uf.audio_url_frente,
                uf.audio_url_dorso,
                dt.description as deck_description
            FROM deck_tree dt
            LEFT JOIN user_flashcards uf ON dt.id = uf.deck_id
            WHERE (uf.image_url IS NOT NULL OR uf.explanation_image_url IS NOT NULL OR uf.audio_url_frente IS NOT NULL OR uf.audio_url_dorso IS NOT NULL OR dt.description IS NOT NULL);
        `;
        const { rows } = await db.query(query, [deckId, userId]);
        return rows;
    }
}

module.exports = new FlashcardRepository();
