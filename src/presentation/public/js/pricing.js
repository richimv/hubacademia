// ✅ Smart Pricing Logic (SessionManager — Exclusivo Mercado Pago)
document.addEventListener('DOMContentLoaded', async () => {
    if (window.sessionManager) {
        await window.sessionManager.initialize();

        window.sessionManager.onStateChange((user) => {
            checkPremiumStatus(user);
        });

        checkPremiumStatus(window.sessionManager.getUser());
    } else {
        console.error("SessionManager no cargado. Verifique imports.");
    }
});

function checkPremiumStatus(user) {
    if (!user) return;

    try {
        const status = user.subscriptionStatus || user.subscription_status;
        const tier = String(user.subscriptionTier || 'free').toLowerCase();
        const role = user.role;

        console.log(`💎 Verificando Estatus: Plan=${tier}, Status=${status}`);

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
                    advBtn.innerHTML = 'Mejorar a Plan Avanzado';
                    advBtn.classList.add('upgrade-btn');
                }
            }
        }

        renderCheckoutAccountBadge(user);
    } catch (e) {
        console.error("Error checking premium status:", e);
    }
}

/**
 * Renderiza la insignia informativa indicando a qué cuenta se vinculará la suscripción
 */
function renderCheckoutAccountBadge(user) {
    if (!user || !user.email) return;
    const pricingHeader = document.querySelector('.pricing-header');
    if (!pricingHeader) return;

    let badge = document.getElementById('pricing-account-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'pricing-account-badge';
        badge.className = 'pricing-account-badge';
        pricingHeader.insertAdjacentElement('afterend', badge);
    }

    const isVerified = user.emailVerified !== false;
    const warningNotice = !isVerified
        ? `<div style="margin-top: 8px; color: #ef4444; font-size: 0.82rem; font-weight: 600;">
            Tu correo no ha sido confirmado aún.
            <a href="/login?redirect=pricing" style="color: #3b82f6; text-decoration: underline; margin-left: 4px;">Confirmar con código OTP</a>
           </div>`
        : '';

    badge.innerHTML = `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 16px; margin: 0 auto 1.5rem auto; max-width: 540px; text-align: center; font-size: 0.88rem; color: var(--text-secondary); box-shadow: var(--shadow-sm);">
            Tu plan se vinculará a: <strong style="color: var(--text-main);">${user.email}</strong>
            <span style="margin: 0 8px; opacity: 0.4;">|</span>
            <a href="/login?redirect=pricing" style="color: var(--primary); text-decoration: none; font-weight: 600;">Cambiar cuenta</a>
            ${warningNotice}
        </div>
    `;
}

/**
 * Ajusta el UI para indicar cuál es el plan que el usuario ya posee o si está bloqueado.
 */
function markCurrentPlan(planId, isActive = false, isLower = false) {
    const card = document.getElementById(`plan-card-${planId}`);
    const btn = document.getElementById(`btn-plan-${planId}`);

    if (card && isActive) {
        card.style.border = '2px solid #fbbf24';
        card.style.position = 'relative';

        const badge = document.createElement('div');
        badge.textContent = 'Tu Plan Actual';
        badge.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #fbbf24;
            color: #000;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 800;
            white-space: nowrap;
            box-shadow: 0 4px 10px rgba(251, 191, 36, 0.3);
            z-index: 10;
        `;
        card.appendChild(badge);
    }

    if (btn) {
        if (isActive) {
            btn.textContent = 'Plan Activo';
        } else if (isLower) {
            btn.textContent = 'Incluido en Plan Avanzado';
        }

        btn.disabled = true;
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.color = '#94a3b8';
        btn.style.cursor = 'default';
        btn.style.pointerEvents = 'none';
        btn.style.border = '1px solid rgba(255,255,255,0.1)';
    }
}

// Check for payment status in URL
const urlParams = new URLSearchParams(window.location.search);
const paymentStatus = urlParams.get('payment');
const statusDetail = urlParams.get('status');

if (paymentStatus === 'success' || statusDetail === 'approved') {
    window.history.replaceState({}, document.title, window.location.pathname);

    if (window.confirmationModal) {
        window.confirmationModal.showAlert('¡Tu cuenta Premium ha sido activada exitosamente! Ya tienes acceso completo a las herramientas de Hub Academia.', 'Pago Exitoso', 'Ir al Inicio').then(() => {
            window.location.href = '/';
        });
    } else {
        alert('Pago exitoso.\nTu cuenta Premium ha sido activada.');
        setTimeout(() => window.location.href = '/', 1000);
    }

} else if (paymentStatus === 'failure') {
    if (window.confirmationModal) {
        window.confirmationModal.showAlert('El pago no se pudo completar en Mercado Pago. Por favor, intenta de nuevo o prueba con otro medio de pago.', 'Pago No Completado');
    } else {
        alert('El pago no se pudo completar. Por favor, intenta de nuevo.');
    }
} else if (paymentStatus === 'pending') {
    if (window.confirmationModal) {
        window.confirmationModal.showAlert('Tu pago está en proceso de acreditación por Mercado Pago. Se activará automáticamente cuando se apruebe.', 'Pago en Proceso');
    } else {
        alert('Tu pago está en proceso. Se activará cuando se apruebe.');
    }
}

function logout() {
    if (window.sessionManager) {
        window.sessionManager.logout();
    } else {
        localStorage.removeItem('authToken');
        const currentParams = new URLSearchParams(window.location.search);
        const redirectedFromApp = currentParams.get('fromApp') === 'true';
        window.location.href = redirectedFromApp ? 'login?redirect=pricing' : 'login';
    }
}

// ✅ Lógica de Pago Exclusiva con Mercado Pago
document.querySelectorAll('.plan-select-btn').forEach(button => {
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
                throw new Error(errData.error || 'Error al iniciar el pago');
            }

            const data = await response.json();

            if (data.init_point) {
                window.location.href = data.init_point;
            } else {
                if (window.confirmationModal) {
                    window.confirmationModal.showAlert('No se recibió el enlace de pago de Mercado Pago. Por favor, intenta nuevamente.', 'Error de Pasarela');
                } else {
                    alert('Error: No se recibió el enlace de pago.');
                }
                if (loading) loading.classList.add('hidden');
            }

        } catch (error) {
            console.error("Error de pago:", error);
            if (window.confirmationModal) {
                window.confirmationModal.showAlert('Hubo un problema al conectar con Mercado Pago: ' + error.message, 'Error de Conexión');
            } else {
                alert('Hubo un problema al conectar con el servidor de pagos. ' + error.message);
            }
            if (loading) loading.classList.add('hidden');
        }
    });
});
