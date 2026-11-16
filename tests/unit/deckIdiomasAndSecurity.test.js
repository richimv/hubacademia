const deckController = require('../../src/application/controllers/deckController');
const DeckService = require('../../src/domain/services/deckService');
const trainingRepository = require('../../src/domain/repositories/flashcardRepository');
const db = require('../../src/infrastructure/database/db');

jest.mock('../../src/domain/repositories/flashcardRepository');
jest.mock('../../src/infrastructure/database/db');

describe('Deck Idiomas Category, Security & IDOR Protection', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            user: { id: 'user-alice', subscriptionTier: 'advanced' },
            params: { deckId: 'deck-100', cardId: 'card-200' },
            body: {},
            query: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('Idiomas Category Normalization & Community Filtering', () => {
        it('should recognize and preserve "Idiomas" category in deckController', () => {
            const normalized = deckController._normalizeCategory('Idiomas');
            expect(normalized).toBe('Idiomas');
        });

        it('should fallback to "General" for unknown or malicious categories', () => {
            const normalized = deckController._normalizeCategory('InvalidCategory<script>');
            expect(normalized).toBe('General');
        });

        it('should allow fetching public decks filtered specifically by "Idiomas"', async () => {
            mockReq.query = { page: '1', limit: '20', category: 'Idiomas' };
            const mockDecks = [
                { id: 'deck-lang-1', name: 'Inglés Médico B2', category: 'Idiomas', is_public: true }
            ];
            trainingRepository.getPublicDecks.mockResolvedValue(mockDecks);

            await deckController.getPublicDecks(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({ success: true, decks: mockDecks });
        });
    });

    describe('Public Deck Privacy & Anonymization in Community', () => {
        it('flashcardRepository.getPublicDecks should not query author_name or join users table', async () => {
            const actualRepo = jest.requireActual('../../src/domain/repositories/flashcardRepository');
            const mockDb = require('../../src/infrastructure/database/db');
            mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'deck-1', name: 'Mazo Anon' }] });

            const results = await actualRepo.getPublicDecks(1, 20, 'Medicina');

            expect(mockDb.query).toHaveBeenCalled();
            const sqlQuery = mockDb.query.mock.calls[0][0];
            expect(sqlQuery).not.toContain('author_name');
            expect(sqlQuery).not.toContain('JOIN users');
            expect(results).toEqual([{ id: 'deck-1', name: 'Mazo Anon' }]);
        });

        it('flashcardRepository.getPublicDecks fallback should also not query author_name or join users table', async () => {
            const actualRepo = jest.requireActual('../../src/domain/repositories/flashcardRepository');
            const mockDb = require('../../src/infrastructure/database/db');
            const err42703 = new Error('Undefined column');
            err42703.code = '42703';
            mockDb.query
                .mockRejectedValueOnce(err42703)
                .mockResolvedValueOnce({ rows: [{ id: 'deck-2', name: 'Mazo Fallback' }] });

            const results = await actualRepo.getPublicDecks(1, 20, 'ALL');

            expect(mockDb.query).toHaveBeenCalledTimes(2);
            const fallbackSql = mockDb.query.mock.calls[1][0];
            expect(fallbackSql).not.toContain('author_name');
            expect(fallbackSql).not.toContain('JOIN users');
            expect(results).toEqual([{ id: 'deck-2', name: 'Mazo Fallback' }]);
        });

        it('repaso.js frontend community deck template should not expose user or author names', () => {
            const fs = require('fs');
            const path = require('path');
            const repasoJs = fs.readFileSync(path.resolve(__dirname, '../../src/presentation/public/js/repaso.js'), 'utf8');

            expect(repasoJs).not.toMatch(/&gt;\s*Por:/);
            expect(repasoJs).not.toContain('deck.author_name');
        });
    });

    describe('IDOR Protection on Deck Mutation & Card Creation', () => {
        it('DeckService.addCard should throw error when deck does not belong to the user', async () => {
            trainingRepository.getDeckById.mockResolvedValue(null);

            await expect(
                DeckService.addCard('user-alice', 'deck-bob', 'Front', 'Back')
            ).rejects.toThrow('Mazo no encontrado o acceso denegado');
        });

        it('DeckService.addBulkCards should throw error when deck does not belong to the user', async () => {
            trainingRepository.getDeckById.mockResolvedValue(null);

            await expect(
                DeckService.addBulkCards('user-alice', 'deck-bob', [{ front: 'F', back: 'B' }])
            ).rejects.toThrow('Mazo no encontrado o acceso denegado');
        });

        it('deckController.addCard should respond with 403 when deck does not belong to user', async () => {
            mockReq.body = { front: 'Anverso seguro', back: 'Reverso seguro' };
            trainingRepository.getDeckById.mockResolvedValue(null);

            await deckController.addCard(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Mazo no encontrado o acceso denegado' });
        });
    });

    describe('Clone Deck Category Preservation', () => {
        it('DeckService.cloneDeck should preserve the original deck category using flashcardRepository', async () => {
            trainingRepository.getPublicDeckForClone.mockResolvedValue({
                id: 'public-deck-1',
                name: 'Vocabulario Italiano',
                icon: 'fas fa-language',
                description: 'Guía de italiano',
                color: '#a78bfa',
                category: 'Idiomas'
            });
            trainingRepository.hasUserClonedDeck.mockResolvedValue(false);
            trainingRepository.countDailyClones.mockResolvedValue(2);

            trainingRepository.getDeckById.mockResolvedValue({ id: 'public-deck-1', name: 'Vocabulario Italiano' });
            trainingRepository.createDeck.mockResolvedValue({
                id: 'cloned-deck-id',
                name: 'Vocabulario Italiano (Clon)',
                category: 'Idiomas'
            });
            trainingRepository.getDeckCards.mockResolvedValue([]);
            trainingRepository.incrementDeckSaves.mockResolvedValue();

            const cloned = await DeckService.cloneDeck('user-alice', 'public-deck-1');

            expect(db.query).not.toHaveBeenCalled();
            expect(trainingRepository.createDeck).toHaveBeenCalledWith(
                'user-alice',
                'Vocabulario Italiano (Clon)',
                'USER',
                'MANUAL',
                'fas fa-language',
                null,
                'Guía de italiano',
                '#a78bfa',
                'Idiomas'
            );
            expect(cloned.category).toBe('Idiomas');
        });

        it('DeckService.isMediaInUse should delegate to flashcardRepository without direct db queries', async () => {
            trainingRepository.isMediaInUse.mockResolvedValue(true);

            const inUse = await DeckService.isMediaInUse('flashcards/sample.webp');

            expect(inUse).toBe(true);
            expect(trainingRepository.isMediaInUse).toHaveBeenCalledWith('flashcards/sample.webp');
            expect(db.query).not.toHaveBeenCalled();
        });
    });

    describe('Audio Voices & Media Cleanup', () => {
        it('ttsService.js should configure studio-grade human voices for Spanish and support Italian', async () => {
            const ttsService = require('../../src/domain/services/ttsService');
            const voiceES = await ttsService.resolveVoiceName('es-ES');
            const voiceUS = await ttsService.resolveVoiceName('es-US');
            const voiceIT = await ttsService.resolveVoiceName('it-IT');
            expect(voiceES).toBe('es-ES-Studio-C');
            expect(voiceUS).toBe('es-US-Studio-B');
            expect(voiceIT).toBe('it-IT-Neural2-A');
        });

        it('deckController.js should clean orphan media (images and audios) safely via _cleanOrphanMedia', async () => {
            const DeckController = require('../../src/application/controllers/deckController');
            const DeckService = require('../../src/domain/services/deckService');
            const mediaController = require('../../src/application/controllers/mediaController');

            const isMediaInUseSpy = jest.spyOn(DeckService, 'isMediaInUse').mockImplementation(async (url) => {
                return url === 'shared.webp'; // 'shared.webp' is in use, 'orphan.mp3' is not
            });
            const deleteFileSpy = jest.spyOn(mediaController, 'deleteFile').mockResolvedValue(true);

            await DeckController._cleanOrphanMedia(['shared.webp', 'orphan.mp3', 'orphan.mp3', null, '']);

            expect(isMediaInUseSpy).toHaveBeenCalledWith('shared.webp');
            expect(isMediaInUseSpy).toHaveBeenCalledWith('orphan.mp3');
            expect(deleteFileSpy).toHaveBeenCalledTimes(1);
            expect(deleteFileSpy).toHaveBeenCalledWith('orphan.mp3');

            isMediaInUseSpy.mockRestore();
            deleteFileSpy.mockRestore();
        });

        it('ttsService.synthesize should respect { cache: false } and not save to tts_cache in GCS', async () => {
            const ttsService = require('../../src/domain/services/ttsService');
            const saveSpy = jest.fn().mockResolvedValue(true);
            const fileMock = {
                exists: jest.fn().mockResolvedValue([false]),
                save: saveSpy
            };
            const bucketMock = {
                file: jest.fn().mockReturnValue(fileMock)
            };
            const originalBucket = ttsService.storage.bucket;
            ttsService.storage.bucket = jest.fn().mockReturnValue(bucketMock);

            const synthesizeSpeechSpy = jest.spyOn(ttsService.client, 'synthesizeSpeech').mockResolvedValue([{
                audioContent: Buffer.from('fake-mp3-data')
            }]);

            const buffer = await ttsService.synthesize('Test without cache', 'es-ES', { cache: false });

            expect(buffer).toEqual(Buffer.from('fake-mp3-data'));
            expect(saveSpy).not.toHaveBeenCalled();

            ttsService.storage.bucket = originalBucket;
            synthesizeSpeechSpy.mockRestore();
        });
    });
});
