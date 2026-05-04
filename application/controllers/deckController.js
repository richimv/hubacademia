const DeckService = require('../../domain/services/deckService');

// 🛡️ CONSTANTES DE SEGURIDAD Y CONTROL DE COSTOS
const SECURITY_LIMITS = {
    MAX_TEXT_LENGTH: 400,      // Límite para guardar en BD (Reducido para brevedad)
    MAX_TTS_LENGTH: 500,       // Límite para enviar a Google TTS (Ahorro de cuota)
    MIN_TEXT_LENGTH: 2,        // Evitar basura
    MAX_BATCH_SIZE: 50         // Tarjetas por lote
};

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
     * Helper to extract GCS image URLs from HTML content
     */
    _extractImageUrls = (html) => {
        if (!html || typeof html !== 'string') return [];
        // Match src="URL" but only for our GCS domain/bucket patterns
        const regex = /src="([^">]+storage\.googleapis\.com[^">]+)"/g;
        const urls = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
            urls.push(match[1]);
        }
        return urls;
    }

    /**
     * ✅ NUEVO: Helper para procesar la síntesis de voz y subir a GCS.
     */
    _processAudioTts = async (text, side = 'front', lang = 'es-ES') => {
        if (!text || text.trim().length < SECURITY_LIMITS.MIN_TEXT_LENGTH) return null;
        
        // 🛡️ RECORTAR TEXTO PARA TTS (Protección de presupuesto)
        const cleanText = text.substring(0, SECURITY_LIMITS.MAX_TTS_LENGTH);
        
        try {
            const TtsService = require('../../domain/services/ttsService');
            const mediaController = require('./mediaController');

            // 1. Sintetizar
            const audioBuffer = await TtsService.synthesize(cleanText, lang);

            // 2. Subir a GCS
            const fileName = `tts_${side}_${Date.now()}.mp3`;
            const gcsPath = await mediaController.uploadRawBuffer(audioBuffer, fileName, 'audio/mpeg', 'audio-cards');

            return gcsPath;
        } catch (e) {
            console.error(`⚠️ [TTS Error] No se pudo generar audio para: ${text.substring(0, 20)}...`, e.message);
            return null; // Fallback: Tarjeta sin audio pero creada
        }
    }

    /**
     * Helper to increment usage if middleware detected a quota need
     */
    _syncUsage = async (req) => {
        try {
            if (req.usageType && req.user && req.user.id) {
                const db = require('../../infrastructure/database/db');
                await db.query(
                    `UPDATE users SET ${req.usageType} = ${req.usageType} + 1 WHERE id = $1`,
                    [req.user.id]
                );
                console.log(`📉 Usage ${req.usageType} incremented for user ${req.user.id}`);
            }
        } catch (e) {
            console.error('[DeckController._syncUsage] Error:', e.message);
        }
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

            // Security: Guests only for SYSTEM or PUBLIC decks
            if (isGuest && deck.type !== 'SYSTEM' && !deck.is_public) {
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
            const { name, icon, parentId, description, color } = req.body;
            const { userId, isGuest } = this._getUserContext(req);

            if (isGuest) return res.status(403).json({ error: 'Debes iniciar sesión para crear mazos' });
            if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

            if (this._extractImageUrls(description).length > 2) {
                return res.status(400).json({ error: 'Límite de 2 imágenes por Guía alcanzado.' });
            }

            const deck = await DeckService.createDeck(userId, name, icon || 'fas fa-layer-group', parentId || null, description || null, color || null);
            await this._syncUsage(req);
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
            const { name, icon, description, color } = req.body;
            const { userId } = this._getUserContext(req);

            if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

            // 1. Get current deck for image cleanup
            const currentDeck = await DeckService.getDeckById(userId, deckId);
            if (!currentDeck) return res.status(404).json({ error: 'Mazo no encontrado' });

            if (this._extractImageUrls(description).length > 2) {
                return res.status(400).json({ error: 'Límite de 2 imágenes por Guía alcanzado.' });
            }

            const deck = await DeckService.updateDeck(userId, deckId, name, icon, description, color || null);
            await this._syncUsage(req);

            // 2. Cleanup orphaned images in description
            const oldImages = this._extractImageUrls(currentDeck.description);
            const newImages = this._extractImageUrls(description);
            const orphanedImages = oldImages.filter(url => !newImages.includes(url));

            if (orphanedImages.length > 0) {
                const mediaController = require('./mediaController');
                for (const url of orphanedImages) {
                    if (!(await DeckService.isMediaInUse(url))) {
                        await mediaController.deleteFile(url);
                    }
                }
            }

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

            // Security: If Guest, ensure it's a SYSTEM deck OR a PUBLIC deck
            if (isGuest) {
                const deck = await DeckService.getDeckById('GUEST', deckId);
                if (!deck || (deck.type !== 'SYSTEM' && !deck.is_public)) {
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
            const { front, back, imageUrl, backImageUrl, generateTtsFront, generateTtsBack, ttsLangFront, ttsLangBack, hideTextFront, hideTextBack } = req.body;
            const { userId } = this._getUserContext(req);

            // Validar que al menos haya texto o imagen en ambos lados
            const hasFront = (front && front.trim()) || imageUrl;
            const hasBack = (back && back.trim()) || backImageUrl;

            if (!hasFront || !hasBack) {
                return res.status(400).json({ error: 'La tarjeta debe tener contenido (texto o imagen) en ambos lados.' });
            }

            // 🛡️ VALIDACIÓN DE LONGITUD
            if ((front && front.length > SECURITY_LIMITS.MAX_TEXT_LENGTH) || (back && back.length > SECURITY_LIMITS.MAX_TEXT_LENGTH)) {
                return res.status(400).json({ error: `El texto de la tarjeta es demasiado largo (Máx: ${SECURITY_LIMITS.MAX_TEXT_LENGTH} caracteres).` });
            }

            // ✅ NUEVO: Generación de Audio TTS Individual
            let audioUrlFront = null;
            let audioUrlBack = null;

            if (generateTtsFront && front) {
                audioUrlFront = await this._processAudioTts(front, 'front', ttsLangFront || 'es-ES');
            }
            if (generateTtsBack && back) {
                audioUrlBack = await this._processAudioTts(back, 'back', ttsLangBack || 'es-ES');
            }

            const card = await DeckService.addCard(userId, deckId, front, back, imageUrl, backImageUrl, audioUrlFront, audioUrlBack, ttsLangFront, ttsLangBack, hideTextFront, hideTextBack);
            await this._syncUsage(req);
            res.json({ success: true, card });
        } catch (error) {
            console.error('[addCard] Error:', error);
            res.status(500).json({ error: 'Error al añadir tarjeta' });
        }
    }

    /**
     * POST /api/decks/:deckId/cards/batch
     */
    addBulkCards = async (req, res) => {
        try {
            const { deckId } = req.params;
            const { cards } = req.body;
            const { userId, isGuest } = this._getUserContext(req);

            if (isGuest) return res.status(403).json({ error: 'Inicia sesión para subir tarjetas.' });
            if (!cards || !Array.isArray(cards)) return res.status(400).json({ error: 'Se requiere un array de tarjetas.' });

            const { generateTtsFront, generateTtsBack, ttsLang } = req.body;

            // LÍMITE DE SEGURIDAD (Backend Enforcement)
            if (cards.length > SECURITY_LIMITS.MAX_BATCH_SIZE) {
                return res.status(400).json({ error: `Límite de ${SECURITY_LIMITS.MAX_BATCH_SIZE} tarjetas excedido para carga masiva.` });
            }

            // 🛡️ VALIDACIÓN DE LONGITUD EN LOTE
            const hasOverlength = cards.some(c => (c.front && c.front.length > SECURITY_LIMITS.MAX_TEXT_LENGTH) || (c.back && c.back.length > SECURITY_LIMITS.MAX_TEXT_LENGTH));
            if (hasOverlength) {
                return res.status(400).json({ error: `Una o más tarjetas en el lote exceden el límite de ${SECURITY_LIMITS.MAX_TEXT_LENGTH} caracteres.` });
            }

            // ✅ NUEVO: Procesamiento por lotes (Batch) para TTS con idioma correcto
            const processedCards = await Promise.all(cards.map(async (c) => {
                let audioUrlFront = null;
                let audioUrlBack = null;

                if (generateTtsFront && c.front) {
                    audioUrlFront = await this._processAudioTts(c.front, 'front', ttsLang || 'es-ES');
                }
                if (generateTtsBack && c.back) {
                    audioUrlBack = await this._processAudioTts(c.back, 'back', ttsLang || 'es-ES');
                }

                return { ...c, audioUrlFront, audioUrlBack };
            }));

            const result = await DeckService.addBulkCards(userId, deckId, processedCards);
            await this._syncUsage(req);
            res.json({ success: true, count: result.inserted });
        } catch (error) {
            console.error('[addBulkCards] Error:', error);
            res.status(500).json({ error: 'Error en la carga masiva.' });
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

            // 3. Limpiar GCS (solo si no están en uso)
            const mediaController = require('./mediaController');
            for (const img of imagesToDelete) {
                if (img.image_url && !(await DeckService.isMediaInUse(img.image_url))) {
                    await mediaController.deleteFile(img.image_url);
                }
                if (img.explanation_image_url && !(await DeckService.isMediaInUse(img.explanation_image_url))) {
                    await mediaController.deleteFile(img.explanation_image_url);
                }
                if (img.audio_url_frente && !(await DeckService.isMediaInUse(img.audio_url_frente))) {
                    await mediaController.deleteFile(img.audio_url_frente);
                }
                if (img.audio_url_dorso && !(await DeckService.isMediaInUse(img.audio_url_dorso))) {
                    await mediaController.deleteFile(img.audio_url_dorso);
                }
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
            const { front, back, imageUrl, backImageUrl, generateTtsFront, generateTtsBack, deleteAudioFront, deleteAudioBack, ttsLangFront, ttsLangBack, hideTextFront, hideTextBack } = req.body;
            const { userId } = this._getUserContext(req);

            // Validar que al menos haya texto o imagen en ambos lados
            const hasFront = (front && front.trim()) || imageUrl;
            const hasBack = (back && back.trim()) || backImageUrl;

            if (!hasFront || !hasBack) {
                return res.status(400).json({ error: 'La tarjeta debe tener contenido (texto o imagen) en ambos lados.' });
            }

            // 🛡️ VALIDACIÓN DE LONGITUD
            if ((front && front.length > SECURITY_LIMITS.MAX_TEXT_LENGTH) || (back && back.length > SECURITY_LIMITS.MAX_TEXT_LENGTH)) {
                return res.status(400).json({ error: `El texto de la tarjeta es demasiado largo (Máx: ${SECURITY_LIMITS.MAX_TEXT_LENGTH} caracteres).` });
            }

            // 1. Obtener la tarjeta actual para comparar imágenes y audios
            const currentCard = await DeckService.getCardById(cardId);
            if (!currentCard) return res.status(404).json({ error: 'Tarjeta no encontrada' });

            // ✅ NUEVO: Actualización de Audio TTS
            let audioUrlFront = currentCard.audio_url_frente;
            let audioUrlBack = currentCard.audio_url_dorso;

            // Procesar borrado manual desde la UI
            if (deleteAudioFront && audioUrlFront) {
                await require('./mediaController').deleteFile(audioUrlFront);
                audioUrlFront = null;
            }
            if (deleteAudioBack && audioUrlBack) {
                await require('./mediaController').deleteFile(audioUrlBack);
                audioUrlBack = null;
            }

            if (generateTtsFront && front) {
                // Borrar audio viejo si existía y no se borró ya manualmente
                if (audioUrlFront) await require('./mediaController').deleteFile(audioUrlFront);
                audioUrlFront = await this._processAudioTts(front, 'front', ttsLangFront || 'es-ES');
            }
            if (generateTtsBack && back) {
                // Borrar audio viejo si existía y no se borró ya manualmente
                if (audioUrlBack) await require('./mediaController').deleteFile(audioUrlBack);
                audioUrlBack = await this._processAudioTts(back, 'back', ttsLangBack || 'es-ES');
            }

            const card = await DeckService.updateCard(userId, cardId, front, back, imageUrl, backImageUrl, audioUrlFront, audioUrlBack, ttsLangFront, ttsLangBack, hideTextFront, hideTextBack);
            await this._syncUsage(req);

            // 2. Limpieza de GCS (Post-Guardado)
            // Si la URL cambió y la anterior no era null, borrar el archivo viejo
            const mediaController = require('./mediaController');
            
            if (currentCard.image_url && currentCard.image_url !== imageUrl) {
                if (!(await DeckService.isMediaInUse(currentCard.image_url))) {
                    await mediaController.deleteFile(currentCard.image_url);
                }
            }
            if (currentCard.explanation_image_url && currentCard.explanation_image_url !== backImageUrl) {
                if (!(await DeckService.isMediaInUse(currentCard.explanation_image_url))) {
                    await mediaController.deleteFile(currentCard.explanation_image_url);
                }
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

            // 2. Limpiar GCS solo si nadie mas usa la imagen/audio
            const mediaController = require('./mediaController');
            if (card.image_url && !(await DeckService.isMediaInUse(card.image_url))) {
                await mediaController.deleteFile(card.image_url);
            }
            if (card.explanation_image_url && !(await DeckService.isMediaInUse(card.explanation_image_url))) {
                await mediaController.deleteFile(card.explanation_image_url);
            }
            if (card.audio_url_frente && !(await DeckService.isMediaInUse(card.audio_url_frente))) {
                await mediaController.deleteFile(card.audio_url_frente);
            }
            if (card.audio_url_dorso && !(await DeckService.isMediaInUse(card.audio_url_dorso))) {
                await mediaController.deleteFile(card.audio_url_dorso);
            }

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

            // 1. Obtener todas las imágenes del árbol de mazos (Tarjetas + Descripciones)
            const rawImageData = await DeckService.getDeckTreeImages(userId, deckId);

            // 2. Eliminar el mazo y sub-mazos de la BD
            await DeckService.deleteDeck(userId, deckId);

            // 3. Limpiar GCS
            const mediaController = require('./mediaController');
            const processedUrls = new Set(); // Evitar duplicados

            for (const row of rawImageData) {
                if (row.image_url && !processedUrls.has(row.image_url)) {
                    if (!(await DeckService.isMediaInUse(row.image_url))) {
                        await mediaController.deleteFile(row.image_url);
                    }
                    processedUrls.add(row.image_url);
                }
                if (row.explanation_image_url && !processedUrls.has(row.explanation_image_url)) {
                    if (!(await DeckService.isMediaInUse(row.explanation_image_url))) {
                        await mediaController.deleteFile(row.explanation_image_url);
                    }
                    processedUrls.add(row.explanation_image_url);
                }
                if (row.audio_url_frente && !processedUrls.has(row.audio_url_frente)) {
                    if (!(await DeckService.isMediaInUse(row.audio_url_frente))) {
                        await mediaController.deleteFile(row.audio_url_frente);
                    }
                    processedUrls.add(row.audio_url_frente);
                }
                if (row.audio_url_dorso && !processedUrls.has(row.audio_url_dorso)) {
                    if (!(await DeckService.isMediaInUse(row.audio_url_dorso))) {
                        await mediaController.deleteFile(row.audio_url_dorso);
                    }
                    processedUrls.add(row.audio_url_dorso);
                }
                // Extraer imágenes de la descripción del mazo
                if (row.deck_description) {
                    const descImages = this._extractImageUrls(row.deck_description);
                    for (const url of descImages) {
                        if (!processedUrls.has(url)) {
                            if (!(await DeckService.isMediaInUse(url))) {
                                await mediaController.deleteFile(url);
                            }
                            processedUrls.add(url);
                        }
                    }
                }
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
            const { topic, amount, generateTtsFront, generateTtsBack, ttsLang } = req.body;
            const { userId } = this._getUserContext(req);

            if (!topic) return res.status(400).json({ error: 'El tema es obligatorio' });

            // LÍMITE DE SEGURIDAD IA
            const requestedAmount = Math.min(Math.max(parseInt(amount) || 5, 1), 20);

            // 🔍 REGLA DE ORO: Obtener tarjetas existentes para evitar duplicados
            const existingCards = await DeckService.getDeckCards(deckId);
            const existingFronts = existingCards.map(c => c.front_content);

            const TrainingService = require('../../domain/services/trainingService');
            const cards = await TrainingService.generateFlashcardsFromTopic(topic, requestedAmount, existingFronts);

            const savedCards = [];
            for (const card of cards) {
                let audioUrlFront = null;
                let audioUrlBack = null;

                if (generateTtsFront) {
                    audioUrlFront = await this._processAudioTts(card.front, 'front', ttsLang || 'es-ES');
                }
                if (generateTtsBack) {
                    audioUrlBack = await this._processAudioTts(card.back, 'back', ttsLang || 'es-ES');
                }

                const saved = await DeckService.addCard(userId, deckId, card.front, card.back, null, null, audioUrlFront, audioUrlBack);
                savedCards.push(saved);
            }

            // Sync Usage Limits (using helper)
            await this._syncUsage(req);

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
            
            await this._syncUsage(req);
            res.json({ success: true, imageUrl: gcsPath });
        } catch (error) {
            console.error('[uploadCardImage] Error:', error);
            res.status(500).json({ error: 'Error al subir imagen de tarjeta' });
        }
    }
    /**
     * GET /api/decks/public
     */
    getPublicDecks = async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const decks = await DeckService.getPublicDecks(page, limit);
            res.json({ success: true, decks });
        } catch (error) {
            console.error('[getPublicDecks] Error:', error);
            res.status(500).json({ error: 'Error al obtener mazos públicos' });
        }
    }

    /**
     * PUT /api/decks/:deckId/visibility
     */
    toggleVisibility = async (req, res) => {
        try {
            const { deckId } = req.params;
            const { is_public } = req.body;
            const { userId, isGuest } = this._getUserContext(req);

            if (isGuest) return res.status(403).json({ error: 'Debes iniciar sesión' });
            if (typeof is_public !== 'boolean') return res.status(400).json({ error: 'Estado de visibilidad inválido' });

            const updated = await DeckService.updateDeckVisibility(userId, deckId, is_public);
            res.json({ success: true, deck: updated });
        } catch (error) {
            console.error('[toggleVisibility] Error:', error);
            res.status(500).json({ error: 'Error al cambiar visibilidad' });
        }
    }

    /**
     * POST /api/decks/:deckId/clone
     */
    cloneDeck = async (req, res) => {
        try {
            const { deckId } = req.params;
            const { userId, isGuest } = this._getUserContext(req);

            if (isGuest) return res.status(403).json({ error: 'Debes iniciar sesión para clonar' });

            const newDeck = await DeckService.cloneDeck(userId, deckId);
            await this._syncUsage(req);
            
            res.json({ success: true, deck: newDeck });
        } catch (error) {
            console.error('[cloneDeck] Error:', error);
            res.status(500).json({ error: error.message || 'Error al clonar el mazo' });
        }
    }
}

module.exports = new DeckController();
