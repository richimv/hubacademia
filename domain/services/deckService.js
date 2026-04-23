const trainingRepository = require('../repositories/trainingRepository');

class DeckService {
    async getUserDecks(userId, parentId = null) {
        return await trainingRepository.getDecks(userId, parentId);
    }

    async getDeckById(userId, deckId) {
        return await trainingRepository.getDeckById(userId, deckId);
    }

    async createDeck(userId, name, icon, parentId = null) {
        // Default to USER created manual deck
        return await trainingRepository.createDeck(userId, name, 'USER', 'MANUAL', icon, parentId);
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

    async addCard(userId, deckId, front, back, imageUrl = null, backImageUrl = null) {
        return await trainingRepository.createFlashcard(userId, deckId, front, back, imageUrl, backImageUrl);
    }

    async updateCard(userId, cardId, front, back, imageUrl = null, backImageUrl = null) {
        return await trainingRepository.updateFlashcardContent(userId, cardId, front, back, imageUrl, backImageUrl);
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

    async updateDeck(userId, deckId, name, icon) {
        return await trainingRepository.updateDeck(userId, deckId, name, icon);
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
}

module.exports = new DeckService();
