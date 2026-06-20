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

        it('should trigger AI refinement when there is a verbal prefix redundancy / stem collision near the blank', async () => {
            db.query.mockResolvedValue({ rows: [] });

            // Initial response has verbal redundancy (leggo / leggere)
            const badQuestion = {
                question_text: "Mi piace molto questo libro. Io _____ leggere ogni giorno.",
                options: ["leggo", "leggono", "legge", "leggere"],
                correct_option_index: 0,
                explanation: "El sujeto es Io, por lo tanto usamos la conjugación leggo del verbo leggere.",
                topic: "Grammar & Use of English",
                difficulty: "A1",
                career: "it-IT",
                audio_text: null
            };

            // Refined response resolves the issue (removes the redundant infinitive)
            const refinedQuestion = {
                question_text: "Mi piace molto questo libro. Io _____ ogni giorno.",
                options: ["leggo", "leggono", "legge", "leggere"],
                correct_option_index: 0,
                explanation: "En este caso, se conjuga directamente el verbo leggere para la primera persona: Io leggo.",
                topic: "Grammar & Use of English",
                difficulty: "A1",
                career: "it-IT",
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
                'MCER',
                'Grammar & Use of English',
                'it-IT',
                1,
                false,
                'A1'
            );

            expect(result).toHaveLength(1);
            expect(result[0].question_text).toBe("Mi piace molto questo libro. Io _____ ogni giorno.");
            expect(mockGenerateContent).toHaveBeenCalledTimes(2); // Dispatched refinement to AI
        });

        it('should trigger AI refinement when there is a greeting/response redundancy (come/bene)', async () => {
            db.query.mockResolvedValue({ rows: [] });

            // Initial response has greeting redundancy (Come _____ oggi? / sta bene lei)
            const badQuestion = {
                question_text: "Buongiorno, Signora Bianchi! Come _____ oggi?",
                options: ["stanno bene loro", "sta bene lei", "stai bene tu", "state bene voi"],
                correct_option_index: 1,
                explanation: "En italiano, cuando nos dirigimos a una persona de manera formal usamos la tercera persona del singular ('Lei').",
                topic: "Grammar & Use of English",
                difficulty: "A1",
                career: "it-IT",
                audio_text: null
            };

            // Refined response resolves the issue (removes 'bene' from the options)
            const refinedQuestion = {
                question_text: "Buongiorno, Signora Bianchi! Come _____ oggi?",
                options: ["stanno loro", "sta Lei", "stai tu", "state voi"],
                correct_option_index: 1,
                explanation: "En italiano, cuando nos dirigimos a una persona de manera formal usamos la tercera persona del singular ('Lei'). Por lo tanto, se usa 'sta Lei' o simplemente 'sta'.",
                topic: "Grammar & Use of English",
                difficulty: "A1",
                career: "it-IT",
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
                'MCER',
                'Grammar & Use of English',
                'it-IT',
                1,
                false,
                'A1'
            );

            expect(result).toHaveLength(1);
            expect(result[0].options[1]).toBe("sta Lei");
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

        it('should run full RAG pipeline even when isUserRequest is true', async () => {
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
                true, // isUserRequest = true
                'Senior'
            );

            expect(result).toHaveLength(1);
            expect(questionRagService.getSyllabusContext).toHaveBeenCalled();
            expect(questionRagService.getTechnicalBasis).toHaveBeenCalled();
            expect(questionRagService.getStyleContextByKeywords).toHaveBeenCalled();
        });

        it('should reject and trigger refinement when a question has a highly repetitive opening style/prefix', async () => {
            // DB returns historical question with repetitive prefix
            db.query
                .mockResolvedValueOnce({ rows: [] }) // For globalHistory
                .mockResolvedValueOnce({
                    rows: [
                        { question_text: "- ¡Mira mi torre de bloques!, le dice Juan a su compañero Pedro, quien intenta acoplar..." }
                    ]
                });

            questionRagService.getSyllabusContext.mockResolvedValue("1.1 Juego y aprendizaje.");
            questionRagService.getTechnicalBasis.mockResolvedValue("Teoría sobre el juego libre.");
            questionRagService.getStyleContextByKeywords.mockResolvedValue("Molde de examen.");

            const mockSelectionResponse = {
                selectedTopic: "Juego libre",
                searchTerms: ["juego", "libre"]
            };

            // First attempt: Repetitive starter
            const badQuestionResponse = {
                question_text: "- ¡Mira mi torre de bloques!, le dice Juan a su compañero Pedro, quien intenta acoplar una pieza adicional. ¿Qué principio pedagógico se evidencia?",
                options: [
                    "Constructivismo y andamiaje activo.",
                    "Instrucción tradicional repetitiva.",
                    "Aprendizaje pasivo y receptivo."
                ],
                correct_option_index: 0,
                explanation: "El andamiaje se produce en la interacción cooperativa.",
                topic: "Estrategias pedagógicas",
                difficulty: "Senior",
                career: "EBR - Primaria"
            };

            // Second attempt: Refined/original starter
            const refinedQuestionResponse = {
                question_text: "Durante el juego libre, Juan y Pedro colaboran para edificar una estructura compleja. ¿Qué principio pedagógico se evidencia?",
                options: [
                    "Constructivismo y andamiaje activo.",
                    "Instrucción tradicional repetitiva.",
                    "Aprendizaje pasivo y receptivo."
                ],
                correct_option_index: 0,
                explanation: "El andamiaje se produce en la interacción cooperativa.",
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
                        candidates: [{ content: { parts: [{ text: JSON.stringify(badQuestionResponse) }] } }]
                    }
                })
                .mockResolvedValueOnce({
                    response: {
                        candidates: [{ content: { parts: [{ text: JSON.stringify(refinedQuestionResponse) }] } }]
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
            expect(result[0].question_text).toBe("Durante el juego libre, Juan y Pedro colaboran para edificar una estructura compleja. ¿Qué principio pedagógico se evidencia?");
            expect(mockGenerateContent).toHaveBeenCalledTimes(3); // selection, bad generation, refinement
        });

        it('should generate multiple questions in parallel chunks of up to 5', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [] }) // For globalHistory
                .mockResolvedValueOnce({ rows: [] });

            questionRagService.getSyllabusContext.mockResolvedValue("1.1 Estrategias pedagógicas.");
            questionRagService.getTechnicalBasis.mockResolvedValue("Teoría sobre estrategias.");
            questionRagService.getStyleContextByKeywords.mockResolvedValue("Molde de examen real.");

            const mockSelectionResponse1 = { selectedTopic: "Estrategias de aprendizaje A", searchTerms: ["estrategia", "A"] };
            const mockSelectionResponse2 = { selectedTopic: "Estrategias de aprendizaje B", searchTerms: ["estrategia", "B"] };

            const mockQuestionResponse1 = {
                question_text: "En el aula de Primaria, el docente observa que... ¿Qué estrategia debe usar?",
                options: ["Opción Correcta A", "Distractor A1", "Distractor A2"],
                correct_option_index: 0,
                explanation: "Explicación detallada A.",
                topic: "Estrategias pedagógicas",
                difficulty: "Senior",
                career: "EBR - Primaria",
                subtopic: "Estrategias de aprendizaje A"
            };

            const mockQuestionResponse2 = {
                question_text: "Durante una sesión de aprendizaje, los estudiantes... ¿Qué estrategia debe usar?",
                options: ["Opción Correcta B", "Distractor B1", "Distractor B2"],
                correct_option_index: 0,
                explanation: "Explicación detallada B.",
                topic: "Estrategias pedagógicas",
                difficulty: "Senior",
                career: "EBR - Primaria",
                subtopic: "Estrategias de aprendizaje B"
            };

            // Setup the parallel predictions using a robust mockImplementation
            let selectionCount = 0;
            mockGenerateContent.mockImplementation((promptObj) => {
                const promptText = typeof promptObj === 'string' ? promptObj : (promptObj.contents?.[0]?.parts?.[0]?.text || "");
                if (promptText.includes("selectedTopic") || promptText.includes("Director Académico")) {
                    selectionCount++;
                    const selectionData = selectionCount === 1 ? mockSelectionResponse1 : mockSelectionResponse2;
                    return { response: { candidates: [{ content: { parts: [{ text: JSON.stringify(selectionData) }] } }] } };
                } else {
                    const isQ2 = promptText.includes("Estrategias de aprendizaje B");
                    const questionData = isQ2 ? mockQuestionResponse2 : mockQuestionResponse1;
                    return { response: { candidates: [{ content: { parts: [{ text: JSON.stringify(questionData) }] } }] } };
                }
            });

            const result = await adminAiService.generateRAGQuestions(
                'ASCENSO',
                'Estrategias pedagógicas',
                'EBR - Primaria',
                2, // Generate 2 questions
                true, // isUserRequest = true
                'Senior'
            );

            expect(result).toHaveLength(2);
            expect(result[0].subtopic).toBe("Estrategias de aprendizaje A");
            expect(result[1].subtopic).toBe("Estrategias de aprendizaje B");
            expect(mockGenerateContent).toHaveBeenCalledTimes(4); // 2 selections + 2 generations
        });

        it('should handle malformed selectionData gracefully when searchTerms is missing or not an array', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [] }) // For globalHistory
                .mockResolvedValueOnce({ rows: [] });

            questionRagService.getSyllabusContext.mockResolvedValue("1.1 Estrategias pedagógicas.");
            questionRagService.getTechnicalBasis.mockResolvedValue("Teoría sobre estrategias.");
            questionRagService.getStyleContextByKeywords.mockResolvedValue("Molde de examen real.");

            const malformedSelection = {
                selectedTopic: "Estrategias de aprendizaje A"
                // searchTerms is missing
            };

            const mockQuestionResponse = {
                question_text: "En el aula de Primaria, el docente observa que... ¿Qué estrategia debe usar?",
                options: ["Opción Correcta A", "Distractor A1", "Distractor A2"],
                correct_option_index: 0,
                explanation: "Explicación detallada A.",
                topic: "Estrategias pedagógicas",
                difficulty: "Senior",
                career: "EBR - Primaria",
                subtopic: "Estrategias de aprendizaje A"
            };

            mockGenerateContent
                .mockResolvedValueOnce({
                    response: {
                        candidates: [{ content: { parts: [{ text: JSON.stringify(malformedSelection) }] } }]
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
                true,
                'Senior'
            );

            expect(result).toHaveLength(1);
            expect(result[0].subtopic).toBe("Estrategias de aprendizaje A");
            expect(mockGenerateContent).toHaveBeenCalledTimes(2);
        });
    });
});
