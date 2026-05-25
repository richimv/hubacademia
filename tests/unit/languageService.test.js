const LanguageService = require('../../src/domain/services/languageService');

const mockGetSyllabus = jest.fn();
const mockGetSyllabusById = jest.fn();
const mockGetSyllabusByTopic = jest.fn();
const mockUpdateSyllabusContent = jest.fn();
const mockToggleProgress = jest.fn();
const mockGetVocabulary = jest.fn();
const mockAddWord = jest.fn();
const mockDeleteWord = jest.fn();
const mockGetVocabularyWordsByIds = jest.fn();
const mockInsertFlashcard = jest.fn();

const mockLanguageRepository = {
    getSyllabus: mockGetSyllabus,
    getSyllabusById: mockGetSyllabusById,
    getSyllabusByTopic: mockGetSyllabusByTopic,
    updateSyllabusContent: mockUpdateSyllabusContent,
    toggleProgress: mockToggleProgress,
    getVocabulary: mockGetVocabulary,
    addWord: mockAddWord,
    deleteWord: mockDeleteWord,
    getVocabularyWordsByIds: mockGetVocabularyWordsByIds,
    insertFlashcard: mockInsertFlashcard
};

// Mock VertexAI dependencies inside the service
jest.mock('@google-cloud/vertexai', () => {
    return {
        VertexAI: jest.fn().mockImplementation(() => {
            return {
                getGenerativeModel: jest.fn().mockImplementation(() => {
                    return {
                        generateContent: jest.fn()
                    };
                })
            };
        })
    };
});

describe('LanguageService', () => {
    let languageService;

    beforeEach(() => {
        jest.clearAllMocks();
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
        it('should delete a vocabulary word from repository successfully', async () => {
            mockDeleteWord.mockResolvedValue(true);

            const result = await languageService.deleteWord(10, 'user-123');

            expect(result).toBe(true);
            expect(mockDeleteWord).toHaveBeenCalledWith(10, 'user-123');
        });
    });
});
