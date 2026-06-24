const idiomasSimulatorRepository = require('../../src/domain/repositories/idiomasSimulatorRepository');
const db = require('../../src/infrastructure/database/db');

jest.mock('../../src/infrastructure/database/db', () => ({
    query: jest.fn()
}));

describe('IdiomasSimulatorRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findQuestionsInBankBatch', () => {
        it('should sanitize seenIds and filter out null, undefined, or non-UUID values', async () => {
            db.query.mockImplementation((queryText, params) => {
                if (queryText.includes('user_question_history')) {
                    return Promise.resolve({ rows: [{ question_id: 'db-uuid-1' }] });
                }
                return Promise.resolve({ rows: [] });
            });

            const target = 'MCER';
            const topics = ['Grammar & Use of English'];
            const limit = 5;
            const userId = 'user-123';
            const career = 'en-US';
            const difficulty = 'B2';
            // Passing seenIds with null, undefined, invalid formats, and a valid UUID
            const sessionSeenIds = [
                null,
                undefined,
                'not-a-uuid',
                '9cfc63b3-b71b-4977-8038-4972eb125711'
            ];

            await idiomasSimulatorRepository.findQuestionsInBankBatch(target, topics, limit, userId, career, difficulty, sessionSeenIds);

            // Verify db.query was called with only valid UUIDs
            const dbCalls = db.query.mock.calls;
            // The second call should be the BalancedPool select query
            const selectCall = dbCalls.find(call => call[0].includes('BalancedPool'));
            expect(selectCall).toBeDefined();
            const params = selectCall[1];

            // Let's find the array parameter representing seenIds
            // params should contain: topics ($1), target ($2), career ($3), difficulty ($4), seenIds ($5), limit ($6)
            const seenIdsParam = params.find(p => Array.isArray(p) && p.includes('9cfc63b3-b71b-4977-8038-4972eb125711'));
            expect(seenIdsParam).toBeDefined();
            expect(seenIdsParam).toContain('9cfc63b3-b71b-4977-8038-4972eb125711');
            expect(seenIdsParam).not.toContain(null);
            expect(seenIdsParam).not.toContain(undefined);
            expect(seenIdsParam).not.toContain('not-a-uuid');
        });
    });

    describe('getRandomDemoQuestions', () => {
        it('should sanitize excludeIds and filter out non-UUID values', async () => {
            db.query.mockResolvedValue({ rows: [] });

            const excludeIds = [
                'invalid-uuid',
                '9cfc63b3-b71b-4977-8038-4972eb125711',
                null
            ];

            await idiomasSimulatorRepository.getRandomDemoQuestions(10, excludeIds, 'MCER');

            const dbCalls = db.query.mock.calls;
            const selectCall = dbCalls.find(call => call[0].includes('SELECT id'));
            expect(selectCall).toBeDefined();
            const params = selectCall[1];

            // excludeIds parameter should only have the valid UUID
            const excludeIdsParam = params.find(p => Array.isArray(p) && p.includes('9cfc63b3-b71b-4977-8038-4972eb125711'));
            expect(excludeIdsParam).toBeDefined();
            expect(excludeIdsParam).toHaveLength(1);
            expect(excludeIdsParam[0]).toBe('9cfc63b3-b71b-4977-8038-4972eb125711');
        });
    });

    describe('saveQuestionBankBatch', () => {
        it('should return matching length with null values if some inserts fail', async () => {
            // Mock query to throw for the second item and succeed for others
            db.query.mockImplementation((queryText, params) => {
                const questionText = params[3];
                if (questionText === 'Fail me') {
                    return Promise.reject(new Error('DB Constraint Error'));
                }
                return Promise.resolve({ rows: [{ id: 'success-uuid' }] });
            });

            const questions = [
                { question_text: 'Pass 1', options: ['A', 'B'], correct_option_index: 0, topic: 'Grammar' },
                { question_text: 'Fail me', options: ['A', 'B'], correct_option_index: 0, topic: 'Grammar' },
                { question_text: 'Pass 2', options: ['A', 'B'], correct_option_index: 0, topic: 'Grammar' }
            ];

            const result = await idiomasSimulatorRepository.saveQuestionBankBatch(questions, 'Grammar', 'MCER', 'en-US');

            expect(result).toHaveLength(3);
            expect(result[0]).toBe('success-uuid');
            expect(result[1]).toBeNull();
            expect(result[2]).toBe('success-uuid');
        });
    });
});
