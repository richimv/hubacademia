const ResourceAutoIngestService = require('../../src/domain/services/resourceAutoIngestService');
const BookRepository = require('../../src/domain/repositories/bookRepository');

jest.mock('../../src/domain/repositories/bookRepository');

describe('ResourceAutoIngestService', () => {
    let service;
    let mockBookRepositoryInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ResourceAutoIngestService();
        mockBookRepositoryInstance = BookRepository.prototype;
    });

    describe('ingestBatch', () => {
        it('should return empty result for empty or invalid array input', async () => {
            const result1 = await service.ingestBatch([]);
            expect(result1).toEqual({ success: true, createdCount: 0, skippedCount: 0, items: [] });

            const result2 = await service.ingestBatch(null);
            expect(result2).toEqual({ success: true, createdCount: 0, skippedCount: 0, items: [] });
        });

        it('should skip items missing title or url', async () => {
            const invalidItems = [
                { url: 'https://example.com/paper1' },
                { title: 'Paper sin URL' }
            ];

            const result = await service.ingestBatch(invalidItems);
            expect(result.createdCount).toBe(0);
            expect(result.skippedCount).toBe(2);
            expect(result.skipped[0].reason).toBe('Falta título o URL');
        });

        it('should skip items with existing URL (deduplication)', async () => {
            mockBookRepositoryInstance.findByUrl.mockResolvedValue({ id: 100, title: 'Existing' });

            const items = [{ title: 'Paper Duplicado', url: 'https://example.com/existing' }];
            const result = await service.ingestBatch(items);

            expect(result.createdCount).toBe(0);
            expect(result.skippedCount).toBe(1);
            expect(result.skipped[0].reason).toBe('URL ya registrada anteriormente');
        });

        it('should create new resource if valid and non-duplicate', async () => {
            mockBookRepositoryInstance.findByUrl.mockResolvedValue(null);
            mockBookRepositoryInstance.create.mockImplementation(data => Promise.resolve({ id: 200, ...data }));
            jest.spyOn(service, '_verifyUrl').mockResolvedValue({ valid: true });

            const items = [
                {
                    title: 'Guía Clínica OMS 2026',
                    url: 'https://who.int/guideline-2026',
                    resource_type: 'guia',
                    domain: 'medicine',
                    content_html: 'Texto plano sin HTML'
                }
            ];

            const result = await service.ingestBatch(items);
            expect(result.createdCount).toBe(1);
            expect(result.skippedCount).toBe(0);
            expect(result.created[0].id).toBe(200);
            expect(result.created[0].resource_type).toBe('guia');
            expect(result.created[0].domain).toBe('medicine');
            expect(result.created[0].content_html).toBe('<p>Texto plano sin HTML</p>');
        });
    });

    describe('_normalizeResourceType', () => {
        it('should normalize various resource type inputs correctly', () => {
            expect(service._normalizeResourceType('articulo cientifico')).toBe('paper');
            expect(service._normalizeResourceType('guia clinica')).toBe('guia');
            expect(service._normalizeResourceType('norma tecnica')).toBe('norma');
            expect(service._normalizeResourceType('libro de texto')).toBe('book');
            expect(service._normalizeResourceType('video tutorial')).toBe('video');
            expect(service._normalizeResourceType('desconocido')).toBe('other');
        });
    });

    describe('_normalizeDomain', () => {
        it('should normalize domains correctly', () => {
            expect(service._normalizeDomain('medicina humana')).toBe('medicine');
            expect(service._normalizeDomain('educacion basica')).toBe('education');
            expect(service._normalizeDomain('idiomas e ingles')).toBe('idiomas');
            expect(service._normalizeDomain('otro')).toBe('medicine');
        });
    });
});
