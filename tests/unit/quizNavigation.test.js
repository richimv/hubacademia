/**
 * Unit tests for Simulator Quiz Navigation & Answer State
 * Executes real logic from src/presentation/public/js/quiz.js
 */

function createMockElement(id = '') {
    const el = {
        id,
        className: '',
        textContent: '',
        _innerHTML: '',
        disabled: false,
        onclick: null,
        style: {},
        children: [],
        classList: {
            _set: new Set(),
            add: jest.fn(function (...cls) { cls.forEach(c => el.classList._set.add(c)); }),
            remove: jest.fn(function (...cls) { cls.forEach(c => el.classList._set.delete(c)); }),
            contains: jest.fn((c) => el.classList._set.has(c))
        },
        appendChild: jest.fn((child) => {
            el.children.push(child);
            return child;
        }),
        querySelectorAll: jest.fn(() => el.children),
        removeAttribute: jest.fn(),
        remove: jest.fn(),
        scrollIntoView: jest.fn()
    };
    Object.defineProperty(el, 'innerHTML', {
        get() { return el._innerHTML; },
        set(val) {
            el._innerHTML = val;
            if (val === '') el.children = [];
        }
    });
    return el;
}

function createStorageMock() {
    const store = new Map();
    return {
        get length() { return store.size; },
        key: jest.fn((i) => Array.from(store.keys())[i] || null),
        getItem: jest.fn((k) => (store.has(k) ? store.get(k) : null)),
        setItem: jest.fn((k, v) => { store.set(k, String(v)); }),
        removeItem: jest.fn((k) => { store.delete(k); })
    };
}

describe('Quiz Simulator Navigation & Answer State (Real quiz.js)', () => {
    let quizModule;
    let elementsMap;

    beforeEach(() => {
        jest.useFakeTimers();
        elementsMap = new Map();

        const getMockEl = (id) => {
            if (!elementsMap.has(id)) elementsMap.set(id, createMockElement(id));
            return elementsMap.get(id);
        };

        global.localStorage = createStorageMock();
        global.sessionStorage = createStorageMock();
        global.document = {
            readyState: 'complete',
            getElementById: jest.fn(getMockEl),
            createElement: jest.fn(() => createMockElement()),
            addEventListener: jest.fn()
        };
        global.window = {
            AppConfig: { API_URL: 'http://localhost:3000' },
            location: { search: '?limit=20' },
            scrollTo: jest.fn(),
            sessionManager: {
                getUser: () => ({ id: 'user-nav-1' }),
                isLoggedIn: () => true
            },
            UIComponents: {
                getQuestionExplanation: jest.fn(() => ({ hasContent: false, text: '', imageUrl: null }))
            },
            quizTutor: { toggle: jest.fn() },
            resolveImageUrl: (url) => url
        };

        jest.isolateModules(() => {
            quizModule = require('../../src/presentation/public/js/quiz');
        });

        quizModule.state.context = 'MEDICINA';
        quizModule.state.mode = 'study';
        quizModule.state.maxQuestions = 3;
        quizModule.state.currentQuestionIndex = 0;
        quizModule.state.score = 0;
        quizModule.state.answers = [];
        quizModule.state.questions = [
            { id: 'q1', question_text: 'P1', options: ['A1', 'B1', 'C1'], correct_option_index: 0, topic: 'Pediatría' },
            { id: 'q2', question_text: 'P2', options: ['A2', 'B2', 'C2'], correct_option_index: 1, topic: 'Cirugía' },
            { id: 'q3', question_text: 'P3', options: ['A3', 'B3', 'C3'], correct_option_index: 2, topic: 'Ginecología' }
        ];
        quizModule.renderQuestion();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('records answers indexed by current question position and recalculates score', () => {
        let buttons = elementsMap.get('optionsGrid').querySelectorAll('button');
        quizModule.handleAnswer(0, buttons[0]);

        expect(quizModule.state.score).toBe(1);
        expect(quizModule.state.answers[0]).toEqual({
            questionId: 0,
            userAnswer: 0,
            isCorrect: true
        });
        expect(buttons[0].classList.contains('correct')).toBe(true);

        quizModule.handleNextQuestion();
        expect(quizModule.state.currentQuestionIndex).toBe(1);

        buttons = elementsMap.get('optionsGrid').querySelectorAll('button');
        quizModule.handleAnswer(0, buttons[0]);

        expect(quizModule.state.score).toBe(1);
        expect(quizModule.state.answers[1]).toEqual({
            questionId: 1,
            userAnswer: 0,
            isCorrect: false
        });
        expect(buttons[0].classList.contains('wrong')).toBe(true);
        expect(buttons[1].classList.contains('correct')).toBe(true);
    });

    it('allows moving backward to review previously answered questions without mutating score', () => {
        let buttons = elementsMap.get('optionsGrid').querySelectorAll('button');
        quizModule.handleAnswer(0, buttons[0]); // +1
        quizModule.handleNextQuestion();

        buttons = elementsMap.get('optionsGrid').querySelectorAll('button');
        quizModule.handleAnswer(1, buttons[1]); // +1
        expect(quizModule.state.score).toBe(2);

        // Retroceder a Pregunta 1 (renderQuestion reanima handleAnswer con isReplaying=true)
        quizModule.handlePreviousQuestion();
        expect(quizModule.state.currentQuestionIndex).toBe(0);
        expect(quizModule.state.score).toBe(2);
        expect(global.window.quizTutor.toggle).toHaveBeenCalledWith(false);

        const replayedButtons = elementsMap.get('optionsGrid').querySelectorAll('button');
        expect(replayedButtons[0].disabled).toBe(true);
        expect(replayedButtons[0].classList.contains('correct')).toBe(true);

        // No retrocede por debajo de 0
        quizModule.handlePreviousQuestion();
        expect(quizModule.state.currentQuestionIndex).toBe(0);

        // Volver a avanzar a Pregunta 2
        quizModule.handleNextQuestion();
        expect(quizModule.state.currentQuestionIndex).toBe(1);
    });

    it('preserves answer array alignment across repeated back-and-forth navigations', () => {
        quizModule.handleAnswer(0, elementsMap.get('optionsGrid').querySelectorAll('button')[0]);
        quizModule.handleNextQuestion();
        quizModule.handleAnswer(2, elementsMap.get('optionsGrid').querySelectorAll('button')[2]);
        quizModule.handleNextQuestion();
        quizModule.handleAnswer(2, elementsMap.get('optionsGrid').querySelectorAll('button')[2]);

        quizModule.handlePreviousQuestion();
        quizModule.handlePreviousQuestion();
        expect(quizModule.state.currentQuestionIndex).toBe(0);

        quizModule.handleNextQuestion();
        quizModule.handleNextQuestion();
        expect(quizModule.state.currentQuestionIndex).toBe(2);

        const mapped = quizModule.state.questions.map((q, idx) => ({
            id: q.id,
            userAnswer: quizModule.state.answers[idx].userAnswer,
            correct_option_index: q.correct_option_index,
            isCorrect: quizModule.state.answers[idx].isCorrect,
            topic: q.topic
        }));

        expect(mapped).toEqual([
            { id: 'q1', userAnswer: 0, correct_option_index: 0, isCorrect: true, topic: 'Pediatría' },
            { id: 'q2', userAnswer: 2, correct_option_index: 1, isCorrect: false, topic: 'Cirugía' },
            { id: 'q3', userAnswer: 2, correct_option_index: 2, isCorrect: true, topic: 'Ginecología' }
        ]);
    });
});
