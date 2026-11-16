const db = require('../../src/infrastructure/database/db');
const AnalyticsRepository = require('../../src/domain/repositories/analyticsRepository');
const adminRepository = require('../../src/domain/repositories/adminRepository');
const docenteRepository = require('../../src/domain/repositories/docenteRepository');
const medicoRepository = require('../../src/domain/repositories/medicoRepository');
const flashcardRepository = require('../../src/domain/repositories/flashcardRepository');
const UserRepository = require('../../src/domain/repositories/userRepository');
const BookRepository = require('../../src/domain/repositories/bookRepository');
const tutorAiService = require('../../src/domain/services/tutorAiService');
const ragService = require('../../src/domain/services/ragService');
const quizPackingUtils = require('../../src/domain/utils/quizPackingUtils');

jest.mock('../../src/infrastructure/database/db', () => ({
    query: jest.fn(),
    pool: jest.fn()
}));

describe('Domain Layer Performance, Memory & N+1 Query Optimizations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        AnalyticsRepository.clearPulseCache();
        BookRepository.clearCache();
        ragService.clearCache();
    });

    describe('1. AnalyticsRepository: web_traffic Pulse Throttling & Query Consolidation', () => {
        it('throttles repeated logPulse calls for the same session within 60s window', async () => {
            const repo = new AnalyticsRepository();
            db.query.mockResolvedValue({ rowCount: 1, rows: [] });

            const first = await repo.logPulse('sess-abc-123', null, false);
            const second = await repo.logPulse('sess-abc-123', null, false);

            expect(first.throttled).toBe(false);
            expect(second.throttled).toBe(true);
            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query.mock.calls[0][0]).toContain("WHERE web_traffic.last_ping < NOW() - INTERVAL '60 seconds'");
        });

        it('bypasses throttle when anonymous session upgrades to an authenticated userId', async () => {
            const repo = new AnalyticsRepository();
            db.query.mockResolvedValue({ rowCount: 1, rows: [] });

            await repo.logPulse('sess-upgrade-1', null, true);
            const upgraded = await repo.logPulse('sess-upgrade-1', 'user-uuid-99', true);

            expect(upgraded.throttled).toBe(false);
            expect(db.query).toHaveBeenCalledTimes(2);
        });

        it('getDashboardMetricsRaw executes only 3 queries and never runs dummy SELECT 0 AS count', async () => {
            const repo = new AnalyticsRepository();
            db.query
                .mockResolvedValueOnce({
                    rows: [{
                        search_bar_count: '12',
                        chatbot_count: '3',
                        educational_count: '9',
                        active_users_count: '4'
                    }]
                })
                .mockResolvedValueOnce({ rows: [{ query: 'serums', count: '5' }] })
                .mockResolvedValueOnce({ rows: [{ count: '150' }] });

            const metrics = await repo.getDashboardMetricsRaw(30);

            expect(db.query).toHaveBeenCalledTimes(3);
            db.query.mock.calls.forEach(([sql]) => {
                expect(sql).not.toContain('SELECT 0 AS count');
            });
            expect(metrics).toEqual({
                totalSearches: 12,
                totalChatQueries: 3,
                educationalQueries: 9,
                totalFeedbacks: 0,
                positiveFeedbacks: 0,
                activeUsers: 4,
                totalChatMessages: 0,
                topSearchesRaw: [{ query: 'serums', count: '5' }],
                totalUsers: 150
            });
        });

        it('getSearchHistory enforces a bounded LIMIT parameter', async () => {
            const repo = new AnalyticsRepository();
            db.query.mockResolvedValueOnce({ rows: [] });

            await repo.getSearchHistory(250);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('LIMIT $1'),
                [250]
            );
        });
    });

    describe('2. DocenteRepository & MedicoRepository: Late Row Lookup & Atomic Batch History Upsert', () => {
        it('saveQuizHistory performs a single atomic batch UPSERT on user_question_history instead of N+1 queries', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 'attempt-1', inserted: true }] })
                .mockResolvedValueOnce({ rowCount: 3, rows: [] });

            const quizData = {
                topic: 'Salud Pública',
                score: 2,
                totalQuestions: 10,
                mode: 'study',
                questions: [
                    { id: '11111111-1111-4111-8111-111111111111', isCorrect: true },
                    { id: '22222222-2222-4222-8222-222222222222', isCorrect: false },
                    { id: '33333333-3333-4333-8333-333333333333', isCorrect: true }
                ]
            };

            await medicoRepository.saveQuizHistory('user-med-1', quizData);

            // 1 query for quiz_history + 1 batch query for user_question_history (not 6+ queries)
            expect(db.query).toHaveBeenCalledTimes(2);
            expect(db.query.mock.calls[1][0]).toContain('ON CONFLICT (user_id, question_id)');
            expect(db.query.mock.calls[1][1]).toEqual([
                'user-med-1',
                '11111111-1111-4111-8111-111111111111',
                '22222222-2222-4222-8222-222222222222',
                '33333333-3333-4333-8333-333333333333'
            ]);
        });

        it('removes dead saveQuestionBankBatch method from docenteRepository and medicoRepository', () => {
            expect(docenteRepository.saveQuestionBankBatch).toBeUndefined();
            expect(medicoRepository.saveQuestionBankBatch).toBeUndefined();
        });
    });

    describe('3. AdminRepository: Late Row Lookup Pagination & Batch Topic Linking', () => {
        it('getAllQuestions uses FilteredIds CTE for late row lookup and subquery for case search', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            await adminRepository.getAllQuestions('education', 'comprensión', 2, 50, 'linked');

            const [sql, params] = db.query.mock.calls[0];
            expect(sql).toContain('WITH FilteredIds AS');
            expect(sql).toContain('SELECT cs_sub.id FROM case_scenarios cs_sub');
            expect(sql).toContain('qb.case_id IS NOT NULL');
            expect(params).toEqual(['education', '%comprensión%', 50, 50]);
        });

        it('addResource inserts multiple topic_resources in a single batch SQL statement', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 77 }] })
                .mockResolvedValueOnce({ rowCount: 3, rows: [] });

            const numericId = await adminRepository.addResource(
                'RES_77', 'Guía MINSA', 'MINSA', 'https://gob.pe/minsa.pdf', 'guia', null, false, false, true, false, [10, 20, 30]
            );

            expect(numericId).toBe(77);
            expect(db.query).toHaveBeenCalledTimes(2);
            expect(db.query.mock.calls[1][0]).toContain('INSERT INTO topic_resources (resource_id, topic_id) VALUES ($1, $2), ($1, $3), ($1, $4) ON CONFLICT DO NOTHING');
            expect(db.query.mock.calls[1][1]).toEqual([77, 10, 20, 30]);
        });
    });

    describe('4. UserRepository & FlashcardRepository: Transaction Safety & Batch Tree Deletion', () => {
        it('UserRepository.delete never queries non-existent feedback table inside transaction', async () => {
            const mockClient = {
                query: jest.fn().mockResolvedValue({ rowCount: 1 }),
                release: jest.fn()
            };
            db.pool.mockReturnValue({
                connect: jest.fn().mockResolvedValue(mockClient)
            });

            const userRepo = new UserRepository();
            await userRepo.delete('user-tx-safe');

            const executedSqls = mockClient.query.mock.calls.map(c => c[0]);
            expect(executedSqls.some(sql => /FROM\s+feedback/i.test(sql))).toBe(false);
        });

        it('FlashcardRepository.deleteDeck deletes all deck tree IDs in a single ANY($1::uuid[]) query', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 'd-child-2' }, { id: 'd-child-1' }, { id: 'd-root' }] })
                .mockResolvedValueOnce({ rowCount: 3 });

            await flashcardRepository.deleteDeck('user-1', 'd-root');

            expect(db.query).toHaveBeenCalledTimes(2);
            expect(db.query.mock.calls[1][0]).toContain('DELETE FROM decks WHERE id = ANY($1::uuid[]) AND user_id = $2');
            expect(db.query.mock.calls[1][1]).toEqual([['d-child-2', 'd-child-1', 'd-root'], 'user-1']);
        });
    });

    describe('5. TutorAiService & BookRepository: Bounded Topic Cache & Clean Repository Delegation', () => {
        it('TutorAiService._setCachedTopics bounds cache size to prevent memory leaks and respects TTL', () => {
            tutorAiService._topicCache.clear();
            for (let i = 0; i < 205; i++) {
                tutorAiService._setCachedTopics(`conv-${i}`, [`tema-${i}`]);
            }

            expect(tutorAiService._topicCache.size).toBeLessThanOrEqual(200);
            expect(tutorAiService._getCachedTopics('conv-0')).toBeNull();
            expect(tutorAiService._getCachedTopics('conv-204')).toEqual(['tema-204']);
        });

        it('TutorAiService._searchVisualResources delegates to BookRepository and caches results', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ title: 'Esquema Shock Séptico', image_url: '/api/media/gcs?file=shock.webp', relevance: 100 }]
            });

            const firstCatalog = await tutorAiService._searchVisualResources(['shock séptico'], 'medicine');
            const secondCatalog = await tutorAiService._searchVisualResources(['shock séptico'], 'medicine');

            expect(firstCatalog).toContain('Esquema Shock Séptico');
            expect(secondCatalog).toBe(firstCatalog);
            expect(db.query).toHaveBeenCalledTimes(1);
        });

        it('quizPackingUtils sanitizes UUID lists accurately', () => {
            const validUuid = '11111111-1111-4111-8111-111111111111';
            const cleaned = quizPackingUtils.sanitizeUuidList([validUuid, validUuid, 'not-a-uuid', null, '']);
            expect(cleaned).toEqual([validUuid]);
        });
    });
});
