const trainingRepository = require('../repositories/trainingRepository');

class DeckService {
    async getUserDecks(userId, parentId = null) {
        return await trainingRepository.getDecks(userId, parentId);
    }

    async getDeckById(userId, deckId) {
        return await trainingRepository.getDeckById(userId, deckId);
    }

    async createDeck(userId, name, icon, parentId = null, description = null, color = null) {
        // Default to USER created manual deck
        return await trainingRepository.createDeck(userId, name, 'USER', 'MANUAL', icon, parentId, description, color);
    }

    async getDueCards(userId, deckId) {
        return await trainingRepository.getDueFlashcards(userId, deckId);
    }

    async getDeckCards(deckId) {
        return await trainingRepository.getDeckCards(deckId);
    }

    async getCardById(cardId) {
        return await trainingRepository.getFlashcardById(cardId);
    }

    async addCard(userId, deckId, front, back, imageUrl = null, backImageUrl = null, audioUrlFront = null, audioUrlBack = null, ttsLangFront = 'es-ES', ttsLangBack = 'es-ES', hideTextFront = false, hideTextBack = false) {
        return await trainingRepository.createFlashcard(userId, deckId, front, back, imageUrl, backImageUrl, audioUrlFront, audioUrlBack, ttsLangFront, ttsLangBack, hideTextFront, hideTextBack);
    }

    async updateCard(userId, cardId, front, back, imageUrl = null, backImageUrl = null, audioUrlFront = null, audioUrlBack = null, ttsLangFront = 'es-ES', ttsLangBack = 'es-ES', hideTextFront = false, hideTextBack = false) {
        return await trainingRepository.updateFlashcardContent(userId, cardId, front, back, imageUrl, backImageUrl, audioUrlFront, audioUrlBack, ttsLangFront, ttsLangBack, hideTextFront, hideTextBack);
    }

    async deleteCard(userId, cardId) {
        return await trainingRepository.deleteFlashcard(userId, cardId);
    }

    async updateCardsOrder(userId, deckId, sortedIds) {
        return await trainingRepository.updateFlashcardsOrder(userId, deckId, sortedIds);
    }

    async deleteBulkCards(userId, cardIds) {
        return await trainingRepository.deleteBulkFlashcards(userId, cardIds);
    }

    async updateDeck(userId, deckId, name, icon, description = null, color = null) {
        return await trainingRepository.updateDeck(userId, deckId, name, icon, description, color);
    }

    async deleteDeck(userId, deckId) {
        return await trainingRepository.deleteDeck(userId, deckId);
    }

    async getCardsImages(userId, cardIds) {
        return await trainingRepository.getCardsImages(userId, cardIds);
    }

    async getDeckTreeImages(userId, deckId) {
        return await trainingRepository.getDeckTreeImages(userId, deckId);
    }

    async addBulkCards(userId, deckId, cards) {
        return await trainingRepository.createFlashcardsManualBatch(userId, deckId, cards);
    }

    async getPublicDecks(page = 1, limit = 20) {
        return await trainingRepository.getPublicDecks(page, limit);
    }

    async updateDeckVisibility(userId, deckId, isPublic) {
        return await trainingRepository.updateDeckVisibility(userId, deckId, isPublic);
    }

    async cloneDeck(userId, publicDeckId) {
        // 1. Fetch original public deck
        // Using 'GUEST' role to bypass user ownership check but we must ensure it's public.
        // Actually, we'll fetch it using a raw or direct DB call if needed, or getDeckById if we adapt it.
        // Let's adapt trainingRepository.getDeckById to allow fetching if public.
        const originalDeck = await trainingRepository.getDeckById('GUEST', publicDeckId);
        // Note: Our GUEST logic in getDeckById only allows 'SYSTEM' decks. 
        // We need a specific fetch for public cloning. Let's do it directly here or adjust repo.
        // For safety, let's use the DB pool directly or add a new repo method.
        const db = require('../../infrastructure/database/db');
        const deckQuery = `SELECT * FROM decks WHERE id = $1 AND is_public = true`;
        const deckRes = await db.query(deckQuery, [publicDeckId]);

        if (deckRes.rows.length === 0) {
            throw new Error('Mazo público no encontrado o no está disponible.');
        }

        const deck = deckRes.rows[0];

        // 2. Create the cloned deck for the new user
        const newDeck = await this.createDeck(userId, `${deck.name} (Clon)`, deck.icon, null, deck.description, deck.color);

        // 3. Fetch original cards
        const cards = await this.getDeckCards(publicDeckId);

        // 4. Bulk insert cards for the new user
        if (cards && cards.length > 0) {
            const mappedCards = cards.map(c => ({
                front: c.front_content,
                back: c.back_content,
                image_url: c.image_url,
                explanation_image_url: c.explanation_image_url,
                audioUrlFront: c.audio_url_frente,
                audioUrlBack: c.audio_url_dorso
            }));

            await this.addBulkCards(userId, newDeck.id, mappedCards);
        }

        // 5. Increment saves count
        await trainingRepository.incrementDeckSaves(publicDeckId);

        return newDeck;
    }

    async isMediaInUse(url) {
        const db = require('../../infrastructure/database/db');
        const cardsQuery = `SELECT count(*) FROM user_flashcards WHERE image_url = $1 OR explanation_image_url = $1 OR audio_url_frente = $1 OR audio_url_dorso = $1`;
        const decksQuery = `SELECT count(*) FROM decks WHERE description LIKE '%' || $1 || '%'`;

        const [cardsRes, decksRes] = await Promise.all([
            db.query(cardsQuery, [url]),
            db.query(decksQuery, [url])
        ]);

        return (parseInt(cardsRes.rows[0].count) + parseInt(decksRes.rows[0].count)) > 0;
    }
}

module.exports = new DeckService();
