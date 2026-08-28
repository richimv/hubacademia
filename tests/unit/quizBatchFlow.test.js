const medicoController = require('../../src/application/controllers/medicoController');
const docenteController = require('../../src/application/controllers/docenteController');
const medicoService = require('../../src/domain/services/medicoService');
const docenteService = require('../../src/domain/services/docenteService');
const quizSessionService = require('../../src/domain/services/quizSessionService');

jest.mock('../../src/domain/services/medicoService', () => ({
    generateQuiz: jest.fn(),
    submitQuizResult: jest.fn()
}));

jest.mock('../../src/domain/services/docenteService', () => ({
    generateQuiz: jest.fn(),
    submitQuizResult: jest.fn()
}));

jest.mock('../../src/domain/services/quizSessionService', () => ({
    appendQuestions: jest.fn(),
    createSession: jest.fn(),
    gradeForSubmission: jest.fn(),
    markSubmitted: jest.fn()
}));

describe('Quiz Batch Loading Flow (Contract & Integrity)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            user: { id: 'usr-123', email: 'test@hubacademia.com', subscriptionTier: 'advanced', subscriptionStatus: 'active' },
            body: {
                quizSessionId: 'sess-abc-123',
                target: 'SERUMS',
                areas: ['Salud Pública', 'Pediatría'],
                career: 'Medicina Humana',
                difficulty: 'Senior',
                seenIds: ['q1', 'q2', 'q3', 'q4', 'q5'],
                mode: '',
                configType: 'custom'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('medicoController.getNextBatch', () => {
        it('fetches the next batch of 5 questions and passes seenIds and configType', async () => {
            medicoService.generateQuiz.mockResolvedValue({
                questions: [
                    { id: 'q6', question_text: 'Q6', options: ['A', 'B'], correct_option_index: 0 },
                    { id: 'q7', question_text: 'Q7', options: ['A', 'B'], correct_option_index: 1 },
                    { id: 'q8', question_text: 'Q8', options: ['A', 'B'], correct_option_index: 0 },
                    { id: 'q9', question_text: 'Q9', options: ['A', 'B'], correct_option_index: 1 },
                    { id: 'q10', question_text: 'Q10', options: ['A', 'B'], correct_option_index: 0 }
                ],
                areas: ['Salud Pública', 'Pediatría'],
                source: 'BANK'
            });

            await medicoController.getNextBatch(req, res);

            expect(medicoService.generateQuiz).toHaveBeenCalledWith(
                expect.objectContaining({
                    target: 'SERUMS',
                    areas: ['Salud Pública', 'Pediatría'],
                    career: 'Medicina Humana',
                    difficulty: 'Senior',
                    configType: 'custom'
                }),
                'usr-123',
                10,
                'advanced',
                ['q1', 'q2', 'q3', 'q4', 'q5']
            );

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                quizSessionId: 'sess-abc-123',
                questions: expect.arrayContaining([expect.objectContaining({ id: 'q6' })]),
                source: 'BANK'
            }));
        });
    });

    describe('docenteController.getNextBatch', () => {
        it('fetches the next batch for docente module properly', async () => {
            req.body.target = 'ASCENSO';
            req.body.career = 'EBR - Primaria';
            docenteService.generateQuiz.mockResolvedValue({
                questions: [
                    { id: 'doc-q6', question_text: 'Doc Q6', options: ['A', 'B'], correct_option_index: 0 },
                    { id: 'doc-q7', question_text: 'Doc Q7', options: ['A', 'B'], correct_option_index: 1 }
                ],
                areas: ['Comprensión Lectora'],
                source: 'BANK'
            });

            await docenteController.getNextBatch(req, res);

            expect(docenteService.generateQuiz).toHaveBeenCalledWith(
                expect.objectContaining({
                    target: 'ASCENSO',
                    career: 'EBR - Primaria',
                    configType: 'custom'
                }),
                'usr-123',
                10,
                'advanced',
                ['q1', 'q2', 'q3', 'q4', 'q5']
            );

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                questions: expect.arrayContaining([expect.objectContaining({ id: 'doc-q6' })])
            }));
        });
    });
});
