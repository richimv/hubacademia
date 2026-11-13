/**
 * Unit tests for Quiz Session Persistence & Resilience (localStorage -> sessionStorage -> _casesMap hydration)
 * Executes real logic from src/presentation/public/js/quiz.js
 */

function createStorageMock() {
    const store = new Map();
    return {
        get length() { return store.size; },
        key: jest.fn((i) => Array.from(store.keys())[i] || null),
        getItem: jest.fn((k) => (store.has(k) ? store.get(k) : null)),
        setItem: jest.fn((k, v) => { store.set(k, String(v)); }),
        removeItem: jest.fn((k) => { store.delete(k); }),
        _store: store
    };
}

describe('Quiz Session Persistence & Multi-Tier Resilience (Real quiz.js)', () => {
    let quizModule;
    let localStore;
    let sessionStore;

    beforeEach(() => {
        localStore = createStorageMock();
        sessionStore = createStorageMock();

        global.localStorage = localStore;
        global.sessionStorage = sessionStore;
        global.document = {
            readyState: 'complete',
            getElementById: jest.fn(() => null),
            createElement: jest.fn(() => ({ style: {}, classList: { add: jest.fn(), remove: jest.fn() } })),
            addEventListener: jest.fn()
        };
        global.window = {
            AppConfig: { API_URL: 'http://localhost:3000' },
            location: { search: '?limit=20&context=MEDICINA' },
            scrollTo: jest.fn(),
            sessionManager: {
                getUser: () => ({ id: 'user-persist-1' }),
                isLoggedIn: () => true
            }
        };

        jest.isolateModules(() => {
            quizModule = require('../../src/presentation/public/js/quiz');
        });

        quizModule.state.context = 'MEDICINA';
        quizModule.state.mode = 'study';
        quizModule.state.targetExam = 'SERUMS';
        quizModule.state.career = 'Medicina Humana';
        quizModule.state.maxQuestions = 20;
        quizModule.state.quizId = 'quiz-abc';
        quizModule.state.quizSessionId = 'qs-999';
        quizModule.state.timeLeft = 1800;
        quizModule.state.isFinished = false;
    });

    it('serializeSessionState deduplicates case metadata into _casesMap and loadSession rehydrates it', () => {
        const longCaseDesc = 'Paciente acude con fiebre prolongada '.repeat(20);
        quizModule.state.questions = [
            {
                id: 'q1',
                case_id: 'case_100',
                case_title: 'Caso 100',
                case_description: longCaseDesc,
                case_image_url: '/img/caso100.png',
                case_order: 1,
                case_code: 'C-100',
                question_text: '¿Diagnóstico?'
            },
            {
                id: 'q2',
                case_id: 'case_100',
                case_title: 'Caso 100',
                case_description: longCaseDesc,
                case_image_url: '/img/caso100.png',
                case_order: 2,
                case_code: 'C-100',
                question_text: '¿Tratamiento?'
            }
        ];

        const serialized = quizModule.serializeSessionState();
        expect(serialized._casesMap.case_100).toEqual({
            case_title: 'Caso 100',
            case_description: longCaseDesc,
            case_image_url: '/img/caso100.png',
            case_order: 1,
            case_code: 'C-100'
        });
        expect(serialized.questions[0].case_description).toBeUndefined();
        expect(serialized.questions[1].case_description).toBeUndefined();

        quizModule.saveSession();

        // Reset in-memory config to verify loadSession restores it and rehydrates questions
        quizModule.state.quizSessionId = null;
        quizModule.state.career = null;

        const restored = quizModule.loadSession();
        expect(restored).not.toBeNull();
        expect(restored._casesMap).toBeUndefined();
        expect(restored.questions).toHaveLength(2);
        expect(restored.questions[0].case_description).toBe(longCaseDesc);
        expect(restored.questions[1].case_description).toBe(longCaseDesc);
        expect(restored.questions[1].case_image_url).toBe('/img/caso100.png');
        expect(quizModule.state.quizSessionId).toBe('qs-999');
        expect(quizModule.state.career).toBe('Medicina Humana');
    });

    it('saveSession falls back to sessionStorage when localStorage throws QuotaExceededError', () => {
        quizModule.state.questions = [{ id: 'q1', question_text: 'Pregunta única' }];

        localStore.setItem.mockImplementation(() => {
            const err = new Error('QuotaExceededError');
            err.name = 'QuotaExceededError';
            throw err;
        });

        quizModule.saveSession();

        const key = quizModule.getStorageKey();
        expect(sessionStore.setItem).toHaveBeenCalledWith(key, expect.any(String));

        const restored = quizModule.loadSession();
        expect(restored).not.toBeNull();
        expect(restored.questions[0].id).toBe('q1');
    });

    it('loadSession rejects and clears expired sessions older than 24 hours', () => {
        const key = quizModule.getStorageKey();
        const expiredPayload = {
            context: 'MEDICINA',
            maxQuestions: 20,
            savedAt: Date.now() - (25 * 60 * 60 * 1000),
            isFinished: false,
            questions: [{ id: 'q1' }]
        };
        localStore._store.set(key, JSON.stringify(expiredPayload));

        expect(quizModule.loadSession()).toBeNull();
        expect(localStore.removeItem).toHaveBeenCalledWith(key);
    });

    it('loadSession clears finished sessions and enforces mode/context/demo guards', () => {
        const key = quizModule.getStorageKey();

        // 1. Finished session
        localStore._store.set(key, JSON.stringify({
            context: 'MEDICINA',
            maxQuestions: 20,
            savedAt: Date.now(),
            isFinished: true,
            questions: [{ id: 'q1' }]
        }));
        expect(quizModule.loadSession()).toBeNull();
        expect(localStore.removeItem).toHaveBeenCalledWith(key);

        // 2. Context mismatch (stored EDUCACION while current is MEDICINA)
        localStore._store.set(key, JSON.stringify({
            context: 'EDUCACION',
            maxQuestions: 20,
            savedAt: Date.now(),
            isFinished: false,
            questions: [{ id: 'q1' }]
        }));
        expect(quizModule.loadSession()).toBeNull();

        // 3. Mode limit mismatch (stored 10q while URL asks 20q)
        localStore._store.set(key, JSON.stringify({
            context: 'MEDICINA',
            maxQuestions: 10,
            savedAt: Date.now(),
            isFinished: false,
            questions: [{ id: 'q1' }]
        }));
        expect(quizModule.loadSession()).toBeNull();

        // 4. Demo mode ignores stored session without deleting user storage
        global.window.location.search = '?limit=20&demo=true';
        localStore._store.set(key, JSON.stringify({
            context: 'MEDICINA',
            maxQuestions: 20,
            savedAt: Date.now(),
            isFinished: false,
            questions: [{ id: 'q1' }]
        }));
        expect(quizModule.loadSession()).toBeNull();
    });

    it('preserves timeLeft intact for real simulacros (>= 50 questions)', () => {
        global.window.location.search = '?limit=60';
        quizModule.state.context = 'EDUCACION';
        quizModule.state.mode = 'real';
        quizModule.state.maxQuestions = 60;
        quizModule.state.timeLeft = 4120;
        quizModule.state.questions = [{ id: 'q1', question_text: 'Casuística' }];

        quizModule.saveSession();
        const restored = quizModule.loadSession();

        expect(restored).not.toBeNull();
        expect(restored.timeLeft).toBe(4120);
        expect(restored.maxQuestions).toBe(60);
    });
});
