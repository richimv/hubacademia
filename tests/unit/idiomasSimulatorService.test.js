const idiomasSimulatorService = require('../../src/domain/services/idiomasSimulatorService');
const idiomasSimulatorRepository = require('../../src/domain/repositories/idiomasSimulatorRepository');
const adminAiService = require('../../src/domain/services/adminAiService');

jest.mock('../../src/domain/repositories/idiomasSimulatorRepository', () => ({
    findQuestionsInBankBatch: jest.fn(),
    saveQuestionBankBatch: jest.fn(),
    saveQuizHistory: jest.fn(),
    incrementSimulatorUsage: jest.fn(),
    getBasicQuizStats: jest.fn(),
    getTopicAnalysis: jest.fn(),
    getTopicAnalysisFallback: jest.fn(),
    getLeaderboard: jest.fn()
}));

jest.mock('../../src/domain/services/adminAiService', () => ({
    generateRAGQuestions: jest.fn()
}));

describe('IdiomasSimulatorService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateQuiz', () => {
        it('should return questions from the bank when repository has enough questions', async () => {
            const mockQuestions = [
                { id: '1', question_text: 'Q1', options: ['A', 'B', 'C', 'D'], correct_option_index: 0, topic: 'Grammar & Use of English' },
                { id: '2', question_text: 'Q2', options: ['A', 'B', 'C', 'D'], correct_option_index: 1, topic: 'Grammar & Use of English' },
                { id: '3', question_text: 'Q3', options: ['A', 'B', 'C', 'D'], correct_option_index: 2, topic: 'Grammar & Use of English' },
                { id: '4', question_text: 'Q4', options: ['A', 'B', 'C', 'D'], correct_option_index: 3, topic: 'Grammar & Use of English' },
                { id: '5', question_text: 'Q5', options: ['A', 'B', 'C', 'D'], correct_option_index: 0, topic: 'Grammar & Use of English' }
            ];

            idiomasSimulatorRepository.findQuestionsInBankBatch.mockResolvedValue(mockQuestions);

            const options = {
                target: 'MCER',
                career: 'en-US',
                difficulty: 'B2',
                areas: ['Grammar & Use of English'],
                configType: 'custom'
            };

            const result = await idiomasSimulatorService.generateQuiz(options, 'user-123', 5, 'free', []);

            expect(result.source).toBe('BANK');
            expect(result.questions).toHaveLength(5);
            expect(idiomasSimulatorRepository.findQuestionsInBankBatch).toHaveBeenCalledWith(
                'MCER',
                ['GRAMMAR & USE OF ENGLISH'],
                50,
                'user-123',
                'en-US',
                'B2',
                []
            );
        });

        it('should fallback to AI generation when bank is insufficient (reposition flow)', async () => {
            // Insufficient bank response (only 2 questions)
            const mockQuestionsBank = [
                { id: '1', question_text: 'Q1', options: ['A', 'B', 'C', 'D'], correct_option_index: 0, topic: 'Grammar & Use of English' },
                { id: '2', question_text: 'Q2', options: ['A', 'B', 'C', 'D'], correct_option_index: 1, topic: 'Grammar & Use of English' }
            ];
            idiomasSimulatorRepository.findQuestionsInBankBatch.mockResolvedValue(mockQuestionsBank);

            // Mock AI response
            const mockAiQuestions = [
                { question_text: 'AI Q1', options: ['A', 'B', 'C', 'D'], correct_option_index: 0, topic: 'Vocabulary & Context' },
                { question_text: 'AI Q2', options: ['A', 'B', 'C', 'D'], correct_option_index: 1, topic: 'Vocabulary & Context' },
                { question_text: 'AI Q3', options: ['A', 'B', 'C', 'D'], correct_option_index: 2, topic: 'Vocabulary & Context' },
                { question_text: 'AI Q4', options: ['A', 'B', 'C', 'D'], correct_option_index: 3, topic: 'Vocabulary & Context' },
                { question_text: 'AI Q5', options: ['A', 'B', 'C', 'D'], correct_option_index: 0, topic: 'Vocabulary & Context' }
            ];
            adminAiService.generateRAGQuestions.mockResolvedValue(mockAiQuestions);
            idiomasSimulatorRepository.saveQuestionBankBatch.mockResolvedValue(['ai-1', 'ai-2', 'ai-3', 'ai-4', 'ai-5']);

            const options = {
                target: 'MCER',
                career: 'en-US',
                difficulty: 'B2',
                areas: ['Vocabulary & Context'],
                configType: 'custom'
            };

            const result = await idiomasSimulatorService.generateQuiz(options, 'user-123', 5, 'free', []);

            expect(result.source).toBe('HYBRID');
            expect(result.questions).toHaveLength(5);
            expect(adminAiService.generateRAGQuestions).toHaveBeenCalledWith(
                'MCER',
                'Vocabulary & Context',
                'en-US',
                5,
                true,
                'B2'
            );
            expect(idiomasSimulatorRepository.saveQuestionBankBatch).toHaveBeenCalled();
        });

        it('should override areas and select all areas when mode is real', async () => {
            const mockQuestions = [
                { id: '1', question_text: 'Q1', options: ['A', 'B', 'C', 'D'], correct_option_index: 0, topic: 'Grammar & Use of English' }
            ];

            idiomasSimulatorRepository.findQuestionsInBankBatch.mockResolvedValue(mockQuestions);

            const options = {
                target: 'MCER',
                career: 'en-US',
                difficulty: 'B2',
                areas: ['Grammar & Use of English'],
                mode: 'real'
            };

            const result = await idiomasSimulatorService.generateQuiz(options, 'user-123', 5, 'free', []);

            expect(result.areas).toEqual([
                'Grammar & Use of English',
                'Vocabulary & Context',
                'Reading Comprehension',
                'Listening Comprehension'
            ]);
            expect(idiomasSimulatorRepository.findQuestionsInBankBatch).toHaveBeenCalledWith(
                'MCER',
                ['*'],
                50,
                'user-123',
                'en-US',
                'B2',
                []
            );
        });
    });

    describe('submitQuizResult', () => {
        it('should compile correct statistics and save history', async () => {
            const quizData = {
                topic: 'Grammar & Use of English',
                difficulty: 'B2',
                score: 2,
                totalQuestions: 3,
                target: 'MCER',
                career: 'en-US',
                questions: [
                    { id: '1', topic: 'Grammar & Use of English', userAnswer: 0, correct_option_index: 0 },
                    { id: '2', topic: 'Grammar & Use of English', userAnswer: 1, correct_option_index: 0 }, // wrong
                    { id: '3', topic: 'Grammar & Use of English', userAnswer: 2, correct_option_index: 2 }
                ]
            };

            idiomasSimulatorRepository.saveQuizHistory.mockResolvedValue('attempt-id-456');

            const result = await idiomasSimulatorService.submitQuizResult('user-123', quizData);

            expect(result.attemptId).toBe('attempt-id-456');
            expect(idiomasSimulatorRepository.saveQuizHistory).toHaveBeenCalledWith('user-123', expect.objectContaining({
                areaStats: {
                    'Grammar & Use of English': { correct: 2, total: 3 }
                }
            }));
        });
    });
});
