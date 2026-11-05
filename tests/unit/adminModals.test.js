const fs = require('fs');
const path = require('path');

describe('Admin Panel - Modales Responsivas y Contraste Dual-Theme', () => {
    let adminCss;
    let adminJs;
    let adminHtml;

    beforeAll(() => {
        adminCss = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/admin.css'), 'utf8');
        adminJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/admin.js'), 'utf8');
        adminHtml = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/admin.html'), 'utf8');
    });

    describe('1. Cumplimiento de Design System y Dual-Theme en Modales', () => {
        test('admin.css no debe contener el background oscuro hardcodeado (#0f0f13) en .modal-content', () => {
            // El background #0f0f13 rompía el modo claro forzando fondos oscuros
            const modalContentBlocks = adminCss.match(/\.modal-content\s*\{[^}]*\}/g) || [];
            for (const block of modalContentBlocks) {
                expect(block).not.toContain('#0f0f13');
            }
        });

        test("modal.css es el propietario único de la superficie de los diálogos", () => {
            const modalCss = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/modal.css'), 'utf8');
            const surface = modalCss.match(/\.modal-content,\s*\.modal-card\s*\{([^}]+)\}/)[1];
            expect(surface).toMatch(/background:\s*var\(--modal-bg\)/);
            expect(surface).toMatch(/border:\s*1px solid var\(--border-color\)/);
            expect(surface).toMatch(/box-shadow:\s*var\(--shadow-xl\)/);
            expect(adminCss).not.toMatch(/\.modal-content\s*\{[^}]*background:/);
        });

        test("Header y body controlan su espaciado sin padding global forzado", () => {
            const modalCss = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/modal.css'), 'utf8');
            const surface = modalCss.match(/\.modal-content,\s*\.modal-card\s*\{([^}]+)\}/)[1];
            expect(surface).not.toMatch(/padding:/);
            expect(modalCss).toMatch(/\.modal-header\s*\{[^}]*padding:/);
            expect(modalCss).toMatch(/\.modal-body\s*\{[^}]*padding:/);
        });

        test("Subcontenedores y chips consumen superficies y textos de ambos temas", () => {
            expect(adminCss).toMatch(/\.import-method-card\s*\{[^}]*background:\s*var\(--bg-tertiary\)/);
            expect(adminCss).toMatch(/\.image-upload-group\s*\{[^}]*background:\s*var\(--bg-tertiary\)/);
            expect(adminCss).toMatch(/\.selected-chip\s*\{[^}]*background:\s*var\(--bg-tertiary\)/);
            expect(adminCss).toMatch(/\.selected-chip\s*\{[^}]*color:\s*var\(--text-main\)/);
        });

        test('No deben existir variables CSS huérfanas en admin.css ni admin.js', () => {
            expect(adminCss).not.toContain('--danger-color');
            expect(adminCss).not.toContain('--accent-color');
            expect(adminJs).not.toContain('--danger-color');
        });
    });

    describe('2. Responsividad Móvil (≤ 768px y ≤ 480px) y Adaptabilidad de Ancho', () => {
        test("El editor mantiene margen horizontal y altura segura en móvil", () => {
            expect(adminCss).toMatch(/@media\s*\(max-width:\s*768px\)[\s\S]*?#generic-modal\s+\.modal-content\s*\{[^}]*width:\s*calc\(100vw\s*-\s*24px\)/);
            expect(adminCss).toMatch(/#generic-modal\s+\.modal-content\s*\{[^}]*max-height:\s*calc\(100dvh\s*-\s*24px\)/);
        });

        test("Los diálogos compartidos reservan márgenes en pantallas compactas", () => {
            const modalCss = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/modal.css'), 'utf8');
            expect(modalCss).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*?\.modal-overlay[^{]*\{[^}]*padding:\s*12px/);
            expect(modalCss).toMatch(/\.modal-content,\s*\.modal-card\s*\{[^}]*width:\s*min\(560px,\s*100%\)/);
        });

        test("El formulario usa una sola columna semántica hasta 640px", () => {
            expect(adminCss).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*?\.admin-form-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
            expect(adminCss).not.toContain('div[style*="grid-template-columns"]');
        });

        test('Acciones de subida de imágenes (.image-upload-actions) hacen flex-wrap en pantallas móviles', () => {
            expect(adminCss).toMatch(/\.image-upload-actions\s*\{[\s\S]*?flex-wrap:\s*wrap/);
        });

        test("El ancho del editor pertenece al CSS y reacciona al viewport", () => {
            expect(adminJs).not.toContain('modalContent.style.width');
            expect(adminJs).not.toContain('modalContent.style.maxWidth');
            expect(adminCss).toMatch(/#generic-modal\s+\.modal-content\s*\{[^}]*width:/);
        });

        test("El editor define dimensiones adaptables antes de abrirse", () => {
            expect(adminCss).toMatch(/#generic-modal\s+\.modal-content\s*\{[^}]*max-width:\s*1100px/);
            expect(adminCss).toMatch(/#generic-modal\s+\.modal-content\s*\{[^}]*width:\s*min\(1100px,\s*calc\(100vw\s*-\s*32px\)\)/);
        });

        test("El controlador abre el editor sin imponer geometría inline", () => {
            expect(adminJs).toContain("this.genericModal.style.display = 'flex';");
            expect(adminJs).not.toContain('modalContent.style.maxHeight');
            expect(adminHtml).toMatch(/href="\/css\/modal\.css/);
        });
    });

    describe('3. Integración de TinyMCE Editor con Dual-Theme Dinámico', () => {
        test('getStandardTinyMCEConfig detecta data-theme y aplica skins/colores acordes a Light y Dark mode', () => {
            expect(adminJs).toContain("const isDark = document.documentElement.getAttribute('data-theme') !== 'light';");
            expect(adminJs).toContain("skin: isDark ? 'oxide-dark' : 'oxide'");
            expect(adminJs).toContain("content_css: isDark ? 'dark' : 'default'");
            expect(adminJs).toContain("const bodyTextColor = isDark ? '#f8fafc' : '#0f172a';");
            expect(adminJs).toContain("const bodyBgColor = isDark ? '#121212' : '#ffffff';");
        });
    });

    describe('4. Estructura y Clases del Modal de Confirmación en admin.html', () => {
        test('admin.html incluye la estructura completa de confirmation-modal-card con contraste y diseño accesible', () => {
            expect(adminHtml).toContain('id="confirmation-modal"');
            expect(adminHtml).toContain('confirmation-modal-card');
            expect(adminHtml).toContain('confirmation-modal-header');
            expect(adminHtml).toContain('confirmation-title-wrap');
            expect(adminHtml).toContain('confirmation-modal-icon-container');
            expect(adminHtml).toContain('confirmation-modal-body');
            expect(adminHtml).toContain('confirmation-modal-footer');
        });
    });
});
