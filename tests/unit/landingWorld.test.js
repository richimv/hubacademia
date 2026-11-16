/**
 * landingWorld.test.js
 * Pruebas unitarias para la matemática del escenario WebGL (world-math.js)
 * y contratos visuales/estructurales de la portada Dark Cinema y tema neutro.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadWorldMathModule() {
    const filePath = path.join(__dirname, '../../src/presentation/public/js/landing/world-math.js');
    const raw = fs.readFileSync(filePath, 'utf8');
    const cjsCode = raw.replace(/^export\s+(?=(const|function)\b)/gm, '');
    const wrapped = `(function() {\n${cjsCode}\nreturn { WORLD_SEED, WORLD_MODES, CHAPTER_DEFS, clamp, lerp, computeSafeDpr, computeChapterState, buildPerspectiveMatrix, buildModelViewMatrix, buildObservatoryGeometry };\n})();`;
    return vm.runInNewContext(wrapped, { Object, Math, Float32Array, Set, Number, Array });
}

describe('Landing Applied AI WebGL World Math & Contracts', () => {
    const mathMod = loadWorldMathModule();
    const publicDir = path.join(__dirname, '../../src/presentation/public');

    test('computeSafeDpr aplica límites seguros para móvil (1.25) y escritorio (1.75)', () => {
        expect(mathMod.computeSafeDpr(3, 390)).toBe(1.25);
        expect(mathMod.computeSafeDpr(2, 640)).toBe(1.25);
        expect(mathMod.computeSafeDpr(3, 1440)).toBe(1.75);
        expect(mathMod.computeSafeDpr(1.5, 1440)).toBe(1.5);
        expect(mathMod.computeSafeDpr(NaN, 1280)).toBe(1);
        expect(mathMod.computeSafeDpr(-2, 1280)).toBe(1);
    });

    test('computeChapterState interpola capítulos S01-S06 sin NaN y centra el rig en móvil', () => {
        const tops = [0, 1350, 2250, 3150, 4050, 4950];

        const heroDesktop = mathMod.computeChapterState(0, 1440, 900, tops, 1350);
        expect(heroDesktop.activeIndex).toBe(0);
        expect(heroDesktop.activeChapter.code).toBe('01');
        expect(heroDesktop.centerX).toBeCloseTo(0.70, 2);

        const heroScrolledDesktop = mathMod.computeChapterState(600, 1440, 900, tops, 1350);
        expect(heroScrolledDesktop.activeIndex).toBe(0);
        expect(heroScrolledDesktop.heroProgress).toBeGreaterThan(0.5);
        expect(heroScrolledDesktop.zoom).toBeGreaterThan(heroDesktop.zoom);

        const boletinDesktop = mathMod.computeChapterState(3000, 1440, 900, tops, 1350);
        expect(boletinDesktop.activeIndex).toBe(3);
        expect(boletinDesktop.activeChapter.id).toBe('boletin-section');

        const heroMobile = mathMod.computeChapterState(0, 390, 844, tops, 800);
        expect(heroMobile.activeIndex).toBe(0);
        expect(heroMobile.centerX).toBe(0.5);
        expect(heroMobile.centerY).toBe(0.72);
        expect(Number.isFinite(heroMobile.camZ)).toBe(true);
        expect(Number.isFinite(heroMobile.opacity)).toBe(true);
    });

    test('buildPerspectiveMatrix y buildModelViewMatrix generan matrices 4x4 válidas y finitas', () => {
        const proj = mathMod.buildPerspectiveMatrix(0.76, 16 / 9, 0.1, 45.0);
        expect(proj).toBeInstanceOf(Float32Array);
        expect(proj).toHaveLength(16);
        expect([...proj].every(Number.isFinite)).toBe(true);

        const zeroAspectProj = mathMod.buildPerspectiveMatrix(0.76, 0, 0.1, 45.0);
        expect([...zeroAspectProj].every(Number.isFinite)).toBe(true);

        const mv = mathMod.buildModelViewMatrix(0.4, -0.2, 0.75, 0.0, -5.0);
        expect(mv).toBeInstanceOf(Float32Array);
        expect(mv).toHaveLength(16);
        expect(mv[14]).toBe(-5);
        expect([...mv].every(Number.isFinite)).toBe(true);
    });

    test('buildObservatoryGeometry genera buffers 3D deterministas de líneas y partículas', () => {
        const first = mathMod.buildObservatoryGeometry(240);
        const second = mathMod.buildObservatoryGeometry(240);

        expect(first.lineVertexCount).toBeGreaterThan(20);
        expect(first.linePositions).toHaveLength(first.lineVertexCount * 3);
        expect(first.lineIntensities).toHaveLength(first.lineVertexCount);
        expect(first.pointCount).toBe(240);
        expect(first.pointPositions).toHaveLength(240 * 3);
        expect(first.pointMeta).toHaveLength(240 * 2);
        expect([...first.linePositions].every(Number.isFinite)).toBe(true);
        expect([...first.pointPositions].every(Number.isFinite)).toBe(true);
        expect(Buffer.from(first.pointPositions.buffer).equals(Buffer.from(second.pointPositions.buffer))).toBe(true);
    });

    test('index.html bloquea Dark Cinema, integra el núcleo WebGL sin HUD redundante ni fuga interna', () => {
        const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
        const mediaConfig = fs.readFileSync(path.join(publicDir, 'js/landing/media-config.js'), 'utf8');
        const landingEntry = fs.readFileSync(path.join(publicDir, 'js/landing-home.js'), 'utf8');

        expect(html).toContain('<html lang="es" data-theme="dark" data-theme-locked="dark">');
        expect(html).not.toContain('id="theme-toggle-btn"');
        expect(html).not.toContain('id="chapter-rail"');
        expect(html).not.toContain('VERTEX AI');
        expect(html).toContain('id="landing-webgl-stage"');
        expect(html).toContain('data-motion-toggle');
        expect(html).toContain('id="tools-live-stage"');
        expect(html).toContain('id="inicial-demo"');
        expect(html).toContain('id="vision-dial-word"');
        expect(html).toContain('"@type":"Organization"');

        expect(mediaConfig).toMatch(/hero:\s*\{[\s\S]*?enabled:\s*false/);
        expect(landingEntry).toMatch(/['"]\.\/landing\/world\.js\?v=[^'"]+['"]/);
    });

    test('theme.css mantiene superficies oscuras neutras sin fondos azules en modo oscuro', () => {
        const themeCss = fs.readFileSync(path.join(publicDir, 'css/theme.css'), 'utf8');
        expect(themeCss).toContain('--bg-main: #050507;');
        expect(themeCss).toContain('--bg-secondary: #0d0d10;');
        expect(themeCss).toContain('--bg-tertiary: #141418;');
    });

    test('world.js alinea precisión GLSL de uniforms compartidos e inicializa variables de bucle antes de listeners', () => {
        const worldSrc = fs.readFileSync(path.join(publicDir, 'js/landing/world.js'), 'utf8');
        const pointModeMatches = worldSrc.match(/uniform mediump float uPointMode;/g) || [];
        expect(pointModeMatches).toHaveLength(2);
        expect(worldSrc.indexOf('let tickerFn')).toBeGreaterThan(-1);
        expect(worldSrc.indexOf('let tickerFn')).toBeLessThan(worldSrc.indexOf('motionButtons.forEach'));
    });

    test('world.js e index.html usan textura equirectangular 2:1 planetaria y fallback coherente sin flash', () => {
        const worldSrc = fs.readFileSync(path.join(publicDir, 'js/landing/world.js'), 'utf8');
        const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

        expect(fs.existsSync(path.join(publicDir, 'assets/landing/textures/astrolabe-equirect-2048.webp'))).toBe(true);
        expect(fs.existsSync(path.join(publicDir, 'assets/landing/images/v6/hero-planet-desktop-1376.webp'))).toBe(true);
        expect(fs.existsSync(path.join(publicDir, 'assets/landing/images/v6/hero-planet-mobile-768.webp'))).toBe(true);

        expect(worldSrc).toContain('astrolabe-equirect-2048.webp');
        expect(worldSrc).toContain('uniform sampler2D uSphereTex;');
        expect(worldSrc).not.toContain('uBackdropTex');
        expect(worldSrc).not.toContain('gridLon');
        expect(html).toContain('hero-planet-desktop-1376.webp');
        expect(html).toContain('hero-planet-mobile-768.webp');
    });
});
