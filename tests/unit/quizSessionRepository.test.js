const db = require('../../src/infrastructure/database/db');
const quizSessionRepository = require('../../src/domain/repositories/quizSessionRepository');

jest.mock('../../src/infrastructure/database/db', () => ({
    pool: jest.fn(),
    query: jest.fn()
}));

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const QUESTION_ID = '22222222-2222-4222-8222-222222222222';

describe('QuizSessionRepository.recordAnswer', () => {
    let client;

    beforeEach(() => {
        jest.clearAllMocks();
        client = {
            query: jest.fn(),
            release: jest.fn()
        };
        db.pool.mockReturnValue({ connect: jest.fn().mockResolvedValue(client) });
    });

    it('locks the session/question and persists only the first selected option', async () => {
        client.query
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{
                session_id: SESSION_ID,
                user_id: null,
                domain: 'medicine',
                status: 'active',
                expires_at: '2099-01-01T00:00:00.000Z',
                session_question_id: QUESTION_ID,
                public_payload: { options: ['A', 'B', 'C'] },
                answer_payload: { correct_option_index: 2 },
                selected_option_index: null,
                is_correct: null,
                answered_at: null
            }] })
            .mockResolvedValueOnce({ rows: [{
                selected_option_index: 2,
                is_correct: true,
                answered_at: '2026-08-21T12:00:00.000Z'
            }] })
            .mockResolvedValueOnce({}); // COMMIT

        const result = await quizSessionRepository.recordAnswer({
            sessionId: SESSION_ID,
            sessionQuestionId: QUESTION_ID,
            userId: null,
            domain: 'medicine',
            selectedOptionIndex: 2
        });

        expect(client.query.mock.calls[1][0]).toContain('FOR UPDATE OF s, q');
        expect(client.query.mock.calls[2][0]).toContain('UPDATE quiz_session_questions');
        expect(result).toEqual(expect.objectContaining({ selected_option_index: 2, is_correct: true }));
        expect(client.release).toHaveBeenCalled();
    });

    it('returns the persisted answer without allowing a replay to change it', async () => {
        client.query
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ rows: [{
                session_id: SESSION_ID,
                user_id: null,
                domain: 'medicine',
                status: 'active',
                expires_at: '2099-01-01T00:00:00.000Z',
                session_question_id: QUESTION_ID,
                public_payload: { options: ['A', 'B', 'C'] },
                answer_payload: { correct_option_index: 2 },
                selected_option_index: 0,
                is_correct: false,
                answered_at: '2026-08-21T12:00:00.000Z'
            }] })
            .mockResolvedValueOnce({});

        const result = await quizSessionRepository.recordAnswer({
            sessionId: SESSION_ID,
            sessionQuestionId: QUESTION_ID,
            userId: null,
            domain: 'medicine',
            selectedOptionIndex: 2
        });

        expect(client.query).toHaveBeenCalledTimes(3);
        expect(result.selected_option_index).toBe(0);
        expect(result.is_correct).toBe(false);
    });
});
