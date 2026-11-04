/** Shared confirmation/notice dialog. Presentation belongs to modal.css. */
class ConfirmationModal {
    constructor() {
        this.modal = document.getElementById('confirmation-modal');
        if (!this.modal) this._injectModalMarkup();
        this.modal = document.getElementById('confirmation-modal');
        this.titleElement = document.getElementById('confirmation-modal-title');
        this.messageElement = document.getElementById('confirmation-modal-message');
        this.confirmBtn = document.getElementById('confirmation-modal-confirm');
        this.cancelBtn = document.getElementById('confirmation-modal-cancel');
        this.closeBtn = this.modal.querySelector('.modal-close-btn,.modal-close');
        this.resolvePromise = null;
        this.previousFocus = null;
        this.modal.setAttribute('role', 'alertdialog');
        this.modal.setAttribute('aria-modal', 'true');
        this.modal.setAttribute('aria-labelledby', 'confirmation-modal-title');
        this.modal.setAttribute('aria-describedby', 'confirmation-modal-message');
        this.confirmBtn.addEventListener('click', () => this.handleConfirm());
        this.cancelBtn.addEventListener('click', () => this.handleCancel());
        this.closeBtn?.addEventListener('click', () => this.handleClose());
        this.modal.addEventListener('click', event => { if (event.target === this.modal) this.handleClose(); });
        document.addEventListener('keydown', event => {
            if (!this.modal.classList.contains('active')) return;
            if (event.key === 'Escape') { event.preventDefault(); this.handleClose(); return; }
            if (event.key !== 'Tab') return;
            const buttons = [...this.modal.querySelectorAll('button:not([disabled])')].filter(button => button.getClientRects().length);
            const first = buttons[0];
            const last = buttons.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        });
    }

    _injectModalMarkup() {
        const modal = document.createElement('div');
        modal.id = 'confirmation-modal';
        modal.className = 'modal modal-overlay';
        modal.innerHTML = `<div class="modal-content confirmation-modal-card">
            <div class="modal-header confirmation-modal-header"><div class="confirmation-title-wrap"><div id="confirmation-modal-icon-container" class="confirmation-modal-icon" aria-hidden="true"><i class="fas fa-question-circle"></i></div><h2 id="confirmation-modal-title">Confirmación</h2></div><button type="button" class="modal-close-btn" aria-label="Cerrar aviso">×</button></div>
            <div class="modal-body confirmation-modal-body"><p id="confirmation-modal-message"></p></div>
            <div class="modal-footer confirmation-modal-footer"><button type="button" id="confirmation-modal-cancel" class="btn-secondary">Cancelar</button><button type="button" id="confirmation-modal-confirm" class="btn-primary">Confirmar</button></div>
        </div>`;
        document.body.append(modal);
    }

    show(message, title = 'Confirmación', confirmText = 'Confirmar', cancelText = 'Cancelar') {
        return this._open(message, title, confirmText, cancelText, false);
    }

    showAlert(message, title = 'Aviso', buttonText = 'Aceptar') {
        return this._open(message, title, buttonText, '', true);
    }

    _open(message, title, confirmText, cancelText, alertOnly) {
        // A replacement must settle the older promise instead of leaving a caller waiting.
        if (this.resolvePromise) this._finish(false);
        this.previousFocus = document.activeElement;
        this._setMessage(message);
        this.titleElement.textContent = title;
        this.confirmBtn.textContent = confirmText;
        this.cancelBtn.textContent = cancelText;
        this.cancelBtn.style.display = alertOnly ? 'none' : 'inline-flex';
        this._updateModalIcon(title);
        const result = new Promise(resolve => { this.resolvePromise = alertOnly ? () => resolve(true) : resolve; });
        this.modal.style.display = 'flex';
        this.modal.classList.add('active');
        window.uiManager?.pushModalState?.('confirmation-modal');
        (alertOnly ? this.confirmBtn : this.cancelBtn).focus();
        return result;
    }

    _updateModalIcon(title) {
        const icon = document.getElementById('confirmation-modal-icon-container');
        if (!icon) return;
        const text = String(title || '').toLowerCase();
        const danger = /eliminar|borrar|descartar|error|advertencia|fallo|límite|peligro|no completado|no se pudo|rechazad/.test(text);
        const success = /éxito|completado|guardado|bien|activada/.test(text);
        icon.dataset.tone = danger ? 'danger' : success ? 'success' : 'info';
        const glyph = danger ? 'fa-exclamation-triangle' : success ? 'fa-check-circle' : /progreso|reanudar|continuar/.test(text) ? 'fa-history' : 'fa-question-circle';
        icon.innerHTML = `<i class="fas ${glyph}"></i>`;
    }

    _setMessage(message) {
        this.messageElement.textContent = String(message || '')
            .replace(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{FE00}-\u{FE0F}\u{200D}]+\s*)+/u, '').trim();
    }

    _finish(value) {
        const resolve = this.resolvePromise;
        this.resolvePromise = null;
        this.close();
        resolve?.(value);
    }

    handleConfirm() { this._finish(true); }
    handleCancel() { this._finish(false); }
    handleClose() { this._finish(null); }

    close() {
        window.uiManager?.popModalState?.('confirmation-modal');
        this.modal.style.display = 'none';
        this.modal.classList.remove('active');
        if (this.previousFocus?.isConnected) this.previousFocus.focus();
        this.previousFocus = null;
    }
}
window.ConfirmationModal = ConfirmationModal;
window.confirmationModal = new ConfirmationModal();
