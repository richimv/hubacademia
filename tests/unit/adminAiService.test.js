// Define mocks first to prevent Temporal Dead Zone (TDZ) reference errors during require hoisting
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn().mockReturnValue({
    generateContent: mockGenerateContent
});

jest.mock('@google-cloud/vertexai', () => {
    return {
        VertexAI: jest.fn().mockImplementation(() => {
            return {
                getGenerativeModel: mockGetGenerativeModel
            };
        })
    };
});

// Mock DB
jest.mock('../../src/infrastructure/database/db', () => ({
    query: jest.fn()
}));

// Mock QuestionRagService
jest.mock('../../src/domain/services/questionRagService', () => ({
    getSyllabusContext: jest.fn(),
    getTechnicalBasis: jest.fn(),
    getStyleContextByKeywords: jest.fn()
}));

// Import the service under test after mocks are declared
const adminAiService = require('../../src/domain/services/adminAiService');
const db = require('../../src/infrastructure/database/db');
const questionRagService = require('../../src/domain/services/questionRagService');

describe('AdminAiService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    });

    describe('_sanitizeExplanation', () => {
        it('should return falsy or non-string inputs unmodified', () => {
            expect(adminAiService._sanitizeExplanation(null)).toBeNull();
            expect(adminAiService._sanitizeExplanation(undefined)).toBeUndefined();
            expect(adminAiService._sanitizeExplanation(123)).toBe(123);
        });

        it('should sanitize "la opción A" or "la alternativa B" to "la opción correcta"', () => {
            const input = 'La opción A es correcta porque detalla el proceso. En cambio, la alternativa B no es válida.';
            const expected = 'La opción correcta es correcta porque detalla el proceso. En cambio, la opción correcta no es válida.';
            expect(adminAiService._sanitizeExplanation(input)).toBe(expected);
        });

        it('should sanitize "la A es correcta" to "la opción correcta es correcta"', () => {
            const input = 'De acuerdo a la norma, la A es correcta.';
            const expected = 'De acuerdo a la norma, la opción correcta es correcta.';
            expect(adminAiService._sanitizeExplanation(input)).toBe(expected);
        });

        it('should sanitize "respuesta A" or "respuesta: A" to "respuesta correcta"', () => {
            const input = 'Por lo tanto, la respuesta A es la adecuada.';
            const expected = 'Por lo tanto, la opción correcta es la adecuada.';
            expect(adminAiService._sanitizeExplanation(input)).toBe(expected);
        });

        it('should sanitize "es la A" at the end of a sentence or followed by punctuation', () => {
            const input = 'La conclusión es la A.';
            const expected = 'La conclusión es la opción correcta.';
            expect(adminAiService._sanitizeExplanation(input)).toBe(expected);
        });

        it('should sanitize "(A)" or "(B)" preceded by option, alternative, or response', () => {
            const input = 'Revisando la opción (A) y la alternativa (B), ambas se descartan.';
            const expected = 'Revisando la opción correcta y la alternativa correcta, ambas se descartan.';
            expect(adminAiService._sanitizeExplanation(input)).toBe(expected);
        });

        it('should sanitize "primera/segunda/tercera opción" (when order is noun + ordinal)', () => {
            const input = 'La opción primera es la que mejor se adapta al caso.';
            const expected = 'La opción correcta es la que mejor se adapta al caso.';
            expect(adminAiService._sanitizeExplanation(input)).toBe(expected);
        });
    });

    describe('generateRAGQuestions - Languages', () => {
        it('should generate language questions correctly without calling Syllabus RAG', async () => {
            db.query.mockResolvedValue({ rows: [] });

            const mockLanguageQuestion = {
                question_text: "What is the capital of the UK? _____",
                options: ["London", "Paris", "Rome", "Berlin"],
                correct_option_index: 0,
                explanation: "Explicación didáctica sobre Londres.",
                topic: "Vocabulary & Context",
                difficulty: "B2",
                career: "en-GB",
                audio_text: null
            };

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: JSON.stringify(mockLanguageQuestion) }
                                ]
                            }
                        }
                    ]
                }
            });

            const result = await adminAiService.generateRAGQuestions(
                'MCER',
                'Vocabulary & Context',
                'en-GB',
                1,
                false,
                'B2'
            );

            expect(result).toHaveLength(1);
            expect(result[0].question_text).toContain("What is the capital");
            expect(result[0].difficulty).toBe("B2");
            expect(result[0].career).toBe("en-GB");
            
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining("SELECT question_text, subtopic FROM question_bank"),
                ["MCER", "en-GB"]
            );
            
            expect(questionRagService.getSyllabusContext).not.toHaveBeenCalled();
            expect(questionRagService.getTechnicalBasis).not.toHaveBeenCalled();
        });

        it('should trigger AI refinement when explanation contains option letters in languages flow', async () => {
            db.query.mockResolvedValue({ rows: [] });

            // Initial response has letters in explanation
            const badQuestion = {
                question_text: "Fill in the blank: She is _____ than her sister.",
                options: ["taller", "more tall", "tallest", "most taller"],
                correct_option_index: 0,
                explanation: "La alternativa A es la correcta porque es un comparativo simple.",
                topic: "Grammar & Use of English",
                difficulty: "A2",
                career: "en-US",
                audio_text: null
            };

            // Refined response resolves the issue
            const refinedQuestion = {
                question_text: "Fill in the blank: She is _____ than her sister.",
                options: ["taller", "more tall", "tallest", "most taller"],
                correct_option_index: 0,
                explanation: "El comparativo simple de 'tall' es 'taller'. Por ello se utiliza esta opción.",
                topic: "Grammar & Use of English",
                difficulty: "A2",
                career: "en-US",
                audio_text: null
            };

            mockGenerateContent
                .mockResolvedValueOnce({
                    response: {
                        candidates: [{ content: { parts: [{ text: JSON.stringify(badQuestion) }] } }]
                    }
                })
                .mockResolvedValueOnce({
                    response: {
                        candidates: [{ content: { parts: [{ text: JSON.stringify(refinedQuestion) }] } }]
                    }
                });

            const result = await adminAiService.generateRAGQuestions(
                'TOEFL',
                'Grammar & Use of English',
                'en-US',
                1,
                false,
                'A2'
            );

            expect(result).toHaveLength(1);
            expect(result[0].explanation).toBe("El comparativo simple de 'tall' es 'taller'. Por ello se utiliza esta opción.");
            expect(mockGenerateContent).toHaveBeenCalledTimes(2); // Dispatched refinement to AI
        });
    });

    describe('generateRAGQuestions - Non-Languages (Syllabus/Standard Flow)', () => {
        it('should execute full RAG pipeline and handle refinement for standard domains like ASCENSO', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            questionRagService.getSyllabusContext.mockResolvedValue("1.1 Estrategias pedagógicas.");
            questionRagService.getTechnicalBasis.mockResolvedValue("Teoría sobre estrategias.");
            questionRagService.getStyleContextByKeywords.mockResolvedValue("Molde de examen real.");

            const mockSelectionResponse = {
                selectedTopic: "Estrategias de aprendizaje",
                searchTerms: ["estrategia", "aprendizaje"]
            };

            const mockQuestionResponse = {
                question_text: "Un docente desea promover el aprendizaje autónomo. ¿Qué estrategia debe usar?",
                options: [
                    "Promover el debate estructurado y autoevaluación continua.",
                    "Entregar una lista exhaustiva de conceptos de memoria.",
                    "Dictar clases magistrales sin interactuar con los alumnos."
                ],
                correct_option_index: 0,
                explanation: "La autoevaluación continua fomenta la reflexión metacognitiva y autonomía.",
                topic: "Estrategias pedagógicas",
                difficulty: "Senior",
                career: "EBR - Primaria"
            };

            mockGenerateContent
                .mockResolvedValueOnce({
                    response: {
                        candidates: [{ content: { parts: [{ text: JSON.stringify(mockSelectionResponse) }] } }]
                    }
                })
                .mockResolvedValueOnce({
                    response: {
                        candidates: [{ content: { parts: [{ text: JSON.stringify(mockQuestionResponse) }] } }]
                    }
                });

            const result = await adminAiService.generateRAGQuestions(
                'ASCENSO',
                'Estrategias pedagógicas',
                'EBR - Primaria',
                1,
                false,
                'Senior'
            );

            expect(result).toHaveLength(1);
            expect(result[0].subtopic).toBe("Estrategias de aprendizaje");
            expect(questionRagService.getSyllabusContext).toHaveBeenCalled();
            expect(questionRagService.getTechnicalBasis).toHaveBeenCalled();
            expect(questionRagService.getStyleContextByKeywords).toHaveBeenCalled();
        });
    });
});
