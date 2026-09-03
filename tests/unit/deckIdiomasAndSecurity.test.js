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

        it('deckController.generateCards should respond with 403 when deck does not belong to user', async () => {
            mockReq.body = { topic: 'Gramática Francesa', amount: 5 };
            trainingRepository.getDeckById.mockResolvedValue(null);

            await deckController.generateCards(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Mazo no encontrado o acceso denegado' });
        });
    });

    describe('Clone Deck Category Preservation', () => {
        it('DeckService.cloneDeck should preserve the original deck category', async () => {
            db.query.mockImplementation((sql, params) => {
                if (sql.includes('SELECT * FROM decks WHERE id = $1 AND is_public = true')) {
                    return Promise.resolve({
                        rows: [{
                            id: 'public-deck-1',
                            name: 'Vocabulario Italiano',
                            icon: 'fas fa-language',
                            description: 'Guía de italiano',
                            color: '#a78bfa',
                            category: 'Idiomas'
                        }]
                    });
                }
                if (sql.includes('SELECT id FROM decks WHERE user_id = $1')) {
                    return Promise.resolve({ rows: [] }); // Not yet cloned
                }
                if (sql.includes('SELECT COUNT(*) as count FROM decks')) {
                    return Promise.resolve({ rows: [{ count: '2' }] });
                }
                return Promise.resolve({ rows: [] });
            });

            trainingRepository.getDeckById.mockResolvedValue({ id: 'public-deck-1', name: 'Vocabulario Italiano' });
            trainingRepository.createDeck.mockResolvedValue({
                id: 'cloned-deck-id',
                name: 'Vocabulario Italiano (Clon)',
                category: 'Idiomas'
            });
            trainingRepository.getDeckCards.mockResolvedValue([]);
            trainingRepository.incrementDeckSaves.mockResolvedValue();

            const cloned = await DeckService.cloneDeck('user-alice', 'public-deck-1');

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
    });

    describe('UI Sobriety & Modal Header Integrity', () => {
        const fs = require('fs');
        const path = require('path');

        it('repaso.js should render compact .deck-title-icon-badge and no longer render .deck-icon-large', () => {
            const code = fs.readFileSync(path.resolve(__dirname, '../../src/presentation/public/js/repaso.js'), 'utf8');
            expect(code).toContain('deck-title-icon-badge');
            expect(code).not.toContain('deck-icon-large');
        });

        it('repaso.js _clearCardModal should reset bulk-file-label to Seleccionar Archivo', () => {
            const code = fs.readFileSync(path.resolve(__dirname, '../../src/presentation/public/js/repaso.js'), 'utf8');
            expect(code).toContain("fileLabel.textContent = 'Seleccionar Archivo'");
        });

        it('dashboard.css should target .modal-footer specifically to avoid inverting .modal-header', () => {
            const css = fs.readFileSync(path.resolve(__dirname, '../../src/presentation/public/css/dashboard.css'), 'utf8');
            expect(css).not.toContain('.modal-content>div:last-of-type');
            expect(css).toContain('.modal-content .modal-footer');
        });

        it('repaso.html bulk-file-label should have text-overflow ellipsis', () => {
            const html = fs.readFileSync(path.resolve(__dirname, '../../src/presentation/public/repaso.html'), 'utf8');
            expect(html).toContain('text-overflow: ellipsis');
        });

        it('deck-explorer.js should use chevron icons for folding/unfolding', () => {
            const code = fs.readFileSync(path.resolve(__dirname, '../../src/presentation/public/js/deck-explorer.js'), 'utf8');
            expect(code).toContain('fa-chevron-right');
            expect(code).toContain('fa-chevron-left');
        });

        it('dashboard.css should position toggle button above create button when collapsed', () => {
            const css = fs.readFileSync(path.resolve(__dirname, '../../src/presentation/public/css/dashboard.css'), 'utf8');
            expect(css).toContain('.explorer-sidebar.is-collapsed #btn-toggle-explorer');
            expect(css).toContain('order: -1');
        });

        it('repaso.js should position Idiomas between Educación and Matemáticas in community categories', () => {
            const code = fs.readFileSync(path.resolve(__dirname, '../../src/presentation/public/js/repaso.js'), 'utf8');
            const eduIdx = code.indexOf("{ id: 'Educación'");
            const idiomasIdx = code.indexOf("{ id: 'Idiomas'");
            const matIdx = code.indexOf("{ id: 'Matemáticas'");
            expect(eduIdx).toBeLessThan(idiomasIdx);
            expect(idiomasIdx).toBeLessThan(matIdx);
        });

        it('deck-explorer.js and dashboard.css should support vertical chevrons on mobile', () => {
            const jsCode = fs.readFileSync(path.resolve(__dirname, '../../src/presentation/public/js/deck-explorer.js'), 'utf8');
            expect(jsCode).toContain('fa-chevron-down');
            expect(jsCode).toContain('fa-chevron-up');

            const cssCode = fs.readFileSync(path.resolve(__dirname, '../../src/presentation/public/css/dashboard.css'), 'utf8');
            expect(cssCode).toContain('\\f077'); // chevron-up
            expect(cssCode).toContain('\\f078'); // chevron-down
        });

        it('uiManager.js popModalState should silently revert state using replaceState without history.back()', () => {
            const uiCode = fs.readFileSync(path.resolve(__dirname, '../../src/presentation/public/js/ui/uiManager.js'), 'utf8');
            expect(uiCode).toContain('this._modalHistoryStack');
            expect(uiCode).toContain('window.history.replaceState(prev.state, \'\', prev.href)');
            expect(uiCode).not.toContain('window.history.back()');
        });

        it('repaso.js renderRootDecks should preserve existing decks grid and avoid flashing skeletons', () => {
            const code = fs.readFileSync(path.resolve(__dirname, '../../src/presentation/public/js/repaso.js'), 'utf8');
            expect(code).toContain('hasLoadedDecks');
            expect(code).toContain('if (!hasLoadedDecks)');
        });

        it('repaso.js handlePopState should protect against reload when modals are open', () => {
            const code = fs.readFileSync(path.resolve(__dirname, '../../src/presentation/public/js/repaso.js'), 'utf8');
            expect(code).toContain('window.uiManager.openModals.size > 0');
        });
    });
});
