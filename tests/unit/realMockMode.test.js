/**
 * Unit Tests for Simulacro Real (Official Mock Exam)
 * Covers: Blind mode detection, timer durations, anti-repetition exemption, and custom config bypass.
 */

jest.mock('../../src/infrastructure/database/db', () => ({
    query: jest.fn(),
    getClient: jest.fn()
}));

const db = require('../../src/infrastructure/database/db');
const docenteRepository = require('../../src/domain/repositories/docenteRepository');
const medicoRepository = require('../../src/domain/repositories/medicoRepository');
const docenteService = require('../../src/domain/services/docenteService');
const medicoService = require('../../src/domain/services/medicoService');

describe('Simulacro Real (Official Mock) - Architecture & Behavior', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('1. Quiz Client Blind Mode vs Study Mode Logic', () => {
        const evaluateModes = (maxQuestions, mode) => {
            const isRealMock = mode === 'real' || Number(maxQuestions) >= 50;
            const isStudyMode = !isRealMock && (Number(maxQuestions) === 20 || mode === 'study');
            const isBlindMode = isRealMock || Number(maxQuestions) === 10 || mode === 'arcade';
            return { isRealMock, isStudyMode, isBlindMode };
        };

        it('identifies 60-question Educación real mock strictly as Blind Mode (NOT study mode)', () => {
            const { isRealMock, isStudyMode, isBlindMode } = evaluateModes(60, 'real');
            expect(isRealMock).toBe(true);
            expect(isStudyMode).toBe(false);
            expect(isBlindMode).toBe(true);
        });

        it('identifies 100-question Salud real mock strictly as Blind Mode (NOT study mode)', () => {
            const { isRealMock, isStudyMode, isBlindMode } = evaluateModes(100, 'real');
            expect(isRealMock).toBe(true);
            expect(isStudyMode).toBe(false);
            expect(isBlindMode).toBe(true);
        });

        it('identifies 20-question exam as Study Mode', () => {
            const { isRealMock, isStudyMode, isBlindMode } = evaluateModes(20, 'study');
            expect(isRealMock).toBe(false);
            expect(isStudyMode).toBe(true);
            expect(isBlindMode).toBe(false);
        });

        it('identifies 10-question exam as Blind Mode (Arcade)', () => {
            const { isRealMock, isStudyMode, isBlindMode } = evaluateModes(10, 'arcade');
            expect(isRealMock).toBe(false);
            expect(isStudyMode).toBe(false);
            expect(isBlindMode).toBe(true);
        });
    });

    describe('2. Official Timer Duration and Display Formatting', () => {
        const getOfficialDuration = (context, maxQuestions, targetExam) => {
            const isEduContext = (context || '').toUpperCase() === 'EDUCACION' || maxQuestions === 60 || ['ASCENSO', 'NOMBRAMIENTO', 'ACCESO_CARGOS'].includes(targetExam);
            return isEduContext ? 10800 : 7200;
        };

        const formatTimerDisplay = (timeLeft) => {
            if (timeLeft >= 3600) {
                const h = Math.floor(timeLeft / 3600).toString().padStart(2, '0');
                const m = Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0');
                const s = (timeLeft % 60).toString().padStart(2, '0');
                return `${h}:${m}:${s}`;
            } else {
                const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
                const s = (timeLeft % 60).toString().padStart(2, '0');
                return `${m}:${s}`;
            }
        };

        it('allocates 10,800 seconds (3 hours) for Educación real mock', () => {
            expect(getOfficialDuration('EDUCACION', 60, 'ASCENSO')).toBe(10800);
        });

        it('allocates 7,200 seconds (2 hours) for Medicina real mock', () => {
            expect(getOfficialDuration('MEDICINA', 100, 'SERUMS')).toBe(7200);
        });

        it('formats timer display with HH:MM:SS when duration is >= 1 hour', () => {
            expect(formatTimerDisplay(10800)).toBe('03:00:00');
            expect(formatTimerDisplay(7200)).toBe('02:00:00');
            expect(formatTimerDisplay(3665)).toBe('01:01:05');
        });

        it('formats timer display with MM:SS when duration is < 1 hour', () => {
            expect(formatTimerDisplay(3599)).toBe('59:59');
            expect(formatTimerDisplay(300)).toBe('05:00');
            expect(formatTimerDisplay(45)).toBe('00:45');
        });
    });

    describe('3. Anti-Repetition Exemption for Real Mock', () => {
        it('docenteRepository.saveQuizHistory skips user_question_history update when mode=real', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 'mock-hist-1', inserted: true }] });

            const quizData = {
                topic: 'Multi-Área',
                score: 52,
                totalQuestions: 60,
                mode: 'real',
                questions: [{ id: 'q-uuid-1', isCorrect: true }, { id: 'q-uuid-2', isCorrect: false }]
            };

            await docenteRepository.saveQuizHistory('user-edu-1', quizData);

            // Expect only the INSERT INTO quiz_history query, NO queries to user_question_history
            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO quiz_history'),
                expect.any(Array)
            );
        });

        it('medicoRepository.saveQuizHistory skips user_question_history update when mode=real', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 'mock-med-hist-1', inserted: true }] });

            const quizData = {
                topic: 'Multi-Área',
                score: 85,
                totalQuestions: 100,
                mode: 'real',
                questions: [{ id: 'q-med-1', isCorrect: true }]
            };

            await medicoRepository.saveQuizHistory('user-med-1', quizData);

            // Expect only the INSERT INTO quiz_history query
            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO quiz_history'),
                expect.any(Array)
            );
        });

        it('docenteRepository.saveQuizHistory updates user_question_history for standard 10q quiz', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 'mock-hist-2', inserted: true }] }) // insert quiz_history
                .mockResolvedValueOnce({ rows: [] }) // check user_question_history
                .mockResolvedValueOnce({ rows: [] }); // insert user_question_history

            const quizData = {
                topic: 'Pedagogía',
                score: 8,
                totalQuestions: 10,
                mode: 'arcade',
                questions: [{ id: 'q-uuid-10', isCorrect: true }]
            };

            await docenteRepository.saveQuizHistory('user-edu-2', quizData);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO user_question_history'),
                expect.any(Array)
            );
        });
    });

    describe('4. Custom Configuration Bypass in Real Mock', () => {
        it('docenteService.generateQuiz sets queryAreas to [*] when mode=real even if custom config is sent', async () => {
            const spyRepo = jest.spyOn(docenteRepository, 'findQuestionsInBankBatch').mockResolvedValueOnce([
                { id: 'q-1', topic: 'Comprensión Lectora', options: ['A', 'B'], correct_option_index: 0 },
                { id: 'q-2', topic: 'Razonamiento Lógico', options: ['C', 'D'], correct_option_index: 1 }
            ]);

            const categoryOptions = {
                target: 'ASCENSO',
                career: 'EBR - Primaria',
                areas: ['Comprensión Lectora'], // User had selected 1 single area
                configType: 'custom',           // User had marked custom
                mode: 'real'                    // Real Mock requested
            };

            await docenteService.generateQuiz(categoryOptions, 'user-edu-3', 10);

            expect(spyRepo).toHaveBeenCalledWith(
                'ASCENSO',
                ['*'], // queryAreas MUST be ['*'] for real mock to bypass custom filter
                expect.any(Number),
                'user-edu-3',
                'EBR - Primaria',
                null,
                expect.any(Array),
                'real'
            );

            spyRepo.mockRestore();
        });

        it('medicoService.generateQuiz sets queryAreas to [*] when mode=real even if custom config is sent', async () => {
            const spyRepo = jest.spyOn(medicoRepository, 'findQuestionsInBankBatch').mockResolvedValueOnce([
                { id: 'q-m1', topic: 'Pediatría', options: ['A', 'B'], correct_option_index: 0 },
                { id: 'q-m2', topic: 'Cardiología', options: ['C', 'D'], correct_option_index: 1 }
            ]);

            const categoryOptions = {
                target: 'SERUMS',
                career: 'Medicina Humana',
                areas: ['Pediatría'],
                configType: 'custom',
                mode: 'real'
            };

            await medicoService.generateQuiz(categoryOptions, 'user-med-3', 10);

            expect(spyRepo).toHaveBeenCalledWith(
                'SERUMS',
                ['*'], // queryAreas MUST be ['*']
                expect.any(Number),
                'user-med-3',
                'Medicina Humana',
                null,
                expect.any(Array),
                'real'
            );

            spyRepo.mockRestore();
        });
    });
});
