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
    emailEl.innerHTML = `${user.email} <i class="fas fa-check-circle" style="color: #10b981; font-size: 0.9rem; margin-left: 5px;" title="Verificado vía Google"></i>`;

    const badgeContainer = document.getElementById('plan-badge-container');
    const tier = String(user.subscriptionTier || 'free').toLowerCase();

    if (user.role === 'admin') {
        badgeContainer.innerHTML = '<span class="badge-premium" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white;"><i class="fas fa-shield-alt"></i> Administrador</span>';
    } else if (tier === 'advanced') {
        badgeContainer.innerHTML = '<span class="badge-premium" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #000; font-weight: 800;"><i class="fas fa-crown"></i> Plan Advanced</span>';
    } else if (tier === 'basic') {
        badgeContainer.innerHTML = '<span class="badge-premium" style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); color: white;"><i class="fas fa-star"></i> Plan Basic</span>';
    } else {
        badgeContainer.innerHTML = '<span class="badge-free"><i class="fas fa-seedling"></i> Plan Gratuito</span>';
    }

    // Update Security & Role Info
    const roleValEl = document.getElementById('user-role-val');
    if (roleValEl) {
        if (user.role === 'admin') roleValEl.textContent = 'Administrador Global';
        else if (user.role === 'teacher') roleValEl.textContent = 'Docente / Facilitador';
        else roleValEl.textContent = 'Estudiante / Usuario Registrado';
    }

    renderSubscriptionDetails(user);
    renderUsageDetails(user);
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
    const isAdmin = user.role === 'admin';

    if (isAdmin) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.15rem; font-weight: 800; color: #fff;">ROL ADMINISTRADOR <i class="fas fa-shield-alt" style="color: #60a5fa;"></i></span>
                    <span style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); padding: 4px 12px; border-radius: 50px; font-size: 0.75rem; font-weight: 700;">ILIMITADO</span>
                </div>
                <div style="color: #94a3b8; font-size: 0.9rem; line-height: 1.5;">
                    <i class="fas fa-check-circle" style="color: #10b981; margin-right: 6px;"></i> Posees acceso total y sin restricciones a todos los servicios de IA y administración.
                </div>
            </div>
        `;
        return;
    }

    if (isPremium) {
        const dateStr = expiresAt ? new Date(expiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Acceso Vitalicio';
        
        let planPerks = '';
        if (tier === 'basic') {
            planPerks = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin: 0.5rem 0; font-size: 0.875rem; color: #cbd5e1;">
                    <div><i class="fas fa-check-circle" style="color: #10b981; margin-right: 8px;"></i> 50 Consultas diarias al Tutor IA Estándar</div>
                    <div><i class="fas fa-check-circle" style="color: #10b981; margin-right: 8px;"></i> 15 Simulacros completos por día</div>
                    <div><i class="fas fa-check-circle" style="color: #10b981; margin-right: 8px;"></i> Flashcards Manuales Ilimitadas</div>
                </div>
            `;
        } else {
            planPerks = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin: 0.5rem 0; font-size: 0.875rem; color: #cbd5e1;">
                    <div><i class="fas fa-check-circle" style="color: #fbbf24; margin-right: 8px;"></i> 100 Consultas diarias al Tutor IA Estándar</div>
                    <div><i class="fas fa-check-circle" style="color: #fbbf24; margin-right: 8px;"></i> 25 Consultas diarias de Especialidad (RAG)</div>
                    <div><i class="fas fa-check-circle" style="color: #fbbf24; margin-right: 8px;"></i> 50 Simulacros completos por día</div>
                    <div><i class="fas fa-check-circle" style="color: #fbbf24; margin-right: 8px;"></i> 30 Generaciones de Flashcards con IA al mes</div>
                </div>
            `;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.2rem; font-weight: 800; color: #fff;">PLAN ${tier.toUpperCase()} <i class="fas fa-check-circle" style="color: #4ade80; margin-left: 4px;"></i></span>
                    <span style="background: rgba(74, 222, 128, 0.1); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.25); padding: 4px 12px; border-radius: 50px; font-size: 0.75rem; font-weight: 700;">ACTIVO</span>
                </div>

                ${planPerks}

                <div style="color: #94a3b8; font-size: 0.875rem; display: flex; align-items: center; gap: 8px;">
                    <i class="far fa-calendar-alt" style="color: #60a5fa;"></i> Vence el: <strong style="color: #f1f5f9;">${dateStr}</strong>
                </div>

                <a href="/pricing" class="btn-action btn-secondary" style="align-self: flex-start; margin-top: 0.25rem;">
                    <i class="fas fa-cog"></i> Administrar Suscripción
                </a>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.15rem; font-weight: 800; color: #94a3b8;">PLAN GRATUITO</span>
                    <span style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25); padding: 4px 12px; border-radius: 50px; font-size: 0.75rem; font-weight: 700;">LIMITADO</span>
                </div>

                <p style="color: #94a3b8; font-size: 0.875rem; line-height: 1.5; margin: 0;">
                    Actualmente cuentas con cuotas restringidas de exploración. Actualiza a un plan Premium para desbloquear simulacros ilimitados y el tutor inteligente.
                </p>

                <a href="/pricing" class="btn-action btn-primary" style="width: 100%; font-size: 0.95rem; padding: 0.85rem;">
                    💎 Activar Plan Basic o Advanced
                </a>
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
        await AuthApiService.updateProfile(newName);
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
 * Genera el HTML simétrico de una tarjeta de consumo
 */
function createUsageCardHTML({ title, icon, colorRGB, badge, countVal, percentage, labelLeft, labelRight }) {
    return `
        <div class="usage-item">
            <div class="usage-item-header">
                <div class="usage-title-group">
                    <div class="usage-icon-pill" style="background: rgba(${colorRGB}, 0.15); color: rgb(${colorRGB});">
                        <i class="${icon}"></i>
                    </div>
                    <div>
                        <div class="usage-title">${title}</div>
                        <span class="usage-badge-tag">${badge}</span>
                    </div>
                </div>
                <div class="usage-count-val" style="color: rgb(${colorRGB});">${countVal}</div>
            </div>
            <div class="usage-progress-bg">
                <div class="usage-progress-bar" style="width: ${percentage}%; background: linear-gradient(90deg, rgb(${colorRGB}) 0%, rgba(${colorRGB}, 0.7) 100%);"></div>
            </div>
            <div class="usage-footer">
                <span class="usage-footer-left">${labelLeft}</span>
                <span class="usage-footer-right" style="color: rgb(${colorRGB});">${labelRight}</span>
            </div>
        </div>
    `;
}

/**
 * Renderiza el consumo detallado de cuotas de IA
 * FILTRADO ESTRICTO SEGÚN EL PLAN (Basic vs Advanced vs Free)
 */
function renderUsageDetails(user) {
    const usageCard = document.getElementById('premium-usage-card');
    const container = document.getElementById('premium-usage-container');
    const planTag = document.getElementById('usage-plan-tag');

    if (!usageCard || !container) return;

    const tier = String(user.subscriptionTier || 'free').toLowerCase();
    const status = user.subscriptionStatus || user.subscription_status;
    const isPremium = tier !== 'free' && status === 'active';
    const isAdmin = user.role === 'admin';

    usageCard.style.display = 'block';

    if (planTag) {
        if (isAdmin) planTag.textContent = 'MODO ADMIN';
        else if (tier === 'advanced') planTag.textContent = 'PLAN ADVANCED';
        else if (tier === 'basic') planTag.textContent = 'PLAN BASIC';
        else planTag.textContent = 'PLAN GRATUITO';
    }

    if (isAdmin) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2.25rem 2rem; background: #121212; border: 1px dashed rgba(255, 255, 255, 0.15); border-radius: 18px;">
                <i class="fas fa-shield-alt" style="font-size: 2.5rem; color: #60a5fa; margin-bottom: 1rem;"></i>
                <h4 style="color: #fff; margin: 0 0 0.5rem 0; font-weight: 700; font-size: 1.15rem;">Acceso Ilimitado de Administrador</h4>
                <p style="color: #94a3b8; font-size: 0.9rem; margin: 0; max-width: 600px; margin: 0 auto; line-height: 1.5;">Como administrador, tu cuenta está exenta de las cuotas y limitaciones estándar de IA en toda la plataforma.</p>
            </div>
        `;
        return;
    }

    const limits = user.limits || {};

    if (isPremium) {
        let cardsHTML = '';

        // 1. Tutor IA Estándar (Basic & Advanced)
        const aiLimit = limits.chat_standard || (tier === 'basic' ? 50 : 100);
        const aiUsed = user.dailyAiUsage !== undefined ? user.dailyAiUsage : (user.daily_ai_usage || 0);
        const aiRemaining = Math.max(0, aiLimit - aiUsed);
        const aiPct = Math.min(100, (aiUsed / aiLimit) * 100);

        cardsHTML += createUsageCardHTML({
            title: 'Tutor de IA Estándar',
            icon: 'fas fa-comments',
            colorRGB: '59, 130, 246', // Blue
            badge: 'Cuota Diaria',
            countVal: `${aiUsed}/${aiLimit}`,
            percentage: aiPct,
            labelLeft: 'Consultas de chat e interpretación',
            labelRight: `Quedan: ${aiRemaining}`
        });

        // 2. Consultas RAG (SOLO PARA ADVANCED)
        if (tier === 'advanced') {
            const ragLimit = limits.daily_rag_limit !== undefined ? limits.daily_rag_limit : 25;
            const ragUsed = user.dailyRagUsage !== undefined ? user.dailyRagUsage : (user.daily_rag_usage || 0);
            const ragRemaining = Math.max(0, ragLimit - ragUsed);
            const ragPct = ragLimit > 0 ? Math.min(100, (ragUsed / ragLimit) * 100) : 0;

            cardsHTML += createUsageCardHTML({
                title: 'Consultas Especialidad (RAG)',
                icon: 'fas fa-brain',
                colorRGB: '20, 184, 166', // Teal
                badge: 'Cuota Diaria (Advanced)',
                countVal: `${ragUsed}/${ragLimit}`,
                percentage: ragPct,
                labelLeft: 'Fundamentación normativa oficial',
                labelRight: `Quedan: ${ragRemaining}`
            });
        }

        // 3. Simuladores (Basic & Advanced)
        const simLimit = limits.simulator || (tier === 'basic' ? 15 : 50);
        const simUsed = user.dailySimulatorUsage !== undefined ? user.dailySimulatorUsage : (user.daily_simulator_usage || 0);
        const simRemaining = Math.max(0, simLimit - simUsed);
        const simPct = Math.min(100, (simUsed / simLimit) * 100);

        cardsHTML += createUsageCardHTML({
            title: 'Simulacros Realizados',
            icon: 'fas fa-stethoscope',
            colorRGB: '139, 92, 246', // Purple
            badge: 'Cuota Diaria',
            countVal: `${simUsed}/${simLimit}`,
            percentage: simPct,
            labelLeft: 'Generación de casos y exámenes',
            labelRight: `Quedan: ${simRemaining}`
        });

        // 4. Flashcards (SOLO PARA ADVANCED)
        if (tier === 'advanced') {
            const fcLimit = limits.monthly_flashcards || 30;
            const fcUsed = user.monthlyFlashcardsUsage !== undefined ? user.monthlyFlashcardsUsage : (user.monthly_flashcards_usage || 0);
            const fcRemaining = Math.max(0, fcLimit - fcUsed);
            const fcPct = Math.min(100, (fcUsed / fcLimit) * 100);

            cardsHTML += createUsageCardHTML({
                title: 'Generador de Flashcards (IA)',
                icon: 'fas fa-clone',
                colorRGB: '245, 158, 11', // Amber
                badge: 'Cuota Mensual (Advanced)',
                countVal: `${fcUsed}/${fcLimit}`,
                percentage: fcPct,
                labelLeft: 'Creación automatizada de mazos con IA',
                labelRight: `Quedan: ${fcRemaining}`
            });
        }

        container.innerHTML = cardsHTML;
    } else {
        // Plan Free / Pending
        const usageCount = user.usageCount !== undefined ? user.usageCount : (user.usage_count || 0);
        const maxFreeLimit = user.maxFreeLimit !== undefined ? user.maxFreeLimit : (user.max_free_limit || 20);
        const remaining = Math.max(0, maxFreeLimit - usageCount);
        const pct = Math.min(100, (remaining / maxFreeLimit) * 100);

        const lastRenewalStr = user.lastFreeRenewal || user.last_free_renewal;
        let renewalDateText = "";
        if (lastRenewalStr) {
            try {
                const lastRenewalDate = new Date(lastRenewalStr);
                const nextRenewalDate = new Date(lastRenewalDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                const options = { weekday: 'long', day: 'numeric', month: 'long' };
                const formattedDate = nextRenewalDate.toLocaleDateString('es-ES', options);
                renewalDateText = `Próximo reinicio: ${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}`;
            } catch (e) {
                console.warn('⚠️ Error al formatear fecha de renovación:', e);
            }
        }

        container.innerHTML = `
            <div class="usage-item" style="grid-column: 1 / -1;">
                <div class="usage-item-header">
                    <div class="usage-title-group">
                        <div class="usage-icon-pill" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">
                            <i class="fas fa-bolt"></i>
                        </div>
                        <div>
                            <div class="usage-title">Créditos Semanales (Pool de Vidas)</div>
                            <span class="usage-badge-tag">Cuota Semanal de Exploración</span>
                        </div>
                    </div>
                    <div class="usage-count-val" style="color: #f59e0b;">${remaining}/${maxFreeLimit}</div>
                </div>
                <div class="usage-progress-bg">
                    <div class="usage-progress-bar" style="width: ${pct}%; background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);"></div>
                </div>
                <div class="usage-footer">
                    <span class="usage-footer-left">Créditos disponibles para simulacros e interacciones de IA</span>
                    <span class="usage-footer-right" style="color: #fbbf24;">Quedan: ${remaining} créditos</span>
                </div>
                ${renewalDateText ? `
                <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed rgba(255,255,255,0.08); font-size: 0.825rem; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <span><i class="far fa-calendar-alt" style="margin-right: 6px; color: #60a5fa;"></i>Reinicio automático cada 7 días.</span>
                    <span style="color: #60a5fa; font-weight: 600;">${renewalDateText}</span>
                </div>
                ` : ''}
            </div>
        `;
    }
}