document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    await window.sessionManager.initialize();
    const user = window.sessionManager.getUser();

    if (!user) {
        window.location.href = '/login';
        return;
    }

    // Fill Data
    document.getElementById('user-name').textContent = user.name || 'Usuario';
    const emailEl = document.getElementById('user-email');
    // Todos los usuarios son Google Verified
    emailEl.innerHTML = `${user.email} <i class="fas fa-check-circle" style="color: #10b981; font-size: 0.9rem; margin-left: 5px;" title="Verificado via Google"></i>`;

    const badgeContainer = document.getElementById('plan-badge-container');
    const tier = String(user.subscriptionTier || 'free').toLowerCase();

    if (user.role === 'admin') {
        badgeContainer.innerHTML = '<span class="badge-premium" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white;"><i class="fas fa-shield-alt"></i> Administrador</span>';
    } else if (tier === 'advanced') {
        badgeContainer.innerHTML = '<span class="badge-premium" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #000; font-weight: 800;"><i class="fas fa-crown"></i> Plan Advanced</span>';
    } else if (tier === 'basic') {
        badgeContainer.innerHTML = '<span class="badge-premium"><i class="fas fa-star"></i> Plan Basic</span>';
    } else {
        badgeContainer.innerHTML = '<span class="badge-free"><i class="fas fa-seedling"></i> Plan Gratuito</span>';
    }

    renderSubscriptionDetails(user);
    renderUsageDetails(user);

    // Inject Header
    const headerPlaceholder = document.getElementById('header-placeholder');
    headerPlaceholder.innerHTML = `
                <header class="main-header">
                    <div class="header-start">
                        <a href="/" class="logo">
                            <img src="assets/logo.png" alt="Logo" class="logo-img">
                            <span class="logo-text">Hub Academia</span>
                        </a>
                    </div>
                </header>
            `;
});

/**
 * Renderiza los detalles de la suscripción
 */
function renderSubscriptionDetails(user) {
    const container = document.getElementById('subscription-status-container');
    if (!container) return;

    const tier = String(user.subscriptionTier || 'free').toLowerCase();
    const expiresAt = user.subscriptionExpiresAt;
    const status = user.subscriptionStatus || user.subscription_status;

    const isPremium = tier !== 'free' && status === 'active';

    if (isPremium) {
        const dateStr = expiresAt ? new Date(expiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Acceso Vitalicio';
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.2rem; font-weight: 800; color: #fff;">${tier.toUpperCase()} <i class="fas fa-check-circle" style="color: #4ade80;"></i></span>
                    <span style="background: rgba(74, 222, 128, 0.1); color: #4ade80; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700;">ACTIVO</span>
                </div>
                <!-- Beneficios Simplificados -->
                <div style="color: #cbd5e1; font-size: 0.95rem;">
                    <i class="far fa-calendar-alt" style="margin-right: 8px;"></i> Vence: <strong>${dateStr}</strong>
                </div>
                <button onclick="window.location.href='/pricing'" class="btn-action" style="background: rgba(255,255,255,0.05); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); width: auto; align-self: flex-start;">
                    Administrar Suscripción
                </button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.2rem; font-weight: 800; color: #94a3b8;">PLAN GRATUITO</span>
                    <span style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700;">LIMITADO</span>
                </div>
                <button onclick="window.location.href='/pricing'" class="btn-action btn-primary" style="width: 100%; justify-content: center; height: 50px; font-size: 1rem;">
                    💎 Ver Planes Premium
                </button>
            </div>
        `;
    }
}

// Modal de eliminación simplificado (Solo Google)
const modal = document.getElementById('delete-modal');
const deleteInput = document.getElementById('delete-password');
const deleteError = document.getElementById('delete-error');

function openDeleteModal() {
    modal.style.display = 'flex';
    deleteInput.value = '';
    deleteError.style.display = 'none';
    deleteInput.focus();
}

function closeDeleteModal() {
    modal.style.display = 'none';
}

modal.addEventListener('click', (e) => {
    if (e.target === modal) closeDeleteModal();
});

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (deleteInput.value !== 'ELIMINAR') {
        deleteError.textContent = 'Debes escribir "ELIMINAR" textualmente.';
        deleteError.style.display = 'block';
        return;
    }

    const btn = document.getElementById('confirm-delete-btn');
    btn.textContent = 'Eliminando...';
    btn.disabled = true;

    try {
        await AuthApiService.deleteAccount();
        await window.sessionManager.logout();
    } catch (error) {
        console.error(error);
        deleteError.textContent = error.message || 'Error al eliminar cuenta';
        deleteError.style.display = 'block';
        btn.textContent = 'Confirmar';
        btn.disabled = false;
    }
});

// Modal de edición de nombre
const editNameModal = document.getElementById('edit-name-modal');
const newNameInput = document.getElementById('new-name-input');
const editNameError = document.getElementById('edit-name-error');

function openEditNameModal() {
    editNameModal.style.display = 'flex';
    const currentName = document.getElementById('user-name').textContent;
    newNameInput.value = currentName !== 'Cargando...' ? currentName : '';
    editNameError.style.display = 'none';
    newNameInput.focus();
}

function closeEditNameModal() {
    editNameModal.style.display = 'none';
}

editNameModal.addEventListener('click', (e) => {
    if (e.target === editNameModal) closeEditNameModal();
});

async function submitNameChange() {
    const newName = newNameInput.value.trim();
    if (newName.length < 2) {
        editNameError.textContent = 'El nombre debe tener al menos 2 caracteres.';
        editNameError.style.display = 'block';
        return;
    }

    const btn = document.getElementById('confirm-edit-name-btn');
    btn.textContent = 'Guardando...';
    btn.disabled = true;

    try {
        const result = await AuthApiService.updateProfile(newName);
        // Actualizar UI
        document.getElementById('user-name').textContent = newName;
        // Actualizar sesión local
        if (window.sessionManager) {
            const user = window.sessionManager.getUser();
            if (user) {
                user.name = newName;
                window.sessionManager.setUser(user);
            }
        }
        closeEditNameModal();
    } catch (error) {
        console.error(error);
        editNameError.textContent = error.message || 'Error al actualizar el nombre.';
        editNameError.style.display = 'block';
    } finally {
        btn.textContent = 'Guardar Cambios';
        btn.disabled = false;
    }
}

/**
 * Renderiza el consumo detallado de cuotas de IA
 */
function renderUsageDetails(user) {
    const usageCard = document.getElementById('premium-usage-card');
    const container = document.getElementById('premium-usage-container');
    if (!usageCard || !container) return;

    const tier = String(user.subscriptionTier || 'free').toLowerCase();
    const status = user.subscriptionStatus || user.subscription_status;
    const isPremium = tier !== 'free' && status === 'active';
    const isAdmin = user.role === 'admin';

    usageCard.style.display = 'block'; // Mostrar la sección de consumos

    if (isAdmin) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; background: rgba(59, 130, 246, 0.05); border: 1px dashed rgba(59, 130, 246, 0.2); border-radius: 16px;">
                <i class="fas fa-shield-alt" style="font-size: 2.5rem; color: #60a5fa; margin-bottom: 1rem;"></i>
                <h4 style="color: #fff; margin-bottom: 0.5rem; font-weight: 700;">Acceso Ilimitado de Administrador</h4>
                <p style="color: #94a3b8; font-size: 0.9rem; margin: 0;">Como administrador, tu cuenta está exenta de las cuotas y limitaciones estándar de IA.</p>
            </div>
        `;
        return;
    }

    const limits = user.limits || {};

    if (isPremium) {
        // Cuotas Premium (Basic / Advanced)
        // 1. Tutor IA
        const aiLimit = limits.chat_standard || (tier === 'basic' ? 30 : 50);
        const aiUsed = user.dailyAiUsage !== undefined ? user.dailyAiUsage : (user.daily_ai_usage || 0);
        const aiRemaining = Math.max(0, aiLimit - aiUsed);
        const aiPct = Math.min(100, (aiUsed / aiLimit) * 100);

        // 2. Simulador
        const simLimit = limits.simulator || (tier === 'basic' ? 15 : 50);
        const simUsed = user.dailySimulatorUsage !== undefined ? user.dailySimulatorUsage : (user.daily_simulator_usage || 0);
        const simRemaining = Math.max(0, simLimit - simUsed);
        const simPct = Math.min(100, (simUsed / simLimit) * 100);

        // 3. Autoevaluación (Arena)
        const arenaLimit = limits.self_evaluation || 15;
        const arenaUsed = user.dailyArenaUsage !== undefined ? user.dailyArenaUsage : (user.daily_arena_usage || 0);
        const arenaRemaining = Math.max(0, arenaLimit - arenaUsed);
        const arenaPct = Math.min(100, (arenaUsed / arenaLimit) * 100);

        // 4. Flashcards (Mensual)
        const fcLimit = limits.monthly_flashcards || (tier === 'basic' ? 10 : 30);
        const fcUsed = user.monthlyFlashcardsUsage !== undefined ? user.monthlyFlashcardsUsage : (user.monthly_flashcards_usage || 0);
        const fcRemaining = Math.max(0, fcLimit - fcUsed);
        const fcPct = Math.min(100, (fcUsed / fcLimit) * 100);

        container.innerHTML = `
            <!-- Item 1: Tutor IA -->
            <div class="usage-item">
                <div class="usage-info">
                    <span class="usage-title"><i class="fas fa-comments" style="color: #3b82f6; margin-right: 8px;"></i>Tutor de IA y Voz</span>
                    <span class="usage-count-val">${aiUsed}/${aiLimit}</span>
                </div>
                <div class="usage-progress-bg">
                    <div class="usage-progress-bar" style="width: ${aiPct}%; background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);"></div>
                </div>
                <div class="usage-footer">
                    <span>Cuota Diaria</span>
                    <span style="color: #60a5fa; font-weight: 600;">Quedan: ${aiRemaining}</span>
                </div>
            </div>

            <!-- Item 2: Simuladores -->
            <div class="usage-item">
                <div class="usage-info">
                    <span class="usage-title"><i class="fas fa-stethoscope" style="color: #8b5cf6; margin-right: 8px;"></i>Simulador Médico</span>
                    <span class="usage-count-val">${simUsed}/${simLimit}</span>
                </div>
                <div class="usage-progress-bg">
                    <div class="usage-progress-bar" style="width: ${simPct}%; background: linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%);"></div>
                </div>
                <div class="usage-footer">
                    <span>Cuota Diaria</span>
                    <span style="color: #a78bfa; font-weight: 600;">Quedan: ${simRemaining}</span>
                </div>
            </div>

            <!-- Item 3: Autoevaluaciones -->
            <div class="usage-item">
                <div class="usage-info">
                    <span class="usage-title"><i class="fas fa-award" style="color: #10b981; margin-right: 8px;"></i>Autoevaluaciones</span>
                    <span class="usage-count-val">${arenaUsed}/${arenaLimit}</span>
                </div>
                <div class="usage-progress-bg">
                    <div class="usage-progress-bar" style="width: ${arenaPct}%; background: linear-gradient(90deg, #10b981 0%, #34d399 100%);"></div>
                </div>
                <div class="usage-footer">
                    <span>Cuota Diaria</span>
                    <span style="color: #34d399; font-weight: 600;">Quedan: ${arenaRemaining}</span>
                </div>
            </div>

            <!-- Item 4: Flashcards -->
            <div class="usage-item">
                <div class="usage-info">
                    <span class="usage-title"><i class="fas fa-clone" style="color: #f59e0b; margin-right: 8px;"></i>Generador Flashcards</span>
                    <span class="usage-count-val">${fcUsed}/${fcLimit}</span>
                </div>
                <div class="usage-progress-bg">
                    <div class="usage-progress-bar" style="width: ${fcPct}%; background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);"></div>
                </div>
                <div class="usage-footer">
                    <span>Cuota Mensual</span>
                    <span style="color: #fbbf24; font-weight: 600;">Quedan: ${fcRemaining}</span>
                </div>
            </div>
        `;
    } else {
        // Plan Free / Pending
        const usageCount = user.usageCount !== undefined ? user.usageCount : (user.usage_count || 0);
        const maxFreeLimit = user.maxFreeLimit !== undefined ? user.maxFreeLimit : (user.max_free_limit || 50);
        const remaining = Math.max(0, maxFreeLimit - usageCount);
        const pct = Math.min(100, (remaining / maxFreeLimit) * 100);

        container.innerHTML = `
            <div class="usage-item" style="grid-column: 1 / -1;">
                <div class="usage-info">
                    <span class="usage-title"><i class="fas fa-bolt" style="color: #fbbf24; margin-right: 8px;"></i>Créditos de Prueba del Sistema (Vidas)</span>
                    <span class="usage-count-val" style="color: #fbbf24;">${remaining}/${maxFreeLimit}</span>
                </div>
                <div class="usage-progress-bg" style="height: 10px; margin: 0.5rem 0;">
                    <div class="usage-progress-bar" style="width: ${pct}%; background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%);"></div>
                </div>
                <div class="usage-footer">
                    <span>Créditos totales de bienvenida para explorar Hub Academia</span>
                    <span style="color: #fbbf24; font-weight: 800;">Quedan: ${remaining} créditos</span>
                </div>
            </div>
        `;
    }
}