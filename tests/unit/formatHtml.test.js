const adminRepository = require('../../src/domain/repositories/adminRepository');

describe('adminRepository.formatPlainTextToHtml', () => {
    it('should return empty string for null, undefined or empty input', () => {
        expect(adminRepository.formatPlainTextToHtml(null)).toBe('');
        expect(adminRepository.formatPlainTextToHtml(undefined)).toBe('');
        expect(adminRepository.formatPlainTextToHtml('')).toBe('');
    });

    it('should return the text unchanged if it already starts with HTML tag', () => {
        const htmlText = '<p>Los niños del aula de cinco años...</p>';
        expect(adminRepository.formatPlainTextToHtml(htmlText)).toBe(htmlText);

        const htmlTextWithSpaces = '  <div>Contenido en div</div>';
        expect(adminRepository.formatPlainTextToHtml(htmlTextWithSpaces)).toBe(htmlTextWithSpaces);
    });

    it('should wrap plain text with no newlines in a paragraph', () => {
        const plain = 'Texto de prueba sin saltos de linea.';
        const expected = '<p>Texto de prueba sin saltos de linea.</p>';
        expect(adminRepository.formatPlainTextToHtml(plain)).toBe(expected);
    });

    it('should convert single newlines to <br> inside a paragraph', () => {
        const plain = 'Primera linea\nSegunda linea';
        const expected = '<p>Primera linea<br>Segunda linea</p>';
        expect(adminRepository.formatPlainTextToHtml(plain)).toBe(expected);
    });

    it('should convert double newlines to multiple paragraphs', () => {
        const plain = 'Parrafo uno\n\nParrafo dos';
        const expected = '<p>Parrafo uno</p><p>Parrafo dos</p>';
        expect(adminRepository.formatPlainTextToHtml(plain)).toBe(expected);
    });

    it('should handle complex carriage returns, double newlines, and single newlines', () => {
        const plain = 'Parrafo 1\r\nLinea 2\r\n\r\nParrafo 2\n\nParrafo 3';
        const expected = '<p>Parrafo 1<br>Linea 2</p><p>Parrafo 2</p><p>Parrafo 3</p>';
        expect(adminRepository.formatPlainTextToHtml(plain)).toBe(expected);
    });
});

describe('adminRepository.decodeHtmlEntities', () => {
    it('should return empty string for null, undefined or empty input', () => {
        expect(adminRepository.decodeHtmlEntities(null)).toBe('');
        expect(adminRepository.decodeHtmlEntities(undefined)).toBe('');
        expect(adminRepository.decodeHtmlEntities('')).toBe('');
    });

    it('should decode named Spanish HTML entities to raw characters', () => {
        const input = 'Marcela, de cinco a&ntilde;os, est&aacute; jugando en el jard&iacute;n.';
        const expected = 'Marcela, de cinco años, está jugando en el jardín.';
        expect(adminRepository.decodeHtmlEntities(input)).toBe(expected);
    });

    it('should decode quotes and non-breaking spaces', () => {
        const input = 'El docente dice:&nbsp;&ldquo;Muy bien&rdquo;.';
        const expected = 'El docente dice: "Muy bien".';
        expect(adminRepository.decodeHtmlEntities(input)).toBe(expected);
    });

    it('should decode Spanish punctuation entities like upside down question and exclamation marks', () => {
        const input = '&iquest;Qu&eacute; busca principalmente la docente? &iexcl;Muy bien!';
        const expected = '¿Qué busca principalmente la docente? ¡Muy bien!';
        expect(adminRepository.decodeHtmlEntities(input)).toBe(expected);
    });

    it('should not affect standard tag brackets or ampersands that are not entities', () => {
        const input = '<p>A & B < C</p>';
        expect(adminRepository.decodeHtmlEntities(input)).toBe(input);
    });
});
