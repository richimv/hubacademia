/**
 * pricing.js
 * Capa de Presentación — Gestión de Planes y Checkout Exclusivo con Mercado Pago.
 */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (window.sessionManager) {
            await window.sessionManager.initialize();

            window.sessionManager.onStateChange((user) => {
                checkPremiumStatus(user);
            });

            checkPremiumStatus(window.sessionManager.getUser());
        }
    } catch (err) {
        console.error('[Pricing] Error inicializando sesión:', err);
    }
});

function checkPremiumStatus(user) {
    if (!user) return;

    try {
        const status = user.subscriptionStatus || user.subscription_status;
        const tier = String(user.subscriptionTier || 'free').toLowerCase();
        const role = user.role;

        const isPremium = (status === 'active' || status === 'premium' || role === 'admin');

        const pricingContent = document.getElementById('pricing-content');
        if (pricingContent) pricingContent.style.display = 'block';

        const premiumContent = document.getElementById('premium-content');
        if (premiumContent) premiumContent.style.display = 'none';

        if (isPremium) {
            if (tier === 'advanced') {
                markCurrentPlan('advanced', true);
                markCurrentPlan('basic', false, true);
            } else if (tier === 'basic') {
                markCurrentPlan('basic', true);
                const advBtn = document.getElementById('btn-plan-advanced');
                if (advBtn) {
                    advBtn.textContent = 'Mejorar a Plan Avanzado';
                    advBtn.classList.add('upgrade-btn');
                }
            }
        }

        renderCheckoutAccountBadge(user);
    } catch (e) {
        console.error('[Pricing] Error verificando estado del plan:', e);
    }
}

function renderCheckoutAccountBadge(user) {
    if (!user || !user.email) return;
    const heroGrid = document.querySelector('.pricing-hero-grid') || document.querySelector('.pricing-header');
    if (!heroGrid) return;

    let badge = document.getElementById('pricing-account-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'pricing-account-badge';
        badge.className = 'pricing-account-badge';
        heroGrid.insertAdjacentElement('afterend', badge);
    }

    const safeEmail = typeof window.escapeHtml === 'function' ? window.escapeHtml(user.email) : user.email;
    const isVerified = user.emailVerified !== false;
    const warningNotice = !isVerified
        ? `<div class="pricing-account-warn">
            Tu correo aún no ha sido confirmado.
            <a href="/login?redirect=pricing">Confirmar con código de seguridad</a>
           </div>`
        : '';

    badge.innerHTML = `
        <div class="pricing-account-inner">
            <span>Tu plan se vinculará a: <strong>${safeEmail}</strong></span>
            <a href="/login?redirect=pricing">Cambiar cuenta</a>
            ${warningNotice}
        </div>
    `;
}

function markCurrentPlan(planId, isActive = false, isLower = false) {
    const card = document.getElementById(`plan-card-${planId}`);
    const btn = document.getElementById(`btn-plan-${planId}`);

    if (card && isActive && !card.querySelector('.current-plan-flag')) {
        card.classList.add('is-current-plan');
        const content = card.querySelector('.step-plan-content') || card;
        const flag = document.createElement('span');
        flag.className = 'current-plan-flag';
        flag.textContent = 'Plan actual activo';
        content.prepend(flag);
    }

    if (btn) {
        if (isActive) {
            btn.textContent = 'Plan activo';
        } else if (isLower) {
            btn.textContent = 'Incluido en Plan Avanzado';
        }
        btn.disabled = true;
    }
}

// Retorno desde pasarela de Mercado Pago
const urlParams = new URLSearchParams(window.location.search);
const paymentStatus = urlParams.get('payment');
const statusDetail = urlParams.get('status');

if (paymentStatus === 'success' || statusDetail === 'approved') {
    window.history.replaceState({}, document.title, window.location.pathname);

    if (window.confirmationModal) {
        window.confirmationModal.showAlert(
            'Tu cuenta Premium ha sido activada automáticamente. Ya cuentas con acceso ampliado a las herramientas de Hub Academia.',
            'Pago Confirmado',
            'Ir al Inicio'
        ).then(() => {
            window.location.href = '/';
        });
    } else {
        alert('Pago confirmado. Tu cuenta Premium ha sido activada.');
        setTimeout(() => { window.location.href = '/'; }, 1000);
    }
} else if (paymentStatus === 'failure') {
    if (window.confirmationModal) {
        window.confirmationModal.showAlert(
            'El pago no se pudo completar en Mercado Pago. Intenta nuevamente o elige otro medio disponible en la pasarela.',
            'Pago No Completado'
        );
    } else {
        alert('El pago no se pudo completar. Intenta nuevamente.');
    }
} else if (paymentStatus === 'pending') {
    if (window.confirmationModal) {
        window.confirmationModal.showAlert(
            'Tu pago está en proceso de acreditación por Mercado Pago. Tu acceso se activará automáticamente en cuanto se apruebe.',
            'Pago en Proceso'
        );
    } else {
        alert('Tu pago está en proceso de acreditación.');
    }
}

// Orden de pago exclusiva con Mercado Pago
document.querySelectorAll('.plan-select-btn').forEach((button) => {
    button.addEventListener('click', async (event) => {
        const selectedPlan = event.currentTarget.getAttribute('data-plan');
        const token = localStorage.getItem('authToken');

        if (!token) {
            if (window.uiManager) window.uiManager.showAuthPromptModal();
            else window.location.href = '/login?redirect=pricing';
            return;
        }

        const currentUser = window.sessionManager?.getUser?.();
        if (currentUser && currentUser.emailVerified === false) {
            const warningMsg = 'Debes confirmar tu correo electrónico con el código de seguridad de 8 dígitos antes de adquirir un plan.';
            if (window.confirmationModal) {
                window.confirmationModal.showAlert(warningMsg, 'Confirmación Requerida').then(() => {
                    window.location.href = '/login?redirect=pricing';
                });
            } else {
                alert(warningMsg);
                window.location.href = '/login?redirect=pricing';
            }
            return;
        }

        const loading = document.getElementById('loading-overlay');
        if (loading) loading.classList.remove('hidden');

        try {
            const response = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/payment/create-order`, {
                method: 'POST',
                body: JSON.stringify({ planId: selectedPlan })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Error al iniciar la orden de pago');
            }

            const data = await response.json();

            if (data.init_point) {
                window.location.href = data.init_point;
            } else {
                if (window.confirmationModal) {
                    window.confirmationModal.showAlert('No se recibió el enlace de pago de Mercado Pago. Intenta nuevamente.', 'Error de Pasarela');
                } else {
                    alert('Error: No se recibió el enlace de pago.');
                }
                if (loading) loading.classList.add('hidden');
            }
        } catch (error) {
            console.error('[Pricing] Error al crear orden en Mercado Pago:', error);
            if (window.confirmationModal) {
                window.confirmationModal.showAlert('Hubo un problema al conectar con Mercado Pago: ' + error.message, 'Error de Conexión');
            } else {
                alert('Hubo un problema al conectar con Mercado Pago: ' + error.message);
            }
            if (loading) loading.classList.add('hidden');
        }
    });
});
