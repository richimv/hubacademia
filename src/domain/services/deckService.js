const trainingRepository = require('../repositories/flashcardRepository');

class DeckService {
    constructor(flashcardRepository = trainingRepository) {
        this.flashcardRepository = flashcardRepository;
    }

    async getUserDecks(userId, parentId = null) {
        return await trainingRepository.getDecks(userId, parentId);
    }

    async getDeckTree(userId) {
        return await trainingRepository.getAllUserDecks(userId);
    }

    async getDeckById(userId, deckId) {
        return await trainingRepository.getDeckById(userId, deckId);
    }

    async getDeckGuide(userId, deckId) {
        return await trainingRepository.getDeckGuide(userId, deckId);
    }

    async createDeck(userId, name, icon, parentId = null, description = null, color = null, category = 'General') {
        // Default to USER created manual deck
        return await trainingRepository.createDeck(userId, name, 'USER', 'MANUAL', icon, parentId, description, color, category);
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
        const deck = await trainingRepository.getDeckById(userId, deckId);
        if (!deck) {
            throw new Error('Mazo no encontrado o acceso denegado');
        }
        const card = await trainingRepository.createFlashcard(userId, deckId, front, back, imageUrl, backImageUrl, audioUrlFront, audioUrlBack, ttsLangFront, ttsLangBack, hideTextFront, hideTextBack);
        await trainingRepository.touchDeck(deckId);
        return card;
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

    async updateDeck(userId, deckId, name, icon, description = null, color = null, category = 'General') {
        return await trainingRepository.updateDeck(userId, deckId, name, icon, description, color, category);
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
        const deck = await trainingRepository.getDeckById(userId, deckId);
        if (!deck) {
            throw new Error('Mazo no encontrado o acceso denegado');
        }
        const createdCards = await trainingRepository.createFlashcardsManualBatch(userId, deckId, cards);
        await trainingRepository.touchDeck(deckId);
        return createdCards;
    }

    async getPublicDecks(page = 1, limit = 20, category = 'ALL') {
        return await trainingRepository.getPublicDecks(page, limit, category);
    }

    async updateDeckVisibility(userId, deckId, isPublic, category = null) {
        return await trainingRepository.updateDeckVisibility(userId, deckId, isPublic, category);
    }

    async cloneDeck(userId, publicDeckId) {
        try {
            // 1. Obtener mazo público original
            const deck = await this.flashcardRepository.getPublicDeckForClone(publicDeckId);
            if (!deck) {
                throw new Error('Mazo público no encontrado o no está disponible.');
            }

            // 2. Anti-Spam / Anti-Duplicados: Verificar si el usuario ya tiene este mazo clonado
            const cloneName = `${deck.name} (Clon)`;
            const alreadyCloned = await this.flashcardRepository.hasUserClonedDeck(userId, cloneName, deck.name);
            if (alreadyCloned) {
                throw new Error('Ya has clonado este mazo en tu biblioteca.');
            }

            // Anti-Abuso: Límite de seguridad contra scripts maliciosos (máx 30 clonaciones por día)
            const dailyClonesCount = await this.flashcardRepository.countDailyClones(userId);
            if (dailyClonesCount >= 30) {
                throw new Error('Has alcanzado el límite de 30 clonaciones de mazos por día. Vuelve mañana.');
            }

            // 3. Crear el mazo clonado para el usuario
            const newDeck = await this.createDeck(userId, cloneName, deck.icon, null, deck.description, deck.color, deck.category || 'General');

            // 4. Obtener tarjetas originales
            const cards = await this.getDeckCards(publicDeckId);

            // 5. Inserción masiva vinculando URLs existentes sin re-sintetizar audio ni duplicar imágenes en GCS
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

            // 6. Incrementar contador de guardados en la comunidad
            await this.flashcardRepository.incrementDeckSaves(publicDeckId);

            return newDeck;
        } catch (error) {
            console.error('❌ [DeckService] Error en cloneDeck:', error.message);
            throw error;
        }
    }

    async isMediaInUse(url) {
        if (!url || typeof url !== 'string') return false;
        try {
            return Boolean(await this.flashcardRepository.isMediaInUse(url));
        } catch (error) {
            console.error('❌ [DeckService] Error en isMediaInUse:', error.message);
            throw error;
        }
    }
}

module.exports = new DeckService();
