/**
 * confirmationModal.js
 * 
 * Maneja la lógica del modal de confirmación personalizado.
 * Reemplaza la funcionalidad nativa de confirm() con una experiencia de usuario más integrada.
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
        this.closeBtn = this.modal.querySelector('.modal-close');

        this.resolvePromise = null;

        this.init();
    }

    _injectModalMarkup() {
        const div = document.createElement('div');
        div.id = 'confirmation-modal';
        div.className = 'modal modal-overlay';
        div.style.cssText = 'display: none; z-index: 2147483647; align-items: center; justify-content: center;';
        div.innerHTML = `
            <div class="modal-content" style="max-width: 440px; padding: 24px; position: relative;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: flex-start; border: none; padding: 0 0 16px 0;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div id="confirmation-modal-icon-container" style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); color: #3b82f6; transition: all 0.3s ease;">
                            <i class="fas fa-question-circle" style="font-size: 1.25rem;"></i>
                        </div>
                        <h2 id="confirmation-modal-title" style="margin: 0; font-size: 1.3rem; font-weight: 800;">Confirmación</h2>
                    </div>
                    <button class="modal-close-btn modal-close" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); color: #94a3b8; font-size: 1.2rem; cursor: pointer; transition: all 0.2s; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">×</button>
                </div>
                <div class="modal-body" style="padding: 8px 0 24px 0; border: none;">
                    <p id="confirmation-modal-message" style="margin: 0; color: #cbd5e1; font-size: 1.05rem; line-height: 1.6;">¿Estás seguro de realizar esta acción?</p>
                </div>
                <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; border: none; padding: 0; background: transparent;">
                    <button id="confirmation-modal-cancel" class="btn-secondary" style="margin: 0;">Cancelar</button>
                    <button id="confirmation-modal-confirm" class="btn-primary" style="margin: 0;">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
    }

    init() {
        // Bindeamos los métodos para no perder el contexto 'this'
        this.handleConfirm = this.handleConfirm.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleClose = this.handleClose.bind(this);

        this.confirmBtn.addEventListener('click', this.handleConfirm);
        this.cancelBtn.addEventListener('click', this.handleCancel);
        this.closeBtn.addEventListener('click', this.handleClose);

        // Cerrar al hacer clic fuera del modal (overlay)
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.handleClose();
            }
        });

        // Soporte para cerrar con la tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'flex') {
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
    /**
     * Muestra el modal de confirmación y devuelve una Promesa.
     * @param {string} message - El mensaje a mostrar.
     * @param {string} title - El título del modal (opcional).
     * @param {string} confirmText - Texto del botón de confirmar (opcional).
     * @param {string} cancelText - Texto del botón de cancelar (opcional).
     * @returns {Promise<boolean>} - Se resuelve a true si se confirma, false si se cancela.
     */
    show(message, title = 'Confirmación', confirmText = 'Confirmar', cancelText = 'Cancelar') {
        this.messageElement.textContent = message;
        this.titleElement.textContent = title;
        this.confirmBtn.textContent = confirmText;
        this.cancelBtn.textContent = cancelText;

        this._updateModalIcon(title);

        // Asegurar que ambos botones estén visibles (por si se usó showAlert antes)
        this.cancelBtn.style.display = 'flex';
        this.confirmBtn.style.display = 'flex';

        this.modal.style.display = 'flex';
        if (window.uiManager && typeof window.uiManager.pushModalState === 'function') {
            window.uiManager.pushModalState('confirmation-modal');
        }
        this.confirmBtn.focus(); // Accesibilidad: poner foco en la acción principal

        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    showAlert(message, title = 'Aviso', buttonText = 'Aceptar') {
        this.messageElement.innerHTML = message.replace(/\n/g, '<br>'); // Permitir saltos de línea
        this.titleElement.textContent = title;
        this.confirmBtn.textContent = buttonText;

        this._updateModalIcon(title);

        // Ocultar botón de cancelar
        this.cancelBtn.style.display = 'none';
        this.confirmBtn.style.display = 'flex';

        this.modal.style.display = 'flex';
        if (window.uiManager && typeof window.uiManager.pushModalState === 'function') {
            window.uiManager.pushModalState('confirmation-modal');
        }
        this.confirmBtn.focus();

        return new Promise((resolve) => {
            this.resolvePromise = () => resolve();
        });
    }

    _updateModalIcon(title) {
        const iconContainer = document.getElementById('confirmation-modal-icon-container');
        if (!iconContainer) return;

        const titleText = (title || "").toLowerCase();
        let iconClass = 'fa-question-circle';
        let bg = 'rgba(59, 130, 246, 0.1)';
        let border = '1px solid rgba(59, 130, 246, 0.2)';
        let color = '#3b82f6';

        if (titleText.includes('eliminar') || titleText.includes('borrar') || titleText.includes('descartar') || titleText.includes('error') || titleText.includes('advertencia') || titleText.includes('fallo') || titleText.includes('límite')) {
            iconClass = 'fa-exclamation-triangle';
            bg = 'rgba(239, 68, 68, 0.1)';
            border = '1px solid rgba(239, 68, 68, 0.2)';
            color = '#ef4444';
        } else if (titleText.includes('éxito') || titleText.includes('completado') || titleText.includes('guardado') || titleText.includes('bien')) {
            iconClass = 'fa-check-circle';
            bg = 'rgba(16, 185, 129, 0.1)';
            border = '1px solid rgba(16, 185, 129, 0.2)';
            color = '#10b981';
        } else if (titleText.includes('simulacro en progreso') || titleText.includes('progreso') || titleText.includes('reanudar') || titleText.includes('continuar')) {
            iconClass = 'fa-history';
            bg = 'rgba(139, 92, 246, 0.1)';
            border = '1px solid rgba(139, 92, 246, 0.2)';
            color = '#a78bfa';
        }

        iconContainer.innerHTML = `<i class="fas ${iconClass}" style="font-size: 1.25rem;"></i>`;
        iconContainer.style.background = bg;
        iconContainer.style.borderColor = border.split(' ').pop(); // extrae el color de borde para compatibilidad directa
        iconContainer.style.color = color;
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
    }
}
