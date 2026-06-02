const mockGetSyllabus = jest.fn();
const mockGetSyllabusById = jest.fn();
const mockGetSyllabusByTopic = jest.fn();
const mockUpdateSyllabusContent = jest.fn();
const mockToggleProgress = jest.fn();
const mockGetVocabulary = jest.fn();
const mockAddWord = jest.fn();
const mockDeleteWord = jest.fn();
const mockGetVocabularyWordById = jest.fn();
const mockGetVocabularyWordsByIds = jest.fn();
const mockInsertFlashcard = jest.fn();
const mockCountVocabulariesWithAudioUrl = jest.fn();
const mockGetLanguageVoice = jest.fn();
const mockUpdateSrsParameters = jest.fn();
const mockSavePracticeLog = jest.fn();
const mockGetConjugations = jest.fn();
const mockSaveConjugation = jest.fn();

const mockFindGlobalWord = jest.fn();
const mockPurgeOrphanGlobalWords = jest.fn();
const mockSearchGlobalSuggestions = jest.fn();
const mockCountUserReferencesToGlobalWord = jest.fn();

const mockGetAllGlobalVocabularies = jest.fn();
const mockGetGlobalVocabularyById = jest.fn();
const mockUpdateGlobalVocabulary = jest.fn();
const mockDeleteGlobalVocabulary = jest.fn();
const mockEnsureGlobalWord = jest.fn();

const mockLanguageRepository = {
    getSyllabus: mockGetSyllabus,
    getSyllabusById: mockGetSyllabusById,
    getSyllabusByTopic: mockGetSyllabusByTopic,
    updateSyllabusContent: mockUpdateSyllabusContent,
    toggleProgress: mockToggleProgress,
    getVocabulary: mockGetVocabulary,
    addWord: mockAddWord,
    deleteWord: mockDeleteWord,
    getVocabularyWordById: mockGetVocabularyWordById,
    getVocabularyWordsByIds: mockGetVocabularyWordsByIds,
    insertFlashcard: mockInsertFlashcard,
    countVocabulariesWithAudioUrl: mockCountVocabulariesWithAudioUrl,
    getLanguageVoice: mockGetLanguageVoice,
    updateSrsParameters: mockUpdateSrsParameters,
    savePracticeLog: mockSavePracticeLog,
    getConjugations: mockGetConjugations,
    saveConjugation: mockSaveConjugation,
    findGlobalWord: mockFindGlobalWord,
    purgeOrphanGlobalWords: mockPurgeOrphanGlobalWords,
    searchGlobalSuggestions: mockSearchGlobalSuggestions,
    countUserReferencesToGlobalWord: mockCountUserReferencesToGlobalWord,
    getAllGlobalVocabularies: mockGetAllGlobalVocabularies,
    getGlobalVocabularyById: mockGetGlobalVocabularyById,
    updateGlobalVocabulary: mockUpdateGlobalVocabulary,
    deleteGlobalVocabulary: mockDeleteGlobalVocabulary,
    ensureGlobalWord: mockEnsureGlobalWord
};

const mockGenerateContent = jest.fn();

jest.mock('../../src/domain/services/ttsService', () => ({
    synthesize: jest.fn(),
    getCachePath: jest.fn()
}));

jest.mock('../../src/application/controllers/mediaController', () => ({
    deleteFile: jest.fn().mockResolvedValue(true),
    uploadRawBuffer: jest.fn().mockResolvedValue('https://mock-gcs.com/file.mp3')
}));

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

const LanguageService = require('../../src/domain/services/languageService');
const ttsService = require('../../src/domain/services/ttsService');

describe('LanguageService', () => {
    let languageService;

    beforeEach(() => {
        jest.clearAllMocks();
        ttsService.synthesize.mockResolvedValue(Buffer.from('mock-audio'));
        ttsService.getCachePath.mockResolvedValue('mock-audio-path.mp3');
        mockFindGlobalWord.mockResolvedValue(null);
        mockPurgeOrphanGlobalWords.mockResolvedValue();
        mockSearchGlobalSuggestions.mockResolvedValue([]);
        mockCountUserReferencesToGlobalWord.mockResolvedValue(0);
        mockGetConjugations.mockResolvedValue([]);
        languageService = new LanguageService(mockLanguageRepository);
    });

    describe('getSyllabus', () => {
        it('should fetch syllabus from repository successfully', async () => {
            const expectedSyllabus = [
                { id: 1, topic_name: 'Greetings', level: 'A1' }
            ];
            mockGetSyllabus.mockResolvedValue(expectedSyllabus);

            const result = await languageService.getSyllabus('user-123', 'en-US', 'A1');

            expect(result).toEqual(expectedSyllabus);
            expect(mockGetSyllabus).toHaveBeenCalledWith('user-123', 'en-US', 'A1');
        });
    });

    describe('toggleProgress', () => {
        it('should toggle syllabus item progress successfully', async () => {
            mockToggleProgress.mockResolvedValue(true);

            const result = await languageService.toggleProgress('user-123', 45, true);

            expect(result).toBe(true);
            expect(mockToggleProgress).toHaveBeenCalledWith('user-123', 45, true);
        });
    });

    describe('getVocabulary', () => {
        it('should fetch vocabulary words from repository successfully', async () => {
            const expectedVocab = [
                { id: 10, word: 'hello', translation: 'hola' }
            ];
            mockGetVocabulary.mockResolvedValue(expectedVocab);

            const result = await languageService.getVocabulary('user-123', 'en-US');

            expect(result).toEqual(expectedVocab);
            expect(mockGetVocabulary).toHaveBeenCalledWith('user-123', 'en-US');
        });
    });

    describe('deleteWord', () => {
        it('should delete a vocabulary word without audio successfully', async () => {
            mockGetVocabularyWordById.mockResolvedValue({ id: 10, vocabulary_id: 'vocab-10', word: 'hello', audio_url: null });
            mockDeleteWord.mockResolvedValue(true);

            const result = await languageService.deleteWord(10, 'user-123');

            expect(mockGetVocabularyWordById).toHaveBeenCalledWith(10, 'user-123');
            expect(mockDeleteWord).toHaveBeenCalledWith(10, 'user-123');
            expect(result).toBe(true);
        });

        it('should delete a vocabulary word with audio', async () => {
            mockGetVocabularyWordById.mockResolvedValue({ id: 11, vocabulary_id: 'vocab-11', word: 'world', audio_url: 'gs://bucket/audio-cards/test.mp3' });
            mockDeleteWord.mockResolvedValue(true);

            const result = await languageService.deleteWord(11, 'user-123');

            expect(mockGetVocabularyWordById).toHaveBeenCalledWith(11, 'user-123');
            expect(mockDeleteWord).toHaveBeenCalledWith(11, 'user-123');
            expect(result).toBe(true);
        });
    });

    describe('adminActions', () => {
        describe('adminGetVocabularies', () => {
            it('should return all global vocabularies', async () => {
                const list = [{ id: 1, word: 'test' }];
                mockGetAllGlobalVocabularies.mockResolvedValue(list);
                const res = await languageService.adminGetVocabularies('en-US');
                expect(res).toEqual(list);
                expect(mockGetAllGlobalVocabularies).toHaveBeenCalledWith('en-US');
            });
        });

        describe('adminAddVocabulary', () => {
            it('should add global vocabulary and synthesize audio', async () => {
                const item = { id: 1, word: 'hello' };
                mockEnsureGlobalWord.mockResolvedValue(item);
                const input = {
                    word: 'hello',
                    language_code: 'en-US',
                    part_of_speech: 'noun',
                    translation: 'hola',
                    definition: 'greeting',
                    example_sentence: 'hello world',
                    level: 'A1'
                };
                const res = await languageService.adminAddVocabulary(input);
                expect(res).toEqual(item);
                expect(mockEnsureGlobalWord).toHaveBeenCalledWith(
                    'hello', 'en-US', 'noun', 'hola', 'greeting', 'hello world', expect.any(String), 'A1'
                );
            });
        });

        describe('adminUpdateVocabulary', () => {
            it('should update global vocabulary and handle audio regeneration if word changes', async () => {
                const original = { id: 1, word: 'hello', language_code: 'en-US', audio_url: 'old-path.mp3' };
                mockGetGlobalVocabularyById.mockResolvedValue(original);
                const updated = { id: 1, word: 'hello updated' };
                mockUpdateGlobalVocabulary.mockResolvedValue(updated);

                const input = {
                    word: 'hello updated',
                    language_code: 'en-US',
                    part_of_speech: 'noun',
                    translation: 'hola modificado',
                    definition: 'greeting updated',
                    example_sentence: 'hello world',
                    level: 'A1'
                };

                const res = await languageService.adminUpdateVocabulary(1, input);
                expect(res).toEqual(updated);
                expect(mockGetGlobalVocabularyById).toHaveBeenCalledWith(1);
                expect(mockUpdateGlobalVocabulary).toHaveBeenCalledWith(1, {
                    word: 'hello updated',
                    language_code: 'en-US',
                    part_of_speech: 'noun',
                    translation: 'hola modificado',
                    definition: 'greeting updated',
                    example_sentence: 'hello world',
                    level: 'A1',
                    audio_url: expect.any(String)
                });
            });
        });

        describe('adminDeleteVocabulary', () => {
            it('should delete global vocabulary and its audios (principal and conjugations)', async () => {
                const original = { id: 1, word: 'hello', language_code: 'en-US', audio_url: 'main-path.mp3' };
                mockGetGlobalVocabularyById.mockResolvedValue(original);
                mockGetConjugations.mockResolvedValue([
                    { id: 101, audio_url: 'conj1-path.mp3' }
                ]);
                mockDeleteGlobalVocabulary.mockResolvedValue(true);

                const res = await languageService.adminDeleteVocabulary(1);
                expect(res).toBe(true);
                expect(mockGetGlobalVocabularyById).toHaveBeenCalledWith(1);
                expect(mockGetConjugations).toHaveBeenCalledWith(1);
                expect(mockDeleteGlobalVocabulary).toHaveBeenCalledWith(1);
            });
        });
    });

    describe('addWord', () => {
        it('should add a vocabulary word successfully with cefrLevel as null when not provided', async () => {
            const mockWordObj = { id: 101, word: 'environment', translation: 'medio ambiente', level: null };
            mockAddWord.mockResolvedValue(mockWordObj);

            const result = await languageService.addWord(
                'user-123',
                'environment',
                'medio ambiente',
                'The surroundings or conditions in which a person, animal, or plant lives.',
                'We must protect the environment.',
                'en-US'
            );

            expect(result).toEqual(mockWordObj);
            expect(mockAddWord).toHaveBeenCalledWith(
                'user-123',
                'en-US',
                null,
                'environment',
                'medio ambiente',
                'The surroundings or conditions in which a person, animal, or plant lives.',
                'We must protect the environment.',
                expect.any(String),
                null
            );
        });

        it('should add a vocabulary word successfully with explicit cefrLevel and partOfSpeech', async () => {
            const mockWordObj = { id: 102, word: 'tuttavia', translation: 'sin embargo', level: 'B1', part_of_speech: 'conjunction' };
            mockAddWord.mockResolvedValue(mockWordObj);

            const result = await languageService.addWord(
                'user-123',
                'tuttavia',
                'sin embargo',
                'Connettore logico.',
                'Volevo venire, tuttavia non potevo.',
                'it-IT',
                'B1',
                'conjunction'
            );

            expect(result).toEqual(mockWordObj);
            expect(mockAddWord).toHaveBeenCalledWith(
                'user-123',
                'it-IT',
                'B1',
                'tuttavia',
                'sin embargo',
                'Connettore logico.',
                'Volevo venire, tuttavia non potevo.',
                expect.any(String),
                'conjunction'
            );
        });
    });

    describe('getChallenge', () => {
        it('should generate a practice challenge using Gemini successfully', async () => {
            mockGetVocabularyWordById.mockResolvedValue({
                id: 15,
                word: 'environment',
                translation: 'medio ambiente',
                language_code: 'en-US',
                part_of_speech: 'noun'
            });

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: '{"challenge": "Escribe una oración en presente simple usando environment."}' }
                                ]
                            }
                        }
                    ]
                }
            });

            const result = await languageService.getChallenge(15, 'user-123');

            expect(result).toBe('Escribe una oración en presente simple usando environment.');
            expect(mockGetVocabularyWordById).toHaveBeenCalledWith(15, 'user-123');
            expect(mockGenerateContent).toHaveBeenCalled();
        });
    });

    describe('practiceWord', () => {
        it('should evaluate the answer, compute SRS with SM-2, and save practice logs successfully', async () => {
            mockGetVocabularyWordById.mockResolvedValue({
                id: 15,
                word: 'environment',
                translation: 'medio ambiente',
                language_code: 'en-US',
                part_of_speech: 'noun',
                interval_days: 1,
                ease_factor: 2.5,
                practice_count: 0,
                srs_state: 'new'
            });

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: '{"precision_score": 90, "corrections": [], "pedagogical_feedback": "Perfect description"}' }
                                ]
                            }
                        }
                    ]
                }
            });

            mockSavePracticeLog.mockResolvedValue({});
            mockUpdateSrsParameters.mockResolvedValue({});

            const result = await languageService.practiceWord(
                15, 'user-123', 'I care about the environment.', 'text', 'Escribe sobre el medio ambiente.'
            );

            expect(result.precision_score).toBe(90);
            expect(mockSavePracticeLog).toHaveBeenCalledWith(
                'user-123', 15, 'text', 'I care about the environment.', true, 90, expect.any(Object)
            );
            expect(mockUpdateSrsParameters).toHaveBeenCalledWith(
                15, 'user-123', 'learning', expect.any(Date), 1, expect.any(Number), 1
            );
        });
    });

    describe('getConjugations', () => {
        it('should return cached conjugations from database if present', async () => {
            const expectedConjugations = [
                { id: 1, tense: 'Present', form: 'is' }
            ];
            mockGetVocabularyWordById.mockResolvedValue({ id: 20, vocabulary_id: 100, word: 'be', part_of_speech: 'verb' });
            mockGetConjugations.mockResolvedValue(expectedConjugations);

            const result = await languageService.getConjugations(20, 'user-123');

            expect(result).toEqual(expectedConjugations);
            expect(mockGetConjugations).toHaveBeenCalledWith(100);
            expect(mockSaveConjugation).not.toHaveBeenCalled();
        });

        it('should generate, cache and return conjugations using Gemini if not in database', async () => {
            mockGetVocabularyWordById.mockResolvedValue({ id: 20, vocabulary_id: 100, word: 'be', part_of_speech: 'verb', language_code: 'en-US' });
            mockGetConjugations.mockResolvedValueOnce([]).mockResolvedValueOnce([
                { id: 1, tense: 'Present', form: 'am' }
            ]);

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: '{"conjugations": [{"tense": "Present", "form": "am"}]}' }
                                ]
                            }
                        }
                    ]
                }
            });

            mockSaveConjugation.mockResolvedValue({});

            const result = await languageService.getConjugations(20, 'user-123');

            expect(result).toEqual([{ id: 1, tense: 'Present', form: 'am' }]);
            expect(mockGenerateContent).toHaveBeenCalled();
            expect(mockSaveConjugation).toHaveBeenCalledWith(100, 'Present', null, null, 'am', expect.any(String));
        });
    });

    describe('generateWordDetails', () => {
        it('should successfully normalize a word and return JSON details', async () => {
            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    { text: '{"word": "sing", "translation": "cantar", "definition": "Emitir sonidos melodiosos.", "example_sentence": "I love to sing.", "part_of_speech": "verb"}' }
                                ]
                            }
                        }
                    ]
                }
            });

            const result = await languageService.generateWordDetails('Cantar', 'en-US', 'A1');

            expect(result).toEqual({
                word: 'sing',
                translation: 'cantar',
                definition: 'Emitir sonidos melodiosos.',
                example_sentence: 'I love to sing.',
                part_of_speech: 'verb'
            });
            expect(mockGenerateContent).toHaveBeenCalled();
        });

        it('should return cached details and skip Gemini call if the word is already in the global vocabularies', async () => {
            const cachedWord = {
                word: 'sing',
                translation: 'cantar',
                definition: 'Emitir sonidos melodiosos.',
                example_sentence: 'I love to sing.',
                part_of_speech: 'verb'
            };
            mockFindGlobalWord.mockResolvedValue(cachedWord);

            const result = await languageService.generateWordDetails('sing', 'en-US', 'A1', 'verb');

            expect(result).toEqual({
                ...cachedWord,
                is_suggested: true
            });
            expect(mockFindGlobalWord).toHaveBeenCalledWith('sing', 'en-US', 'verb');
            expect(mockGenerateContent).not.toHaveBeenCalled();
        });

        it('should throw an error for malicious prompt inputs', async () => {
            await expect(
                languageService.generateWordDetails('DROP TABLE users; --', 'en-US', 'A1')
            ).rejects.toThrow('MALICIOUS_INPUT_DETECTED');
        });

        it('should throw an error for invalid input types', async () => {
            await expect(
                languageService.generateWordDetails(null, 'en-US', 'A1')
            ).rejects.toThrow('INVALID_INPUT');
        });
    });

    describe('getSearchSuggestions', () => {
        it('should return suggestions from the repository when query is non-empty', async () => {
            const expectedSuggestions = [
                { id: 'uuid-1', word: 'sing', translation: 'cantar' }
            ];
            mockSearchGlobalSuggestions.mockResolvedValue(expectedSuggestions);

            const result = await languageService.getSearchSuggestions('si', 'en-US');

            expect(result).toEqual(expectedSuggestions);
            expect(mockSearchGlobalSuggestions).toHaveBeenCalledWith('si', 'en-US');
        });

        it('should return empty list when query is empty or spaces', async () => {
            const result = await languageService.getSearchSuggestions(' ', 'en-US');
            expect(result).toEqual([]);
            expect(mockSearchGlobalSuggestions).not.toHaveBeenCalled();
        });
    });

    describe('adminSaveLessonContent', () => {
        it('should throw an error if content is invalid', async () => {
            await expect(languageService.adminSaveLessonContent(1, null)).rejects.toThrow('INVALID_CONTENT');
            await expect(languageService.adminSaveLessonContent(1, 'not-an-object')).rejects.toThrow('INVALID_CONTENT');
        });

        it('should throw an error if content is missing required schema fields', async () => {
            await expect(languageService.adminSaveLessonContent(1, { title: 'Test' })).rejects.toThrow('INVALID_CONTENT_SCHEMA');
            await expect(languageService.adminSaveLessonContent(1, { title: 'Test', explanation: 'desc' })).rejects.toThrow('INVALID_CONTENT_SCHEMA');
        });

        it('should successfully update and return the modified row if input is correct', async () => {
            const validContent = {
                title: 'Greetings',
                explanation: 'Saying hello and goodbye',
                exercises: []
            };
            mockUpdateSyllabusContent.mockResolvedValue({ id: 1, content: validContent });

            const result = await languageService.adminSaveLessonContent(1, validContent);

            expect(mockUpdateSyllabusContent).toHaveBeenCalledWith(1, validContent);
            expect(result).toEqual({ id: 1, content: validContent });
        });
    });
});

