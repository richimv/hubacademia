const fs = require('fs');
const path = require('path');
const vm = require('vm');

jest.mock('../../src/infrastructure/database/db', () => ({
    query: jest.fn()
}));

jest.mock('../../src/domain/repositories/libraryRepository', () => {
    const updateNote = jest.fn();
    const deleteNote = jest.fn();
    return jest.fn().mockImplementation(() => ({
        updateNote,
        deleteNote
    }));
});

jest.mock('../../src/domain/services/mlService', () => ({
    generateCourseDescription: jest.fn()
}));

jest.mock('../../src/application/controllers/mediaController', () => ({
    uploadFile: jest.fn(),
    deleteFile: jest.fn()
}));

jest.mock('../../src/domain/services/driveService', () => ({}));
jest.mock('../../src/domain/services/docenteService', () => ({}));
jest.mock('../../src/domain/services/medicoService', () => ({}));
jest.mock('../../src/domain/services/quizSessionService', () => ({
    createSession: jest.fn(),
    submitAnswer: jest.fn()
}));
jest.mock('../../src/domain/services/usageService', () => {
    const checkAndIncrementUsage = jest.fn();
    return jest.fn().mockImplementation(() => ({
        checkAndIncrementUsage
    }));
});

const db = require('../../src/infrastructure/database/db');
const AnalyticsRepository = require('../../src/domain/repositories/analyticsRepository');
const libraryController = require('../../src/application/controllers/libraryController');
const CoursesController = require('../../src/application/controllers/coursesController');
const docenteController = require('../../src/application/controllers/docenteController');
const medicoController = require('../../src/application/controllers/medicoController');
const UsageService = require('../../src/domain/services/usageService');

function createMockRes() {
    const res = {
        statusCode: 200,
        body: null,
        headers: {},
        status: jest.fn(code => {
            res.statusCode = code;
            return res;
        }),
        json: jest.fn(payload => {
            res.body = payload;
            return res;
        }),
        send: jest.fn(payload => {
            res.body = payload;
            return res;
        }),
        set: jest.fn((key, val) => {
            res.headers[key] = val;
            return res;
        })
    };
    return res;
}

describe('Security Hardening & Cleanup Verification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('AnalyticsRepository SQL Interval Parameterization', () => {
        const repo = new AnalyticsRepository();

        it('clamps and sanitizes days into integer bounds [1..3650]', () => {
            expect(repo._sanitizeDays(7)).toBe(7);
            expect(repo._sanitizeDays('14')).toBe(14);
            expect(repo._sanitizeDays('invalid')).toBe(30);
            expect(repo._sanitizeDays(-10)).toBe(30);
            expect(repo._sanitizeDays(0)).toBe(30);
            expect(repo._sanitizeDays(99999)).toBe(3650);
        });

        it('parameterizes intervals across analytics time-series and metrics queries', async () => {
            db.query.mockResolvedValue({ rows: [{ count: '5', impressions: 1, clicks: 0, unique_questions: 1 }] });

            await repo.getSearchHistoryTimeSeries("7; DROP TABLE users;--");
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining("($1 || ' days')::interval"),
                [7]
            );
            expect(db.query.mock.calls[0][0]).not.toContain('DROP TABLE');

            db.query.mockClear();
            await repo.getDashboardMetricsRaw('abc');
            const parameterizedCalls = db.query.mock.calls.filter(call => call.length === 2);
            expect(parameterizedCalls.length).toBeGreaterThan(0);
            parameterizedCalls.forEach(([sql, params]) => {
                expect(sql).toContain("($1 || ' days')::interval");
                expect(sql).not.toContain('abc');
                expect(params).toEqual([30]);
            });

            db.query.mockClear();
            await repo.getInteractionTrendsRaw(1);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining("($1 || ' days')::interval"),
                [0]
            );

            db.query.mockClear();
            await repo.getTopViewedEntitiesRaw('course', '15');
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining("($2 || ' days')::interval"),
                ['course', 15]
            );
        });
    });

    describe('Controller Strict Integer ID Validation & Generic 500 Responses', () => {
        it('rejects non-positive integer note IDs with 400 in libraryController', async () => {
            for (const badId of ['abc', '0', '-3', '12abc']) {
                const resUpdate = createMockRes();
                await libraryController.updateNote(
                    { user: { id: 'user-1' }, params: { id: badId }, body: { title: 't' } },
                    resUpdate
                );
                expect(resUpdate.statusCode).toBe(400);

                const resDelete = createMockRes();
                await libraryController.deleteNote(
                    { user: { id: 'user-1' }, params: { id: badId } },
                    resDelete
                );
                expect(resDelete.statusCode).toBe(400);

                const resToggle = createMockRes();
                await libraryController.toggleItem(
                    { user: { id: 'user-1' }, body: { type: 'course', id: badId, action: 'save' } },
                    resToggle
                );
                expect(resToggle.statusCode).toBe(400);
            }
        });

        it('sanitizes days in buildSafeTimeFilter to prevent SQL interval NaN errors', () => {
            const { buildSafeTimeFilter } = require('../../src/application/controllers/quizSessionControllerSupport');
            expect(buildSafeTimeFilter('')).toBe('');
            expect(buildSafeTimeFilter('abc')).toBe('');
            expect(buildSafeTimeFilter('-5')).toBe('');
            expect(buildSafeTimeFilter(0)).toBe('');
            expect(buildSafeTimeFilter('30')).toBe(" AND created_at >= NOW() - INTERVAL '30 days'");
            expect(buildSafeTimeFilter(99999)).toBe(" AND created_at >= NOW() - INTERVAL '3650 days'");
        });

        it('rejects invalid numeric IDs with 400 and hides internal error.message on 500 in CoursesController', async () => {
            const adminService = {
                getAll: jest.fn(),
                getById: jest.fn(),
                update: jest.fn(),
                _getRepository: jest.fn()
            };
            const controller = new CoursesController({}, adminService);

            for (const method of ['getCareerById', 'getCourseById', 'getResourceById', 'getTopicById', 'getCourseDescription']) {
                const res = createMockRes();
                await controller[method]({ params: { id: 'not-an-id' } }, res);
                expect(res.statusCode).toBe(400);
                expect(adminService.getById).not.toHaveBeenCalled();
            }

            const resUpdateBad = createMockRes();
            await controller.updateEntity({ params: { id: 'bad-id' }, body: {} }, resUpdateBad, 'course');
            expect(resUpdateBad.statusCode).toBe(400);

            const resDeleteBad = createMockRes();
            await controller.deleteEntity({ params: { id: 'bad-id' } }, resDeleteBad, 'book');
            expect(resDeleteBad.statusCode).toBe(400);

            const sensitiveError = new Error('password authentication failed for postgres://internal');
            adminService.getAll.mockRejectedValueOnce(sensitiveError);
            const resCourses500 = createMockRes();
            await controller.getCourses({ query: {} }, resCourses500);
            expect(resCourses500.statusCode).toBe(500);
            expect(resCourses500.body.error).not.toContain('postgres://internal');

            for (const method of ['getCareerById', 'getCourseById', 'getResourceById', 'getTopicById']) {
                adminService.getById.mockRejectedValueOnce(sensitiveError);
                const res500 = createMockRes();
                await controller[method]({ params: { id: '42' } }, res500);
                expect(res500.statusCode).toBe(500);
                expect(res500.body.error).not.toContain('postgres://internal');
            }
        });

        it('does not leak raw error.message in docenteController and medicoController startQuiz 500 fallback', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            try {
                const usageInstance = new UsageService();
                usageInstance.checkAndIncrementUsage.mockRejectedValue(new Error('SECRET_INTERNAL_STACK_TRACE'));

                const req = {
                    user: { id: 'user-1', role: 'student', subscriptionTier: 'free' },
                    body: { target: 'SERUMS', areas: ['Salud Pública'], round: 1 }
                };

                const resDoc = createMockRes();
                await docenteController.startQuiz(req, resDoc);
                expect(resDoc.statusCode).toBe(500);
                expect(resDoc.body.error).toBe('Error interno al iniciar el simulador.');

                const resMed = createMockRes();
                await medicoController.startQuiz(req, resMed);
                expect(resMed.statusCode).toBe(500);
                expect(resMed.body.error).toBe('Error interno al iniciar el simulador.');
            } finally {
                consoleSpy.mockRestore();
            }
        });
    });

    describe('Frontend XSS Escaping & Image Fallback Loop Prevention', () => {
        it('escapes HTML payloads, omits inline JS strings in onclick, and avoids obsolete fallback .webp paths', () => {
            const configCode = fs.readFileSync(
                path.join(__dirname, '../../src/presentation/public/js/config.js'),
                'utf8'
            );
            const code = fs.readFileSync(
                path.join(__dirname, '../../src/presentation/public/js/ui/components.js'),
                'utf8'
            );
            const sandboxConsole = {
                log: jest.fn(),
                info: jest.fn(),
                debug: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            };
            const configSandbox = {
                console: sandboxConsole,
                URL,
                location: { origin: 'https://hubacademia.com', hostname: 'hubacademia.com' }
            };
            configSandbox.window = configSandbox;
            vm.runInNewContext(configCode, configSandbox);

            expect(configSandbox.getDefaultResourceImage('book')).toBe('');
            expect(configSandbox.resolveImageUrl('', 'paper')).toBe('');

            const sandbox = {
                console: sandboxConsole,
                Math,
                document: { addEventListener: jest.fn() },
                escapeHtml: configSandbox.escapeHtml,
                resolveImageUrl: configSandbox.resolveImageUrl,
                getDefaultResourceImage: configSandbox.getDefaultResourceImage
            };
            sandbox.window = sandbox;
            vm.runInNewContext(code, sandbox);

            const html = sandbox.createNewsBulletinWidgetHTML(
                [{
                    id: "1');alert('id",
                    title: '<img src=x onerror=alert(1)>',
                    author: '<script>alert(2)</script>',
                    url: "https://example.com/?q=';alert(3)//",
                    content_html: '<p>Resumen <b>seguro</b></p>',
                    resource_type: 'norma'
                }],
                'education'
            );

            expect(html).not.toContain('<script>alert(2)</script>');
            expect(html).not.toContain('<img src=x onerror=alert(1)>');
            expect(html).not.toContain('paper.webp');
            expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
            expect(html).toContain('this.dataset.url');
            expect(html).toContain('this.dataset.id');
        });

        it('uses CSS icon fallbacks safely and escapes search headings without onerror loops', () => {
            const componentsCode = fs.readFileSync(
                path.join(__dirname, '../../src/presentation/public/js/ui/components.js'),
                'utf8'
            );
            const resourceCode = fs.readFileSync(
                path.join(__dirname, '../../src/presentation/public/js/resource.js'),
                'utf8'
            );
            const searchCode = fs.readFileSync(
                path.join(__dirname, '../../src/presentation/public/js/search.js'),
                'utf8'
            );

            expect(componentsCode).toContain('onerror="this.onerror=null;');
            expect(componentsCode).not.toContain('assets/paper.webp');
            expect(resourceCode).toContain('onerror="this.onerror=null;');
            expect(resourceCode).toContain('urc-icon-fallback');
            expect(searchCode).toContain("window.escapeHtml(data.searchQuery || '')");
            expect(searchCode).toContain('window.escapeHtml(area)');
            expect(searchCode).toContain('window.escapeHtml(topic)');
        });
    });
});
