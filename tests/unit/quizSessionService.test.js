const quizSessionRepository = require('../../src/domain/repositories/quizSessionRepository');
const quizSessionService = require('../../src/domain/services/quizSessionService');

jest.mock('../../src/domain/repositories/quizSessionRepository', () => ({
    createSession: jest.fn(),
    appendQuestions: jest.fn(),
    recordAnswer: jest.fn(),
    getGradedSession: jest.fn(),
    markSubmitted: jest.fn()
}));

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_QUESTION_ID = '22222222-2222-4222-8222-222222222222';
const BANK_QUESTION_ID = '33333333-3333-4333-8333-333333333333';

describe('QuizSessionService', () => {
    beforeEach(() => jest.clearAllMocks());

    it('stores the answer key server-side and returns a public projection', async () => {
        quizSessionRepository.createSession.mockImplementation(async ({ questions }) => ({
            id: SESSION_ID,
            expires_at: '2026-08-22T00:00:00.000Z',
            questions: [{
                id: SESSION_QUESTION_ID,
                bank_question_id: questions[0].bankQuestionId,
                public_payload: questions[0].publicPayload
            }]
        }));

        const result = await quizSessionService.createSession({
            userId: '44444444-4444-4444-8444-444444444444',
            domain: 'medicine',
            questions: [{
                id: BANK_QUESTION_ID,
                question_text: 'Pregunta',
                options: ['A', 'B', 'C'],
                correct_option_index: 1,
                explanation: 'Explicación privada'
            }]
        });

        const storedQuestion = quizSessionRepository.createSession.mock.calls[0][0].questions[0];
        expect(storedQuestion.publicPayload).toHaveProperty('correct_option_index', 1);
        expect(storedQuestion.publicPayload).toHaveProperty('explanation', 'Explicación privada');
        expect(storedQuestion.answerPayload).toEqual(expect.objectContaining({
            correct_option_index: 1,
            explanation: 'Explicación privada'
        }));
        expect(result.questions[0]).toEqual(expect.objectContaining({
            id: BANK_QUESTION_ID,
            sessionQuestionId: SESSION_QUESTION_ID,
            correct_option_index: 1,
            explanation: 'Explicación privada'
        }));
    });

    it('rejects malformed questions before opening a session', async () => {
        await expect(quizSessionService.createSession({
            domain: 'education',
            questions: [{ options: ['A'], correct_option_index: 4 }]
        })).rejects.toMatchObject({ code: 'INVALID_QUIZ_QUESTION' });
        expect(quizSessionRepository.createSession).not.toHaveBeenCalled();
    });

    it('returns feedback only after the repository has locked the first answer', async () => {
        quizSessionRepository.recordAnswer.mockResolvedValue({
            session_question_id: SESSION_QUESTION_ID,
            selected_option_index: 2,
            is_correct: true,
            answer_payload: {
                correct_option_index: 2,
                explanation: 'Detalle',
                explanation_image_url: null
            },
            answered_at: '2026-08-21T12:00:00.000Z'
        });

        const result = await quizSessionService.recordAnswer({
            sessionId: SESSION_ID,
            sessionQuestionId: SESSION_QUESTION_ID,
            userId: null,
            domain: 'medicine',
            selectedOptionIndex: 2
        });

        expect(result).toEqual(expect.objectContaining({
            selectedOptionIndex: 2,
            correctOptionIndex: 2,
            isCorrect: true
        }));
    });

    it('computes score exclusively from persisted server answers', async () => {
        quizSessionRepository.getGradedSession.mockResolvedValue({
            id: SESSION_ID,
            questions: [
                {
                    id: SESSION_QUESTION_ID,
                    bank_question_id: BANK_QUESTION_ID,
                    public_payload: { topic: 'Cardiología' },
                    answer_payload: { correct_option_index: 1 },
                    selected_option_index: 1,
                    is_correct: true
                },
                {
                    id: '55555555-5555-4555-8555-555555555555',
                    bank_question_id: null,
                    public_payload: { topic: 'Cardiología' },
                    answer_payload: { correct_option_index: 0 },
                    selected_option_index: 2,
                    is_correct: false
                }
            ]
        });

        const result = await quizSessionService.gradeForSubmission({
            sessionId: SESSION_ID,
            userId: '44444444-4444-4444-8444-444444444444',
            domain: 'medicine'
        });

        expect(result.score).toBe(1);
        expect(result.totalQuestions).toBe(2);
        expect(result.questions[0]).toEqual(expect.objectContaining({ isCorrect: true, userAnswer: 1 }));
    });

    it('correctly grades batch client answers when questions were answered offline-first (e.g. 3/10 and 7/10)', async () => {
        // Mock a 10-question session with null selected_option_index in DB
        const tenQuestions = Array.from({ length: 10 }, (_, i) => ({
            id: `session-q-${i}`,
            bank_question_id: `bank-q-${i}`,
            public_payload: { id: `bank-q-${i}`, topic: 'Pedagogía' },
            answer_payload: { correct_option_index: 0 }, // All correct answers are 0 (A)
            selected_option_index: null,
            is_correct: null
        }));

        quizSessionRepository.getGradedSession.mockImplementation(async ({ clientAnswers }) => {
            // Simulate repository grading clientAnswers
            const graded = tenQuestions.map((q, idx) => {
                const ans = clientAnswers && clientAnswers[idx];
                const selected = ans ? ans.userAnswer : null;
                const correct = q.answer_payload.correct_option_index;
                return {
                    ...q,
                    selected_option_index: selected,
                    is_correct: selected !== null ? selected === correct : false
                };
            });
            return { id: SESSION_ID, questions: graded };
        });

        // 1. Test student with 3 correct answers (3/10)
        const clientAnswers3 = [
            { id: 'bank-q-0', userAnswer: 0 }, // Correct
            { id: 'bank-q-1', userAnswer: 0 }, // Correct
            { id: 'bank-q-2', userAnswer: 0 }, // Correct
            { id: 'bank-q-3', userAnswer: 1 }, // Wrong
            { id: 'bank-q-4', userAnswer: 2 }, // Wrong
            { id: 'bank-q-5', userAnswer: 1 }, // Wrong
            { id: 'bank-q-6', userAnswer: 2 }, // Wrong
            { id: 'bank-q-7', userAnswer: 3 }, // Wrong
            { id: 'bank-q-8', userAnswer: 1 }, // Wrong
            { id: 'bank-q-9', userAnswer: 2 }  // Wrong
        ];

        const result3 = await quizSessionService.gradeForSubmission({
            sessionId: SESSION_ID,
            userId: '44444444-4444-4444-8444-444444444444',
            domain: 'education',
            clientAnswers: clientAnswers3
        });

        expect(result3.score).toBe(3);
        expect(result3.totalQuestions).toBe(10);
        expect(result3.questions.filter(q => q.isCorrect).length).toBe(3);

        // 2. Test student with 7 correct answers (7/10)
        const clientAnswers7 = [
            { id: 'bank-q-0', userAnswer: 0 }, // Correct
            { id: 'bank-q-1', userAnswer: 0 }, // Correct
            { id: 'bank-q-2', userAnswer: 0 }, // Correct
            { id: 'bank-q-3', userAnswer: 0 }, // Correct
            { id: 'bank-q-4', userAnswer: 0 }, // Correct
            { id: 'bank-q-5', userAnswer: 0 }, // Correct
            { id: 'bank-q-6', userAnswer: 0 }, // Correct
            { id: 'bank-q-7', userAnswer: 1 }, // Wrong
            { id: 'bank-q-8', userAnswer: 2 }, // Wrong
            { id: 'bank-q-9', userAnswer: 1 }  // Wrong
        ];

        const result7 = await quizSessionService.gradeForSubmission({
            sessionId: SESSION_ID,
            userId: '44444444-4444-4444-8444-444444444444',
            domain: 'education',
            clientAnswers: clientAnswers7
        });

        expect(result7.score).toBe(7);
        expect(result7.totalQuestions).toBe(10);
        expect(result7.questions.filter(q => q.isCorrect).length).toBe(7);
    });
});
