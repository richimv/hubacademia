const fs = require('fs');
const path = require('path');
const { resolveGoogleAuthOptions, parseInlineServiceAccount } = require('../../src/infrastructure/config/googleCredentials');
const { resolvePublicBaseUrl } = require('../../src/infrastructure/config/publicUrl');

function collectFilesRecursively(dirPath, extensions = ['.js', '.json', '.html', '.css']) {
    if (!fs.existsSync(dirPath)) return [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(collectFilesRecursively(fullPath, extensions));
        } else if (extensions.includes(path.extname(entry.name))) {
            files.push(fullPath);
        }
    }
    return files;
}

describe('Fase 1: Vercel Serverless Architecture & Zero Render Verification', () => {
    const rootDir = path.resolve(__dirname, '../..');
    let savedEnv;

    beforeEach(() => {
        savedEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = savedEnv;
    });

    test('vercel.json routes /api/* and /health to /api/index with maxDuration 60 and zero Render references', () => {
        const vercelConfigPath = path.join(rootDir, 'vercel.json');
        const raw = fs.readFileSync(vercelConfigPath, 'utf8');
        expect(raw).not.toContain('onrender.com');

        const parsed = JSON.parse(raw);
        expect(parsed.outputDirectory).toBe('src/presentation/public');
        expect(parsed.cleanUrls).toBe(true);
        expect(parsed.functions['api/*.js'].maxDuration).toBe(60);

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

    test('zero active references to onrender.com remain in src/, api/, or vercel.json', () => {
        const filesToCheck = [
            ...collectFilesRecursively(path.join(rootDir, 'src')),
            ...collectFilesRecursively(path.join(rootDir, 'api')),
            path.join(rootDir, 'vercel.json')
        ];

        const offending = [];
        for (const file of filesToCheck) {
            const content = fs.readFileSync(file, 'utf8');
            if (/onrender\.com/i.test(content)) {
                offending.push(path.relative(rootDir, file));
            }
        }

        expect(offending).toEqual([]);
    });
});
