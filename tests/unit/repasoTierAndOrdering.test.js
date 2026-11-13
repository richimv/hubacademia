const db = require('../../src/infrastructure/database/db');
const flashcardRepository = require('../../src/domain/repositories/flashcardRepository');
const DeckService = require('../../src/domain/services/deckService');
const { SessionManager } = require('../../src/presentation/public/js/sessionManager');
const { RepasoManager } = require('../../src/presentation/public/js/repaso');

jest.mock('../../src/infrastructure/database/db');

describe('Repaso Tier Permissions and Chronological Ordering (Real Modules)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        const store = new Map();
        global.localStorage = {
            getItem: jest.fn((k) => (store.has(k) ? store.get(k) : null)),
            setItem: jest.fn((k, v) => store.set(k, String(v))),
            removeItem: jest.fn((k) => store.delete(k)),
            _store: store
        };
        global.window = {
            addEventListener: jest.fn(),
            sessionManager: { getUser: jest.fn(() => null) },
            uiManager: { showPaywallModal: jest.fn(), showToast: jest.fn(), showAuthPromptModal: jest.fn() }
        };
    });

    describe('SessionManager & RepasoManager: Tier and Admin Resolution', () => {
        it('SessionManager.isAdmin correctly identifies admin by role or subscriptionTier', () => {
            const checkAdmin = (user) => SessionManager.prototype.isAdmin.call({ currentUser: user });

            expect(checkAdmin({ role: 'admin', subscriptionTier: 'free' })).toBe(true);
            expect(checkAdmin({ role: 'admin', subscriptionTier: null })).toBe(true);
            expect(checkAdmin({ role: 'student', subscriptionTier: 'admin' })).toBe(true);
            expect(checkAdmin({ role: 'student', subscriptionTier: 'basic' })).toBe(false);
            expect(checkAdmin({ role: 'student', subscriptionTier: 'advanced' })).toBe(false);
            expect(checkAdmin({ role: 'student', subscriptionTier: 'free' })).toBe(false);
            expect(checkAdmin(null)).toBe(false);
        });

        it('RepasoManager.userTier correctly returns "admin" when role is admin even if subscription_tier is free', () => {
            const repasoProto = RepasoManager.prototype;
            const resolveTier = (user) => {
                global.window.sessionManager.getUser.mockReturnValue(user);
                return Object.getOwnPropertyDescriptor(repasoProto, 'userTier').get.call({});
            };

            expect(resolveTier({ role: 'admin', subscription_tier: 'free' })).toBe('admin');
            expect(resolveTier({ role: 'admin', subscriptionTier: 'free' })).toBe('admin');
            expect(resolveTier({ role: 'student', subscription_tier: 'basic' })).toBe('basic');
            expect(resolveTier({ role: 'student', subscriptionTier: 'advanced' })).toBe('advanced');
            expect(resolveTier({ role: 'student', subscription_tier: 'free' })).toBe('free');
            expect(resolveTier(null)).toBe('free');
        });

        it('RepasoManager.isAdvancedOrAdmin returns true for advanced and admin, false for basic and free', () => {
            const repasoProto = RepasoManager.prototype;
            const isAdv = (tier) => Object.getOwnPropertyDescriptor(repasoProto, 'isAdvancedOrAdmin').get.call({ userTier: tier });

            expect(isAdv('admin')).toBe(true);
            expect(isAdv('advanced')).toBe(true);
            expect(isAdv('basic')).toBe(false);
            expect(isAdv('free')).toBe(false);
        });

        it('RepasoManager.switchCardMode allows admin/basic/advanced into bulk mode, while blocking free with paywall and unauthenticated with auth modal', () => {
            const elements = {
                'tab-card-individual': { classList: { toggle: jest.fn() } },
                'tab-card-bulk': { classList: { toggle: jest.fn() } },
                'section-card-individual': { style: { display: '' } },
                'section-card-bulk': { style: { display: '' } }
            };
            global.document = {
                getElementById: jest.fn((id) => elements[id])
            };

            const createInstance = (tier, token = 'valid-token') => {
                if (token) global.localStorage._store.set('authToken', token);
                else global.localStorage._store.delete('authToken');
                const instance = Object.create(RepasoManager.prototype);
                Object.defineProperty(instance, 'token', { get: () => global.localStorage.getItem('authToken') });
                Object.defineProperty(instance, 'userTier', { get: () => tier });
                instance.currentCardMode = 'individual';
                return instance;
            };

            for (const tier of ['admin', 'basic', 'advanced']) {
                const mgr = createInstance(tier);
                mgr.switchCardMode('bulk');
                expect(mgr.currentCardMode).toBe('bulk');
                expect(elements['section-card-bulk'].style.display).toBe('block');
            }

            const freeMgr = createInstance('free');
            freeMgr.switchCardMode('bulk');
            expect(freeMgr.currentCardMode).toBe('individual');
            expect(global.window.uiManager.showPaywallModal).toHaveBeenCalledWith(
                expect.stringContaining('Carga Masiva'),
                'flashcards'
            );

            const guestMgr = createInstance('free', null);
            guestMgr.switchCardMode('bulk');
            expect(global.window.uiManager.showAuthPromptModal).toHaveBeenCalled();
        });
    });

    describe('Database Query Ordering: Newly created/updated decks & cards appear first', () => {
        it('getDecks orders by COALESCE(d.updated_at, d.created_at) DESC, d.created_at DESC', async () => {
            let executedQuery = '';
            db.query.mockImplementation((query) => {
                executedQuery = query;
                return Promise.resolve({ rows: [] });
            });

            await flashcardRepository.getDecks('test-user-id', null);
            expect(executedQuery).toContain('ORDER BY COALESCE(d.updated_at, d.created_at) DESC, d.created_at DESC');
        });

        it('getAllUserDecks orders by COALESCE(d.updated_at, d.created_at) DESC, d.created_at DESC', async () => {
            let executedQuery = '';
            db.query.mockImplementation((query) => {
                executedQuery = query;
                return Promise.resolve({ rows: [] });
            });

            await flashcardRepository.getAllUserDecks('test-user-id');
            expect(executedQuery).toContain('ORDER BY COALESCE(d.updated_at, d.created_at) DESC, d.created_at DESC');
        });

        it('getDeckCards orders by sort_order ASC, created_at DESC (newest cards at top)', async () => {
            let executedQuery = '';
            db.query.mockImplementation((query) => {
                executedQuery = query;
                return Promise.resolve({ rows: [] });
            });

            await flashcardRepository.getDeckCards('test-deck-id');
            expect(executedQuery).toContain('ORDER BY sort_order ASC, created_at DESC');
        });

        it('touchDeck executes UPDATE decks SET updated_at = NOW() WHERE id = $1', async () => {
            let executedQuery = '';
            let executedParams = [];
            db.query.mockImplementation((query, params) => {
                executedQuery = query;
                executedParams = params;
                return Promise.resolve({ rows: [] });
            });

            await flashcardRepository.touchDeck('deck-123');
            expect(executedQuery).toContain('UPDATE decks SET updated_at = NOW() WHERE id = $1');
            expect(executedParams).toEqual(['deck-123']);
        });
    });

    describe('DeckService: touches deck on addCard and addBulkCards', () => {
        it('addCard calls trainingRepository.touchDeck', async () => {
            const mockTouchDeck = jest.spyOn(flashcardRepository, 'touchDeck').mockResolvedValue();
            jest.spyOn(flashcardRepository, 'getDeckById').mockResolvedValue({ id: 'deck-123' });
            jest.spyOn(flashcardRepository, 'createFlashcard').mockResolvedValue({ id: 'card-1' });

            await DeckService.addCard('user-1', 'deck-123', 'Front', 'Back');

            expect(mockTouchDeck).toHaveBeenCalledWith('deck-123');
        });

        it('addBulkCards calls trainingRepository.touchDeck', async () => {
            const mockTouchDeck = jest.spyOn(flashcardRepository, 'touchDeck').mockResolvedValue();
            jest.spyOn(flashcardRepository, 'getDeckById').mockResolvedValue({ id: 'deck-123' });
            jest.spyOn(flashcardRepository, 'createFlashcardsManualBatch').mockResolvedValue({ inserted: 5 });

            await DeckService.addBulkCards('user-1', 'deck-123', [
                { front: 'F1', back: 'B1' },
                { front: 'F2', back: 'B2' }
            ]);

            expect(mockTouchDeck).toHaveBeenCalledWith('deck-123');
        });
    });
});
