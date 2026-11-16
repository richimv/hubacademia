const fs = require('fs');
const path = require('path');

describe('Database & Vercel Serverless Infrastructure Optimization', () => {
    const rootDir = path.resolve(__dirname, '../..');
    let savedEnv;

    beforeEach(() => {
        savedEnv = { ...process.env };
        jest.resetModules();
        delete globalThis.__hubAcademiaPgPool;
    });

    afterEach(() => {
        process.env = savedEnv;
        delete globalThis.__hubAcademiaPgPool;
        jest.restoreAllMocks();
    });

    describe('1. pg.Pool Serverless Configuration & Runtime DDL Protection (db.js)', () => {
        test('configures max=1, allowExitOnIdle=true, keepAlive=false, and 30s idleTimeout in Vercel Serverless', () => {
            const mockOn = jest.fn();
            const mockQuery = jest.fn().mockResolvedValue({ rows: [{ ok: 1 }], rowCount: 1 });
            const mockEnd = jest.fn().mockResolvedValue();
            const MockPool = jest.fn().mockImplementation((opts) => ({
                options: opts,
                on: mockOn,
                query: mockQuery,
                end: mockEnd
            }));

            jest.doMock('pg', () => ({ Pool: MockPool }));

            process.env.NODE_DATABASE_URL = 'postgresql://postgres:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
            process.env.VERCEL = '1';
            delete process.env.PG_POOL_MAX;
            delete process.env.PG_IDLE_TIMEOUT_MS;

            const db = require('../../src/infrastructure/database/db');
            const poolInstance = db.pool();

            expect(MockPool).toHaveBeenCalledTimes(1);
            const poolConfig = MockPool.mock.calls[0][0];
            expect(poolConfig.max).toBe(1);
            expect(poolConfig.idleTimeoutMillis).toBe(30000);
            expect(poolConfig.connectionTimeoutMillis).toBe(5000);
            expect(poolConfig.query_timeout).toBe(15000);
            expect(poolConfig.allowExitOnIdle).toBe(true);
            expect(poolConfig.keepAlive).toBe(false);
            expect(poolConfig.application_name).toBe('hubacademia-vercel');
            expect(globalThis.__hubAcademiaPgPool).toBe(poolInstance);

            // Verificar que errores XX000 de desconexión inactiva de Supavisor no destruyen el pool singleton
            const errorHandler = mockOn.mock.calls.find(([event]) => event === 'error')[1];
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            errorHandler(Object.assign(new Error('DbHandler exited'), { code: 'XX000' }));
            expect(mockEnd).not.toHaveBeenCalled();
            expect(db.pool()).toBe(poolInstance);
            warnSpy.mockRestore();
        });

        test('blocks runtime DDL and VACUUM statements without opening a PostgreSQL connection', async () => {
            const MockPool = jest.fn();
            jest.doMock('pg', () => ({ Pool: MockPool }));
            process.env.NODE_DATABASE_URL = 'postgresql://postgres:pass@localhost:5432/postgres';
            delete process.env.ALLOW_RUNTIME_DDL;

            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const db = require('../../src/infrastructure/database/db');

            const ddlStatements = [
                'CREATE EXTENSION IF NOT EXISTS "unaccent"',
                '  /* comment */ ALTER TABLE documents ADD COLUMN IF NOT EXISTS fts tsvector',
                'VACUUM FULL documents',
                'CREATE INDEX IF NOT EXISTS idx_test ON documents(id)',
                'DROP TABLE IF EXISTS documents'
            ];

            for (const sql of ddlStatements) {
                expect(db.isBlockedRuntimeDdl(sql)).toBe(true);
                const res = await db.query(sql);
                expect(res).toEqual({ rows: [], rowCount: 0, skippedRuntimeDdl: true });
            }

            // Ninguna sentencia DDL bloqueada debió instanciar el Pool ni abrir conexión
            expect(MockPool).not.toHaveBeenCalled();
            expect( db.isBlockedRuntimeDdl('SELECT id, topic FROM question_bank WHERE domain = $1') ).toBe(false);
            warnSpy.mockRestore();
        });

        test('retries once on transient connection termination (XX000 / 57P01 / ECONNRESET)', async () => {
            const mockQuery = jest.fn()
                .mockRejectedValueOnce(Object.assign(new Error('Connection terminated unexpectedly'), { code: '57P01' }))
                .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

            jest.doMock('pg', () => ({
                Pool: jest.fn().mockImplementation(() => ({
                    on: jest.fn(),
                    query: mockQuery,
                    end: jest.fn().mockResolvedValue()
                }))
            }));

            process.env.NODE_DATABASE_URL = 'postgresql://postgres:pass@localhost:5432/postgres';
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const db = require('../../src/infrastructure/database/db');

            const res = await db.query('SELECT 1');
            expect(res.rows).toEqual([{ id: 1 }]);
            expect(mockQuery).toHaveBeenCalledTimes(2);
            await db.closePool();
            expect(globalThis.__hubAcademiaPgPool).toBeUndefined();
            warnSpy.mockRestore();
        });
    });

    describe('2. Lazy DB Initialization on Vercel Serverless Cold Start (server.js)', () => {
        test('skips eager SELECT NOW() on cold start when running in Vercel Serverless', async () => {
            const mockQuery = jest.fn().mockResolvedValue({ rows: [{ now: '2026-11-16T00:00:00Z' }] });
            jest.doMock('../../src/infrastructure/database/db', () => ({
                query: mockQuery,
                pool: jest.fn()
            }));
            jest.doMock('../../src/infrastructure/config/googleCredentials', () => ({
                resolveGoogleAuthOptions: jest.fn().mockReturnValue({})
            }));

            process.env.VERCEL = '1';
            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            const Server = require('../../src/infrastructure/config/server');
            const server = new Server();

            await server.testDBConnection();
            expect(mockQuery).not.toHaveBeenCalled();

            // Si se fuerza explícitamente, sí ejecuta SELECT NOW()
            await server.testDBConnection({ force: true });
            expect(mockQuery).toHaveBeenCalledWith('SELECT NOW()');
            logSpy.mockRestore();
        });
    });

    describe('3. Auth Middleware DB Lookup Deduplication & Timer-Free Cache (authMiddleware.js)', () => {
        test('deduplicates concurrent UserRepository.findById calls and caches dbUser without setInterval', async () => {
            const authSource = fs.readFileSync(
                path.join(rootDir, 'src/infrastructure/middleware/authMiddleware.js'),
                'utf8'
            );
            expect(authSource).not.toContain('setInterval(');

            const mockGetUser = jest.fn().mockResolvedValue({
                data: {
                    user: { id: 'user-uuid-1', email: 'docente@hub.com', email_confirmed_at: '2026-01-01T00:00:00Z' }
                },
                error: null
            });
            const mockFindById = jest.fn().mockImplementation(async (id) => ({
                id,
                email: 'docente@hub.com',
                role: 'student',
                subscriptionTier: 'advanced'
            }));

            jest.doMock('../../src/infrastructure/config/supabaseClient', () => ({
                auth: { getUser: mockGetUser }
            }));
            jest.doMock('../../src/domain/repositories/userRepository', () =>
                jest.fn().mockImplementation(() => ({ findById: mockFindById }))
            );

            const { auth, clearTokenCache } = require('../../src/infrastructure/middleware/authMiddleware');
            clearTokenCache();

            const token = [
                Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
                Buffer.from(JSON.stringify({ sub: 'user-uuid-1', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'),
                'sig'
            ].join('.');

            const makeReq = (method = 'GET', pathUrl = '/api/medico/stats') => ({
                method,
                path: pathUrl,
                originalUrl: pathUrl,
                header: (h) => (h === 'Authorization' ? `Bearer ${token}` : null)
            });
            const makeRes = () => {
                const res = { status: jest.fn(), json: jest.fn() };
                res.status.mockReturnValue(res);
                return res;
            };

            // Simular 4 peticiones GET concurrentes con el mismo token
            const reqs = [makeReq(), makeReq(), makeReq(), makeReq()];
            await Promise.all(reqs.map((r) => auth(r, makeRes(), jest.fn())));

            expect(mockGetUser).toHaveBeenCalledTimes(1);
            expect(mockFindById).toHaveBeenCalledTimes(1);
            expect(reqs[0].user).toMatchObject({ id: 'user-uuid-1', emailVerified: true });
        });
    });

    describe('4. Telemetry Pulse Deduplication Middleware (analyticsRoutes.js)', () => {
        test('throttles duplicate pulses for the same sessionId within 2 minutes and allows auth state upgrade', () => {
            const analyticsRoutes = require('../../src/infrastructure/routes/analyticsRoutes');
            const { throttlePulseMiddleware, clearPulseSessionCache } = analyticsRoutes;
            clearPulseSessionCache();

            const createRes = () => {
                const res = { statusCode: 200, sent: false };
                res.status = jest.fn((code) => {
                    res.statusCode = code;
                    return res;
                });
                res.send = jest.fn(() => {
                    res.sent = true;
                    return res;
                });
                return res;
            };

            const next1 = jest.fn();
            const res1 = createRes();
            throttlePulseMiddleware(
                { body: { sessionId: 'sess-123' }, header: () => null },
                res1,
                next1
            );
            expect(next1).toHaveBeenCalledTimes(1);
            expect(res1.sent).toBe(false);

            // Segundo pulso anónimo inmediato con el mismo sessionId se responde 204 en memoria
            const next2 = jest.fn();
            const res2 = createRes();
            throttlePulseMiddleware(
                { body: { sessionId: 'sess-123' }, header: () => null },
                res2,
                next2
            );
            expect(next2).not.toHaveBeenCalled();
            expect(res2.statusCode).toBe(204);
            expect(res2.sent).toBe(true);

            // Si el mismo sessionId ahora envía Authorization Bearer, pasa inmediatamente para vincular user_id
            const next3 = jest.fn();
            const res3 = createRes();
            throttlePulseMiddleware(
                { body: { sessionId: 'sess-123' }, header: (h) => (h === 'Authorization' ? 'Bearer tok' : null) },
                res3,
                next3
            );
            expect(next3).toHaveBeenCalledTimes(1);
        });
    });

    describe('5. Supabase SQL RAM & Index Migration Integrity', () => {
        test('migration script drops legacy documents table, removes duplicate indexes, and creates composite/trigram indexes', () => {
            const migrationSql = fs.readFileSync(
                path.join(rootDir, 'src/infrastructure/database/20261116_supabase_ram_and_index_optimization.sql'),
                'utf8'
            );
            const schemaSql = fs.readFileSync(
                path.join(rootDir, 'src/infrastructure/database/database_schema.sql'),
                'utf8'
            );

            expect(migrationSql).toContain('DROP TABLE IF EXISTS public.documents CASCADE;');
            expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.f_unaccent(text)');
            expect(migrationSql).toContain('DROP CONSTRAINT IF EXISTS unique_user_question;');
            expect(migrationSql).toContain('DROP INDEX IF EXISTS public.idx_uhist_user_q;');
            expect(migrationSql).toContain('DROP INDEX IF EXISTS public.unique_user_question;');
            expect(migrationSql).toContain('idx_question_bank_domain_created_at');
            expect(migrationSql).toContain('idx_question_bank_simulator_lookup');
            expect(migrationSql).toContain('idx_question_bank_qtext_trgm');
            expect(migrationSql).toContain('idx_user_question_history_user_seen_at');
            expect(migrationSql).toContain('purge_stale_operational_data()');

            expect(schemaSql).not.toContain('CREATE INDEX idx_uhist_user_q');
            expect(schemaSql).not.toContain('CREATE UNIQUE INDEX unique_user_question');
            expect(schemaSql).toContain('idx_question_bank_domain_created_at');
            expect(schemaSql).toContain('idx_user_question_history_user_seen_at');
        });
    });
});
