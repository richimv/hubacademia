/**
 * @file quizNavigation.test.js
 * Pruebas unitarias de lógica de estado para navegación hacia atrás/adelante en el Quiz
 */

describe('Quiz Navigation & Answer State Management', () => {
    let state;

    beforeEach(() => {
        state = {
            currentQuestionIndex: 0,
            maxQuestions: 10,
            score: 0,
            answers: [],
            questions: [
                { id: 'q1', question_text: 'Pregunta 1', options: ['A', 'B', 'C'], correct_option_index: 0, topic: 'Pediatría' },
                { id: 'q2', question_text: 'Pregunta 2', options: ['A', 'B', 'C'], correct_option_index: 1, topic: 'Cirugía' },
                { id: 'q3', question_text: 'Pregunta 3', options: ['A', 'B', 'C'], correct_option_index: 2, topic: 'Ginecología' }
            ],
            isFinished: false
        };
    });

    const handleAnswer = (selectedIndex, isReplaying = false) => {
        const q = state.questions[state.currentQuestionIndex];
        if (!q) return;

        const isCorrect = selectedIndex === q.correct_option_index;
        if (!isReplaying) {
            state.answers[state.currentQuestionIndex] = {
                questionId: state.currentQuestionIndex,
                userAnswer: selectedIndex,
                isCorrect: isCorrect
            };
            state.score = state.answers.filter(a => a && a.isCorrect).length;
        }
    };

    const handlePreviousQuestion = () => {
        if (state.currentQuestionIndex > 0) {
            state.currentQuestionIndex--;
        }
    };

    const handleNextQuestion = () => {
        state.currentQuestionIndex++;
        if (state.currentQuestionIndex >= state.maxQuestions) {
            state.isFinished = true;
        }
    };

    it('records answers indexed by current question position correctly', () => {
        // Responder Pregunta 1
        handleAnswer(0); // Correcta
        expect(state.score).toBe(1);
        expect(state.answers[0]).toEqual({
            questionId: 0,
            userAnswer: 0,
            isCorrect: true
        });

        // Avanzar a Pregunta 2
        handleNextQuestion();
        expect(state.currentQuestionIndex).toBe(1);

        // Responder Pregunta 2
        handleAnswer(0); // Incorrecta (correcta era 1)
        expect(state.score).toBe(1);
        expect(state.answers[1]).toEqual({
            questionId: 1,
            userAnswer: 0,
            isCorrect: false
        });
    });

    it('allows moving backward to review previously answered questions without modifying score', () => {
        // Responder Pregunta 1 y 2
        handleAnswer(0);
        handleNextQuestion();
        handleAnswer(1); // Correcta
        expect(state.score).toBe(2);

        // Retroceder a Pregunta 1
        handlePreviousQuestion();
        expect(state.currentQuestionIndex).toBe(0);

        // Reanudar/revisar pregunta previa
        const existingAns = state.answers[state.currentQuestionIndex];
        expect(existingAns).toBeDefined();
        expect(existingAns.userAnswer).toBe(0);

        // Simular ejecución de handleAnswer en modo replay
        handleAnswer(existingAns.userAnswer, true);
        expect(state.score).toBe(2); // Puntaje inmutable

        // Volver a avanzar a Pregunta 2
        handleNextQuestion();
        expect(state.currentQuestionIndex).toBe(1);
    });

    it('correctly maps questions and answers for submission payload after multiple navigations', () => {
        // Responder Q1, Q2, Q3
        handleAnswer(0); // Q1 correct (0)
        handleNextQuestion();
        handleAnswer(2); // Q2 wrong (correct 1)
        handleNextQuestion();
        handleAnswer(2); // Q3 correct (2)

        // Retroceder a Q1 y volver a Q3
        handlePreviousQuestion();
        handlePreviousQuestion();
        expect(state.currentQuestionIndex).toBe(0);
        handleNextQuestion();
        handleNextQuestion();
        expect(state.currentQuestionIndex).toBe(2);

        const totalCount = 3;
        const mappedQuestions = state.questions.slice(0, totalCount).map((q, idx) => ({
            id: q.id,
            userAnswer: state.answers[idx]?.userAnswer !== undefined ? state.answers[idx].userAnswer : 0,
            correct_option_index: q.correct_option_index,
            isCorrect: !!state.answers[idx]?.isCorrect,
            topic: q.topic || 'General'
        }));

        expect(mappedQuestions).toHaveLength(3);
        expect(mappedQuestions[0]).toEqual({
            id: 'q1',
            userAnswer: 0,
            correct_option_index: 0,
            isCorrect: true,
            topic: 'Pediatría'
        });
        expect(mappedQuestions[1]).toEqual({
            id: 'q2',
            userAnswer: 2,
            correct_option_index: 1,
            isCorrect: false,
            topic: 'Cirugía'
        });
        expect(mappedQuestions[2]).toEqual({
            id: 'q3',
            userAnswer: 2,
            correct_option_index: 2,
            isCorrect: true,
            topic: 'Ginecología'
        });
    });
});
