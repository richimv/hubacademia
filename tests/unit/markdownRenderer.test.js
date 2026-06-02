describe('MarkdownRenderer URL safety', () => {
    beforeEach(() => {
        jest.resetModules();
        global.window = {
            location: {
                origin: 'https://www.hubacademia.com'
            }
        };
        require('../../src/presentation/public/js/utils/markdown-renderer');
    });

    afterEach(() => {
        delete global.window;
    });

    it('allows expected safe URL formats', () => {
        const { _isSafeUrl } = window.MarkdownRenderer;

        expect(_isSafeUrl('/assets/logo.png')).toBe(true);
        expect(_isSafeUrl('assets/logo.png')).toBe(true);
        expect(_isSafeUrl('https://www.hubacademia.com/resource')).toBe(true);
        expect(_isSafeUrl('mailto:soporte@hubacademia.com')).toBe(true);
        expect(_isSafeUrl('tel:+511234567')).toBe(true);
        expect(_isSafeUrl('data:image/png;base64,AAAA')).toBe(true);
    });

    it('blocks active or unexpected URL protocols', () => {
        const { _isSafeUrl } = window.MarkdownRenderer;

        expect(_isSafeUrl('javascript:alert(1)')).toBe(false);
        expect(_isSafeUrl('java\nscript:alert(1)')).toBe(false);
        expect(_isSafeUrl('vbscript:msgbox(1)')).toBe(false);
        expect(_isSafeUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
        expect(_isSafeUrl('data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+')).toBe(false);
        expect(_isSafeUrl('ftp://example.com/file')).toBe(false);
    });
});
