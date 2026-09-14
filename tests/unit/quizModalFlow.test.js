/**
 * Tests unitarios para el flujo de modales en simuladores:
 * 1. Modal de finalización (¡Simulacro Finalizado!) y botón "Nuevo Examen" en modo normal vs demo.
 * 2. Modal de reanudación (Simulacro en progreso) y botón "Iniciar nuevo".
 * 3. Aislamiento y ejecución del ciclo anti-repetición 24h solo tras culminar examen.
 */

const fs = require('fs');
const path = require('path');
const db = require('../../src/infrastructure/database/db');
const docenteRepository = require('../../src/domain/repositories/docenteRepository');
const medicoRepository = require('../../src/domain/repositories/medicoRepository');

jest.mock('../../src/infrastructure/database/db', () => ({
    query: jest.fn(),
    getClient: jest.fn()
}));

describe('Quiz Modals Flow & Anti-Repetition Lifecycle Verification', () => {
    let quizJs;
    let uiManagerJs;

    beforeAll(() => {
        quizJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/quiz.js'), 'utf8');
        uiManagerJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/ui/uiManager.js'), 'utf8');
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('1. Modal de Finalización & Botón "Nuevo Examen"', () => {
        it('window.startNewExam verifica demo/visitante y sale de quiz redirigiendo al dashboard', () => {
            expect(quizJs).toContain('window.startNewExam = function () {');
            // Verifica que detecta modo demo o visitante sin intentos
            expect(quizJs).toMatch(/isDemo\s*\|\|\s*isGuest/);
            // Verifica que limpia la sesión activa
            expect(quizJs).toContain('clearSession();');
            // Verifica que muestra modal de registro con callback para salir al cerrar
            expect(quizJs).toMatch(/window\.uiManager\.showAuthPromptModal\(\(\)\s*=>\s*\{[\s\S]*?exitToDashboard\(\);/);
            // Verifica que para usuarios registrados ejecuta location.reload()
            expect(quizJs).toContain('location.reload();');
        });

        it('uiManager.showAuthPromptModal acepta callback onClose y lo ejecuta en hideAuthPromptModal', () => {
            expect(uiManagerJs).toMatch(/showAuthPromptModal\(onClose\s*=\s*null\)\s*\{[\s\S]*?this\._authModalOnClose\s*=\s*onClose;/);
            expect(uiManagerJs).toMatch(/hideAuthPromptModal\(\)\s*\{[\s\S]*?this\._authModalOnClose[\s\S]*?cb\(\);/);
        });

        it('uiManager.injectModalHTML vincula evento de clic en backdrop para cerrar y disparar callback', () => {
            expect(uiManagerJs).toMatch(/modalEl\.addEventListener\('click',\s*\(e\)\s*=>\s*\{[\s\S]*?this\.hideAuthPromptModal\(\);/);
        });
    });

    describe('2. Modal de Reanudación ("Simulacro en progreso") & Botón "Iniciar nuevo"', () => {
        it('al descartar sesión anterior (resume === false), resetea estado en limpio y pasa IDs descartados a startQuiz', () => {
            expect(quizJs).toMatch(/else\s+if\s*\(resume\s*===\s*false\)\s*\{[\s\S]*?const\s+discardedQuestionIds\s*=\s*\(recovered\s*&&/);
            expect(quizJs).toMatch(/state\.questions\s*=\s*\[\];/);
            expect(quizJs).toMatch(/state\.currentQuestionIndex\s*=\s*0;/);
            expect(quizJs).toMatch(/state\.score\s*=\s*0;/);
            expect(quizJs).toMatch(/state\.answers\s*=\s*\[\];/);
            expect(quizJs).toMatch(/state\.quizSessionId\s*=\s*null;/);
            expect(quizJs).toMatch(/await\s+startQuiz\(discardedQuestionIds\);/);
        });

        it('startQuiz recibe temporarySeenIds y los inyecta en el payload de /start y en /demo', () => {
            expect(quizJs).toMatch(/async\s+function\s+startQuiz\(temporarySeenIds\s*=\s*\[\]\)/);
            expect(quizJs).toMatch(/seenIds:\s*Array\.isArray\(temporarySeenIds\)\s*\?\s*temporarySeenIds\s*:\s*\[\]/);
            expect(quizJs).toMatch(/excludeIds=\$\{combinedExclude\.join\(','\)\}/);
        });
    });

    describe('3. Ciclo de Anti-Repetición: Marcado de Vistas SOLO al Culminar Examen', () => {
        it('docenteRepository.saveQuizHistory registra preguntas en user_question_history para exámenes estándar de 10q y 20q', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 'mock-hist-id', inserted: true }] }) // INSERT quiz_history
                .mockResolvedValueOnce({ rows: [] }) // SELECT user_question_history
                .mockResolvedValueOnce({ rows: [] }); // INSERT user_question_history

            const quizData = {
                topic: 'Pedagogía',
                score: 18,
                totalQuestions: 20,
                mode: 'study',
                questions: [{ id: 'q-seen-1', isCorrect: true }]
            };

            await docenteRepository.saveQuizHistory('usr-edu-test', quizData);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO user_question_history'),
                expect.arrayContaining(['usr-edu-test', 'q-seen-1'])
            );
        });

        it('medicoRepository.saveQuizHistory registra preguntas en user_question_history para exámenes estándar de 10q y 20q', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 'mock-med-hist-id', inserted: true }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const quizData = {
                topic: 'Pediatría',
                score: 8,
                totalQuestions: 10,
                mode: 'arcade',
                questions: [{ id: 'qm-seen-1', isCorrect: true }]
            };

            await medicoRepository.saveQuizHistory('usr-med-test', quizData);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO user_question_history'),
                expect.arrayContaining(['usr-med-test', 'qm-seen-1'])
            );
        });

        it('saveQuizHistory NUNCA marca en user_question_history si es Simulacro Real (práctica libre)', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 'mock-real-hist', inserted: true }] });

            const quizData = {
                topic: 'Multi-Área',
                score: 55,
                totalQuestions: 60,
                mode: 'real',
                questions: [{ id: 'q-real-1', isCorrect: true }, { id: 'q-real-2', isCorrect: false }]
            };

            await docenteRepository.saveQuizHistory('usr-edu-real', quizData);

            // Solo una consulta ejecutada (quiz_history), cero a user_question_history
            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).not.toHaveBeenCalledWith(
                expect.stringContaining('user_question_history'),
                expect.any(Array)
            );
        });
    });
});
