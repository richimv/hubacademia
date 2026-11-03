const Server = require('../../src/infrastructure/config/server');

describe('Server security headers', () => {
    let originalNodeEnv;

    beforeEach(() => {
        originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
    });

    test('emits CSP report-only and HSTS on HTTPS traffic', async () => {
        const server = new Server();
        server.configureMiddleware();
        const listener = server.app.listen(0, '127.0.0.1');

        try {
            await new Promise((resolve) => listener.once('listening', resolve));
            const address = listener.address();
            const response = await fetch(`http://127.0.0.1:${address.port}/missing`, {
                headers: { 'x-forwarded-proto': 'https' }
            });

            expect(response.headers.get('content-security-policy-report-only')).toContain("default-src 'self'");
            expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains');
            expect(response.headers.get('x-powered-by')).toBeNull();
        } finally {
            await new Promise((resolve) => listener.close(resolve));
        }
    });
});
