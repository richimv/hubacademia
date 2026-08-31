const adminController = require('../../src/application/controllers/adminController');

describe('Admin TinyMCE & Image Sanitization Logic', () => {
    describe('_sanitizeHtmlImages', () => {
        it('should return original HTML untouched if no data:image/ exists', async () => {
            const html = '<p>Texto de prueba con <a href="https://example.com">enlace</a></p>';
            const result = await adminController._sanitizeHtmlImages(html, 'cases');
            expect(result).toBe(html);
        });

        it('should extract base64 data and replace it with clean media URL', async () => {
            const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            const htmlWithBase64 = `<p>Enunciado del caso:</p><img src="data:image/png;base64,${sampleBase64}" alt="Figura 1"><p>Fin del caso.</p>`;

            const result = await adminController._sanitizeHtmlImages(htmlWithBase64, 'cases');
            
            expect(result).not.toContain('data:image/png;base64');
            expect(result).toMatch(/src=["'](\/assets\/cases\/|https?:\/\/.*\/api\/media\/gcs\?file=)/);
            expect(result).toContain('alt="Figura 1"');
        });

        it('should strip MSO / VML comments from Microsoft Word copies', async () => {
            const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            const wordHtml = `<!--[if gte vml 1]><v:shape>...</v:shape><![endif]--><!--[if !vml]--><img src="data:image/png;base64,${sampleBase64}"><!--[endif]-->`;

            const result = await adminController._sanitizeHtmlImages(wordHtml, 'questions');

            expect(result).not.toContain('<!--[if');
            expect(result).not.toContain('<![endif]-->');
            expect(result).not.toContain('data:image/png;base64');
        });
    });
});
