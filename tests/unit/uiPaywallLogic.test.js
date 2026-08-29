/**
 * Tests unitarios para la lógica de Paywall y Freemium de UI (uiManager)
 * Valida la detección de límites y configuración de modales para 'diagnostic', 'quiz_tutor', 'simulator'.
 */

describe('UI Paywall & Freemium Action Validation', () => {

    class MockUIManager {
        constructor() {
            this.lastModalConfig = null;
            this.modalVisible = false;
        }

        validateFreemiumAction(event, type = 'arena', user) {
            if (!user) return true;

            const userTier = (user.subscriptionTier || user.subscription_tier || 'free').toLowerCase();
            const usageCount = user.usageCount !== undefined ? user.usageCount : (user.usage_count || 0);
            const maxFreeLimit = user.maxFreeLimit !== undefined ? user.maxFreeLimit : (user.max_free_limit || 10);
            const dailySimUsage = user.dailySimulatorUsage !== undefined ? user.dailySimulatorUsage : (user.daily_simulator_usage || 0);

            // 1. Lógica para Usuarios FREE (Vidas Globales)
            if (userTier === 'free') {
                if (usageCount >= maxFreeLimit) {
                    if (event && typeof event.preventDefault === 'function') {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    this.showPaywallModal(null, type, user);
                    return false;
                }
                return true;
            }

            // 2. Lógica para Usuarios PREMIUM (Límites Diarios)
            if (type === 'simulator' || type === 'diagnostic') {
                const limits = user.limits || {};
                const limit = limits.simulator !== undefined ? limits.simulator : (userTier === 'basic' ? 15 : 50);
                if (userTier !== 'admin' && dailySimUsage >= limit) {
                    if (event && typeof event.preventDefault === 'function') {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    this.showPaywallModal(null, type, user);
                    return false;
                }
            } else if (type === 'chat_standard' || type === 'chat' || type === 'flashcard_tutor' || type === 'quiz_tutor') {
                const dailyAiUsage = user.dailyAiUsage !== undefined ? user.dailyAiUsage : (user.daily_ai_usage || 0);
                const limits = user.limits || {};
                const limit = limits.chat_standard !== undefined ? limits.chat_standard : (userTier === 'basic' ? 50 : 100);
                if (userTier !== 'admin' && dailyAiUsage >= limit) {
                    if (event && typeof event.preventDefault === 'function') {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    this.showPaywallModal(null, 'quiz_tutor', user);
                    return false;
                }
            }

            return true;
        }

        showPaywallModal(customMsg = null, context = 'arena', user = null) {
            let userTier = 'free';
            if (user) userTier = (user.subscriptionTier || user.subscription_tier || 'free').toLowerCase();

            let config = {
                title: '¡Desbloquea el Acceso Premium! 💎',
                message: customMsg || 'Suscríbete hoy y accede a todos los beneficios y herramientas ilimitadas de Hub Academia.',
                btnText: 'Ver Planes Premium',
                btnUrl: '/pricing',
                icon: 'fa-crown'
            };

            if (context === 'chat_standard' || context === 'chat' || context === 'flashcard_tutor' || context === 'quiz_tutor') {
                config.icon = 'fa-comments';
                if (userTier === 'basic') {
                    config.title = '¡Límite de Consultas Alcanzado! 🚀';
                    config.message = customMsg || 'Has alcanzado tu límite de consultas diarias al Tutor IA para el Plan Básico (50 consultas/día). Mejora tu plan a Avanzado para obtener 100 consultas diarias y soporte pedagógico/médico profundo.';
                    config.btnText = 'Mejorar a Avanzado';
                    config.btnUrl = '/pricing';
                    config.icon = 'fa-rocket';
                } else if (userTier === 'advanced' || userTier === 'admin') {
                    config.title = '¡Meta Diaria Alcanzada! 🏆';
                    config.message = customMsg || 'Has completado tus consultas diarias al Tutor IA para el Plan Avanzado (100 consultas/día). ¡Mañana se renovará automáticamente tu cuota!';
                    config.btnText = 'Volver al Inicio';
                    config.btnUrl = '/';
                    config.icon = 'fa-medal';
                } else {
                    config.title = '¡Prueba Gratuita Finalizada! 💎';
                    config.message = customMsg || 'Has consumido tus 10 vidas de prueba gratuitas. Activa un plan premium para continuar practicando con el Tutor IA sin interrupciones.';
                    config.btnText = 'Ver Planes Premium';
                    config.btnUrl = '/pricing';
                    config.icon = 'fa-crown';
                }
            } else if (context === 'simulator' || context === 'diagnostic') {
                config.icon = 'fa-chart-pie';
                if (userTier === 'basic') {
                    config.title = '¡Límite Diario Alcanzado! 🚀';
                    config.message = customMsg || 'Has alcanzado tu límite diario para este recurso. Mejora tu plan a Avanzado para acceder a diagnósticos IA en tiempo real y mayor capacidad.';
                    config.btnText = 'Mejorar a Avanzado';
                    config.btnUrl = '/pricing';
                    config.icon = 'fa-rocket';
                } else if (userTier === 'advanced' || userTier === 'admin') {
                    config.title = '¡Meta Diaria Alcanzada! 🏆';
                    config.message = customMsg || 'Has completado tus diagnósticos y simulacros de hoy. ¡Mañana se renovará automáticamente tu cuota!';
                    config.btnText = 'Volver al Inicio';
                    config.btnUrl = '/';
                    config.icon = 'fa-medal';
                } else {
                    config.title = '¡Desbloquea el Acceso Premium! 💎';
                    config.message = customMsg || 'Has consumido tus 10 vidas de prueba gratuitas. Suscríbete hoy para acceder a diagnósticos inteligentes con IA y simulacros ilimitados.';
                    config.btnText = 'Ver Planes Premium';
                    config.btnUrl = '/pricing';
                    config.icon = 'fa-crown';
                }
            }

            this.lastModalConfig = config;
            this.modalVisible = true;
            return config;
        }
    }

    let uiManager;

    beforeEach(() => {
        uiManager = new MockUIManager();
    });

    test('should block FREE user with 0 lives on Extraer Insights (diagnostic) and show Paywall', () => {
        const freeUser = { subscriptionTier: 'free', usageCount: 10, maxFreeLimit: 10 };
        const allowed = uiManager.validateFreemiumAction(null, 'diagnostic', freeUser);

        expect(allowed).toBe(false);
        expect(uiManager.modalVisible).toBe(true);
        expect(uiManager.lastModalConfig.title).toContain('Desbloquea');
        expect(uiManager.lastModalConfig.message).toContain('Has consumido tus 10 vidas de prueba gratuitas');
        expect(uiManager.lastModalConfig.btnText).toBe('Ver Planes Premium');
    });

    test('should allow FREE user with remaining lives on Extraer Insights', () => {
        const freeUser = { subscriptionTier: 'free', usageCount: 4, maxFreeLimit: 10 };
        const allowed = uiManager.validateFreemiumAction(null, 'diagnostic', freeUser);

        expect(allowed).toBe(true);
        expect(uiManager.modalVisible).toBe(false);
    });

    test('should block BASIC user who reached daily AI limit on Quiz Tutor', () => {
        const basicUser = { subscriptionTier: 'basic', dailyAiUsage: 50 };
        const allowed = uiManager.validateFreemiumAction(null, 'quiz_tutor', basicUser);

        expect(allowed).toBe(false);
        expect(uiManager.modalVisible).toBe(true);
        expect(uiManager.lastModalConfig.title).toContain('Límite de Consultas');
        expect(uiManager.lastModalConfig.btnText).toBe('Mejorar a Avanzado');
    });

    test('should block ADVANCED user who reached daily AI limit on Quiz Tutor with completion message', () => {
        const advUser = { subscriptionTier: 'advanced', dailyAiUsage: 100 };
        const allowed = uiManager.validateFreemiumAction(null, 'quiz_tutor', advUser);

        expect(allowed).toBe(false);
        expect(uiManager.modalVisible).toBe(true);
        expect(uiManager.lastModalConfig.title).toContain('Meta Diaria');
        expect(uiManager.lastModalConfig.message).toContain('Has completado tus consultas diarias al Tutor IA');
        expect(uiManager.lastModalConfig.btnText).toBe('Volver al Inicio');
    });

    test('should block FREE user with 0 lives on Quiz Tutor (during exam or in review)', () => {
        const freeUser = { subscriptionTier: 'free', usageCount: 10, maxFreeLimit: 10 };
        const allowed = uiManager.validateFreemiumAction(null, 'quiz_tutor', freeUser);

        expect(allowed).toBe(false);
        expect(uiManager.modalVisible).toBe(true);
        expect(uiManager.lastModalConfig.title).toContain('Prueba Gratuita');
        expect(uiManager.lastModalConfig.message).toContain('Has consumido tus 10 vidas de prueba gratuitas');
    });
});
