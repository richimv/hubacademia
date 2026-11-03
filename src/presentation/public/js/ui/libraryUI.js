/**
 * libraryUI.js - Controlador ligero de Biblioteca de Consulta
 *
 * Tras la unificación de "Mis Notas" dentro de /repaso ("Repaso y Notas")
 * y la simplificación de /library para consulta directa sin fricción
 * (sin pestañas de Guardados, Favoritos ni drawer flotante), este módulo
 * mantiene únicamente:
 *  1. Redirección limpia de enlaces heredados (?tab=notes -> /repaso?view=notes).
 *  2. Navegación segura de tarjetas con [data-library-resource].
 *  3. Compatibilidad defensiva para invocaciones heredadas (updateButtons, openNoteModal).
 */

class LibraryUI {
    constructor() {
        this.isDedicatedPage = Boolean(document.getElementById('library-page-container'));
        this.init();
    }

    init() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('tab') === 'notes') {
                window.location.replace('/repaso?view=notes');
                return;
            }
        } catch (_) {
            // Ignorar entornos sin URL válida
        }

        document.addEventListener('click', (e) => {
            const resourceCard = e.target.closest('[data-library-resource]');
            if (!resourceCard) return;

            const resourceId = resourceCard.dataset.resourceId || '';
            const resourceType = resourceCard.dataset.resourceType || 'book';
            const isPremium = resourceCard.dataset.isPremium === 'true';

            if (resourceType === 'course') {
                window.location.href = `/course?id=${encodeURIComponent(resourceId)}`;
            } else if (window.uiManager && typeof window.uiManager.unlockAndNavigate === 'function') {
                window.uiManager.unlockAndNavigate(resourceId, resourceType, isPremium);
            }
        });
    }

    /**
     * Compatibilidad defensiva para enlaces heredados que intenten cambiar a Notas.
     * @param {string} tab
     */
    switchTab(tab) {
        if (tab === 'notes') {
            window.location.href = '/repaso?view=notes';
        }
    }

    /**
     * Si algún componente externo invoca openNoteModal, delega al módulo unificado
     * en Repaso o redirige limpiamente a /repaso?view=notes.
     * @param {string|null} noteId
     */
    openNoteModal(noteId = null) {
        if (window.repasoNotesUI && typeof window.repasoNotesUI.openNoteModal === 'function') {
            window.repasoNotesUI.openNoteModal(noteId);
            return;
        }
        window.location.href = '/repaso?view=notes';
    }

    closeNoteModal() {
        if (window.repasoNotesUI && typeof window.repasoNotesUI.closeNoteModal === 'function') {
            window.repasoNotesUI.closeNoteModal();
        }
    }

    /**
     * No-op defensivo: ya no existen botones de Guardados ni Favoritos en tarjetas.
     */
    updateButtons() {
        // Intencionalmente vacío
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.libraryUI = new LibraryUI();
        window.libraryManager = window.libraryUI;
    }, 50);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LibraryUI };
}
