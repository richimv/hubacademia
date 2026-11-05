const fs = require('fs');
const path = require('path');

jest.mock('../../src/domain/repositories/docenteRepository', () => ({
    findQuestionsInBankBatch: jest.fn(),
    recordSeenQuestions: jest.fn().mockResolvedValue()
}));

jest.mock('../../src/domain/repositories/medicoRepository', () => ({
    findQuestionsInBankBatch: jest.fn(),
    recordSeenQuestions: jest.fn().mockResolvedValue()
}));

const docenteRepository = require('../../src/domain/repositories/docenteRepository');
const medicoRepository = require('../../src/domain/repositories/medicoRepository');
const docenteService = require('../../src/domain/services/docenteService');
const medicoService = require('../../src/domain/services/medicoService');
const {
    VERTEX_DURABLE_CACHE_POLICY,
    getVertexCandidateModels,
    normalizeThinkingLevel,
    buildVertexGenerationConfig,
    extractModelResponsePayload
} = require('../../src/infrastructure/config/vertexAiConfig');

const ROOT = path.resolve(__dirname, '../..');

function readProjectFile(relPath) {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('Vertex AI model configuration, Sniper-RAG Eradication & Supabase Explicit GRANTs', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
        jest.clearAllMocks();
    });

    test('ACT-01 & ACT-02: Vertex AI retains the configured project defaults and omits deprecated sampling params', () => {
        delete process.env.VERTEX_MODEL_PRIMARY;
        delete process.env.VERTEX_MODEL_FALLBACK;
        delete process.env.VERTEX_THINKING_LEVEL;

        expect(getVertexCandidateModels()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.8-flash']);

        const defaultConfig = buildVertexGenerationConfig({ maxOutputTokens: 2048, responseMimeType: 'application/json' });
        expect(defaultConfig).toEqual({
            maxOutputTokens: 2048,
            responseMimeType: 'application/json'
        });
        expect(defaultConfig).not.toHaveProperty('temperature');
        expect(defaultConfig).not.toHaveProperty('topP');
        expect(defaultConfig).not.toHaveProperty('top_p');
        expect(defaultConfig).not.toHaveProperty('topK');
        expect(defaultConfig).not.toHaveProperty('top_k');
        expect(defaultConfig).not.toHaveProperty('thinking_budget');

        const reasonedConfig = buildVertexGenerationConfig({
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
            thinkingLevel: 'MEDIUM'
        });
        expect(reasonedConfig.thinkingConfig).toEqual({ thinkingLevel: 'medium' });

        expect(normalizeThinkingLevel('minimal')).toBe('minimal');
        expect(normalizeThinkingLevel('low')).toBe('low');
        expect(normalizeThinkingLevel('medium')).toBe('medium');
        expect(normalizeThinkingLevel('high')).toBe('high');
        expect(normalizeThinkingLevel('invalid_budget')).toBeNull();
    });

    test('Thought Signatures are extracted from Vertex AI parts without leaking internal thought blocks', () => {
        const mockVertexResult = {
            response: {
                candidates: [{
                    content: {
                        parts: [
                            { thought: true, text: 'Internal chain of thought' },
                            { text: '{"answer":"Respuesta pedagógica"}', thoughtSignature: 'sig-vertex-36-xyz' }
                        ]
                    }
                }]
            }
        };

        const extracted = extractModelResponsePayload(mockVertexResult);
        expect(extracted).toEqual({
            text: '{"answer":"Respuesta pedagógica"}',
            thoughtSignature: 'sig-vertex-36-xyz'
        });
    });

    test('ACT-03: Durable Caching policy documents 24h implicit retention and valid EPHEMERAL PATCH helper', () => {
        expect(VERTEX_DURABLE_CACHE_POLICY.retentionType).toBe('DURABLE');
        expect(VERTEX_DURABLE_CACHE_POLICY.defaultTtlHours).toBe(24);
        expect(VERTEX_DURABLE_CACHE_POLICY.projects).toEqual(
            expect.arrayContaining(['gen-lang-client-0179928353', 'meducat'])
        );

        const patchSpec = VERTEX_DURABLE_CACHE_POLICY.buildEphemeralPatchConfig('meducat', 'us-central1');
        expect(patchSpec.method).toBe('PATCH');
        expect(patchSpec.url).toBe('https://us-central1-aiplatform.googleapis.com/v1/projects/meducat/cacheConfig');
        expect(patchSpec.body).toEqual({ retentionType: 'EPHEMERAL' });
    });

    test("Los servicios académicos mantienen Vertex y parámetros vigentes; Hubi usa su proveedor independiente", () => {
        const aiFiles = [
            'src/infrastructure/config/vertexAiConfig.js',
            'src/domain/services/tutorAiService.js',
            'src/domain/services/ragService.js',
            'src/application/controllers/analyticsController.js'
        ];
        for (const rel of aiFiles) {
            const source = readProjectFile(rel);
            expect(source).not.toMatch(/generativelanguage\.googleapis\.com/i);
            expect(source).not.toMatch(/thinking_budget/i);
        }
        process.env.VERTEX_MODEL_PRIMARY = 'primary-project-model';
        process.env.VERTEX_MODEL_FALLBACK = 'fallback-project-model';
        expect(getVertexCandidateModels()).toEqual(['primary-project-model', 'fallback-project-model']);
        process.env.VERTEX_MODEL_FALLBACK = 'primary-project-model';
        expect(getVertexCandidateModels()).toEqual(['primary-project-model']);
        });

    test('Sniper-RAG question generation files and endpoints are 100% eradicated', () => {
        expect(fs.existsSync(path.join(ROOT, 'src/domain/services/questionRagService.js'))).toBe(false);
        expect(fs.existsSync(path.join(ROOT, 'src/domain/services/adminAiService.js'))).toBe(false);
        expect(fs.existsSync(path.join(ROOT, 'src/domain/prompts/generationPrompts.js'))).toBe(false);

        const apiRoutes = readProjectFile('src/infrastructure/routes/apiRoutes.js');
        const adminController = readProjectFile('src/application/controllers/adminController.js');
        const adminJs = readProjectFile('src/presentation/public/js/admin.js');

        expect(apiRoutes).not.toMatch(/questions\/generate-ai/);
        expect(adminController).not.toMatch(/generateAiQuestions|adminAiService/);
        expect(adminJs).not.toMatch(/openModal\('ai-question'\)|questions\/generate-ai/);
    });

    test('DocenteService and MedicoService serve exclusively curated BANK questions even when bank count < limit', async () => {
        docenteRepository.findQuestionsInBankBatch.mockResolvedValue([
            {
                id: 'q-doc-1',
                topic: 'Enfoque por competencias',
                question_text: 'Caso pedagógico curado MINEDU',
                options: ['A', 'B', 'C'],
                correct_option_index: 0
            }
        ]);

        const docenteQuiz = await docenteService.generateQuiz(
            { target: 'ASCENSO', career: 'EBR - Primaria', mode: 'standard' },
            'user-123',
            10,
            'advanced'
        );

        expect(docenteQuiz.source).toBe('BANK');
        expect(docenteQuiz.questions).toHaveLength(1);

        medicoRepository.findQuestionsInBankBatch.mockResolvedValue([
            {
                id: 'q-med-1',
                topic: 'Salud Pública',
                question_text: 'Caso clínico curado SERUMS',
                options: ['A', 'B', 'C', 'D'],
                correct_option_index: 1
            }
        ]);

        const medicoQuiz = await medicoService.generateQuiz(
            { target: 'SERUMS', career: 'Medicina Humana', mode: 'standard' },
            'user-123',
            10,
            'advanced'
        );

        expect(medicoQuiz.source).toBe('BANK');
        expect(medicoQuiz.questions).toHaveLength(1);
    });

    test('ACT-04: Supabase SQL schema and migration enforce RLS and explicit GRANT statements for anon, authenticated, and service_role', () => {
        const masterSchema = readProjectFile('src/infrastructure/database/database_schema.sql');
        const grantsMigration = readProjectFile('src/infrastructure/database/supabase_explicit_grants_migration.sql');

        for (const sql of [masterSchema, grantsMigration]) {
            expect(sql).toMatch(/GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;/i);
            expect(sql).toMatch(/GRANT SELECT ON TABLE[\s\S]*TO anon;/i);
            expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON[\s\S]*TO authenticated;/i);
            expect(sql).toMatch(/TO service_role;/i);
            expect(sql).toMatch(/REVOKE ALL ON TABLE[\s\S]*public\.question_bank[\s\S]*FROM PUBLIC, anon, authenticated;/i);
        }
    });
});
