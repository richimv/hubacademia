/**
 * hubiAvatar.test.js
 * Pruebas unitarias para el rig SVG animado de Hubi (hubiAvatar.js)
 * y su integración en chat.js, chat.css y páginas públicas.
 */
const fs = require('fs');
const path = require('path');

describe('Hubi SVG Rigged Avatar & Chat Integration', () => {
    const publicDir = path.join(__dirname, '../../src/presentation/public');
    let HubiAvatar;

    function createMockWrapper() {
        const gazeEl = { style: {} };
        const eyesEl = {
            animate: jest.fn(),
            classList: { add: jest.fn(), remove: jest.fn() }
        };
        return {
            className: '',
            dataset: {},
            innerHTML: '',
            getBoundingClientRect: () => ({ left: 1000, top: 800, width: 64, height: 64 }),
            querySelector: (selector) => {
                if (selector === '.hubi-eyes-open') return eyesEl;
                if (selector === '.hubi-gaze') return gazeEl;
                return null;
            },
            _gazeEl: gazeEl,
            _eyesEl: eyesEl
        };
    }

    beforeEach(() => {
        jest.useFakeTimers();
        const mockWrapper = createMockWrapper();
        global.window = {
            matchMedia: jest.fn(() => ({ matches: false })),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };
        global.document = {
            hidden: false,
            documentElement: { dataset: { reduceMotion: 'false' } },
            createElement: jest.fn(() => mockWrapper),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };

        jest.isolateModules(() => {
            HubiAvatar = require('../../src/presentation/public/js/ui/hubiAvatar');
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('buildMarkup genera capas anatómicas completas e IDs únicos por instancia sin íconos de robot', () => {
        const launcherSvg = HubiAvatar.buildMarkup('hubi-1', 'launcher');
        const headerSvg = HubiAvatar.buildMarkup('hubi-2', 'header');

        expect(launcherSvg).toContain('id="hubi-1-body"');
        expect(headerSvg).toContain('id="hubi-2-body"');
        expect(launcherSvg).toContain('aria-hidden="true"');
        expect(launcherSvg).toContain('hubi-wings-front');
        expect(launcherSvg).toContain('hubi-antenna--left');
        expect(launcherSvg).toContain('hubi-eyes-open');
        expect(launcherSvg).toContain('hubi-eyes-happy');
        expect(launcherSvg).toContain('hubi-orbit-front');
        expect(launcherSvg).not.toContain('fa-robot');
    });

    test('mountHubiAvatar gestiona estados (idle, hover, invited, thinking, reply) y limpia recursos en destroy()', () => {
        const host = { replaceChildren: jest.fn() };
        const instance = HubiAvatar.mountHubiAvatar(host, { variant: 'launcher' });

        expect(host.replaceChildren).toHaveBeenCalledTimes(1);
        expect(instance.getState()).toBe('idle');

        instance.setState('hover');
        expect(instance.getState()).toBe('hover');
        expect(instance.element.dataset.hubiState).toBe('hover');

        instance.setState('thinking');
        expect(instance.getState()).toBe('thinking');

        instance.setState('estado-invalido');
        expect(instance.getState()).toBe('idle');

        instance.flashReply(1200);
        expect(instance.getState()).toBe('reply');
        jest.advanceTimersByTime(1250);
        expect(instance.getState()).toBe('idle');

        instance.destroy();
        instance.setState('hover');
        expect(instance.getState()).toBe('idle');
        expect(global.window.removeEventListener).toHaveBeenCalled();
        expect(global.document.removeEventListener).toHaveBeenCalled();
    });

    test('respeta prefers-reduced-motion y dataset.reduceMotion sin ejecutar parpadeos automáticos', () => {
        global.document.documentElement.dataset.reduceMotion = 'true';
        const host = { replaceChildren: jest.fn() };
        const instance = HubiAvatar.mountHubiAvatar(host, { variant: 'launcher' });

        jest.advanceTimersByTime(10000);
        expect(instance.element._eyesEl.animate).not.toHaveBeenCalled();
        instance.destroy();
    });

    test('chat.js, chat.css y páginas HTML integran hubiAvatar.js antes de chat.js con soporte reduced-motion', () => {
        const chatJs = fs.readFileSync(path.join(publicDir, 'js/chat.js'), 'utf8');
        const chatCss = fs.readFileSync(path.join(publicDir, 'css/chat.css'), 'utf8');

        expect(chatJs).toContain('mountHubiAvatars');
        expect(chatJs).toContain("setState('thinking')");
        expect(chatJs).toContain('flashReply(1500)');
        expect(chatCss).toContain('.hubi-rig');
        expect(chatCss).toContain('@media (prefers-reduced-motion: reduce)');
        expect(chatCss).toContain('html[data-reduce-motion="true"]');

        for (const page of ['index.html', 'library.html', 'course.html', 'resource.html']) {
            const html = fs.readFileSync(path.join(publicDir, page), 'utf8');
            const avatarIdx = html.indexOf('/js/ui/hubiAvatar.js');
            const chatIdx = html.indexOf('/js/chat.js');
            expect(avatarIdx).toBeGreaterThan(-1);
            expect(chatIdx).toBeGreaterThan(avatarIdx);
        }
    });
});
