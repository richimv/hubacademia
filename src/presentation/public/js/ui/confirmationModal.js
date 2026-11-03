/**
 * confirmationModal.js
 * 
 * Maneja la lógica del modal de confirmación y alertas personalizado.
 * Reemplaza la funcionalidad nativa de confirm() y alert() con una experiencia integrada.
 */

class ConfirmationModal {
    constructor() {
        this.modal = document.getElementById('confirmation-modal');
        if (!this.modal) {
            this._injectModalMarkup();
            this.modal = document.getElementById('confirmation-modal');
        }
        this.titleElement = document.getElementById('confirmation-modal-title');
        this.messageElement = document.getElementById('confirmation-modal-message');
        this.confirmBtn = document.getElementById('confirmation-modal-confirm');
        this.cancelBtn = document.getElementById('confirmation-modal-cancel');
        this.closeBtn = this.modal.querySelector('.modal-close-btn') || this.modal.querySelector('.modal-close');

        this.resolvePromise = null;

        this.init();
    }

    _injectModalMarkup() {
        if (document.getElementById('confirmation-modal')) return;
        const div = document.createElement('div');
        div.id = 'confirmation-modal';
        div.className = 'modal modal-overlay';
        div.style.zIndex = '2147483647';
        div.innerHTML = `
            <div class="modal-content confirmation-modal-card">
                <div class="modal-header confirmation-modal-header">
                    <div class="confirmation-title-wrap">
                        <div id="confirmation-modal-icon-container" class="confirmation-modal-icon">
                            <i class="fas fa-question-circle"></i>
                        </div>
                        <h2 id="confirmation-modal-title">Confirmación</h2>
                    </div>
                    <button class="modal-close-btn modal-close" aria-label="Cerrar modal">×</button>
                </div>
                <div class="modal-body confirmation-modal-body">
                    <p id="confirmation-modal-message">¿Estás seguro de realizar esta acción?</p>
                </div>
                <div class="modal-footer confirmation-modal-footer">
                    <button id="confirmation-modal-cancel" class="btn-secondary">Cancelar</button>
                    <button id="confirmation-modal-confirm" class="btn-primary">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
    }

    init() {
        this.handleConfirm = this.handleConfirm.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleClose = this.handleClose.bind(this);

        if (this.confirmBtn) this.confirmBtn.addEventListener('click', this.handleConfirm);
        if (this.cancelBtn) this.cancelBtn.addEventListener('click', this.handleCancel);
        if (this.closeBtn) this.closeBtn.addEventListener('click', this.handleClose);

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.handleClose();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && (this.modal.style.display === 'flex' || this.modal.classList.contains('active'))) {
                this.handleClose();
            }
        });
    }

    /**
     * Muestra el modal de confirmación y devuelve una Promesa.
     * @param {string} message - El mensaje a mostrar.
     * @param {string} title - El título del modal (opcional).
     * @param {string} confirmText - Texto del botón de confirmar (opcional).
     * @param {string} cancelText - Texto del botón de cancelar (opcional).
     * @returns {Promise<boolean>} - Se resuelve a true si se confirma, false si se cancela.
     */
    show(message, title = 'Confirmación', confirmText = 'Confirmar', cancelText = 'Cancelar') {
        this._setMessage(message);
        this.titleElement.textContent = title;
        this.confirmBtn.textContent = confirmText;
        this.cancelBtn.textContent = cancelText;

        this._updateModalIcon(title);

        this.cancelBtn.style.display = 'inline-flex';
        this.confirmBtn.style.display = 'inline-flex';

        this.modal.style.display = 'flex';
        this.modal.classList.add('active');

        if (window.uiManager && typeof window.uiManager.pushModalState === 'function') {
            window.uiManager.pushModalState('confirmation-modal');
        }
        this.confirmBtn.focus();

        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    showAlert(message, title = 'Aviso', buttonText = 'Aceptar') {
        this._setMessage(message);
        this.titleElement.textContent = title;
        this.confirmBtn.textContent = buttonText;

        this._updateModalIcon(title);

        this.cancelBtn.style.display = 'none';
        this.confirmBtn.style.display = 'inline-flex';

        this.modal.style.display = 'flex';
        this.modal.classList.add('active');

        if (window.uiManager && typeof window.uiManager.pushModalState === 'function') {
            window.uiManager.pushModalState('confirmation-modal');
        }
        this.confirmBtn.focus();

        return new Promise((resolve) => {
            this.resolvePromise = () => resolve(true);
        });
    }

    _updateModalIcon(title) {
        const iconContainer = document.getElementById('confirmation-modal-icon-container');
        if (!iconContainer) return;

        const titleText = (title || "").toLowerCase();
        let iconClass = 'fa-question-circle';
        let iconColor = 'var(--primary)';
        let iconBg = 'rgba(59, 130, 246, 0.12)';
        let iconBorder = '1px solid rgba(59, 130, 246, 0.25)';

        if (titleText.includes('eliminar') || titleText.includes('borrar') || titleText.includes('descartar') || titleText.includes('error') || titleText.includes('advertencia') || titleText.includes('fallo') || titleText.includes('límite') || titleText.includes('peligro')) {
            iconClass = 'fa-exclamation-triangle';
            iconColor = 'var(--danger)';
            iconBg = 'var(--danger-bg)';
            iconBorder = '1px solid var(--danger-border)';
        } else if (titleText.includes('éxito') || titleText.includes('completado') || titleText.includes('guardado') || titleText.includes('bien') || titleText.includes('activada')) {
            iconClass = 'fa-check-circle';
            iconColor = 'var(--success)';
            iconBg = 'var(--success-bg)';
            iconBorder = '1px solid var(--success-border)';
        } else if (titleText.includes('simulacro en progreso') || titleText.includes('progreso') || titleText.includes('reanudar') || titleText.includes('continuar')) {
            iconClass = 'fa-history';
            iconColor = 'var(--accent-purple)';
            iconBg = 'rgba(139, 92, 246, 0.12)';
            iconBorder = '1px solid rgba(139, 92, 246, 0.25)';
        }

        iconContainer.innerHTML = `<i class="fas ${iconClass}"></i>`;
        iconContainer.style.background = iconBg;
        iconContainer.style.border = iconBorder;
        iconContainer.style.color = iconColor;
    }

    _setMessage(message) {
        if (!this.messageElement) return;
        const cleanMsg = String(message || '')
            .replace(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{FE00}-\u{FE0F}\u{200D}]+\s*)+/u, '')
            .trim();
        this.messageElement.textContent = cleanMsg;
        this.messageElement.style.whiteSpace = 'pre-line';
    }

    handleConfirm() {
        this.close();
        if (this.resolvePromise) {
            this.resolvePromise(true);
            this.resolvePromise = null;
        }
    }

    handleCancel() {
        this.close();
        if (this.resolvePromise) {
            this.resolvePromise(false);
            this.resolvePromise = null;
        }
    }

    handleClose() {
        this.close();
        if (this.resolvePromise) {
            this.resolvePromise(null);
            this.resolvePromise = null;
        }
    }

    close() {
        if (window.uiManager && typeof window.uiManager.popModalState === 'function') {
            window.uiManager.popModalState('confirmation-modal');
        }
        this.modal.style.display = 'none';
        this.modal.classList.remove('active');
    }
}

// Instancia global
window.ConfirmationModal = ConfirmationModal;
window.confirmationModal = new ConfirmationModal();
