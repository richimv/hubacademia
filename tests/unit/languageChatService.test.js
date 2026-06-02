const LanguageChatService = require('../../src/domain/services/languageChatService');

const mockGenerateContent = jest.fn();

// Mock VertexAI dependencies inside the service
jest.mock('@google-cloud/vertexai', () => {
    return {
        VertexAI: jest.fn().mockImplementation(() => {
            return {
                getGenerativeModel: jest.fn().mockImplementation(() => {
                    return {
                        generateContent: mockGenerateContent
                    };
                })
            };
        })
    };
});

describe('LanguageChatService', () => {
    let languageChatService;

    beforeEach(() => {
        jest.clearAllMocks();
        languageChatService = new LanguageChatService();
    });

    describe('processChat', () => {
        it('should correctly process a clean message in English target language', async () => {
            const expectedResponse = {
                response: "Hello! That sounds great. What are your plans for today?",
                corrections: []
            };

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: JSON.stringify(expectedResponse) }
                                ]
                            }
                        }
                    ]
                }
            });

            const result = await languageChatService.processChat(
                "I am ready to practice.",
                "en-US",
                "B1",
                [{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi there' }]
            );

            expect(result).toEqual(expectedResponse);
            expect(mockGenerateContent).toHaveBeenCalledWith({
                contents: [
                    { role: 'user', parts: [{ text: 'Hello' }] },
                    { role: 'model', parts: [{ text: 'Hi there' }] },
                    { role: 'user', parts: [{ text: 'I am ready to practice.' }] }
                ],
                systemInstruction: {
                    role: 'system',
                    parts: [{ text: expect.stringContaining("Eres un tutor de idiomas") }]
                },
                generationConfig: expect.any(Object)
            });
        });

        it('should handle corrections returned by the AI tutor when error is present', async () => {
            const expectedResponse = {
                response: "That's good to hear, but let's correct that sentence.",
                corrections: [
                    {
                        original: "I is 32",
                        corrected: "I am 32",
                        explanation: "Con el pronombre 'I' se usa 'am'."
                    }
                ]
            };

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: JSON.stringify(expectedResponse) }
                                ]
                            }
                        }
                    ]
                }
            });

            const result = await languageChatService.processChat(
                "I is 32 years old.",
                "en-US",
                "A1",
                []
            );

            expect(result).toEqual(expectedResponse);
            expect(mockGenerateContent).toHaveBeenCalledWith({
                contents: [
                    { role: 'user', parts: [{ text: 'I is 32 years old.' }] }
                ],
                systemInstruction: {
                    role: 'system',
                    parts: [{ text: expect.stringContaining("Eres un tutor de idiomas") }]
                },
                generationConfig: expect.any(Object)
            });
        });

        it('should congratulate user and return empty corrections when user corrects their previous error', async () => {
            const expectedResponse = {
                response: "Excellent! That is correct. Where do you live now?",
                corrections: []
            };

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: JSON.stringify(expectedResponse) }
                                ]
                            }
                        }
                    ]
                }
            });

            const result = await languageChatService.processChat(
                "I am 32 years old.",
                "en-US",
                "A1",
                [
                    { role: 'user', content: 'I is 32 old years' },
                    { role: 'assistant', content: 'Please write: "I am 32 years old".' }
                ]
            );

            expect(result).toEqual(expectedResponse);
            expect(mockGenerateContent).toHaveBeenCalledWith({
                contents: [
                    { role: 'user', parts: [{ text: 'I is 32 old years' }] },
                    { role: 'model', parts: [{ text: 'Please write: "I am 32 years old".' }] },
                    { role: 'user', parts: [{ text: 'I am 32 years old.' }] }
                ],
                systemInstruction: {
                    role: 'system',
                    parts: [{ text: expect.stringContaining("Eres un tutor de idiomas") }]
                },
                generationConfig: expect.any(Object)
            });
        });

        it('should pass listeningMode: true to systemInstruction when listeningMode is enabled', async () => {
            const expectedResponse = {
                response: "This is a longer response from the tutor to test your listening skills. Can you hear me clearly?",
                corrections: []
            };

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: JSON.stringify(expectedResponse) }
                                ]
                            }
                        }
                    ]
                }
            });

            const result = await languageChatService.processChat(
                "Hello tutor",
                "en-US",
                "B1",
                [],
                true
            );

            expect(result).toEqual(expectedResponse);
            expect(mockGenerateContent).toHaveBeenCalledWith({
                contents: [
                    { role: 'user', parts: [{ text: 'Hello tutor' }] }
                ],
                systemInstruction: {
                    role: 'system',
                    parts: [{ text: expect.stringContaining("Modo de Escucha (Listening Mode) activo: SÍ") }]
                },
                generationConfig: expect.any(Object)
            });
        });

        it('should handle parsing errors gracefully by throwing an error', async () => {
            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: "invalid-json" }
                                ]
                            }
                        }
                    ]
                }
            });

            await expect(
                languageChatService.processChat("Hello", "en-US", "B1", [])
            ).rejects.toThrow('AI_PARSE_ERROR');
        });
    });

    describe('generatePracticeExercise', () => {
        it('should generate a practice exercise structure successfully', async () => {
            const expectedResponse = {
                caseType: "translation_full",
                promptL1: "Traduce al inglés: Ayer fui al parque.",
                sentenceL2: "",
                correctL2: "Yesterday I went to the park.",
                pronunciationFeedback: "- **Yesterday**: La palabra Yesterday se pronuncia /'jestədeɪ/. Para decirlo correctamente en español, puedes seguir estos pasos:\n  - Sílaba 1: \"ies\" (suave).\n  - Sílaba 2: \"ter\" (vocal neutra).\n  - Sílaba 3: \"dei\" (como rey).\n  - Al unirlo todo suena: ies-TER-dei. El acento principal va en la segunda sílaba.",
                languageCode: "en-US"
            };

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: JSON.stringify(expectedResponse) }
                                ]
                            }
                        }
                    ]
                }
            });

            const result = await languageChatService.generatePracticeExercise("en-US", "A2", "translation_full");
            expect(result).toEqual(expectedResponse);
        });

        it('should generate a read_aloud practice exercise structure successfully', async () => {
            const expectedResponse = {
                caseType: "read_aloud",
                promptL1: "Lee la siguiente oración en voz alta:",
                sentenceL2: "What time is it?",
                correctL2: "What time is it?",
                pronunciationFeedback: "- **What**: La palabra What se pronuncia /wɒt/. Para decirlo correctamente en español, puedes seguir estos pasos:\n  - Sílaba 1: \"uat\" (sonido labiodental suave).\n  - Al unirlo todo suena: UAT. El acento principal va en la primera sílaba.",
                languageCode: "en-US"
            };

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: JSON.stringify(expectedResponse) }
                                ]
                            }
                        }
                    ]
                }
            });

            const result = await languageChatService.generatePracticeExercise("en-US", "A2", "read_aloud");
            expect(result).toEqual(expectedResponse);
        });

        it('should inject excludeList instructions in the prompt when provided', async () => {
            const expectedResponse = {
                caseType: "translation_term",
                promptL1: "Traduce el término al inglés: subterráneo",
                sentenceL2: "",
                correctL2: "underground",
                pronunciationFeedback: "- **underground**: La palabra underground se pronuncia /'ʌndəgraʊnd/. Para decirlo correctamente en español, puedes seguir estos pasos:\n  - Sílaba 1: \"an\" (con a corta).\n  - Sílaba 2: \"der\" (vocal neutra).\n  - Sílaba 3: \"graund\" (diptongo suave).\n  - Al unirlo todo suena: an-der-GRAUND. El acento principal va en la tercera sílaba.",
                languageCode: "en-US"
            };

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: JSON.stringify(expectedResponse) }
                                ]
                            }
                        }
                    ]
                }
            });

            const excludeList = ["underground", "the weather is nice"];
            const result = await languageChatService.generatePracticeExercise("en-US", "A2", "translation_term", "voice", excludeList);
            expect(result).toEqual(expectedResponse);

            const callArgs = mockGenerateContent.mock.calls[mockGenerateContent.mock.calls.length - 1][0];
            const promptText = callArgs.contents[0].parts[0].text;
            expect(promptText).toContain('TERMINANTEMENTE PROHIBIDO');
            expect(promptText).toContain('underground');
            expect(promptText).toContain('the weather is nice');
        });
    });

    describe('evaluatePracticeAnswer', () => {
        it('should evaluate user answer successfully returning correct score and feedback', async () => {
            const exercise = {
                caseType: "translation_full",
                promptL1: "Traduce al inglés: Ayer fui al parque.",
                sentenceL2: "",
                correctL2: "Yesterday I went to the park."
            };
            const expectedResponse = {
                isCorrect: true,
                score: 100,
                feedback: "¡Excelente traducción! Estructura y tiempo verbal perfectos.",
                modelAnswer: "Yesterday I went to the park."
            };

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: JSON.stringify(expectedResponse) }
                                ]
                            }
                        }
                    ]
                }
            });

            const result = await languageChatService.evaluatePracticeAnswer(exercise, "Yesterday I went to the park.", "text");
            expect(result).toEqual(expectedResponse);
        });

        it('should evaluate read_aloud user answer successfully in voice mode', async () => {
            const exercise = {
                caseType: "read_aloud",
                promptL1: "Lee la siguiente oración en voz alta:",
                sentenceL2: "What time is it?",
                correctL2: "What time is it?"
            };
            const expectedResponse = {
                isCorrect: true,
                score: 100,
                feedback: "¡Excelente pronunciación!",
                modelAnswer: "What time is it?"
            };

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: JSON.stringify(expectedResponse) }
                                ]
                            }
                        }
                    ]
                }
            });

            const result = await languageChatService.evaluatePracticeAnswer(exercise, "what time is it", "voice");
            expect(result).toEqual(expectedResponse);
        });

        it('should override the read_aloud evaluation score programmatically if words are present', async () => {
            const exercise = {
                caseType: "read_aloud",
                promptL1: "Lee la siguiente oración en voz alta:",
                sentenceL2: "He enjoys playing football in the park on Saturdays.",
                correctL2: "He enjoys playing football in the park on Saturdays."
            };
            const mockLlmResponse = {
                isCorrect: false,
                score: 10,
                feedback: "Incorrecto, dijiste she al principio.",
                modelAnswer: "He enjoys playing football in the park on Saturdays."
            };

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: JSON.stringify(mockLlmResponse) }
                                ]
                            }
                        }
                    ]
                }
            });

            const result = await languageChatService.evaluatePracticeAnswer(exercise, "she enjoys playing football in the park on Saturdays he", "voice");
            expect(result.score).toBe(100);
            expect(result.isCorrect).toBe(true);
            expect(result.feedback).toBe("Incorrecto, dijiste she al principio.");
        });

        it('should isolate the voice evaluation by not passing the userAnswer in the prompt', async () => {
            const exercise = {
                caseType: "translation_term",
                promptL1: "Traduce el término al inglés: despertador",
                sentenceL2: "",
                correctL2: "alarm clock",
                languageCode: "en-US"
            };
            const mockLlmResponse = {
                feedback: "- **alarm**: La palabra alarm se pronuncia /ə'lɑːm/.\n- **clock**: La palabra clock se pronuncia /klɒk/."
            };

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: JSON.stringify(mockLlmResponse) }
                                ]
                            }
                        }
                    ]
                }
            });

            const result = await languageChatService.evaluatePracticeAnswer(exercise, "desperate", "voice");
            
            // Programmatic check: "desperate" doesn't match "alarm clock" -> score 0, isCorrect false
            expect(result.score).toBe(0);
            expect(result.isCorrect).toBe(false);
            expect(result.feedback).toBe("- **alarm**: La palabra alarm se pronuncia /ə'lɑːm/.\n- **clock**: La palabra clock se pronuncia /klɒk/.");
            
            // Assert prompt isolation: the prompt sent to mockGenerateContent must NOT contain the student's userAnswer "desperate"
            const callArgs = mockGenerateContent.mock.calls[mockGenerateContent.mock.calls.length - 1][0];
            const promptText = callArgs.contents[0].parts[0].text;
            expect(promptText).not.toContain("desperate");
            expect(promptText).toContain("alarm clock");
        });

        it('should resolve evaluation programmatically in 0ms without calling generateContent if pronunciationFeedback is present in voice mode', async () => {
            jest.clearAllMocks();
            const exercise = {
                caseType: "translation_term",
                promptL1: "Traduce el término al inglés: despertador",
                sentenceL2: "",
                correctL2: "alarm clock",
                pronunciationFeedback: "- **alarm**: La palabra alarm se pronuncia /ə'lɑːm/.\n- **clock**: La palabra clock se pronuncia /klɒk/.",
                languageCode: "en-US"
            };

            const result = await languageChatService.evaluatePracticeAnswer(exercise, "alarm clock", "voice");

            expect(result.score).toBe(100);
            expect(result.isCorrect).toBe(true);
            expect(result.feedback).toBe("- **alarm**: La palabra alarm se pronuncia /ə'lɑːm/.\n- **clock**: La palabra clock se pronuncia /klɒk/.");
            expect(result.modelAnswer).toBe("alarm clock");

            // Assert that Vertex AI mock was never called
            expect(mockGenerateContent).not.toHaveBeenCalled();
        });
    });
});
