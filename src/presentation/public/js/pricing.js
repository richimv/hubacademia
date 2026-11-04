/** Access passes. Keeps the existing Mercado Pago endpoint and plan IDs. */
const PLAN_LABELS = Object.freeze({ basic: 'Elegir Básico', advanced: 'Elegir Avanzado' });
let checkoutInProgress = false;

function notifyPricing(message, title) {
    if (window.confirmationModal) return window.confirmationModal.showAlert(message, title);
    window.alert(message);
    return Promise.resolve();
}

function markCurrentPlan(planId, isActive = false, isLower = false) {
    const card = document.getElementById('plan-card-' + planId);
    const button = document.getElementById('btn-plan-' + planId);
    if (!card || !button) return;
    button.disabled = isActive || isLower || checkoutInProgress;
    if (isActive) {
        card.classList.add('is-current-plan');
        const flag = document.createElement('p');
        flag.className = 'current-plan-flag';
        flag.textContent = 'Pase activo';
        card.querySelector('.plan-tile-top').prepend(flag);
        button.textContent = 'Pase activo';
    } else if (isLower) button.textContent = 'Incluido en tu pase Avanzado';
}

function renderCheckoutAccountBadge(user) {
    document.getElementById('pricing-account-badge')?.remove();
    if (!user?.email) return;
    const header = document.querySelector('.pricing-header');
    if (!header) return;
    const badge = document.createElement('div');
    badge.id = 'pricing-account-badge';
    badge.className = 'pricing-account-badge';
    const safeEmail = window.escapeHtml(user.email);
    badge.innerHTML = `<div class="pricing-account-inner"><span>El pase se vinculará a <strong>${safeEmail}</strong></span><a href="/login?redirect=pricing">Cambiar cuenta</a>${user.emailVerified === false ? '<p class="pricing-account-warn">Confirma tu correo antes de continuar con el pago.</p>' : ''}</div>`;
    header.after(badge);
}

function checkPremiumStatus(user) {
    document.querySelectorAll('.current-plan-flag').forEach(flag => flag.remove());
    for (const [id, label] of Object.entries(PLAN_LABELS)) {
        const button = document.getElementById('btn-plan-' + id);
        if (button) { button.disabled = checkoutInProgress; button.textContent = label; }
        document.getElementById('plan-card-' + id)?.classList.remove('is-current-plan');
    }
    const status = user?.subscriptionStatus || user?.subscription_status;
    const tier = String(user?.subscriptionTier || user?.subscription_tier || 'free').toLowerCase();
    if (status === 'active' || status === 'premium') {
        if (tier === 'advanced') { markCurrentPlan('advanced', true); markCurrentPlan('basic', false, true); }
        else if (tier === 'basic') {
            markCurrentPlan('basic', true);
            const upgrade = document.getElementById('btn-plan-advanced');
            if (upgrade) upgrade.textContent = 'Elegir pase Avanzado';
        }
    }
    renderCheckoutAccountBadge(user);
}

async function startCheckout(button) {
    if (checkoutInProgress) return;
    const planId = button.dataset.plan;
    if (!Object.hasOwn(PLAN_LABELS, planId)) return;
    if (!localStorage.getItem('authToken')) {
        if (window.uiManager) window.uiManager.showAuthPromptModal();
        else window.location.href = '/login?redirect=pricing';
        return;
    }
    const user = window.sessionManager?.getUser();
    if (user?.emailVerified === false) {
        await notifyPricing('Confirma tu correo con el código de seguridad antes de adquirir un pase.', 'Confirma tu correo');
        window.location.href = '/login?redirect=pricing';
        return;
    }
    checkoutInProgress = true;
    document.querySelectorAll('.plan-select-btn').forEach(item => { item.disabled = true; });
    const loading = document.getElementById('loading-overlay');
    loading?.classList.remove('hidden');
    let navigating = false;
    try {
        const response = await window.NetworkService.fetch(window.AppConfig.API_URL + '/api/payment/create-order', {
            method: 'POST', body: JSON.stringify({ planId })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.init_point) throw new Error(data.error || 'No se pudo obtener el enlace de pago.');
        navigating = true;
        window.location.href = data.init_point;
    } catch (error) {
        await notifyPricing(error.message || 'No se pudo conectar con Mercado Pago. Vuelve a intentarlo.', 'No se pudo iniciar el pago');
    } finally {
        if (!navigating) {
            checkoutInProgress = false;
            loading?.classList.add('hidden');
            checkPremiumStatus(window.sessionManager?.getUser());
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('.plan-select-btn').forEach(button => button.addEventListener('click', () => startCheckout(button)));
    try {
        await window.sessionManager?.initialize();
        window.sessionManager?.onStateChange(checkPremiumStatus);
        checkPremiumStatus(window.sessionManager?.getUser());
    } catch (error) { console.error('[Pricing] No se pudo sincronizar la cuenta.', error); }
});
