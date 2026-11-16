/**
 * Tests unitarios para el Tutor IA de Simulador de Examen (Quiz Tutor)
 * Ejecuta directamente buildQuizTutorPrompt (domain/prompts/chatPrompts) y ChatController.
 */

const { buildQuizTutorPrompt } = require('../../src/domain/prompts/chatPrompts');
const ChatController = require('../../src/application/controllers/chatController');
const TutorAiService = require('../../src/domain/services/tutorAiService');

jest.mock('../../src/domain/repositories/knowledgeBaseRepository');
jest.mock('../../src/domain/services/tutorAiService');

describe('Quiz Tutor Context Normalization & Prompt Construction (Real Module)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should include all options formatted as [A], [B], [C] in the prompt', () => {
        const mockContext = {
            type: 'quiz_tutor',
            questionText: '¿Cuál es la acción pertinente?',
            options: ['Opción 1', 'Opción 2', 'Opción 3'],
            correctOptionIndex: 1,
            correctOptionText: 'Opción 2',
            userOptionIndex: 0,
            userOptionText: 'Opción 1',
            isUserCorrect: false,
            explanation: 'Sustento oficial',
            topic: 'Evaluación'
        };

        const { tutorInstruction } = buildQuizTutorPrompt({
            context: mockContext,
            message: 'Detalles',
            finalSpecialization: 'education'
        });

        expect(tutorInstruction).toContain('[A] Opción 1');
        expect(tutorInstruction).toContain('[B] Opción 2');
        expect(tutorInstruction).toContain('[C] Opción 3');
        expect(tutorInstruction).toContain('RESPUESTA SELECCIONADA POR EL ESTUDIANTE: Opción [A]');
        expect(tutorInstruction).toContain('❌ Incorrecta');
        expect(tutorInstruction).toContain('TIENES ACCESO COMPLETO AL REACTIVO Y A SUS OPCIONES');
    });

    test('should handle stringified JSON options and medicine specialization', () => {
        const mockContext = {
            type: 'quiz_tutor',
            questionText: 'Paciente con dolor...',
            options: JSON.stringify(['Nitroglicerina', 'Aspirina']),
            correctOptionIndex: 1,
            examContext: 'MEDICINA'
        };

        const { tutorInstruction, examDomain, optionsCount } = buildQuizTutorPrompt({
            context: mockContext,
            message: 'Medicina',
            finalSpecialization: 'medicine'
        });

        expect(examDomain).toBe('MEDICINA');
        expect(optionsCount).toBe(2);
        expect(tutorInstruction).toContain('[A] Nitroglicerina');
        expect(tutorInstruction).toContain('CLAVE CORRECTA OFICIAL: Opción [B] (Aspirina)');
    });

    test('should handle userOptionIndex = 0 and correctOptionIndex = 0 properly', () => {
        const mockContext = {
            type: 'quiz_tutor',
            questionText: 'Pregunta 1',
            options: ['Opción A', 'Opción B'],
            correctOptionIndex: 0,
            userOptionIndex: 0,
            isUserCorrect: true
        };

        const { tutorInstruction } = buildQuizTutorPrompt({
            context: mockContext,
            message: 'Consulta',
            finalSpecialization: 'education'
        });

        expect(tutorInstruction).toContain('CLAVE CORRECTA OFICIAL: Opción [A] (Opción A)');
        expect(tutorInstruction).toContain('RESPUESTA SELECCIONADA POR EL ESTUDIANTE: Opción [A] (Opción A) -> ✅ Correcta');
    });

    test('should include case scenario, data table and image when provided, omitting internal case title', () => {
        const mockContext = {
            type: 'quiz_tutor',
            questionText: 'A partir de la tabla...',
            options: ['30 estudiantes', '24 estudiantes'],
            correctOptionIndex: 0,
            caseTitle: 'Caso-Primaria-Mat15',
            caseDescription: 'La docente organizó los datos en una tabla.',
            caseTableHtml: '<table><tr><th>Dinosaurio</th></tr></table>',
            imageUrl: 'https://storage.googleapis.com/hubacademia/dinos.png'
        };

        const { tutorInstruction } = buildQuizTutorPrompt({
            context: mockContext,
            message: 'Explica',
            finalSpecialization: 'education'
        });

        expect(tutorInstruction).not.toContain('Caso-Primaria-Mat15');
        expect(tutorInstruction).not.toContain('Título:');
        expect(tutorInstruction).toContain('La docente organizó los datos en una tabla.');
        expect(tutorInstruction).toContain('Tabla / Datos de Apoyo:');
        expect(tutorInstruction).toContain('IMAGEN DE APOYO EN LA PREGUNTA: https://storage.googleapis.com/hubacademia/dinos.png');
        expect(tutorInstruction).toContain('PROHIBICIÓN ESTRICTA DE CÓDIGOS Y TÍTULOS INTERNOS');
    });

    test('ChatController.processMessage injects real buildQuizTutorPrompt output into TutorAiService', async () => {
        TutorAiService.handleChat.mockResolvedValue({
            intencion: 'explicacion_reactivo',
            respuesta: 'La clave correcta es la B.',
            sugerencias: ['Ver norma']
        });

        const controller = new ChatController(
            { addMessage: jest.fn() },
            { logEvent: jest.fn() },
            { checkAndIncrementUsage: jest.fn() }
        );
        controller.enrichResponse = jest.fn(async (_msg, aiResult) => aiResult);

        const req = {
            user: { id: 'user-123' },
            userTier: 'basic',
            useRag: false,
            body: {
                message: '¿Por qué es la B?',
                specialization: 'education',
                context: {
                    type: 'quiz_tutor',
                    questionText: 'Enfoque pedagógico',
                    options: ['Memorístico', 'Por competencias'],
                    correctOptionIndex: 1,
                    userOptionIndex: 0
                }
            }
        };
        const res = {
            set: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await controller.processMessage(req, res);

        expect(TutorAiService.handleChat).toHaveBeenCalledTimes(1);
        const [injectedPrompt, , meta] = TutorAiService.handleChat.mock.calls[0];
        expect(injectedPrompt).toContain('[MODO: TUTOR DE SIMULADOR DE EXAMEN]');
        expect(injectedPrompt).toContain('[B] Por competencias');
        expect(injectedPrompt).toContain('❌ Incorrecta');
        expect(injectedPrompt).toContain('¿Por qué es la B?');
        expect(meta.specialization).toBe('education');
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            respuesta: 'La clave correcta es la B.'
        }));
    });

    test('ChatController.processMessage increments daily_ai_usage and daily_rag_usage via UsageService without direct DB calls', async () => {
        TutorAiService.handleChat.mockResolvedValue({
            intencion: 'explicacion_reactivo',
            respuesta: 'Explicación con RAG.',
            sugerencias: []
        });

        const mockUsageService = {
            checkAndIncrementUsage: jest.fn(),
            incrementUsageColumn: jest.fn().mockResolvedValue(undefined)
        };
        const controller = new ChatController(
            { addMessage: jest.fn() },
            { logEvent: jest.fn() },
            mockUsageService
        );
        controller.enrichResponse = jest.fn(async (_msg, aiResult) => aiResult);

        const req = {
            user: { id: 'user-adv-1' },
            userTier: 'advanced',
            useRag: true,
            usageType: 'daily_ai_usage',
            incrementRag: true,
            body: {
                message: 'Explica el fundamento clínico',
                specialization: 'medicine',
                context: {
                    type: 'quiz_tutor',
                    questionText: 'Caso clínico',
                    options: ['A', 'B'],
                    correctOptionIndex: 0
                }
            }
        };
        const res = {
            set: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await controller.processMessage(req, res);

        expect(mockUsageService.incrementUsageColumn).toHaveBeenCalledWith('user-adv-1', 'daily_ai_usage', 1);
        expect(mockUsageService.incrementUsageColumn).toHaveBeenCalledWith('user-adv-1', 'daily_rag_usage', 1);
        expect(mockUsageService.checkAndIncrementUsage).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            respuesta: 'Explicación con RAG.'
        }));
    });
});
