const db = require('../../src/infrastructure/database/db');
const docenteRepository = require('../../src/domain/repositories/docenteRepository');
const medicoRepository = require('../../src/domain/repositories/medicoRepository');
const docenteService = require('../../src/domain/services/docenteService');
const medicoService = require('../../src/domain/services/medicoService');

jest.mock('../../src/infrastructure/database/db', () => ({
    query: jest.fn(),
    getClient: jest.fn()
}));

describe('Anti-Repetition 24h System & Real Mock Exemption', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('DocenteRepository: findQuestionsInBankBatch', () => {

        it('queries user_question_history and excludes seen questions & case siblings for standard 20q quiz', async () => {
            const mockUserId = '11111111-1111-4111-8111-111111111111';
            const seenQuestionId = '22222222-2222-4222-8222-222222222222';

            // 1. Mock query for user_question_history
            db.query.mockResolvedValueOnce({
                rows: [{ question_id: seenQuestionId }]
            });

            // 2. Mock query for main bank fetch (returns 20 fresh questions)
            const freshQuestions = Array.from({ length: 20 }, (_, i) => ({
                id: `33333333-3333-4333-8333-${String(i + 1).padStart(12, '0')}`,
                question_text: `Pregunta fresca ${i + 1}`,
                options: ['A', 'B', 'C', 'D'],
                correct_option_index: 0,
                case_id: null
            }));
            db.query.mockResolvedValueOnce({ rows: freshQuestions });

            const result = await docenteRepository.findQuestionsInBankBatch(
                'ASCENSO',
                ['Comprensión Lectora'],
                20,
                mockUserId,
                'EBR - Primaria',
                null,
                [],
                'standard'
            );

            // Assert user_question_history was queried for 24-hour window
            expect(db.query).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining("seen_at > NOW() - INTERVAL '24 hours'"),
                [mockUserId]
            );

            // Assert main query excludes seen questions and their case siblings
            expect(db.query).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining("qb.id <> ALL("),
                expect.arrayContaining([[seenQuestionId]])
            );

            expect(result).toHaveLength(20);
        });

        it('falls back to recycling questions when unseen bank questions are insufficient', async () => {
            const mockUserId = '11111111-1111-4111-8111-111111111111';
            const seenId = '22222222-2222-4222-8222-222222222222';

            // 1. user_question_history query
            db.query.mockResolvedValueOnce({
                rows: [{ question_id: seenId }]
            });

            // 2. Main query with filter returns only 2 questions (fewer than requested 10)
            db.query.mockResolvedValueOnce({
                rows: [
                    { id: 'fresh-1', question_text: 'F-1', options: ['A', 'B'], case_id: null },
                    { id: 'fresh-2', question_text: 'F-2', options: ['A', 'B'], case_id: null }
                ]
            });

            // 3. Fallback query returns all bank questions to recycle
            db.query.mockResolvedValueOnce({
                rows: [
                    { id: 'fresh-1', question_text: 'F-1', options: ['A', 'B'], case_id: null },
                    { id: 'fresh-2', question_text: 'F-2', options: ['A', 'B'], case_id: null },
                    { id: seenId, question_text: 'Recycled', options: ['A', 'B'], case_id: null }
                ]
            });

            const result = await docenteRepository.findQuestionsInBankBatch(
                'ASCENSO',
                ['*'],
                10,
                mockUserId,
                null,
                null,
                [],
                'study'
            );

            // 3 queries executed: 1 history, 1 main with exclusion, 1 fallback
            expect(db.query).toHaveBeenCalledTimes(3);
            expect(result.length).toBeGreaterThanOrEqual(2);
        });

        it('bypasses user_question_history when mode is "real"', async () => {
            const mockUserId = '11111111-1111-4111-8111-111111111111';

            const bankQuestions = Array.from({ length: 60 }, (_, i) => ({
                id: `q-real-${i + 1}`,
                question_text: `Real Mock Q ${i + 1}`,
                options: ['A', 'B', 'C', 'D'],
                correct_option_index: 1,
                case_id: null
            }));
            db.query.mockResolvedValueOnce({ rows: bankQuestions });

            const result = await docenteRepository.findQuestionsInBankBatch(
                'ASCENSO',
                ['*'],
                60,
                mockUserId,
                'EBR - Primaria',
                null,
                [],
                'real'
            );

            // user_question_history must NOT be queried
            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).not.toHaveBeenCalledWith(
                expect.stringContaining("user_question_history"),
                expect.any(Array)
            );
            expect(result).toHaveLength(60);
        });
    });

    describe('MedicoRepository: findQuestionsInBankBatch', () => {

        it('queries user_question_history and excludes seen questions for standard mode', async () => {
            const mockUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
            const seenQuestionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

            db.query.mockResolvedValueOnce({
                rows: [{ question_id: seenQuestionId }]
            });

            const mockQuestions = Array.from({ length: 20 }, (_, i) => ({
                id: `med-fresh-${i + 1}`,
                question_text: `Med Question ${i + 1}`,
                options: ['A', 'B', 'C', 'D'],
                correct_option_index: 2,
                case_id: null
            }));
            db.query.mockResolvedValueOnce({ rows: mockQuestions });

            const result = await medicoRepository.findQuestionsInBankBatch(
                'SERUMS',
                ['Salud Pública'],
                20,
                mockUserId,
                'Medicina Humana',
                null,
                [],
                'standard'
            );

            expect(db.query).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining("seen_at > NOW() - INTERVAL '24 hours'"),
                [mockUserId]
            );
            expect(result).toHaveLength(20);
        });

        it('bypasses user_question_history when mode is "real"', async () => {
            const mockUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

            const bankQuestions = Array.from({ length: 100 }, (_, i) => ({
                id: `med-real-${i + 1}`,
                question_text: `Med Real Q ${i + 1}`,
                options: ['A', 'B', 'C', 'D'],
                correct_option_index: 0,
                case_id: null
            }));
            db.query.mockResolvedValueOnce({ rows: bankQuestions });

            const result = await medicoRepository.findQuestionsInBankBatch(
                'SERUMS',
                ['*'],
                100,
                mockUserId,
                'Medicina Humana',
                null,
                [],
                'real'
            );

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).not.toHaveBeenCalledWith(
                expect.stringContaining("user_question_history"),
                expect.any(Array)
            );
            expect(result).toHaveLength(100);
        });
    });

    describe('Atomic Exam Packing: Casuística Clustering & Variety', () => {

        it('packs case questions contiguously with ascending case_order and mixes units organically', () => {
            const rawQuestions = [
                // Case Alpha (3 questions)
                { id: 'a1', topic: 'Pedagogía', case_id: 'case-alpha', case_order: 1, case_title: 'Caso Alpha' },
                { id: 'a2', topic: 'Pedagogía', case_id: 'case-alpha', case_order: 2, case_title: 'Caso Alpha' },
                { id: 'a3', topic: 'Pedagogía', case_id: 'case-alpha', case_order: 3, case_title: 'Caso Alpha' },
                // Case Beta (2 questions)
                { id: 'b1', topic: 'Didáctica', case_id: 'case-beta', case_order: 1, case_title: 'Caso Beta' },
                { id: 'b2', topic: 'Didáctica', case_id: 'case-beta', case_order: 2, case_title: 'Caso Beta' },
                // Solo questions
                { id: 's1', topic: 'Pedagogía', case_id: null },
                { id: 's2', topic: 'Didáctica', case_id: null },
                { id: 's3', topic: 'Convivencia', case_id: null },
                { id: 's4', topic: 'Gestión', case_id: null },
                { id: 's5', topic: 'Tutoría', case_id: null }
            ];

            const packed = docenteService.packExamQuestions(rawQuestions, 10, ['Pedagogía', 'Didáctica', 'Convivencia'], false);

            expect(packed.length).toBe(10);

            // Sibling questions of case-alpha must appear consecutively and in order
            const alphaIndices = packed
                .map((q, idx) => (q.case_id === 'case-alpha' ? idx : null))
                .filter(idx => idx !== null);

            if (alphaIndices.length === 3) {
                expect(alphaIndices[1]).toBe(alphaIndices[0] + 1);
                expect(alphaIndices[2]).toBe(alphaIndices[1] + 1);
                expect(packed[alphaIndices[0]].case_order).toBe(1);
                expect(packed[alphaIndices[1]].case_order).toBe(2);
                expect(packed[alphaIndices[2]].case_order).toBe(3);
            }

            // Sibling questions of case-beta must appear consecutively and in order
            const betaIndices = packed
                .map((q, idx) => (q.case_id === 'case-beta' ? idx : null))
                .filter(idx => idx !== null);

            if (betaIndices.length === 2) {
                expect(betaIndices[1]).toBe(betaIndices[0] + 1);
                expect(packed[betaIndices[0]].case_order).toBe(1);
                expect(packed[betaIndices[1]].case_order).toBe(2);
            }
        });
    });

    describe('Controller Layer: Forwarding seenIds from req.body to Services', () => {
        const docenteController = require('../../src/application/controllers/docenteController');
        const medicoController = require('../../src/application/controllers/medicoController');

        it('docenteController.startQuiz extracts seenIds and forwards to docenteService.generateQuiz', async () => {
            const spyService = jest.spyOn(docenteService, 'generateQuiz').mockResolvedValueOnce({
                topic: 'Pedagogía',
                areas: ['Pedagogía'],
                questions: [{ id: 'q-1', question_text: 'Q1', options: ['A', 'B'] }]
            });

            const req = {
                user: { id: 'usr-edu-1', role: 'admin', subscriptionTier: 'advanced', subscriptionStatus: 'active' },
                body: {
                    target: 'ASCENSO',
                    areas: ['Pedagogía'],
                    limit: 10,
                    mode: 'study',
                    seenIds: ['disc-q-1', 'disc-q-2']
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await docenteController.startQuiz(req, res);

            expect(spyService).toHaveBeenCalledWith(
                expect.objectContaining({ target: 'ASCENSO', mode: 'study' }),
                'usr-edu-1',
                10,
                'advanced',
                ['disc-q-1', 'disc-q-2']
            );

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
            spyService.mockRestore();
        });

        it('medicoController.startQuiz extracts seenIds and forwards to medicoService.generateQuiz', async () => {
            const spyService = jest.spyOn(medicoService, 'generateQuiz').mockResolvedValueOnce({
                topic: 'Pediatría',
                areas: ['Pediatría'],
                questions: [{ id: 'qm-1', question_text: 'QM1', options: ['A', 'B'] }]
            });

            const req = {
                user: { id: 'usr-med-1', role: 'admin', subscriptionTier: 'advanced', subscriptionStatus: 'active' },
                body: {
                    target: 'SERUMS',
                    areas: ['Pediatría'],
                    limit: 10,
                    mode: 'study',
                    seenIds: ['disc-qm-1']
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await medicoController.startQuiz(req, res);

            expect(spyService).toHaveBeenCalledWith(
                expect.objectContaining({ target: 'SERUMS', mode: 'study' }),
                'usr-med-1',
                10,
                'advanced',
                ['disc-qm-1']
            );

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
            spyService.mockRestore();
        });
    });
});

