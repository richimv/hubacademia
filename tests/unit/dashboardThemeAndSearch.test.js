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
        test('Debe usar estilo cápsula unificado con border-radius de 30px y altura de 44px en desktop', () => {
            expect(adminCss).toMatch(/\.search-bar-container\s*\{[\s\S]*?border-radius:\s*30px;/);
            expect(adminCss).toMatch(/\.search-bar-container\s*\{[\s\S]*?height:\s*44px;/);
            expect(adminCss).toMatch(/\.search-bar-container\s*\{[\s\S]*?min-height:\s*44px;/);
            expect(adminCss).toMatch(/\.search-bar-container:focus-within\s*\{[\s\S]*?border-color:\s*var\(--primary\);/);
        });

        test('Debe adaptarse ergonómicamente a celulares (<= 768px) con altura de 46px y cápsula', () => {
            expect(adminCss).toMatch(/@media\s*\(max-width:\s*768px\)[\s\S]*?\.search-bar-container\s*\{[\s\S]*?height:\s*46px;[\s\S]*?min-height:\s*46px;[\s\S]*?border-radius:\s*30px;/);
        });
    });

    describe('Aislamiento de la Modal de Registro (Join Modal)', () => {
        test('injectModalHTML en uiManager.js debe incluir display: none inline defensivo', () => {
            expect(uiManagerJs).toContain('class="auth-prompt-modal" style="display: none;"');
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

        test('dashboard.css debe estilizar .kpi-card y .chart-card consumiendo var(--card-bg)', () => {
            expect(dashboardCss).toMatch(/\.kpi-card\s*\{[\s\S]*?background:\s*var\(--card-bg\);/);
            expect(dashboardCss).toMatch(/\.chart-card\s*\{[\s\S]*?background:\s*var\(--card-bg\);/);
        });

        test('dashboard.css debe definir clases semánticas para variantes de KPI (.kpi-card-warning y .kpi-card-live)', () => {
            expect(dashboardCss).toContain('.kpi-card.kpi-card-warning');
            expect(dashboardCss).toContain('.kpi-card.kpi-card-live');
            expect(dashboardCss).toContain('var(--danger-bg)');
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
