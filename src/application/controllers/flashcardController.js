const flashcardService = require('../../domain/services/flashcardService');

class FlashcardController {

    /**
     * GET /api/flashcard/due
     * Obtiene flashcards pendientes.
     */
    async getDueFlashcards(req, res) {
        try {
            const cards = await flashcardService.getDueFlashcards(req.user.id);
            res.json({ success: true, cards });
        } catch (error) {
            console.error('Error getting flashcards:', error);
            res.status(500).json({ error: 'Error obteniendo flashcards.' });
        }
    }

    /**
     * POST /api/flashcard/review
     * Procesa el repaso (SM-2).
     */
    async reviewFlashcard(req, res) {
        try {
            const { cardId, quality, currentInterval, currentEf, currentReps } = req.body;

            const result = await flashcardService.processReview(cardId, quality, {
                interval_days: currentInterval,
                easiness_factor: currentEf,
                repetition_number: currentReps
            });

            res.json(result);
        } catch (error) {
            console.error('Error reviewing flashcard:', error);
            res.status(500).json({ error: 'Error procesando repaso.' });
        }
    }
}

module.exports = new FlashcardController();
