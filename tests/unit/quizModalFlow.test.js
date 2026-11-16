/**
 * Tests unitarios de ejecución real para el flujo de modales en simuladores:
 * 1. Modal de finalización (startNewExam) + UIManager (showAuthPromptModal / hideAuthPromptModal / backdrop).
 * 2. Modal de reanudación (init con resume === false) y startQuiz con seenIds / excludeIds.
 * 3. Aislamiento y ejecución del ciclo anti-repetición 24h solo tras culminar examen.
 */

const db = require('../../src/infrastructure/database/db');
const docenteRepository = require('../../src/domain/repositories/docenteRepository');
const medicoRepository = require('../../src/domain/repositories/medicoRepository');

jest.mock('../../src/infrastructure/database/db', () => ({
    query: jest.fn(),
    getClient: jest.fn()
}));

function setupQuizModalDom({ search = '', isAuthenticated = true, canTakeDemo = false } = {}) {
    const store = {};
    if (isAuthenticated) {
        store.authToken = 'jwt-test-token';
    }
    const localStorageMock = {
        getItem: jest.fn((k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null)),
        setItem: jest.fn((k, v) => { store[k] = String(v); }),
        removeItem: jest.fn((k) => { delete store[k]; }),
        clear: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); })
    };

    const makeStubEl = () => ({
        classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn(), contains: jest.fn(() => false) },
        style: {},
        textContent: '',
        innerHTML: '',
        disabled: false,
        dataset: {},
        setAttribute: jest.fn(),
        addEventListener: jest.fn(),
        remove: jest.fn(),
        querySelector: jest.fn(() => null),
        querySelectorAll: jest.fn(() => [])
    });

    const elementsById = {
        loadingOverlay: makeStubEl(),
        'loading-overlay': makeStubEl(),
        maxQ: makeStubEl(),
        lightboxModal: makeStubEl(),
        lightboxImage: makeStubEl(),
        lightboxClose: makeStubEl(),
        lightboxZoomIn: makeStubEl(),
        lightboxZoomOut: makeStubEl(),
        lightboxZoomReset: makeStubEl(),
        lightboxViewport: makeStubEl()
    };

    const reloadMock = jest.fn();
    const locationMock = {
        href: `https://hubacademia.test/quiz.html${search}`,
        pathname: '/quiz.html',
        search,
        reload: reloadMock
    };

    global.localStorage = localStorageMock;
    global.sessionStorage = localStorageMock;
    global.location = locationMock;
    global.document = {
        body: {
            setAttribute: jest.fn(),
            classList: { remove: jest.fn(), add: jest.fn() },
            dataset: {},
            insertAdjacentHTML: jest.fn()
        },
        title: '',
        getElementById: jest.fn((id) => elementsById[id] || null),
        querySelector: jest.fn(() => null),
        querySelectorAll: jest.fn(() => []),
        addEventListener: jest.fn(),
        createElement: jest.fn(() => makeStubEl())
    };
    global.window = {
        location: locationMock,
        history: { pushState: jest.fn(), back: jest.fn() },
        AppConfig: { API_URL: '' },
        NetworkService: { fetch: jest.fn() },
        sessionManager: {
            initialize: jest.fn().mockResolvedValue(undefined),
            getUser: jest.fn(() => (isAuthenticated ? { id: 'usr-1', email: 'doc@test.com' } : null)),
            isLoggedIn: jest.fn(() => isAuthenticated)
        },
        GuestSessionManager: {
            canTakeDailyDemo: jest.fn(() => canTakeDemo),
            recordDemoAttempt: jest.fn()
        },
        confirmationModal: {
            show: jest.fn().mockResolvedValue(false),
            showAlert: jest.fn().mockResolvedValue(undefined)
        },
        uiManager: {
            showAuthPromptModal: jest.fn(),
            showPaywallModal: jest.fn(),
            showToast: jest.fn(),
            injectModalHTML: jest.fn()
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    };

    return { store, locationMock, reloadMock };
}

describe('Quiz Modals Flow & Anti-Repetition Lifecycle Verification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('1. Modal de Finalización, Botón "Nuevo Examen" y UIManager Auth Modal', () => {
        it('window.startNewExam redirige al dashboard al cerrar modal cuando visitante agotó demo, y recarga cuando es usuario autenticado', () => {
            // Caso A: visitante no autenticado sin cuota demo -> muestra auth modal y ejecuta exitToDashboard en onClose
            const guestEnv = setupQuizModalDom({ isAuthenticated: false, canTakeDemo: false });
            let quizModule;
            jest.isolateModules(() => {
                quizModule = require('../../src/presentation/public/js/quiz');
            });

            quizModule.state.context = 'EDUCACION';
            quizModule.state.questions = [{ id: 'q1' }];
            quizModule.saveSession();

            global.window.startNewExam();

            expect(global.localStorage.removeItem).toHaveBeenCalledWith(quizModule.getStorageKey());
            expect(global.window.uiManager.showAuthPromptModal).toHaveBeenCalledTimes(1);
            const onCloseCallback = global.window.uiManager.showAuthPromptModal.mock.calls[0][0];
            expect(typeof onCloseCallback).toBe('function');
            onCloseCallback();
            expect(guestEnv.locationMock.href).toBe('simulator-dashboard?context=EDUCACION');

            // Caso B: usuario autenticado con ?demo=true -> elimina demo param y recarga sin bloqueo de invitado
            const authEnv = setupQuizModalDom({ search: '?demo=true&context=MEDICINA', isAuthenticated: true, canTakeDemo: false });
            jest.isolateModules(() => {
                quizModule = require('../../src/presentation/public/js/quiz');
            });

            global.window.startNewExam();
            expect(global.window.uiManager.showAuthPromptModal).not.toHaveBeenCalled();
            expect(authEnv.locationMock.href).toBe('/quiz.html?context=MEDICINA');

            // Caso C: usuario autenticado sin ?demo -> recarga la página
            const stdEnv = setupQuizModalDom({ search: '?context=MEDICINA', isAuthenticated: true });
            jest.isolateModules(() => {
                quizModule = require('../../src/presentation/public/js/quiz');
            });
            global.window.startNewExam();
            expect(stdEnv.reloadMock).toHaveBeenCalledTimes(1);
        });

        it('UIManager.showAuthPromptModal registra callback onClose y lo ejecuta en hideAuthPromptModal y al hacer clic en backdrop', () => {
            const modalEl = {
                style: { display: 'none' },
                addEventListener: jest.fn()
            };
            const statusEl = () => ({ className: '', textContent: '', classList: { add: jest.fn(), remove: jest.fn() } });
            let modalInserted = false;
            global.navigator = { onLine: true };
            global.window = {
                location: { href: 'http://localhost/' },
                history: { pushState: jest.fn(), back: jest.fn() },
                addEventListener: jest.fn()
            };
            global.document = {
                getElementById: jest.fn((id) => {
                    if (id === 'status-pill-container' || id === 'status-pill' || id === 'status-text') return statusEl();
                    if (id === 'auth-prompt-modal' && modalInserted) return modalEl;
                    return null;
                }),
                querySelector: jest.fn(() => true),
                createElement: jest.fn(() => ({ style: {}, setAttribute: jest.fn(), className: '' })),
                head: { appendChild: jest.fn() },
                body: {
                    classList: { add: jest.fn(), remove: jest.fn() },
                    appendChild: jest.fn(),
                    insertAdjacentHTML: jest.fn(() => { modalInserted = true; })
                }
            };

            const { UIManager } = require('../../src/presentation/public/js/ui/uiManager');
            const ui = new UIManager();
            const onClose = jest.fn();

            ui.showAuthPromptModal(onClose);
            expect(modalEl.style.display).toBe('flex');
            expect(modalEl.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));

            // Simular clic directo en el backdrop (e.target === modalEl)
            const clickCall = modalEl.addEventListener.mock.calls.find(([ev]) => ev === 'click');
            clickCall[1]({ target: modalEl });

            expect(modalEl.style.display).toBe('none');
            expect(onClose).toHaveBeenCalledTimes(1);

            // Una segunda llamada a hideAuthPromptModal no debe re-ejecutar el callback ya consumido
            ui.hideAuthPromptModal();
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('2. Modal de Reanudación ("Simulacro en progreso") & startQuiz', () => {
        it('init() con resume === false descarta sesión previa, resetea state y llama a startQuiz() contra /start', async () => {
            const env = setupQuizModalDom({ search: '?context=MEDICINA&topic=Cardio', isAuthenticated: true });
            global.window.NetworkService.fetch.mockResolvedValue({
                ok: false,
                status: 500,
                json: async () => ({ error: 'stop-after-request' })
            });

            let quizModule;
            jest.isolateModules(() => {
                quizModule = require('../../src/presentation/public/js/quiz');
            });

            // Guardar sesión previa recuperable en localStorage
            quizModule.state.context = 'MEDICINA';
            quizModule.state.questions = [{ id: 'old-q1' }];
            quizModule.state.currentQuestionIndex = 1;
            quizModule.state.score = 1;
            quizModule.state.answers = [{ questionId: 'old-q1', userAnswer: 0, isCorrect: true }];
            quizModule.state.quizSessionId = 'sess-prev-1';
            quizModule.saveSession();

            await quizModule.init();

            expect(env.store[quizModule.getStorageKey()]).toBeUndefined();
            expect(quizModule.state.questions).toEqual([]);
            expect(quizModule.state.currentQuestionIndex).toBe(0);
            expect(quizModule.state.score).toBe(0);
            expect(quizModule.state.answers).toEqual([]);
            expect(quizModule.state.quizSessionId).toBeNull();
            expect(global.window.NetworkService.fetch).toHaveBeenCalledWith(
                '/api/medico/start',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.any(String)
                })
            );
        });

        it('startQuiz(temporarySeenIds) inyecta seenIds en /start y excludeIds combinados en /demo', async () => {
            // Modo estándar /start con seenIds temporales
            const env = setupQuizModalDom({ search: '?context=MEDICINA', isAuthenticated: true });
            global.window.NetworkService.fetch.mockResolvedValue({
                ok: false,
                status: 500,
                json: async () => ({ error: 'stop' })
            });

            let quizModule;
            jest.isolateModules(() => {
                quizModule = require('../../src/presentation/public/js/quiz');
            });
            await quizModule.init();
            global.window.NetworkService.fetch.mockClear();

            await quizModule.startQuiz(['temp-q1', 'temp-q2']);
            const [, postOpts] = global.window.NetworkService.fetch.mock.calls[0];
            expect(JSON.parse(postOpts.body).seenIds).toEqual(['temp-q1', 'temp-q2']);

            // Modo demo con guest_seen_ids_medicine + temporarySeenIds combinados
            setupQuizModalDom({ search: '?demo=true&context=MEDICINA', isAuthenticated: false, canTakeDemo: true });
            global.localStorage.setItem('guest_seen_ids_medicine', JSON.stringify(['guest-q1']));
            global.window.NetworkService.fetch.mockResolvedValue({
                json: async () => ({ success: false })
            });

            jest.isolateModules(() => {
                quizModule = require('../../src/presentation/public/js/quiz');
            });
            quizModule.state.context = 'MEDICINA';
            await quizModule.startQuiz(['temp-q3', 'guest-q1']);

            const [demoUrl] = global.window.NetworkService.fetch.mock.calls[0];
            expect(demoUrl).toContain('excludeIds=guest-q1,temp-q3');
            expect(env.store).toBeDefined();
        });
    });

    describe('3. Ciclo de Anti-Repetición: Marcado de Vistas SOLO al Culminar Examen', () => {
        it('docenteRepository.saveQuizHistory registra preguntas en user_question_history para exámenes estándar de 10q y 20q', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 'mock-hist-id', inserted: true }] }) // INSERT quiz_history
                .mockResolvedValueOnce({ rows: [] }); // Batch UPSERT user_question_history

            const quizData = {
                topic: 'Pedagogía',
                score: 18,
                totalQuestions: 20,
                mode: 'study',
                questions: [{ id: 'q-seen-1', isCorrect: true }]
            };

            await docenteRepository.saveQuizHistory('usr-edu-test', quizData);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO user_question_history'),
                expect.arrayContaining(['usr-edu-test', 'q-seen-1'])
            );
        });

        it('medicoRepository.saveQuizHistory registra preguntas en user_question_history para exámenes estándar de 10q y 20q', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 'mock-med-hist-id', inserted: true }] })
                .mockResolvedValueOnce({ rows: [] });

            const quizData = {
                topic: 'Pediatría',
                score: 8,
                totalQuestions: 10,
                mode: 'arcade',
                questions: [{ id: 'qm-seen-1', isCorrect: true }]
            };

            await medicoRepository.saveQuizHistory('usr-med-test', quizData);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO user_question_history'),
                expect.arrayContaining(['usr-med-test', 'qm-seen-1'])
            );
        });

        it('saveQuizHistory NUNCA marca en user_question_history si es Simulacro Real (práctica libre)', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 'mock-real-hist', inserted: true }] });

            const quizData = {
                topic: 'Multi-Área',
                score: 55,
                totalQuestions: 60,
                mode: 'real',
                questions: [{ id: 'q-real-1', isCorrect: true }, { id: 'q-real-2', isCorrect: false }]
            };

            await docenteRepository.saveQuizHistory('usr-edu-real', quizData);

            // Solo una consulta ejecutada (quiz_history), cero a user_question_history
            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).not.toHaveBeenCalledWith(
                expect.stringContaining('user_question_history'),
                expect.any(Array)
            );
        });
    });
});
