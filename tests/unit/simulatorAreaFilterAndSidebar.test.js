const fs = require('fs');
const path = require('path');

describe('Simulador & Sidebar - Truncado de Áreas Extensas y Scrollbar Cross-Browser', () => {
    let simCss;
    let simJs;
    let sidebarCss;

    beforeAll(() => {
        simCss = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/simulator-dashboard.css'), 'utf8');
        simJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/simulator-dash.js'), 'utf8');
        sidebarCss = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/sidebar.css'), 'utf8');
    });

    describe('1. Truncado Elíptico de Áreas Pedagógicas Extensas en Hero Card', () => {
        test('simulator-dashboard.css define .config-summary-pill--area con elipsis y max-width', () => {
            expect(simCss).toContain('.config-summary-pill--area');
            expect(simCss).toMatch(/\.config-summary-pill--area\s*\{[^}]*max-width:\s*210px/);
            expect(simCss).toMatch(/\.config-summary-pill--area\s*\{[^}]*text-overflow:\s*ellipsis/);
            expect(simCss).toMatch(/\.config-summary-pill--area\s*\{[^}]*overflow:\s*hidden/);
            expect(simCss).toMatch(/\.config-summary-pill--area\s*\{[^}]*white-space:\s*nowrap/);
        });

        test('Media query móvil ajusta max-width compacto para .config-summary-pill--area', () => {
            expect(simCss).toMatch(/@media[^{]*max-width:\s*768px[\s\S]*?\.config-summary-pill--area\s*\{[^}]*max-width:\s*140px/);
        });

        test('simulator-dash.js inyecta la clase config-summary-pill--area y el atributo title accesible', () => {
            expect(simJs).toContain('config-summary-pill--area');
            expect(simJs).toContain('title="${escapeAttr(infoText)}"');
            expect(simJs).toContain('escapeAttr');
        });
    });

    describe('2. Scrollbar Cross-Browser y Limpieza Visual en Sidebar Global', () => {
        test('sidebar.css implementa scrollbar-width y scrollbar-color modernos para Firefox y navegadores estándar', () => {
            expect(sidebarCss).toMatch(/\.sidebar-menu\s*\{[\s\S]*?scrollbar-width:\s*thin/);
            expect(sidebarCss).toMatch(/\.sidebar-menu\s*\{[\s\S]*?scrollbar-color:/);
        });

        test('sidebar.css estiliza webkit-scrollbar-track y thumb sutil para WebKit/Blink (Chrome, Edge)', () => {
            expect(sidebarCss).toContain('.sidebar-menu::-webkit-scrollbar-track');
            expect(sidebarCss).toContain('.sidebar-menu::-webkit-scrollbar-thumb');
            expect(sidebarCss).toMatch(/\.sidebar-menu::-webkit-scrollbar\s*\{[^}]*width:\s*4px/);
        });
    });
});
