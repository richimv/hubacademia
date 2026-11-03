if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        // Check Auth
        if (window.sessionManager) {
            await window.sessionManager.initialize();
        }
        const user = window.sessionManager ? window.sessionManager.getUser() : null;

        if (!user) {
            if (typeof window !== 'undefined' && window.location) {
                window.location.href = '/login';
            }
            return;
        }

        // Fill Data
        const nameEl = document.getElementById('user-name');
        if (nameEl) nameEl.textContent = user.name || 'Usuario';
        const emailEl = document.getElementById('user-email');
        if (emailEl) emailEl.textContent = user.email || '';

        const avatarBadge = document.getElementById('user-avatar-badge');
        if (avatarBadge) {
            const displayName = user.name || 'Usuario';
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`;
            const rawPhoto = user.picture || user.avatar_url || user.avatarUrl;
            let safePhotoUrl = fallbackAvatar;
            if (rawPhoto && typeof rawPhoto === 'string') {
                const trimmed = rawPhoto.trim();
                if (trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined') {
                    safePhotoUrl = getSafeProfileImageUrl(trimmed) || fallbackAvatar;
                }
            }

            const image = document.createElement('img');
            image.src = safePhotoUrl;
            image.alt = displayName;
            image.className = 'profile-avatar-img';
            image.referrerPolicy = 'no-referrer';
            image.onerror = () => {
                image.onerror = null;
                image.src = fallbackAvatar;
            };
            avatarBadge.replaceChildren(image);
        }

        const badgeContainer = document.getElementById('plan-badge-container');
        const tier = String(user.subscriptionTier || 'free').toLowerCase();

        if (user.role === 'admin') {
            badgeContainer.innerHTML = '<span class="badge-premium" style="background: var(--primary);"><i class="fas fa-shield-alt"></i> Administrador Global</span>';
        } else if (tier === 'advanced') {
            badgeContainer.innerHTML = '<span class="badge-premium" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff;"><i class="fas fa-crown"></i> Plan Advanced</span>';
        } else if (tier === 'basic') {
            badgeContainer.innerHTML = '<span class="badge-premium"><i class="fas fa-star"></i> Plan Basic</span>';
        } else {
            badgeContainer.innerHTML = '<span class="badge-free">Plan Gratuito</span>';
        }

        // Update Security & Role Info
        const roleValEl = document.getElementById('user-role-val');
        if (roleValEl) {
            if (user.role === 'admin') roleValEl.textContent = 'Administrador Global';
            else if (user.role === 'teacher') roleValEl.textContent = 'Docente';
            else roleValEl.textContent = 'Estudiante';
        }

        const isVerified = user.emailVerified !== false;
        updateEmailVerificationUI(isVerified, user.email);
        setupProfileOtpModal(user);
        setupChangePasswordModal(user);
        setupDeleteModal();
        setupEditNameModal();

        renderSubscriptionDetails(user);
        renderUsageDetails(user);
    });
}

function getSafeProfileImageUrl(value) {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return null;
    try {
        const url = new URL(trimmed, window.location.origin);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch (error) {
        return null;
    }
}

/**
 * Calcula la fecha de la próxima renovación mensual (cada 30 días) para usuarios Free
 * @param {Object} user - Objeto de usuario
 * @returns {{ formattedDate: string, daysLeft: number }}
 */
function getNextFreeRenewalInfo(user) {
    const RENEWAL_DAYS = 30;
    const lastRenewalStr = user.lastFreeRenewal || user.last_free_renewal;
    if (!lastRenewalStr) {
        return { formattedDate: "Cada 30 días", daysLeft: RENEWAL_DAYS };
    }

    try {
        const lastRenewalDate = new Date(lastRenewalStr);
        const nextRenewalDate = new Date(lastRenewalDate.getTime() + RENEWAL_DAYS * 24 * 60 * 60 * 1000);
        const now = new Date();
        const diffMs = nextRenewalDate.getTime() - now.getTime();
        const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        const rawDate = nextRenewalDate.toLocaleDateString('es-ES', options);
        const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

        return { formattedDate, daysLeft };
    } catch (e) {
        console.warn('⚠️ Error al calcular fecha de renovación:', e);
        return { formattedDate: "Cada 30 días", daysLeft: RENEWAL_DAYS };
    }
}

/**
 * Renderiza los detalles de la suscripción
 */
function renderSubscriptionDetails(user) {
    const container = document.getElementById('subscription-status-container');
    if (!container) return;

    const rawTier = String(user.subscriptionTier || 'free').toLowerCase();
    const tier = ['basic', 'advanced'].includes(rawTier) ? rawTier : 'free';
    const expiresAt = user.subscriptionExpiresAt;
    const status = user.subscriptionStatus || user.subscription_status;

    const isPremium = tier !== 'free' && status === 'active';
    const isAdmin = user.role === 'admin';

    if (isAdmin) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.1rem; font-weight: 800; color: var(--text-main);">ROL ADMINISTRADOR</span>
                    <span style="background: var(--primary-glow); color: var(--primary); border: 1px solid var(--border-hover); padding: 4px 12px; border-radius: 50px; font-size: 0.72rem; font-weight: 700;">ILIMITADO</span>
                </div>
                <div style="color: var(--text-secondary); font-size: 0.875rem; line-height: 1.5;">
                    Posees acceso total y sin restricciones a todos los servicios de IA y administración de la plataforma.
                </div>
            </div>
        `;
        return;
    }

    if (isPremium) {
        const dateStr = expiresAt ? new Date(expiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Acceso Activo';
        
        let planPerks = '';
        if (tier === 'basic') {
            planPerks = `
                <div style="display: flex; flex-direction: column; gap: 0.45rem; margin: 0.25rem 0; font-size: 0.85rem; color: var(--text-secondary);">
                    <div>• 50 Consultas diarias al Tutor IA</div>
                    <div>• 15 Simulacros completos por día</div>
                    <div>• Flashcards Manuales Ilimitadas</div>
                </div>
            `;
        } else {
            planPerks = `
                <div style="display: flex; flex-direction: column; gap: 0.45rem; margin: 0.25rem 0; font-size: 0.85rem; color: var(--text-secondary);">
                    <div>• 100 Consultas diarias al Tutor IA</div>
                    <div>• 25 Consultas diarias de Especialidad (RAG)</div>
                    <div>• 50 Simulacros completos por día</div>
                    <div>• 30 Generaciones de Flashcards con IA al mes</div>
                </div>
            `;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.15rem; font-weight: 800; color: var(--text-main);">PLAN ${tier.toUpperCase()}</span>
                    <span style="background: var(--success-bg); color: var(--success); border: 1px solid var(--success-border); padding: 4px 12px; border-radius: 50px; font-size: 0.72rem; font-weight: 700;">ACTIVO</span>
                </div>

                ${planPerks}

                <div style="color: var(--text-secondary); font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
                    <i class="far fa-calendar-alt" style="color: var(--primary);"></i> Vence el: <strong style="color: var(--text-main);">${dateStr}</strong>
                </div>

                <a href="/pricing" class="btn-action btn-secondary" style="align-self: flex-start; margin-top: 0.25rem; text-decoration: none;">
                    Administrar Suscripción
                </a>
            </div>
        `;
    } else {
        const renewalInfo = getNextFreeRenewalInfo(user);

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.1rem; font-weight: 800; color: var(--text-main);">PLAN GRATUITO</span>
                    <span style="background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning-border); padding: 4px 12px; border-radius: 50px; font-size: 0.72rem; font-weight: 700;">10 VIDAS / MES</span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.85rem; color: var(--text-secondary);">
                    <div>• <strong>10 Créditos mensuales</strong> para simuladores y tutorías</div>
                    <div>• <strong>Recarga automática</strong> cada 30 días</div>
                </div>

                <div class="renewal-banner">
                    <i class="far fa-calendar-check"></i>
                    <div class="renewal-banner-text">
                        Próxima recarga: <strong>${renewalInfo.formattedDate}</strong>
                    </div>
                </div>

                <a href="/pricing" class="btn-action btn-primary" style="width: 100%; margin-top: 0.25rem; text-align: center; text-decoration: none;">
                    Activar Plan Basic o Advanced
                </a>
            </div>
        `;
    }
}

/**
 * Controladores del Modal de Eliminación de Cuenta
 */
function openDeleteModal() {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('delete-modal');
    const deleteInput = document.getElementById('delete-password');
    const deleteError = document.getElementById('delete-error');
    if (modal) modal.style.display = 'flex';
    if (deleteInput) deleteInput.value = '';
    if (deleteError) deleteError.style.display = 'none';
    const btn = document.getElementById('confirm-delete-btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-trash-alt"></i> Sí, eliminar cuenta';
        btn.disabled = false;
    }
    if (deleteInput) deleteInput.focus();
}

function closeDeleteModal() {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('delete-modal');
    if (modal) modal.style.display = 'none';
}

function setupDeleteModal() {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('delete-modal');
    const deleteInput = document.getElementById('delete-password');
    const deleteError = document.getElementById('delete-error');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    if (modal && (!modal.dataset || !modal.dataset.bound)) {
        if (modal.dataset) modal.dataset.bound = 'true';
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeDeleteModal();
        });
    }

    if (confirmDeleteBtn && (!confirmDeleteBtn.dataset || !confirmDeleteBtn.dataset.bound)) {
        if (confirmDeleteBtn.dataset) confirmDeleteBtn.dataset.bound = 'true';
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!deleteInput || deleteInput.value !== 'ELIMINAR') {
                if (deleteError) {
                    deleteError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Debes escribir "ELIMINAR" textualmente.';
                    deleteError.style.display = 'block';
                }
                return;
            }

            confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
            confirmDeleteBtn.disabled = true;

            try {
                await AuthApiService.deleteAccount();
                await window.sessionManager.logout();
            } catch (error) {
                console.error(error);
                if (deleteError) {
                    deleteError.textContent = error.message || 'Error al eliminar cuenta';
                    deleteError.style.display = 'block';
                }
                confirmDeleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Sí, eliminar cuenta';
                confirmDeleteBtn.disabled = false;
            }
        });
    }
}

/**
 * Controladores del Modal de Edición de Nombre
 * Incluye verificación preventiva de cooldown (7 días entre cambios).
 */
function openEditNameModal() {
    if (typeof document === 'undefined') return;
    const editNameModal = document.getElementById('edit-name-modal');
    const newNameInput = document.getElementById('new-name-input');
    const editNameError = document.getElementById('edit-name-error');
    const confirmBtn = document.getElementById('confirm-edit-name-btn');
    if (editNameModal) editNameModal.style.display = 'flex';
    const currentNameEl = document.getElementById('user-name');
    const currentName = currentNameEl ? currentNameEl.textContent : '';
    if (newNameInput) {
        newNameInput.value = currentName !== 'Cargando...' ? currentName : '';
        newNameInput.focus();
    }
    if (editNameError) editNameError.style.display = 'none';

    // 🛡️ Verificación preventiva de cooldown de 7 días
    try {
        const user = window.sessionManager ? window.sessionManager.getUser() : null;
        if (user && user.lastNameChangeAt && user.role !== 'admin') {
            const lastChange = new Date(user.lastNameChangeAt);
            const now = new Date();
            const diffMs = Math.abs(now - lastChange);
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays < 7) {
                const remaining = 7 - diffDays;
                if (editNameError) {
                    editNameError.innerHTML = `<i class="fas fa-clock"></i> Solo puedes cambiar tu nombre una vez por semana. Faltan ${remaining} día${remaining !== 1 ? 's' : ''}.`;
                    editNameError.style.display = 'block';
                    editNameError.style.color = '#e67e22';
                }
                if (newNameInput) {
                    newNameInput.disabled = true;
                    newNameInput.style.opacity = '0.6';
                }
                if (confirmBtn) {
                    confirmBtn.disabled = true;
                    confirmBtn.style.opacity = '0.5';
                    confirmBtn.style.cursor = 'not-allowed';
                }
                return;
            }
        }
    } catch (_) { /* Si no se puede verificar, permitir intento normal */ }

    // Restaurar estado normal si no hay cooldown activo
    if (newNameInput) {
        newNameInput.disabled = false;
        newNameInput.style.opacity = '1';
    }
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
        confirmBtn.style.cursor = 'pointer';
    }
}

function closeEditNameModal() {
    if (typeof document === 'undefined') return;
    const editNameModal = document.getElementById('edit-name-modal');
    if (editNameModal) editNameModal.style.display = 'none';
}

async function submitNameChange() {
    if (typeof document === 'undefined') return;
    const newNameInput = document.getElementById('new-name-input');
    const editNameError = document.getElementById('edit-name-error');
    if (!newNameInput) return;
    const newName = newNameInput.value.trim();
    if (newName.length < 2) {
        if (editNameError) {
            editNameError.textContent = 'El nombre debe tener al menos 2 caracteres.';
            editNameError.style.display = 'block';
            editNameError.style.color = '';
        }
        return;
    }

    const btn = document.getElementById('confirm-edit-name-btn');
    if (btn) {
        btn.textContent = 'Guardando...';
        btn.disabled = true;
    }

    try {
        await AuthApiService.updateProfile(newName);
        // Actualizar UI
        const nameEl = document.getElementById('user-name');
        if (nameEl) nameEl.textContent = newName;
        // Actualizar sesión local con nombre y timestamp del cambio
        if (window.sessionManager) {
            const user = window.sessionManager.getUser();
            if (user) {
                user.name = newName;
                user.lastNameChangeAt = new Date().toISOString();
                window.sessionManager.setUser(user);
            }
        }
        if (typeof window !== 'undefined' && window.uiManager && typeof window.uiManager.showToast === 'function') {
            window.uiManager.showToast('Nombre de perfil actualizado con éxito.', 'success');
        }
        closeEditNameModal();
    } catch (error) {
        // 🛡️ Distinguir errores de regla de negocio vs errores técnicos
        const isCooldownError = error.message && error.message.includes('Solo puedes cambiar tu nombre');
        if (isCooldownError) {
            console.warn('[Perfil] Cooldown de cambio de nombre activo:', error.message);
        } else {
            console.error('[Perfil] Error al actualizar nombre:', error);
        }
        if (editNameError) {
            editNameError.textContent = error.message || 'Error al actualizar el nombre.';
            editNameError.style.display = 'block';
            editNameError.style.color = isCooldownError ? '#e67e22' : '';
        }
    } finally {
        if (btn) {
            btn.textContent = 'Guardar Cambios';
            btn.disabled = false;
        }
    }
}

function setupEditNameModal() {
    if (typeof document === 'undefined') return;
    const editNameModal = document.getElementById('edit-name-modal');
    const newNameInput = document.getElementById('new-name-input');
    const confirmEditNameBtn = document.getElementById('confirm-edit-name-btn');

    if (editNameModal && (!editNameModal.dataset || !editNameModal.dataset.bound)) {
        if (editNameModal.dataset) editNameModal.dataset.bound = 'true';
        editNameModal.addEventListener('click', (e) => {
            if (e.target === editNameModal) closeEditNameModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && editNameModal.style.display === 'flex') {
                closeEditNameModal();
            }
        });
    }

    if (confirmEditNameBtn && (!confirmEditNameBtn.dataset || !confirmEditNameBtn.dataset.bound)) {
        if (confirmEditNameBtn.dataset) confirmEditNameBtn.dataset.bound = 'true';
        confirmEditNameBtn.addEventListener('click', (e) => {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
            submitNameChange();
        });
    }

    if (newNameInput && (!newNameInput.dataset || !newNameInput.dataset.bound)) {
        if (newNameInput.dataset) newNameInput.dataset.bound = 'true';
        newNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitNameChange();
            }
        });
    }
}

/**
 * Genera el componente HTML para una tarjeta de métrica de consumo
 */
function createUsageCardHTML({ title, colorHex, badge, countVal, percentage, labelLeft, labelRight }) {
    return `
        <div class="usage-item">
            <div class="usage-item-header">
                <div class="usage-title-group">
                    <div class="usage-title-text-wrap">
                        <div class="usage-title">${title}</div>
                        <span class="usage-badge-tag">${badge}</span>
                    </div>
                </div>
                <div class="usage-count-val" style="color: ${colorHex};">${countVal}</div>
            </div>
            <div class="usage-progress-bg">
                <div class="usage-progress-bar" style="width: ${percentage}%; background: ${colorHex};"></div>
            </div>
            <div class="usage-footer">
                <span class="usage-footer-left">${labelLeft}</span>
                <span class="usage-footer-right" style="color: ${colorHex}; font-weight: 600;">${labelRight}</span>
            </div>
        </div>
    `;
}

/**
 * Renderiza el consumo detallado de cuotas
 */
function renderUsageDetails(user) {
    const usageCard = document.getElementById('premium-usage-card');
    const container = document.getElementById('premium-usage-container');
    const planTag = document.getElementById('usage-plan-tag');
    const titleEl = document.getElementById('usage-section-title');
    const subtitleEl = document.getElementById('usage-section-subtitle');

    if (!usageCard || !container) return;

    const rawTier = String(user.subscriptionTier || 'free').toLowerCase();
    const tier = ['basic', 'advanced'].includes(rawTier) ? rawTier : 'free';
    const status = user.subscriptionStatus || user.subscription_status;
    const isPremium = tier !== 'free' && status === 'active';
    const isAdmin = user.role === 'admin';

    usageCard.style.display = 'block';

    if (planTag) {
        if (isAdmin) planTag.textContent = 'ADMINISTRADOR';
        else if (tier === 'advanced') planTag.textContent = 'PLAN ADVANCED';
        else if (tier === 'basic') planTag.textContent = 'PLAN BASIC';
        else planTag.textContent = 'PLAN GRATUITO';
    }

    if (isAdmin) {
        if (titleEl) titleEl.textContent = 'Acceso de Administrador';
        if (subtitleEl) subtitleEl.textContent = 'Permisos globales para todos los módulos y herramientas de la plataforma.';

        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; background: var(--bg-tertiary); border: 1px dashed var(--border-color); border-radius: 14px;">
                <h4 style="color: var(--text-main); margin: 0 0 0.4rem 0; font-weight: 700; font-size: 1.05rem;">Acceso Ilimitado de Administrador</h4>
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0 auto; max-width: 540px; line-height: 1.5;">Tu cuenta posee permisos globales y acceso sin restricciones ni límites de cuota en todas las funciones de IA.</p>
            </div>
        `;
        return;
    }

    const limits = user.limits || {};

    if (isPremium) {
        if (titleEl) titleEl.textContent = 'Consumo de Servicios IA';
        if (subtitleEl) subtitleEl.textContent = 'Monitoreo en tiempo real de las cuotas asignadas a tu nivel de membresía actual.';

        let cardsHTML = '';

        // 1. Tutor IA Estándar (Basic & Advanced)
        const aiLimit = limits.chat_standard || (tier === 'basic' ? 50 : 100);
        const aiUsed = user.dailyAiUsage !== undefined ? user.dailyAiUsage : (user.daily_ai_usage || 0);
        const aiRemaining = Math.max(0, aiLimit - aiUsed);
        const aiPct = Math.min(100, (aiUsed / aiLimit) * 100);

        cardsHTML += createUsageCardHTML({
            title: 'Tutor de IA Estándar',
            colorHex: 'var(--primary)',
            badge: 'Diario',
            countVal: `${aiUsed} / ${aiLimit}`,
            percentage: aiPct,
            labelLeft: 'Interacciones con Tutor IA',
            labelRight: `Disponibles: ${aiRemaining}`
        });

        // 2. Consultas RAG (SOLO PARA ADVANCED)
        if (tier === 'advanced') {
            const ragLimit = limits.daily_rag_limit !== undefined ? limits.daily_rag_limit : 25;
            const ragUsed = user.dailyRagUsage !== undefined ? user.dailyRagUsage : (user.daily_rag_usage || 0);
            const ragRemaining = Math.max(0, ragLimit - ragUsed);
            const ragPct = ragLimit > 0 ? Math.min(100, (ragUsed / ragLimit) * 100) : 0;

            cardsHTML += createUsageCardHTML({
                title: 'Consultas RAG Especializadas',
                colorHex: 'var(--accent-teal)',
                badge: 'Diario (Advanced)',
                countVal: `${ragUsed} / ${ragLimit}`,
                percentage: ragPct,
                labelLeft: 'Base de conocimiento oficial',
                labelRight: `Disponibles: ${ragRemaining}`
            });
        }

        // 3. Simuladores (Basic & Advanced)
        const simLimit = limits.simulator || (tier === 'basic' ? 15 : 50);
        const simUsed = user.dailySimulatorUsage !== undefined ? user.dailySimulatorUsage : (user.daily_simulator_usage || 0);
        const simRemaining = Math.max(0, simLimit - simUsed);
        const simPct = Math.min(100, (simUsed / simLimit) * 100);

        cardsHTML += createUsageCardHTML({
            title: 'Simulacros y Exámenes',
            colorHex: 'var(--accent-purple)',
            badge: 'Diario',
            countVal: `${simUsed} / ${simLimit}`,
            percentage: simPct,
            labelLeft: 'Evaluaciones rendidas hoy',
            labelRight: `Disponibles: ${simRemaining}`
        });

        // 4. Flashcards (SOLO PARA ADVANCED)
        if (tier === 'advanced') {
            const fcLimit = limits.monthly_flashcards || 30;
            const fcUsed = user.monthlyFlashcardsUsage !== undefined ? user.monthlyFlashcardsUsage : (user.monthly_flashcards_usage || 0);
            const fcRemaining = Math.max(0, fcLimit - fcUsed);
            const fcPct = Math.min(100, (fcUsed / fcLimit) * 100);

            cardsHTML += createUsageCardHTML({
                title: 'Generador de Flashcards',
                colorHex: 'var(--warning)',
                badge: 'Mensual (Advanced)',
                countVal: `${fcUsed} / ${fcLimit}`,
                percentage: fcPct,
                labelLeft: 'Creación de mazos con IA',
                labelRight: `Disponibles: ${fcRemaining}`
            });
        }

        container.innerHTML = cardsHTML;
    } else {
        // Plan Free / Pending
        if (titleEl) titleEl.textContent = 'Créditos de Vidas Mensuales';
        if (subtitleEl) subtitleEl.textContent = 'Tus créditos se recargan automáticamente a 10 cada 30 días para practicar en simulacros y consultar al Tutor IA.';

        const isVerified = user.emailVerified !== false;
        const usageCount = user.usageCount !== undefined ? user.usageCount : (user.usage_count || 0);
        const maxFreeLimit = user.maxFreeLimit !== undefined ? user.maxFreeLimit : (user.max_free_limit || 10);
        const remaining = isVerified ? Math.max(0, maxFreeLimit - usageCount) : 0;
        const pct = isVerified ? Math.min(100, (remaining / maxFreeLimit) * 100) : 0;
        
        let colorHex = 'var(--success)';
        if (!isVerified) {
            colorHex = 'var(--warning)';
        } else if (remaining <= 2 && remaining > 0) {
            colorHex = 'var(--warning)';
        } else if (remaining === 0) {
            colorHex = 'var(--danger)';
        }

        const countText = isVerified ? `${remaining} / ${maxFreeLimit}` : `0 / ${maxFreeLimit}`;
        const rightFooter = isVerified
            ? `Disponibles: ${remaining} vidas`
            : `Bloqueadas: Confirma tu correo`;

        container.innerHTML = `
            <div class="usage-item" style="grid-column: 1 / -1;">
                <div class="usage-item-header">
                    <div class="usage-title-group">
                        <div class="usage-title-text-wrap">
                            <div class="usage-title">Créditos de Exploración Disponibles</div>
                            <span class="usage-badge-tag">${isVerified ? 'Recarga Mensual (10 Vidas)' : 'Cuenta No Confirmada (0 Vidas)'}</span>
                        </div>
                    </div>
                    <div class="usage-count-val" style="color: ${colorHex}; font-size: 1.25rem; font-weight: 800;">${countText}</div>
                </div>
                <div class="usage-progress-bg">
                    <div class="usage-progress-bar" style="width: ${pct}%; background: ${colorHex};"></div>
                </div>
                <div class="usage-footer">
                    <span class="usage-footer-left">Consumidos este mes: ${usageCount}</span>
                    <span class="usage-footer-right" style="color: ${colorHex}; font-weight: 600;">${rightFooter}</span>
                </div>
            </div>
        `;
    }
}

/**
 * Actualiza la UI de verificación de correo en el perfil
 */
function updateEmailVerificationUI(isVerified, email) {
    if (typeof document === 'undefined') return;

    const banner = document.getElementById('unverified-email-banner');
    if (banner) {
        banner.style.display = isVerified ? 'none' : 'flex';
    }

    const badgeContainer = document.getElementById('email-verification-badge-container');
    if (badgeContainer) {
        if (isVerified) {
            badgeContainer.innerHTML = '<span class="badge-status-active"><i class="fas fa-check-circle"></i> Cuenta Verificada</span>';
        } else {
            badgeContainer.innerHTML = '<button type="button" onclick="openProfileOtpModal()" class="badge-status-unverified" title="Haz clic para verificar tu correo con código OTP"><i class="fas fa-exclamation-triangle"></i> Correo No Verificado &bull; Verificar</button>';
        }
    }

    const identityStatus = document.getElementById('user-identity-status-val');
    if (identityStatus) {
        if (isVerified) {
            identityStatus.className = 'security-row-val text-success';
            identityStatus.style.color = 'var(--success)';
            identityStatus.innerHTML = '<i class="fas fa-check-circle" style="margin-right: 6px;"></i> Activa y Verificada';
        } else {
            identityStatus.className = 'security-row-val text-warning';
            identityStatus.style.color = 'var(--warning)';
            identityStatus.innerHTML = '<i class="fas fa-clock" style="margin-right: 6px;"></i> Pendiente de Verificación';
        }
    }
}

// Variables para el control de OTP en Perfil
let profileOtpCountdownInterval = null;
let profileOtpCountdownSeconds = 0;
let profileOtpUserEmail = '';

function resolveSupabaseClient() {
    if (typeof window !== 'undefined') {
        if (window.supabaseClient) return window.supabaseClient;
        if (typeof window.getSupabaseClient === 'function' && window.getSupabaseClient !== resolveSupabaseClient) {
            return window.getSupabaseClient();
        }
        if (typeof supabase !== 'undefined' && window.AppConfig) {
            window.supabaseClient = supabase.createClient(window.AppConfig.SUPABASE_URL, window.AppConfig.SUPABASE_ANON_KEY);
            return window.supabaseClient;
        }
    }
    return null;
}

function maskEmailForDisplay(raw) {
    if (!raw || !raw.includes('@')) return raw;
    const [name, domain] = raw.split('@');
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.substring(0, 2)}***@${domain}`;
}

function setupProfileOtpModal(user) {
    if (typeof document === 'undefined' || !user) return;
    profileOtpUserEmail = user.email || '';

    const otpHiddenInput = document.getElementById('otp-hidden-input');
    const otpVerifyBtn = document.getElementById('btn-otp-verify');
    const otpResendBtn = document.getElementById('btn-otp-resend');
    const otpFeedback = document.getElementById('otp-feedback');
    const otpContainer = document.getElementById('otp-boxes-container');

    if (otpContainer && otpHiddenInput) {
        otpContainer.addEventListener('click', () => {
            otpHiddenInput.focus();
        });
    }

    if (otpHiddenInput) {
        otpHiddenInput.addEventListener('input', () => {
            const rawVal = otpHiddenInput.value.replace(/[^0-9]/g, '').slice(0, 8);
            otpHiddenInput.value = rawVal;
            renderProfileOtpBoxes(rawVal);

            if (otpFeedback) otpFeedback.style.display = 'none';

            if (otpVerifyBtn) {
                otpVerifyBtn.disabled = rawVal.length < 6;
            }

            if (rawVal.length === 8) {
                handleProfileOtpVerification();
            }
        });
    }

    if (otpVerifyBtn) {
        otpVerifyBtn.onclick = handleProfileOtpVerification;
    }

    if (otpResendBtn) {
        otpResendBtn.onclick = handleProfileOtpResend;
    }
}

function renderProfileOtpBoxes(value) {
    if (typeof document === 'undefined') return;
    const otpBoxes = Array.from(document.querySelectorAll('#otp-modal .otp-box'));
    if (!otpBoxes || otpBoxes.length === 0) return;
    otpBoxes.forEach((box, idx) => {
        const digit = value[idx] || '';
        const digitEl = box.querySelector('.otp-digit');
        if (digitEl) digitEl.textContent = digit;

        if (digit) {
            box.classList.add('filled');
        } else {
            box.classList.remove('filled');
        }

        if (idx === value.length && value.length < 8) {
            box.classList.add('active');
        } else {
            box.classList.remove('active');
        }
    });
}

function showProfileOtpFeedback(message, type = 'error') {
    if (typeof document === 'undefined') return;
    const otpFeedback = document.getElementById('otp-feedback');
    if (!otpFeedback) return;
    otpFeedback.textContent = message;
    otpFeedback.className = `otp-feedback otp-feedback-${type}`;
    otpFeedback.style.display = 'block';
}

function startProfileOtpCooldown(seconds = 60) {
    if (profileOtpCountdownInterval) {
        clearInterval(profileOtpCountdownInterval);
    }

    profileOtpCountdownSeconds = seconds;
    updateProfileOtpCooldownUI();

    profileOtpCountdownInterval = setInterval(() => {
        profileOtpCountdownSeconds -= 1;
        updateProfileOtpCooldownUI();

        if (profileOtpCountdownSeconds <= 0) {
            clearInterval(profileOtpCountdownInterval);
            profileOtpCountdownInterval = null;
        }
    }, 1000);
}

function updateProfileOtpCooldownUI() {
    if (typeof document === 'undefined') return;
    const otpCountdownText = document.getElementById('otp-countdown-text');
    const otpResendBtn = document.getElementById('btn-otp-resend');
    if (!otpCountdownText || !otpResendBtn) return;

    if (profileOtpCountdownSeconds > 0) {
        otpCountdownText.style.display = 'inline';
        otpCountdownText.innerHTML = `Reenviar nuevo código en <strong>${profileOtpCountdownSeconds}s</strong>`;
        otpResendBtn.style.display = 'none';
    } else {
        otpCountdownText.style.display = 'none';
        otpResendBtn.style.display = 'inline-flex';
        otpResendBtn.disabled = false;
    }
}

function openProfileOtpModal() {
    if (typeof document === 'undefined') return;
    const user = (typeof window !== 'undefined' && window.sessionManager) ? window.sessionManager.getUser() : null;
    if (user && user.email) {
        profileOtpUserEmail = user.email;
    }

    const modal = document.getElementById('otp-modal');
    const emailDisplay = document.getElementById('otp-email-display');
    const otpHiddenInput = document.getElementById('otp-hidden-input');
    const otpFeedback = document.getElementById('otp-feedback');
    const otpVerifyBtn = document.getElementById('btn-otp-verify');

    if (emailDisplay) {
        emailDisplay.textContent = maskEmailForDisplay(profileOtpUserEmail);
    }
    if (otpHiddenInput) {
        otpHiddenInput.value = '';
        renderProfileOtpBoxes('');
    }
    if (otpFeedback) otpFeedback.style.display = 'none';
    if (otpVerifyBtn) otpVerifyBtn.disabled = true;

    if (modal) {
        modal.style.display = 'flex';
    }

    startProfileOtpCooldown(60);

    setTimeout(() => {
        if (otpHiddenInput) otpHiddenInput.focus();
    }, 200);
}

function closeProfileOtpModal() {
    if (profileOtpCountdownInterval) {
        clearInterval(profileOtpCountdownInterval);
        profileOtpCountdownInterval = null;
    }
    if (typeof document !== 'undefined') {
        const modal = document.getElementById('otp-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

async function handleProfileOtpVerification() {
    const client = resolveSupabaseClient();
    if (!client || !profileOtpUserEmail) return;

    const otpHiddenInput = document.getElementById('otp-hidden-input');
    const otpVerifyBtn = document.getElementById('btn-otp-verify');
    const token = (otpHiddenInput?.value || '').trim();

    if (typeof window !== 'undefined' && window.AuthValidation) {
        const val = window.AuthValidation.validateOtpToken(token);
        if (!val.valid) {
            showProfileOtpFeedback(val.error || 'Código incorrecto.', 'error');
            return;
        }
    }

    const originalBtnHTML = otpVerifyBtn ? otpVerifyBtn.innerHTML : '';
    if (otpVerifyBtn) {
        otpVerifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        otpVerifyBtn.disabled = true;
    }

    try {
        let { data, error } = await client.auth.verifyOtp({
            email: profileOtpUserEmail,
            token: token,
            type: 'signup'
        });

        if (error) {
            const retry = await client.auth.verifyOtp({
                email: profileOtpUserEmail,
                token: token,
                type: 'email'
            });
            if (retry.error) throw retry.error;
            data = retry.data;
        }

        showProfileOtpFeedback('¡Correo verificado con éxito! 🎉', 'success');
        if (otpVerifyBtn) {
            otpVerifyBtn.innerHTML = '<i class="fas fa-check"></i> ¡Verificado!';
        }

        // Sincronizar usuario con el backend y actualizar sesión local
        if (typeof window !== 'undefined' && window.sessionManager) {
            const currentUser = window.sessionManager.getUser();
            if (currentUser) {
                currentUser.emailVerified = true;
            }
            if (typeof window.sessionManager.syncGoogleUser === 'function') {
                try {
                    await window.sessionManager.syncGoogleUser();
                } catch (e) {
                    console.warn('Sync post-verificación:', e);
                }
            }
        }

        updateEmailVerificationUI(true, profileOtpUserEmail);

        if (typeof window !== 'undefined' && window.uiManager && typeof window.uiManager.showToast === 'function') {
            window.uiManager.showToast('¡Correo verificado con éxito! Tus vidas y servicios han sido activados.', 'success');
        }

        setTimeout(() => {
            closeProfileOtpModal();
        }, 1200);

    } catch (err) {
        console.error('❌ Error Verificando OTP en Perfil:', err);
        showProfileOtpFeedback(err.message || 'Código incorrecto o expirado.', 'error');
        if (otpVerifyBtn) {
            otpVerifyBtn.innerHTML = originalBtnHTML;
            otpVerifyBtn.disabled = false;
        }
    }
}

async function handleProfileOtpResend() {
    const client = resolveSupabaseClient();
    if (!client || !profileOtpUserEmail) return;

    const otpResendBtn = document.getElementById('btn-otp-resend');
    const otpHiddenInput = document.getElementById('otp-hidden-input');

    if (otpResendBtn) {
        otpResendBtn.disabled = true;
        otpResendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    }

    try {
        const { error } = await client.auth.resend({
            type: 'signup',
            email: profileOtpUserEmail
        });

        if (error) throw error;

        showProfileOtpFeedback('Se ha enviado un nuevo código a tu correo.', 'success');
        startProfileOtpCooldown(60);
        if (otpHiddenInput) {
            otpHiddenInput.value = '';
            renderProfileOtpBoxes('');
            otpHiddenInput.focus();
        }
    } catch (err) {
        console.error('❌ Error reenviando OTP en Perfil:', err);
        showProfileOtpFeedback(err.message || 'No se pudo reenviar el código. Intenta nuevamente.', 'error');
    } finally {
        if (otpResendBtn) {
            otpResendBtn.innerHTML = '<i class="fas fa-redo"></i> ¿No recibiste el código? Reenviar';
        }
    }
}

/**
 * Controladores del Modal de Cambio de Contraseña en Perfil
 */
function openChangePasswordModal() {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('change-password-modal');
    const pwdInput = document.getElementById('change-new-password');
    const confirmInput = document.getElementById('change-confirm-password');
    const feedback = document.getElementById('change-pwd-feedback');

    if (pwdInput) pwdInput.value = '';
    if (confirmInput) confirmInput.value = '';
    if (feedback) {
        feedback.style.display = 'none';
        feedback.textContent = '';
    }

    // Resetear lista de reglas visuales
    ['cp-rule-length', 'cp-rule-upper', 'cp-rule-lower', 'cp-rule-number', 'cp-rule-spaces'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('met');
            const icon = el.querySelector('i');
            if (icon) icon.className = 'far fa-circle rule-icon';
        }
    });

    if (modal) modal.style.display = 'flex';
    setTimeout(() => {
        if (pwdInput) pwdInput.focus();
    }, 150);
}

function closeChangePasswordModal() {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('change-password-modal');
    if (modal) modal.style.display = 'none';
}

function setupChangePasswordModal(user) {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('change-password-modal');
    const form = document.getElementById('form-change-password');
    const pwdInput = document.getElementById('change-new-password');
    const confirmInput = document.getElementById('change-confirm-password');
    const feedback = document.getElementById('change-pwd-feedback');
    const submitBtn = document.getElementById('btn-submit-change-pwd');
    const openBtn = document.getElementById('btn-open-change-pwd');

    if (!modal || !form) return;

    // Vincular botón de apertura defensivamente
    if (openBtn && !openBtn.dataset.bound) {
        openBtn.dataset.bound = 'true';
        openBtn.addEventListener('click', (e) => {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
            openChangePasswordModal();
        });
    }

    // Cerrar al hacer clic en el backdrop y con la tecla Escape
    if (!modal.dataset.bound) {
        modal.dataset.bound = 'true';
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeChangePasswordModal();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeChangePasswordModal();
            }
        });
    }

    // Configurar alternador de visibilidad (Eye Toggle)
    modal.querySelectorAll('.btn-toggle-password').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = 'true';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = btn.querySelector('i');
            if (!input || !icon) return;

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Validación de reglas en tiempo real
    if (pwdInput && !pwdInput.dataset.bound && typeof window !== 'undefined' && window.AuthValidation) {
        pwdInput.dataset.bound = 'true';
        const updateRule = (ruleId, isMet) => {
            const el = document.getElementById(ruleId);
            if (!el) return;
            const icon = el.querySelector('i');
            if (isMet) {
                el.classList.add('met');
                if (icon) icon.className = 'fas fa-check-circle rule-icon';
            } else {
                el.classList.remove('met');
                if (icon) icon.className = 'far fa-circle rule-icon';
            }
        };

        pwdInput.addEventListener('input', () => {
            const val = pwdInput.value;
            const status = window.AuthValidation.evaluatePasswordRules(val);

            updateRule('cp-rule-length', status.hasMinLength);
            updateRule('cp-rule-upper', status.hasUpper);
            updateRule('cp-rule-lower', status.hasLower);
            updateRule('cp-rule-number', status.hasNumber);
            updateRule('cp-rule-spaces', status.noSpaces && val.length > 0);
        });
    }

    // Manejar envío de formulario de cambio de contraseña
    form.onsubmit = async (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        const newPassword = pwdInput?.value || '';
        const confirmPassword = confirmInput?.value || '';

        const showFeedback = (msg, isError = true) => {
            if (!feedback) return;
            feedback.innerHTML = isError 
                ? `<i class="fas fa-exclamation-circle" style="margin-right: 6px;"></i> ${msg}`
                : `<i class="fas fa-check-circle" style="margin-right: 6px;"></i> ${msg}`;
            feedback.className = `otp-feedback otp-feedback-${isError ? 'error' : 'success'}`;
            feedback.style.display = 'block';
        };

        if (typeof window !== 'undefined' && window.AuthValidation) {
            const pwdVal = window.AuthValidation.validatePassword(newPassword, { isNewPassword: true });
            if (!pwdVal.valid) {
                showFeedback(pwdVal.error);
                return;
            }
            if (newPassword !== confirmPassword) {
                showFeedback('Las contraseñas no coinciden. Por favor verifica que ambas sean idénticas.');
                return;
            }
        } else {
            if (!newPassword || newPassword.length < 8) {
                showFeedback('La contraseña debe tener al menos 8 caracteres.');
                return;
            }
            if (newPassword !== confirmPassword) {
                showFeedback('Las contraseñas no coinciden.');
                return;
            }
        }

        const client = resolveSupabaseClient();
        if (!client) {
            showFeedback('Servicio de autenticación no disponible.');
            return;
        }

        const origBtnText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            submitBtn.disabled = true;
        }

        try {
            const { data, error } = await client.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            showFeedback('¡Contraseña actualizada con éxito! 🎉', false);
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
            }

            if (typeof window !== 'undefined' && window.uiManager && typeof window.uiManager.showToast === 'function') {
                window.uiManager.showToast('Contraseña actualizada correctamente.', 'success');
            }

            // Limpiar campos y checklist de seguridad
            if (pwdInput) pwdInput.value = '';
            if (confirmInput) confirmInput.value = '';
            ['cp-rule-length', 'cp-rule-upper', 'cp-rule-lower', 'cp-rule-number', 'cp-rule-spaces'].forEach(ruleId => {
                const el = document.getElementById(ruleId);
                if (el) {
                    el.classList.remove('met');
                    const icon = el.querySelector('i');
                    if (icon) icon.className = 'far fa-circle rule-icon';
                }
            });

            setTimeout(() => {
                closeChangePasswordModal();
                if (submitBtn) {
                    submitBtn.innerHTML = origBtnText;
                    submitBtn.disabled = false;
                }
                if (feedback) feedback.style.display = 'none';
            }, 2000);

        } catch (err) {
            console.error('❌ Error cambiando contraseña en perfil:', err);
            showFeedback(err.message || 'Error al actualizar contraseña. Intenta nuevamente.');
            if (submitBtn) {
                submitBtn.innerHTML = origBtnText;
                submitBtn.disabled = false;
            }
        }
    };
}

if (typeof window !== 'undefined') {
    window.openProfileOtpModal = openProfileOtpModal;
    window.closeProfileOtpModal = closeProfileOtpModal;
    window.openChangePasswordModal = openChangePasswordModal;
    window.closeChangePasswordModal = closeChangePasswordModal;
    window.updateEmailVerificationUI = updateEmailVerificationUI;
    window.openEditNameModal = openEditNameModal;
    window.closeEditNameModal = closeEditNameModal;
    window.submitNameChange = submitNameChange;
    window.openDeleteModal = openDeleteModal;
    window.closeDeleteModal = closeDeleteModal;
    window.setupDeleteModal = setupDeleteModal;
    window.setupEditNameModal = setupEditNameModal;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createUsageCardHTML,
        renderUsageDetails,
        getNextFreeRenewalInfo,
        getSafeProfileImageUrl,
        updateEmailVerificationUI,
        maskEmailForDisplay,
        openChangePasswordModal,
        closeChangePasswordModal,
        setupChangePasswordModal,
        openEditNameModal,
        closeEditNameModal,
        submitNameChange,
        openDeleteModal,
        closeDeleteModal,
        setupDeleteModal,
        setupEditNameModal
    };
}

