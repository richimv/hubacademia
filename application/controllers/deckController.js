const DeckService = require('../../domain/services/deckService');

class DeckController {
    /**
     * Helper to get common user context.
     */
    _getUserContext = (req) => {
        return {
            userId: req.user ? req.user.id : 'GUEST',
            isGuest: !req.user
        };
    }

    /**
     * GET /api/decks
     * Query Params: ?parentId=uuid (optional)
     */
    listDecks = async (req, res) => {
        try {
            const { userId } = this._getUserContext(req);
            const { parentId } = req.query;
            const decks = await DeckService.getUserDecks(userId, parentId || null);
            res.json({ success: true, decks });
        } catch (error) {
            console.error('[listDecks] Error:', error);
            res.status(500).json({ error: 'Error al obtener los mazos' });
        }
    }

    /**
     * GET /api/decks/:deckId
     */
    getDeckById = async (req, res) => {
        try {
            const { userId, isGuest } = this._getUserContext(req);
            const { deckId } = req.params;
            const deck = await DeckService.getDeckById(userId, deckId);

            if (!deck) return res.status(404).json({ error: 'Mazo no encontrado' });

            // Security: Guests only for SYSTEM decks
            if (isGuest && deck.type !== 'SYSTEM') {
                return res.status(403).json({ error: 'Acceso denegado: Inicia sesión para ver este mazo' });
            }

            res.json({ success: true, deck });
        } catch (error) {
            console.error('[getDeckById] Error:', error);
            res.status(500).json({ error: 'Error al obtener el mazo' });
        }
    }

    /**
     * POST /api/decks
     */
    createDeck = async (req, res) => {
        try {
            const { name, icon, parentId } = req.body;
            const { userId, isGuest } = this._getUserContext(req);

            if (isGuest) return res.status(403).json({ error: 'Debes iniciar sesión para crear mazos' });
            if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

            const deck = await DeckService.createDeck(userId, name, icon || 'fas fa-layer-group', parentId || null);
            res.json({ success: true, deck });
        } catch (error) {
            console.error('[createDeck] Error:', error);
            res.status(500).json({ error: 'Error al crear el mazo' });
        }
    }

    /**
     * PUT /api/decks/:deckId
     */
    updateDeck = async (req, res) => {
        try {
            const { deckId } = req.params;
            const { name, icon } = req.body;
            const { userId } = this._getUserContext(req);

            if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

            const deck = await DeckService.updateDeck(userId, deckId, name, icon);
            res.json({ success: true, deck });
        } catch (error) {
            console.error('[updateDeck] Error:', error);
            res.status(500).json({ error: 'Error al actualizar el mazo' });
        }
    }

    /**
     * GET /api/decks/:deckId/cards/due
     */
    getDueCards = async (req, res) => {
        try {
            const { deckId } = req.params;
            const { userId } = this._getUserContext(req);
            const cards = await DeckService.getDueCards(userId, deckId);
            res.json({ success: true, cards });
        } catch (error) {
            console.error('[getDueCards] Error:', error);
            res.status(500).json({ error: 'Error al obtener tarjetas pendientes' });
        }
    }

    /**
     * GET /api/decks/:deckId/cards/:cardId/study
     */
    getStudyCard = async (req, res) => {
        try {
            const { cardId } = req.params;
            const { userId } = this._getUserContext(req);
            
            const card = await DeckService.getCardById(cardId);
            
            // Validar propiedad de la tarjeta (seguridad básica)
            if (!card || card.user_id !== userId) {
                return res.status(403).json({ error: 'Tarjeta no encontrada o sin acceso' });
            }

            res.json({ success: true, cards: [card] }); // Envuelto en array para compatibilidad con el frontend
        } catch (error) {
            console.error('[getStudyCard] Error:', error);
            res.status(500).json({ error: 'Error al obtener tarjeta de estudio' });
        }
    }

    /**
     * GET /api/decks/:deckId/cards
     */
    listCards = async (req, res) => {
        try {
            const { deckId } = req.params;
            const { userId, isGuest } = this._getUserContext(req);

            // Security: If Guest, ensure it's a SYSTEM deck
            if (isGuest) {
                const deck = await DeckService.getDeckById('GUEST', deckId);
                if (!deck || deck.type !== 'SYSTEM') {
                    return res.status(403).json({ error: 'Acceso denegado: No puedes ver estas tarjetas' });
                }
            }

            const cards = await DeckService.getDeckCards(deckId);
            res.json({ success: true, cards });
        } catch (error) {
            console.error('[listCards] Error:', error);
            res.status(500).json({ error: 'Error al listar tarjetas' });
        }
    }

    /**
     * POST /api/decks/:deckId/cards
     */
    addCard = async (req, res) => {
        try {
            const { deckId } = req.params;
            const { front, back, imageUrl, backImageUrl } = req.body;
            const { userId } = this._getUserContext(req);

            // Validar que al menos haya texto o imagen en ambos lados
            const hasFront = (front && front.trim()) || imageUrl;
            const hasBack = (back && back.trim()) || backImageUrl;

            if (!hasFront || !hasBack) {
                return res.status(400).json({ error: 'La tarjeta debe tener contenido (texto o imagen) en ambos lados.' });
            }

            const card = await DeckService.addCard(userId, deckId, front, back, imageUrl, backImageUrl);
            res.json({ success: true, card });
        } catch (error) {
            console.error('[addCard] Error:', error);
            res.status(500).json({ error: 'Error al añadir tarjeta' });
        }
    }

    /**
     * PUT /api/decks/:deckId/cards/reorder
     */
    reorderCards = async (req, res) => {
        try {
            const { deckId } = req.params;
            const { sortedIds } = req.body;
            const { userId } = this._getUserContext(req);

            if (!sortedIds || !Array.isArray(sortedIds)) {
                return res.status(400).json({ error: 'Se requiere una lista de IDs para reordenar' });
            }

            await DeckService.updateCardsOrder(userId, deckId, sortedIds);
            res.json({ success: true });
        } catch (error) {
            console.error('[reorderCards] Error:', error);
            res.status(500).json({ error: 'Error al reordenar tarjetas' });
        }
    }

    /**
     * DELETE /api/cards/batch
     */
    deleteBulkCards = async (req, res) => {
        try {
            const { cardIds } = req.body;
            const { userId } = this._getUserContext(req);

            if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
                return res.status(400).json({ error: 'Se requieren IDs de tarjetas' });
            }

            // 1. Obtener las imágenes de GCS a eliminar
            const imagesToDelete = await DeckService.getCardsImages(userId, cardIds);

            // 2. Eliminar tarjetas de la BD
            await DeckService.deleteBulkCards(userId, cardIds);

            // 3. Limpiar GCS
            const mediaController = require('./mediaController');
            for (const img of imagesToDelete) {
                if (img.image_url) await mediaController.deleteFile(img.image_url);
                if (img.explanation_image_url) await mediaController.deleteFile(img.explanation_image_url);
            }

            res.json({ success: true, deletedCount: cardIds.length });
        } catch (error) {
            console.error('[deleteBulkCards] Error:', error);
            res.status(500).json({ error: 'Error al eliminar tarjetas masivamente' });
        }
    }

    /**
     * PUT /api/cards/:cardId
     */
    updateCard = async (req, res) => {
        try {
            const { cardId } = req.params;
            const { front, back, imageUrl, backImageUrl } = req.body;
            const { userId } = this._getUserContext(req);

            // Validar que al menos haya texto o imagen en ambos lados
            const hasFront = (front && front.trim()) || imageUrl;
            const hasBack = (back && back.trim()) || backImageUrl;

            if (!hasFront || !hasBack) {
                return res.status(400).json({ error: 'La tarjeta debe tener contenido (texto o imagen) en ambos lados.' });
            }

            // 1. Obtener la tarjeta actual para comparar imágenes
            const currentCard = await DeckService.getCardById(cardId);
            if (!currentCard) return res.status(404).json({ error: 'Tarjeta no encontrada' });

            const card = await DeckService.updateCard(userId, cardId, front, back, imageUrl, backImageUrl);

            // 2. Limpieza de GCS (Post-Guardado)
            // Si la URL cambió y la anterior no era null, borrar el archivo viejo
            const mediaController = require('./mediaController');
            
            if (currentCard.image_url && currentCard.image_url !== imageUrl) {
                await mediaController.deleteFile(currentCard.image_url);
            }
            if (currentCard.explanation_image_url && currentCard.explanation_image_url !== backImageUrl) {
                await mediaController.deleteFile(currentCard.explanation_image_url);
            }

            res.json({ success: true, card });
        } catch (error) {
            console.error('[updateCard] Error:', error);
            res.status(500).json({ error: 'Error al actualizar tarjeta' });
        }
    }

    /**
     * DELETE /api/cards/:cardId
     */
    deleteCard = async (req, res) => {
        try {
            const { cardId } = req.params;
            const { userId } = this._getUserContext(req);

            // 1. Obtener la tarjeta para saber qué archivos borrar
            const card = await DeckService.getCardById(cardId);
            if (!card) return res.status(404).json({ error: 'Tarjeta no encontrada' });

            await DeckService.deleteCard(userId, cardId);

            // 2. Limpiar GCS
            const mediaController = require('./mediaController');
            if (card.image_url) await mediaController.deleteFile(card.image_url);
            if (card.explanation_image_url) await mediaController.deleteFile(card.explanation_image_url);

            res.json({ success: true });
        } catch (error) {
            console.error('[deleteCard] Error:', error);
            res.status(500).json({ error: 'Error al eliminar tarjeta' });
        }
    }

    /**
     * DELETE /api/decks/:deckId
     */
    deleteDeck = async (req, res) => {
        try {
            const { deckId } = req.params;
            const { userId } = this._getUserContext(req);

            // 1. Obtener todas las imágenes del árbol de mazos
            const imagesToDelete = await DeckService.getDeckTreeImages(userId, deckId);

            // 2. Eliminar el mazo y sub-mazos de la BD
            await DeckService.deleteDeck(userId, deckId);

            // 3. Limpiar GCS
            const mediaController = require('./mediaController');
            for (const img of imagesToDelete) {
                if (img.image_url) await mediaController.deleteFile(img.image_url);
                if (img.explanation_image_url) await mediaController.deleteFile(img.explanation_image_url);
            }

            res.json({ success: true });
        } catch (error) {
            console.error('[deleteDeck] Error:', error);
            res.status(500).json({ error: 'Error al eliminar el mazo' });
        }
    }

    /**
     * POST /api/decks/:deckId/generate
     */
    generateCards = async (req, res) => {
        try {
            const { deckId } = req.params;
            const { topic } = req.body;
            const { userId } = this._getUserContext(req);

            if (!topic) return res.status(400).json({ error: 'El tema es obligatorio' });

            const TrainingService = require('../../domain/services/trainingService');
            const cards = await TrainingService.generateFlashcardsFromTopic(topic, 5);

            const savedCards = [];
            for (const card of cards) {
                const saved = await DeckService.addCard(userId, deckId, card.front, card.back);
                savedCards.push(saved);
            }

            // Sync Usage Limits
            try {
                const db = require('../../infrastructure/database/db');
                if (req.usageType) {
                    await db.query(
                        `UPDATE users SET ${req.usageType} = ${req.usageType} + 1 WHERE id = $1`,
                        [userId]
                    );
                }
            } catch (limitErr) {
                console.warn("Could not sync AI limits, continuing...", limitErr.message);
            }

            res.json({ success: true, count: savedCards.length, cards: savedCards });
        } catch (error) {
            console.error('[generateCards] Error:', error);
            res.status(500).json({ error: 'Error al generar tarjetas con IA' });
        }
    }

    /**
     * POST /api/cards/upload-image
     */
    uploadCardImage = async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
            }

            const mediaController = require('./mediaController');
            const gcsPath = await mediaController.uploadFile(req.file, 'flashcards');
            
            res.json({ success: true, imageUrl: gcsPath });
        } catch (error) {
            console.error('[uploadCardImage] Error:', error);
            res.status(500).json({ error: 'Error al subir imagen de tarjeta' });
        }
    }
}

module.exports = new DeckController();
