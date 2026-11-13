/**
 * Unit tests for UIManager Paywall, Freemium Status Bar & Welcome Modal
 * Executes the real UIManager class from src/presentation/public/js/ui/uiManager.js
 */

const { UIManager } = require('../../src/presentation/public/js/ui/uiManager');

function createClassList() {
    const set = new Set();
    return {
        add: jest.fn((...cls) => cls.forEach(c => set.add(c))),
        remove: jest.fn((...cls) => cls.forEach(c => set.delete(c))),
        contains: jest.fn((c) => set.has(c)),
        toggle: jest.fn((c, force) => {
            if (force === undefined) {
                if (set.has(c)) { set.delete(c); return false; }
                set.add(c); return true;
            }
            if (force) set.add(c);
            else set.delete(c);
            return force;
        })
    };
}

function createDomEl(id = '') {
    return {
        id,
        hidden: false,
        className: '',
        textContent: '',
        innerText: '',
        innerHTML: '',
        href: '',
        title: '',
        onclick: null,
        style: { display: '' },
        classList: createClassList(),
        setAttribute: jest.fn(),
        addEventListener: jest.fn(),
        appendChild: jest.fn(),
        append: jest.fn(),
        focus: jest.fn(),
        remove: jest.fn(),
        querySelector: jest.fn(() => createDomEl()),
        closest: jest.fn(() => null)
    };
}

function createDomEnvironment(pathname = '/dashboard') {
    const byId = new Map();
    const localStore = new Map();

    // Pre-register status-pill & freemium bar sub-elements cleanly when injected
    const makeBarEl = () => {
        const bar = createDomEl('freemium-status-bar');
        const upgradeBtn = createDomEl();
        const labelSpan = createDomEl();
        bar.querySelector = jest.fn((sel) => {
            if (sel === '.upgrade-btn-small') return upgradeBtn;
            if (sel === '.usage-label-text') return labelSpan;
            return null;
        });
        bar._upgradeBtn = upgradeBtn;
        bar._labelSpan = labelSpan;
        return bar;
    };

    const registerHtmlIds = (html) => {
        if (html.includes('id="freemium-status-bar"') && !byId.has('freemium-status-bar')) {
            byId.set('freemium-status-bar', makeBarEl());
            const pill = createDomEl('usage-pill');
            const countSpan = createDomEl('free-usage-count');
            countSpan.closest = jest.fn((sel) => (sel === '.usage-pill' ? pill : null));
            countSpan._pill = pill;
            byId.set('free-usage-count', countSpan);
            byId.set('freemium-toast', createDomEl('freemium-toast'));
            byId.set('freemium-toast-msg', createDomEl('freemium-toast-msg'));
        }
        if (html.includes('id="paywall-modal"') && !byId.has('paywall-modal')) {
            const modal = createDomEl('paywall-modal');
            modal.innerHTML = html;
            byId.set('paywall-modal', modal);
            for (const suffix of ['title', 'text', 'badge-text', 'badge-icon', 'btn', 'btn-text', 'secondary-btn', 'features']) {
                const subId = `paywall-modal-${suffix}`;
                if (!byId.has(subId)) byId.set(subId, createDomEl(subId));
            }
        }
        for (const knownId of ['status-pill-container', 'status-pill', 'status-text', 'auth-prompt-modal', 'video-player-modal', 'media-viewer-modal']) {
            if (html.includes(`id="${knownId}"`) && !byId.has(knownId)) {
                byId.set(knownId, createDomEl(knownId));
            }
        }
    };

    const body = createDomEl('body');
    body.insertAdjacentHTML = jest.fn((_pos, html) => registerHtmlIds(html));
    body.appendChild = jest.fn((node) => {
        if (node && node.id) byId.set(node.id, node);
        if (node && node.innerHTML) registerHtmlIds(node.innerHTML);
        return node;
    });
    body.append = jest.fn((node) => {
        if (node && node.id) byId.set(node.id, node);
        if (node && node.innerHTML) registerHtmlIds(node.innerHTML);
    });

    const head = createDomEl('head');

    global.document = {
        readyState: 'complete',
        head,
        body,
        querySelector: jest.fn(() => null),
        addEventListener: jest.fn(),
        getElementById: jest.fn((id) => byId.get(id) || null),
        createElement: jest.fn(() => createDomEl())
    };

    global.navigator = { onLine: true };
    global.requestAnimationFrame = jest.fn((cb) => cb());
    global.localStorage = {
        getItem: jest.fn((k) => (localStore.has(k) ? localStore.get(k) : null)),
        setItem: jest.fn((k, v) => localStore.set(k, String(v))),
        removeItem: jest.fn((k) => localStore.delete(k)),
        _store: localStore
    };
    global.window = {
        location: { pathname, search: '', href: `https://www.hubacademia.com${pathname}` },
        history: { state: null, pushState: jest.fn(), replaceState: jest.fn() },
        addEventListener: jest.fn(),
        sessionManager: { getUser: jest.fn(() => null) }
    };

    return { byId, body, localStore };
}

describe('UIManager Paywall, Freemium Status & Welcome Modal (Real Class)', () => {
    let uiManager;
    let domEnv;

    beforeEach(() => {
        jest.useFakeTimers();
        domEnv = createDomEnvironment('/dashboard');
        uiManager = new UIManager();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    describe('validateFreemiumAction & showPaywallModal', () => {
        test('blocks FREE user with 0 lives on Extraer Insights (diagnostic) and opens paywall modal', () => {
            global.window.sessionManager.getUser.mockReturnValue({
                subscriptionTier: 'free',
                usageCount: 10,
                maxFreeLimit: 10
            });
            const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() };

            const allowed = uiManager.validateFreemiumAction(event, 'diagnostic');

            expect(allowed).toBe(false);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(uiManager.openModals.has('paywall-modal')).toBe(true);
            const modalHtml = domEnv.byId.get('paywall-modal').innerHTML;
            expect(modalHtml).toContain('Desbloquea');
            expect(modalHtml).toContain('Has consumido tus 10 vidas de prueba gratuitas');
            expect(modalHtml).toContain('Ver Planes Premium');
        });

        test('allows FREE user with remaining lives (4/10 and last life 9/10, including numeric strings)', () => {
            for (const user of [
                { subscriptionTier: 'free', usageCount: 4, maxFreeLimit: 10 },
                { subscriptionTier: 'free', usageCount: 9, maxFreeLimit: 10 },
                { subscriptionTier: 'free', usageCount: '9', maxFreeLimit: '10' }
            ]) {
                global.window.sessionManager.getUser.mockReturnValue(user);
                expect(uiManager.validateFreemiumAction(null, 'flashcards')).toBe(true);
                expect(uiManager.openModals.has('paywall-modal')).toBe(false);
            }
        });

        test('allows PENDING user with 1 life remaining and blocks PENDING/EXPIRED user with 0 lives', () => {
            global.window.sessionManager.getUser.mockReturnValue({
                subscriptionTier: 'basic',
                subscriptionStatus: 'pending',
                usageCount: 9,
                maxFreeLimit: 10
            });
            expect(uiManager.validateFreemiumAction(null, 'flashcards')).toBe(true);

            global.window.sessionManager.getUser.mockReturnValue({
                subscriptionTier: 'basic',
                subscriptionStatus: 'expired',
                usageCount: 10,
                maxFreeLimit: 10
            });
            expect(uiManager.validateFreemiumAction(null, 'flashcards')).toBe(false);
            expect(uiManager.openModals.has('paywall-modal')).toBe(true);
        });

        test('blocks BASIC and ADVANCED users at daily AI limit on Quiz Tutor with tier-specific modal copy', () => {
            global.window.sessionManager.getUser.mockReturnValue({
                subscriptionTier: 'basic',
                subscriptionStatus: 'active',
                dailyAiUsage: 50
            });
            expect(uiManager.validateFreemiumAction(null, 'quiz_tutor')).toBe(false);
            let modalHtml = domEnv.byId.get('paywall-modal').innerHTML;
            expect(modalHtml).toContain('Límite de Consultas');
            expect(modalHtml).toContain('Mejorar a Avanzado');

            domEnv = createDomEnvironment('/dashboard');
            uiManager = new UIManager();
            global.window.sessionManager.getUser.mockReturnValue({
                subscriptionTier: 'advanced',
                subscriptionStatus: 'active',
                dailyAiUsage: 100
            });
            expect(uiManager.validateFreemiumAction(null, 'quiz_tutor')).toBe(false);
            modalHtml = domEnv.byId.get('paywall-modal').innerHTML;
            expect(modalHtml).toContain('Meta Diaria');
            expect(modalHtml).toContain('Has completado tus consultas diarias al Tutor IA');
            expect(modalHtml).toContain('Volver al Inicio');
        });

        test('blocks FREE user with 0 lives on Quiz Tutor', () => {
            global.window.sessionManager.getUser.mockReturnValue({
                subscriptionTier: 'free',
                usageCount: 10,
                maxFreeLimit: 10
            });

            expect(uiManager.validateFreemiumAction(null, 'quiz_tutor')).toBe(false);
            const modalHtml = domEnv.byId.get('paywall-modal').innerHTML;
            expect(modalHtml).toContain('Prueba Gratuita');
            expect(modalHtml).toContain('Has consumido tus 10 vidas de prueba gratuitas');
        });
    });

    describe('isResourceLocked', () => {
        test('respects free lives remaining (including string coercion), active paid plans, and visitor state', () => {
            expect(uiManager.isResourceLocked(false)).toBe(false);

            global.window.sessionManager.getUser.mockReturnValue({ subscriptionTier: 'free', usageCount: 9, maxFreeLimit: 10 });
            expect(uiManager.isResourceLocked(true)).toBe(false);

            global.window.sessionManager.getUser.mockReturnValue({ subscriptionTier: 'free', usageCount: '9', maxFreeLimit: '10' });
            expect(uiManager.isResourceLocked(true)).toBe(false);

            global.window.sessionManager.getUser.mockReturnValue({ subscriptionTier: 'free', usageCount: 10, maxFreeLimit: 10 });
            expect(uiManager.isResourceLocked(true)).toBe(true);

            global.window.sessionManager.getUser.mockReturnValue({ subscriptionTier: 'basic', subscriptionStatus: 'active', usageCount: 50, maxFreeLimit: 10 });
            expect(uiManager.isResourceLocked(true)).toBe(false);
        });
    });

    describe('showLifeDecrementToast', () => {
        test('does NOT trigger showPaywallModal when remaining reaches 0 and shows contextual warnings', () => {
            const paywallSpy = jest.spyOn(uiManager, 'showPaywallModal');
            const toastSpy = jest.spyOn(uiManager, 'showToast');

            uiManager.showLifeDecrementToast(0, 10);
            expect(paywallSpy).not.toHaveBeenCalled();
            expect(toastSpy).toHaveBeenCalledWith(
                expect.stringContaining('Has consumido tu última vida de prueba mensual'),
                'warning',
                4000
            );

            uiManager.showLifeDecrementToast(1, 10);
            expect(paywallSpy).not.toHaveBeenCalled();
            expect(toastSpy).toHaveBeenCalledWith(
                expect.stringContaining('solo 1/10 vidas de prueba'),
                'warning',
                3500
            );
        });
    });

    describe('updateFreemiumStatus & checkAndShowWelcomeModal', () => {
        test('updateFreemiumStatus hides bar for optimistic, active paid users, and excluded pages; shows for verified FREE users', () => {
            uiManager.updateFreemiumStatus({
                id: 'sb-123',
                subscriptionTier: 'unknown',
                subscriptionStatus: 'pending',
                _isOptimistic: true
            });
            const bar = domEnv.byId.get('freemium-status-bar');
            expect(bar.hidden).toBe(true);
            expect(domEnv.body.classList.remove).toHaveBeenCalledWith('has-trial-mode');

            uiManager.updateFreemiumStatus({
                id: 'usr_basic',
                subscriptionTier: 'basic',
                subscriptionStatus: 'active',
                _isOptimistic: false
            });
            expect(bar.hidden).toBe(true);

            uiManager.updateFreemiumStatus({
                id: 'usr_free',
                subscriptionTier: 'free',
                subscriptionStatus: 'pending',
                _isOptimistic: false,
                usageCount: 2,
                maxFreeLimit: 10
            });
            expect(bar.hidden).toBe(false);
            expect(bar.classList.add).toHaveBeenCalledWith('visible');
            expect(domEnv.body.classList.add).toHaveBeenCalledWith('has-trial-mode');
            expect(domEnv.byId.get('free-usage-count').textContent).toBe('8/10');
        });

        test('checkAndShowWelcomeModal blocks paid users, study pages, optimistic users, and first-time registration; shows on real monthly renewal', () => {
            // Paid user -> never shown
            uiManager.checkAndShowWelcomeModal({
                id: 'usr_paid',
                subscriptionTier: 'advanced',
                subscriptionStatus: 'active',
                lastFreeRenewal: '2026-09-05T00:00:00.000Z',
                usageCount: 0,
                _isOptimistic: false
            });
            expect(domEnv.byId.get('welcome-freemium-modal')).toBeUndefined();

            // Excluded pages -> never shown
            for (const path of ['/quiz.html', '/simulator-dashboard.html', '/flashcards.html']) {
                global.window.location.pathname = path;
                uiManager.checkAndShowWelcomeModal({
                    id: 'usr_free',
                    subscriptionTier: 'free',
                    subscriptionStatus: 'pending',
                    lastFreeRenewal: '2026-09-05T00:00:00.000Z',
                    createdAt: '2026-08-01T00:00:00.000Z',
                    usageCount: 0,
                    _isOptimistic: false
                });
                expect(domEnv.byId.get('welcome-freemium-modal')).toBeUndefined();
            }

            global.window.location.pathname = '/dashboard';

            // Optimistic user -> never shown
            uiManager.checkAndShowWelcomeModal({
                id: 'usr_opt',
                subscriptionTier: 'free',
                subscriptionStatus: 'pending',
                lastFreeRenewal: '2026-09-05T00:00:00.000Z',
                usageCount: 0,
                _isOptimistic: true
            });
            expect(domEnv.byId.get('welcome-freemium-modal')).toBeUndefined();

            // First-time sign-in (!lastSeen) -> silently records date, does not show modal
            uiManager.checkAndShowWelcomeModal({
                id: 'usr_new',
                subscriptionTier: 'free',
                subscriptionStatus: 'pending',
                lastFreeRenewal: '2026-09-05T00:00:00.000Z',
                createdAt: '2026-09-05T00:00:00.000Z',
                usageCount: 0,
                _isOptimistic: false
            });
            expect(domEnv.byId.get('welcome-freemium-modal')).toBeUndefined();
            expect(global.localStorage.setItem).toHaveBeenCalledWith('lastSeenFreeRenewal_usr_new', '2026-09-05');

            // Returning confirmed FREE user with older lastSeen -> shows welcome modal
            domEnv.localStore.set('lastSeenFreeRenewal_usr_free', '2026-08-28');
            uiManager.checkAndShowWelcomeModal({
                id: 'usr_free',
                subscriptionTier: 'free',
                subscriptionStatus: 'pending',
                lastFreeRenewal: '2026-09-05T00:00:00.000Z',
                createdAt: '2026-08-01T00:00:00.000Z',
                usageCount: 0,
                _isOptimistic: false
            });
            expect(domEnv.byId.get('welcome-freemium-modal')).toBeDefined();
            expect(uiManager.openModals.has('welcome-freemium-modal')).toBe(true);
        });
    });
});
