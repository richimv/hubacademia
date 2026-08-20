const deckController = require('../../src/application/controllers/deckController');
const DeckService = require('../../src/domain/services/deckService');

jest.mock('../../src/domain/services/deckService');
jest.mock('../../src/infrastructure/database/db');

describe('DeckController Security & Cost Limits', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            user: { id: 'user-123', subscription_tier: 'advanced' },
            params: { deckId: 'deck-1', cardId: 'card-1' },
            body: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('Individual Card Validation (addCard & updateCard)', () => {
        it('should allow text up to 1000 characters without TTS for advanced user', async () => {
            mockReq.body = {
                front: 'A'.repeat(950),
                back: 'B'.repeat(950)
            };
            DeckService.addCard.mockResolvedValue({ id: 'card-new' });

            await deckController.addCard(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should reject text exceeding 1000 characters', async () => {
            mockReq.body = {
                front: 'A'.repeat(1001),
                back: 'Valid back'
            };

            await deckController.addCard(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('1000')
            }));
        });

        it('should reject TTS generation if front exceeds 500 characters', async () => {
            mockReq.body = {
                front: 'A'.repeat(550),
                back: 'Valid back',
                generateTtsFront: true
            };

            await deckController.addCard(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('500')
            }));
        });

        it('should reject TTS generation or Image upload for Basic or Free user with 403 paywall', async () => {
            mockReq.user.subscription_tier = 'basic';
            mockReq.body = {
                front: 'Front text',
                back: 'Back text',
                generateTtsFront: true
            };

            await deckController.addCard(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                paywall: true
            }));
        });

        it('should allow text-only cards up to 1000 characters for Basic user', async () => {
            mockReq.user.subscription_tier = 'basic';
            mockReq.body = {
                front: 'Valid text '.repeat(50), // ~550 chars
                back: 'Valid back text'
            };
            DeckService.addCard.mockResolvedValue({ id: 'card-basic' });

            await deckController.addCard(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('Bulk Excel Cards Validation (addBulkCards)', () => {
        it('should reject bulk upload if card count exceeds 100', async () => {
            const cards = Array.from({ length: 101 }, (_, i) => ({
                front: `Front ${i}`,
                back: `Back ${i}`
            }));
            mockReq.body = { cards };

            await deckController.addBulkCards(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('100')
            }));
        });

        it('should accept bulk upload of 100 cards within 1000 chars each for Advanced user', async () => {
            const cards = Array.from({ length: 100 }, (_, i) => ({
                front: `Front text ${i}`,
                back: `Back text ${i}`
            }));
            mockReq.body = { cards };
            DeckService.addBulkCards.mockResolvedValue({ inserted: 100 });

            await deckController.addBulkCards(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                count: 100
            }));
        });

        it('should reject bulk TTS if user is not Advanced', async () => {
            mockReq.user.subscription_tier = 'basic';
            mockReq.body = {
                cards: [{ front: 'F', back: 'B' }],
                generateTtsFront: true
            };

            await deckController.addBulkCards(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                paywall: true
            }));
        });

        it('should reject bulk TTS if any card exceeds 500 characters', async () => {
            mockReq.body = {
                cards: [
                    { front: 'Short front', back: 'Short back' },
                    { front: 'A'.repeat(520), back: 'Short back' }
                ],
                generateTtsFront: true
            };

            await deckController.addBulkCards(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('500')
            }));
        });
    });

    describe('Image Upload Validation (uploadCardImage)', () => {
        it('should reject image upload for Basic or Free users', async () => {
            mockReq.user.subscription_tier = 'basic';
            mockReq.file = { originalname: 'test.png', buffer: Buffer.from('abc') };

            await deckController.uploadCardImage(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                paywall: true
            }));
        });
    });

    describe('Community Public Decks Sorting & Visibility', () => {
        it('should call DeckService.getPublicDecks with category and page parameters', async () => {
            mockReq.query = { page: '1', limit: '20', category: 'Tecnología' };
            const mockPublicDecks = [
                { id: 'deck-latest', name: 'Mazo Reciente', category: 'Tecnología', updated_at: new Date().toISOString() },
                { id: 'deck-older', name: 'Mazo Antiguo', category: 'Tecnología', updated_at: new Date(Date.now() - 86400000).toISOString() }
            ];
            DeckService.getPublicDecks.mockResolvedValue(mockPublicDecks);

            await deckController.getPublicDecks(mockReq, mockRes);

            expect(DeckService.getPublicDecks).toHaveBeenCalledWith(1, 20, 'Tecnología');
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, decks: mockPublicDecks });
        });

        it('should update deck visibility with category parameter', async () => {
            mockReq.params = { deckId: 'deck-1' };
            mockReq.body = { is_public: true, category: 'Derecho' };
            DeckService.updateDeckVisibility.mockResolvedValue({ id: 'deck-1', is_public: true, category: 'Derecho' });

            await deckController.toggleVisibility(mockReq, mockRes);

            expect(DeckService.updateDeckVisibility).toHaveBeenCalledWith('user-123', 'deck-1', true, 'Derecho');
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });
});
