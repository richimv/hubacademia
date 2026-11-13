const fs = require('fs');
const path = require('path');
const { resolveGoogleAuthOptions, parseInlineServiceAccount } = require('../../src/infrastructure/config/googleCredentials');
const { resolvePublicBaseUrl } = require('../../src/infrastructure/config/publicUrl');

describe('Fase 1: Vercel Serverless Architecture Verification', () => {
    const rootDir = path.resolve(__dirname, '../..');
    let savedEnv;

    beforeEach(() => {
        savedEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = savedEnv;
    });

    test('vercel.json routes /api/* and /health to /api/index with maxDuration 300 and zero Render references', () => {
        const vercelConfigPath = path.join(rootDir, 'vercel.json');
        const raw = fs.readFileSync(vercelConfigPath, 'utf8');
        expect(raw).not.toContain('onrender.com');

        const parsed = JSON.parse(raw);
        expect(parsed.outputDirectory).toBe('src/presentation/public');
        expect(parsed.cleanUrls).toBe(true);
        expect(parsed.functions['api/*.js'].maxDuration).toBe(300);

        const apiRewrite = parsed.rewrites.find((r) => r.source === '/api/:apiRoute*');
        expect(apiRewrite).toBeDefined();
        expect(apiRewrite.destination).toBe('/api/index');
    });

    test('api/index.js exports an async serverless handler function', () => {
        const handlerPath = path.join(rootDir, 'api/index.js');
        expect(fs.existsSync(handlerPath)).toBe(true);
        const handler = require(handlerPath);
        expect(typeof handler).toBe('function');
    });

    test('googleCredentials resolves inline JSON and Base64 service account credentials in memory', () => {
        const fakeSa = {
            project_id: 'hub-vercel-test',
            client_email: 'vertex-bot@hub-vercel-test.iam.gserviceaccount.com',
            private_key: '-----BEGIN PRIVATE KEY-----\\nABC123XYZ\\n-----END PRIVATE KEY-----\\n'
        };

        process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify(fakeSa);
        delete process.env.GOOGLE_CLOUD_PROJECT;

        const directOpts = resolveGoogleAuthOptions('UnitTest');
        expect(directOpts.projectId).toBe('hub-vercel-test');
        expect(directOpts.credentials.client_email).toBe(fakeSa.client_email);
        expect(directOpts.credentials.private_key).toContain('\nABC123XYZ\n');

        delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        const base64Payload = Buffer.from(JSON.stringify(fakeSa), 'utf8').toString('base64');
        const b64Opts = parseInlineServiceAccount(base64Payload, 'UnitTestBase64');
        expect(b64Opts.credentials.client_email).toBe(fakeSa.client_email);
    });

    test('resolvePublicBaseUrl resolves Vercel production URLs and defaults to www.hubacademia.com', () => {
        delete process.env.BACKEND_PUBLIC_URL;
        delete process.env.BACKEND_URL;
        delete process.env.API_URL;
        delete process.env.FRONTEND_URL;
        process.env.VERCEL_PROJECT_PRODUCTION_URL = 'www.hubacademia.com';

        expect(resolvePublicBaseUrl()).toBe('https://www.hubacademia.com');
    });

    test("Render solo se reconoce para normalizar contenido antiguo; API y archivos se sirven en el origen actual", () => {
        const compatibilityFile = path.join(rootDir, 'src/presentation/public/js/config.js');
        const windowMock = { location: { hostname: 'www.hubacademia.com', origin: 'https://www.hubacademia.com' } };
        require('vm').runInNewContext(fs.readFileSync(compatibilityFile, 'utf8'), {
            window: windowMock, URL, document: { currentScript: null },
            console: { log() {}, info() {}, debug() {}, warn() {}, error() {} }
        });
        expect(windowMock.AppConfig.API_URL).toBe(windowMock.location.origin);
        const resolved = new URL(windowMock.resolveImageUrl('https://tutor-ia-backend.onrender.com/api/media/gcs?file=questions%2Fsample.webp'));
        expect(resolved.origin).toBe(windowMock.location.origin);
        expect(resolved.pathname).toBe('/api/media/gcs');
        expect(resolved.searchParams.get('file')).toBe('questions/sample.webp');
        expect(windowMock.resolveImageUrl('https://tutor-ia-backend.onrender.com/assets/legacy.webp')).toBe(windowMock.location.origin + '/assets/legacy.webp');
        });
});
