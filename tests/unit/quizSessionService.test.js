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
});
