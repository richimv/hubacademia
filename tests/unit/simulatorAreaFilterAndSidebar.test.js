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

        test('sidebar.css mantiene scrollbar invisible por defecto para estética limpia pero funcional', () => {
            expect(sidebarCss).toMatch(/\.sidebar-menu\s*\{[\s\S]*?scrollbar-color:\s*transparent\s+transparent/);
            expect(sidebarCss).toMatch(/\.sidebar-menu::-webkit-scrollbar-thumb\s*\{[\s\S]*?background:\s*transparent/);
        });

        test('sidebar.css muestra scrollbar sutilmente SOLO en hover cuando el menú está desplegado', () => {
            expect(sidebarCss).toContain('body:not(.sidebar-collapsed) .global-sidebar:hover .sidebar-menu');
            expect(sidebarCss).toContain('body:not(.sidebar-collapsed) .sidebar-menu:hover');
            expect(sidebarCss).toMatch(/body:not\(\.sidebar-collapsed\)[^{]*\.sidebar-menu:hover\s*\{[\s\S]*?scrollbar-color:/);
        });

        test('sidebar.css desactiva y oculta el scrollbar por completo cuando el menú está plegado', () => {
            expect(sidebarCss).toMatch(/body\.sidebar-collapsed\s+\.sidebar-menu\s*\{[\s\S]*?scrollbar-width:\s*none\s*!important/);
            expect(sidebarCss).toMatch(/body\.sidebar-collapsed\s+\.sidebar-menu::-webkit-scrollbar\s*\{[\s\S]*?display:\s*none\s*!important/);
        });
});
