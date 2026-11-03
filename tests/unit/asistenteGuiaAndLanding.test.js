const fs = require('fs');
const path = require('path');
const asistenteGuiaKnowledge = require('../../src/domain/services/asistenteGuiaKnowledge');
const {
    LIVE_CASES,
    TUTOR_DEMO_CASES,
    initLiveEvaluator,
    initToolsWorkbench,
    initToolsAccordion,
    initTutorDemo
} = require('../../src/presentation/public/js/home-animations');

describe('Fase 5: Asistente Guía Corporativo, Portada Hub Academia y Health CSS', () => {
    const publicDir = path.join(__dirname, '../../src/presentation/public');
    const cssDir = path.join(publicDir, 'css');

    describe('1. Base de Conocimiento Estática (asistenteGuiaKnowledge.js)', () => {
        test('expone píldoras limpias para visitantes (4) y registrados (3) sin emojis innecesarios', () => {
            const visitorPills = asistenteGuiaKnowledge.getVisitorPills();
            const registeredPills = asistenteGuiaKnowledge.getRegisteredPills();

            expect(visitorPills).toHaveLength(4);
            expect(registeredPills).toHaveLength(3);
            expect(visitorPills[0]).toContain('Herramientas');
            expect(visitorPills[1]).toContain('Mercado Pago');
        });

        test('presenta el ecosistema completo con prioridad en Educación e incluye docentes.hubacademia.com', () => {
            const servicios = asistenteGuiaKnowledge.matchIntent('1');
            expect(servicios.intencion).toBe('informacion_servicios');
            expect(servicios.respuesta).toContain('https://docentes.hubacademia.com/');
            expect(servicios.respuesta).toContain('/simulator-dashboard?context=EDUCACION');
            expect(servicios.respuesta).toContain('/repaso');
            expect(servicios.respuesta).toContain('/library');
            expect(servicios.respuesta).not.toMatch(/wa\.me|whatsapp|yape|plin/i);
        });

        test('informa planes S/ 9.90 y S/ 24.90 con pago único exclusivo vía Mercado Pago', () => {
            const precios = asistenteGuiaKnowledge.matchIntent('cuanto cuesta mercado pago');
            expect(precios.intencion).toBe('informacion_precios');
            expect(precios.respuesta).toContain('S/ 9.90');
            expect(precios.respuesta).toContain('S/ 24.90');
            expect(precios.respuesta).toContain('Mercado Pago');
            expect(precios.respuesta).not.toMatch(/wa\.me|whatsapp|yape|plin|993869166/i);
        });

        test('reconoce consultas sobre Educación Inicial, Notas, ventajas e ingresos inválidos', () => {
            expect(asistenteGuiaKnowledge.matchIntent('plataforma de educacion inicial').intencion).toBe('informacion_servicios');
            expect(asistenteGuiaKnowledge.matchIntent('mis notas de repaso').intencion).toBe('informacion_servicios');
            expect(asistenteGuiaKnowledge.matchIntent('por que elegir hub academia minedu').intencion).toBe('informacion_ventajas');
            expect(asistenteGuiaKnowledge.matchIntent('como crear cuenta con google').intencion).toBe('informacion_acceso');
            expect(asistenteGuiaKnowledge.matchIntent('texto aleatorio sin coincidencia xyz').intencion).toBe('opcion_invalida');
        });
    });

    describe('2. Estructura Corporativa y Restricciones de Alcance en index.html', () => {
        let indexHtml;

        beforeAll(() => {
            indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
        });

        test('presenta las cuatro herramientas activas (Docentes Inicial, Simuladores, Repaso y Notas, Biblioteca)', () => {
            expect(indexHtml).toContain('https://docentes.hubacademia.com/');
            expect(indexHtml).toContain('/simulator-dashboard?context=EDUCACION');
            expect(indexHtml).toContain('/simulator-dashboard?context=MEDICINA');
            expect(indexHtml).toContain('/repaso');
            expect(indexHtml).toContain('/library');
            expect(indexHtml).toContain('id="live-casuistica"');
            expect(indexHtml).toContain('id="tools-live-stage"');
            expect(indexHtml).toContain('id="tutor-live-demo"');
        });

        test('define tema oscuro institucional con theme-color #050505 y tipografía Inter', () => {
            expect(indexHtml).toContain('<meta name="theme-color" content="#050505">');
            expect(indexHtml).toContain('family=Inter');
            expect(indexHtml).not.toContain('family=Epilogue');
            expect(indexHtml).toContain('/css/footer.css');
        });

        test('NO muestra herramientas futuras prohibidas en la interfaz (PCA, Unidades, Sesiones, Rúbricas)', () => {
            expect(indexHtml).not.toMatch(/Planificación Curricular Anual/i);
            expect(indexHtml).not.toMatch(/Programación Curricular Anual/i);
            expect(indexHtml).not.toMatch(/Unidades y Proyectos de Aprendizaje/i);
            expect(indexHtml).not.toMatch(/Diseño de Sesiones de Aprendizaje/i);
            expect(indexHtml).not.toMatch(/Creador de Sesiones/i);
            expect(indexHtml).not.toMatch(/Generador de Rúbricas/i);
        });

        test('elimina métricas ficticias legacy (1K+, 5K+, 98%) y flujos de WhatsApp', () => {
            expect(indexHtml).not.toContain('1K+');
            expect(indexHtml).not.toContain('5K+');
            expect(indexHtml).not.toMatch(/wa\.me|whatsapp|yape|plin|993869166/i);
        });
    });

    describe('3. Salud de Código y Centralización CSS (code-health-rules.md & DESIGN_SYSTEM.md)', () => {
        test('verifica eliminación de stylesheets muertos y duplicados', () => {
            expect(fs.existsSync(path.join(cssDir, 'hero.css'))).toBe(false);
            expect(fs.existsSync(path.join(cssDir, 'modules.css'))).toBe(false);
            expect(fs.existsSync(path.join(cssDir, 'privacy.css'))).toBe(false);
            expect(fs.existsSync(path.join(cssDir, 'terms.css'))).toBe(false);

            expect(fs.existsSync(path.join(cssDir, 'legal.css'))).toBe(true);
            expect(fs.existsSync(path.join(cssDir, 'footer.css'))).toBe(true);
        });

        test('landing.css prohíbe superficies azuladas en tema oscuro y aplica escala Matte Black', () => {
            const landingCss = fs.readFileSync(path.join(cssDir, 'landing.css'), 'utf8');

            // Asegura que no se usen fondos navy/azules prohibidos
            expect(landingCss).not.toMatch(/--land-bg-a:\s*#(?:0b1120|131c2e|192438|0f172a|060911)/i);
            expect(landingCss).not.toMatch(/--land-surface:\s*#(?:0b1120|131c2e|192438|0f172a)/i);

            // Asegura presencia de tokens institucionales Matte Black
            expect(landingCss).toContain('#050505');
            expect(landingCss).toContain('#0c0c0c');
            expect(landingCss).toContain('#121212');
            expect(landingCss).toContain("'Inter'");
        });
    });

    describe('4. Componentes Interactivos en home-animations.js', () => {
        test('contiene casuística oficial curada para EDUCACION y SALUD con retroalimentación normativa', () => {
            expect(LIVE_CASES.EDUCACION).toBeDefined();
            expect(LIVE_CASES.SALUD).toBeDefined();
            expect(LIVE_CASES.EDUCACION.options).toHaveLength(3);
            expect(LIVE_CASES.SALUD.options).toHaveLength(3);
            expect(typeof initLiveEvaluator).toBe('function');
        });

        test('exporta gestor de mesa de trabajo de herramientas y casos de diálogo tutor', () => {
            expect(TUTOR_DEMO_CASES.CNEB).toBeDefined();
            expect(TUTOR_DEMO_CASES.MINSA).toBeDefined();
            expect(typeof initToolsWorkbench).toBe('function');
            expect(typeof initToolsAccordion).toBe('function');
            expect(typeof initTutorDemo).toBe('function');
        });
    });
});
