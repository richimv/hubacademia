const fs = require('fs');
const path = require('path');

describe('Dashboard Dual-Theme, Modal Isolation & Admin Responsive Search Bar', () => {
    let adminCss;
    let dashboardCss;
    let dashboardHtml;
    let dashboardJs;
    let uiManagerJs;

    beforeAll(() => {
        adminCss = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/admin.css'), 'utf8');
        dashboardCss = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/dashboard.css'), 'utf8');
        dashboardHtml = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/dashboard.html'), 'utf8');
        dashboardJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/dashboard.js'), 'utf8');
        uiManagerJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/ui/uiManager.js'), 'utf8');
    });

    describe('Barra de Búsqueda Responsiva en admin.css', () => {
        test("El buscador usa tokens de formulario y área táctil de 44px", () => {
            expect(adminCss).toMatch(/\.search-bar-container\s*\{[^}]*min-height:\s*44px/);
            expect(adminCss).toMatch(/\.search-bar-container\s*\{[^}]*background:\s*var\(--input-bg\)/);
            expect(adminCss).toMatch(/\.search-bar-container:focus-within\s*\{[^}]*border-color:\s*var\(--primary\)/);
        });

        test("El buscador puede encogerse y apilarse en pantallas móviles", () => {
            expect(adminCss).toMatch(/@media\s*\(max-width:\s*768px\)[\s\S]*?\.search-bar-container\s*\{[^}]*min-width:\s*0/);
            expect(adminCss).toMatch(/\.tab-search-row\s*\{[^}]*flex-direction:\s*column/);
        });
    });

    describe('Aislamiento de la Modal de Registro (Join Modal)', () => {
        test("La invitación de acceso inicia oculta mediante el CSS compartido", () => {
            const modalCss = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/modal.css'), 'utf8');
            expect(uiManagerJs).toContain('class="auth-prompt-modal" role="dialog"');
            expect(modalCss).toMatch(/\.auth-prompt-modal[^{]*\{[^}]*display:\s*none/);
            expect(modalCss).toMatch(/:is\([^)]*\.auth-prompt-modal[^)]*\):is\([^)]*\.active/);
        });

        test('injectModalHTML debe excluir rutas administrativas (/dashboard y /admin)', () => {
            expect(uiManagerJs).toMatch(/path\.startsWith\('\/dashboard'\)\s*\|\|\s*path\.startsWith\('\/admin'\)/);
        });

        test('dashboard.html debe cargar components.css y modal.css para integridad arquitectónica', () => {
            expect(dashboardHtml).toMatch(/<link\s+rel="stylesheet"\s+href="\/css\/components\.css/);
            expect(dashboardHtml).toMatch(/<link\s+rel="stylesheet"\s+href="\/css\/modal\.css/);
        });
    });

    describe('Saneamiento Dual-Theme en dashboard.css y dashboard.html', () => {
        test('dashboard.css no debe contener variables hardcodeadas de tarjetas oscuras rgba(10, 10, 10, 0.4)', () => {
            expect(dashboardCss).not.toContain('--bg-card: rgba(10, 10, 10, 0.4);');
            expect(dashboardCss).toContain('--bg-card: var(--card-bg);');
        });

        test("Las métricas heredan su superficie y los gráficos usan tokens de tema", () => {
            expect(dashboardCss).toMatch(/\.kpi-card\s*\{[^}]*background:\s*none/);
            expect(dashboardCss).toMatch(/\.kpi-card\s*\{[^}]*color:\s*var\(--text-main\)/);
            expect(dashboardCss).toMatch(/\.chart-card,\s*\.ai-card\s*\{[^}]*background:\s*var\(--bg-secondary\)/);
        });

        test("Las métricas usan colores semánticos de texto en avisos y actividad", () => {
            expect(dashboardCss).toMatch(/\.kpi-card-warning\s+\.kpi-value\s*\{[^}]*color:\s*var\(--warning\)/);
            expect(dashboardCss).toMatch(/\.kpi-card-live\s+\.kpi-value\s*\{[^}]*color:\s*var\(--success\)/);
        });

        test('dashboard.html debe aplicar clases semánticas y no hardcodear estilos oscuros inline', () => {
            expect(dashboardHtml).toContain('class="kpi-card kpi-card-warning"');
            expect(dashboardHtml).toContain('class="kpi-card kpi-card-live"');
            expect(dashboardHtml).not.toContain('style="background: #1e293b;');
            expect(dashboardHtml).not.toContain('style="border: 1px solid var(--accent-warning);"');
        });
    });

    describe('Reactividad Dual-Theme en Gráficos (dashboard.js)', () => {
        test('dashboard.js debe escuchar cambios de tema con themeManager y evento hub:theme-change', () => {
            expect(dashboardJs).toContain('window.themeManager.onThemeChange');
            expect(dashboardJs).toContain('hub:theme-change');
        });

        test('createBarChart en dashboard.js debe detectar modo oscuro/claro y aplicar paleta adaptativa', () => {
            expect(dashboardJs).toContain('window.themeManager.isDark()');
            expect(dashboardJs).toContain('#f8fafc');
            expect(dashboardJs).toContain('#0f172a');
        });
    });
});
