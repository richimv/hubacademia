/**
 * adminRouteSecurity.test.js
 * 
 * Pruebas unitarias para validar la seguridad integral del panel de administración
 * y dashboard de métricas:
 * 1. Escudo Zero-Flicker en <head> de admin.html y dashboard.html.
 * 2. Guardia de seguridad síncrono previo al renderizado en el navegador.
 * 3. Validación criptográfica de sesión y purga de DOM en admin.js y dashboard.js.
 * 4. Bloqueo de fuga de información en endpoints (ej: /api/books?includeHidden=true).
 * 5. Cabeceras estrictas de caché y noindex en vercel.json.
 */

const fs = require('fs');
const path = require('path');
const CoursesController = require('../../src/application/controllers/coursesController');

describe('Seguridad Blindada de Rutas Administrativas (Zero-Flicker y Control de Acceso)', () => {
    let adminHtml;
    let dashboardHtml;
    let adminJs;
    let dashboardJs;
    let vercelConfig;

    beforeAll(() => {
        adminHtml = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/admin.html'), 'utf8');
        dashboardHtml = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/dashboard.html'), 'utf8');
        adminJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/admin.js'), 'utf8');
        dashboardJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/dashboard.js'), 'utf8');
        vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../vercel.json'), 'utf8'));
    });

    describe('1. Protección Zero-Flicker en el HTML (Pre-Render)', () => {
        test('admin.html incluye el estilo bloqueante en <head> para evitar renderizado parcial', () => {
            expect(adminHtml).toContain('id="admin-shield-style"');
            expect(adminHtml).toContain('html { display: none !important; }');
        });

        test('admin.html ejecuta guard síncrono con verificación de JWT y redirección inmediata', () => {
            expect(adminHtml).toContain("localStorage.getItem('authToken')");
            expect(adminHtml).toContain("window.location.replace('/')");
            expect(adminHtml).toContain('hubacademia01@gmail.com');
        });

        test('dashboard.html incluye el estilo bloqueante en <head>', () => {
            expect(dashboardHtml).toContain('id="admin-shield-style"');
            expect(dashboardHtml).toContain('html { display: none !important; }');
        });

        test('dashboard.html ejecuta guard síncrono con verificación de JWT y redirección inmediata', () => {
            expect(dashboardHtml).toContain("localStorage.getItem('authToken')");
            expect(dashboardHtml).toContain("window.location.replace('/')");
            expect(dashboardHtml).toContain('hubacademia01@gmail.com');
        });

        test('Ambos archivos HTML prohíben indexación y archivado en motores de búsqueda', () => {
            expect(adminHtml).toContain('content="noindex, nofollow, noarchive"');
            expect(dashboardHtml).toContain('content="noindex, nofollow, noarchive"');
        });
    });

    describe('2. Verificación en JavaScript y Purga del DOM en caso no autorizado', () => {
        test('admin.js espera a sessionManager.initialize() y purga el DOM si no es admin', () => {
            expect(adminJs).toContain('window.sessionManager.initialize()');
            expect(adminJs).toContain("user.role !== 'admin'");
            expect(adminJs).toContain("document.body.innerHTML = ''");
            expect(adminJs).toContain("window.location.replace('/')");
        });

        test('admin.js solo retira el escudo admin-shield-style tras verificar rol admin', () => {
            expect(adminJs).toContain("document.getElementById('admin-shield-style')");
            expect(adminJs).toContain("document.documentElement.style.display = ''");
        });

        test('admin.js purga el DOM y redirige si loadAllData recibe 401/403/Unauthorized', () => {
            expect(adminJs).toContain("error.message.includes('401')");
            expect(adminJs).toContain("error.message.includes('403')");
            expect(adminJs).toContain("error.message === 'Unauthorized'");
        });

        test('dashboard.js valida el rol admin y purga el DOM si el usuario no tiene privilegios', () => {
            expect(dashboardJs).toContain('window.sessionManager.initialize()');
            expect(dashboardJs).toContain("user.role !== 'admin'");
            expect(dashboardJs).toContain("document.body.innerHTML = ''");
            expect(dashboardJs).toContain("window.location.replace('/')");
        });
    });

    describe('3. Protección Backend contra Fuga de Recursos Ocultos (/api/books)', () => {
        let mockAdminService;
        let controller;

        beforeEach(() => {
            mockAdminService = {
                getAll: jest.fn().mockResolvedValue([{ id: 1, title: 'Libro Público' }])
            };
            controller = new CoursesController(null, mockAdminService);
        });

        test('Rechaza includeHidden si el usuario no está autenticado', async () => {
            const req = {
                query: { includeHidden: 'true' },
                user: null
            };
            const res = {
                set: jest.fn(),
                json: jest.fn()
            };

            await controller.getBooks(req, res);

            // Debe consultar con includeHidden = false
            expect(mockAdminService.getAll).toHaveBeenCalledWith('book', expect.objectContaining({
                includeHidden: false
            }));
            expect(res.set).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('public'));
        });

        test('Rechaza includeHidden si el usuario está autenticado pero con rol "student"', async () => {
            const req = {
                query: { includeHidden: 'true' },
                user: { id: 'student-123', role: 'student' }
            };
            const res = {
                set: jest.fn(),
                json: jest.fn()
            };

            await controller.getBooks(req, res);

            // Debe forzar includeHidden = false para estudiantes
            expect(mockAdminService.getAll).toHaveBeenCalledWith('book', expect.objectContaining({
                includeHidden: false
            }));
            expect(res.set).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('public'));
        });

        test('Permite includeHidden únicamente si el usuario tiene rol "admin"', async () => {
            const req = {
                query: { includeHidden: 'true' },
                user: { id: 'admin-123', role: 'admin' }
            };
            const res = {
                set: jest.fn(),
                json: jest.fn()
            };

            await controller.getBooks(req, res);

            // Debe habilitar includeHidden = true
            expect(mockAdminService.getAll).toHaveBeenCalledWith('book', expect.objectContaining({
                includeHidden: true
            }));
            expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        });
    });

    describe('4. Configuración de Cabeceras en vercel.json', () => {
        test('vercel.json configura Cache-Control private no-store y X-Robots-Tag para admin y dashboard', () => {
            const adminRule = vercelConfig.headers.find(h => h.source === '/(admin|dashboard)(.*)');
            expect(adminRule).toBeDefined();

            const cacheHeader = adminRule.headers.find(h => h.key === 'Cache-Control');
            expect(cacheHeader).toBeDefined();
            expect(cacheHeader.value).toContain('no-store');
            expect(cacheHeader.value).toContain('private');

            const robotsHeader = adminRule.headers.find(h => h.key === 'X-Robots-Tag');
            expect(robotsHeader).toBeDefined();
            expect(robotsHeader.value).toBe('noindex, nofollow, noarchive');
        });
    });
});
