/**
 * repasoNotesUI.js
 * Controlador modular de Notas de Estudio integrado en el Centro de Repaso (/repaso).
 * Consume LibraryService (/api/library/my-library y /api/library/notes) respetando la arquitectura de 4 capas.
 */
class RepasoNotesUI {
    constructor() {
        this.service = window.libraryService;
        this.editingNoteId = null;
        this._hasLoadedOnce = false;
        this._initialized = false;
    }

    async init() {
        if (this._initialized) return;
        this._initialized = true;

        this._renderNoteModal();
        this._bindEvents();

        window.addEventListener('library:state-changed', () => {
            const notesView = document.getElementById('notes-view');
            if (notesView && notesView.style.display !== 'none') {
                this.filterAndSortNotes();
            }
        });

        if (localStorage.getItem('authToken') && this.service) {
            try {
                await this.service.loadFullLibrary();
                this._hasLoadedOnce = true;
            } catch (err) {
                console.error('[RepasoNotesUI] Error precargando notas:', err);
            }
        }
    }

    _bindEvents() {
        document.addEventListener('click', (e) => {
            const noteActionEl = e.target.closest('[data-note-action]');
            if (!noteActionEl) return;

            const notesView = document.getElementById('notes-view');
            if (!notesView || !notesView.contains(noteActionEl)) return;

            e.stopPropagation();
            const noteId = noteActionEl.dataset.noteId;
            if (!noteId) return;

            if (noteActionEl.dataset.noteAction === 'delete') {
                this.deleteNote(noteId);
            } else {
                this.openNoteEditor(noteId);
            }
        });
    }

    async renderNotesBoard() {
        const container = document.getElementById('notes-view');
        if (!container) return;

        await this.init();

        const isAuthenticated = !!localStorage.getItem('authToken');
        if (!isAuthenticated) {
            container.innerHTML = `
                <div class="repaso-dashboard-header">
                    <div class="repaso-header-top-row">
                        <h1 class="repaso-header-title">Mis Notas de Estudio</h1>
                    </div>
                    <p class="repaso-header-subtitle">Centraliza tus apuntes personales y las explicaciones guardadas desde el Tutor IA.</p>
                </div>
                <div class="notes-guest-empty">
                    <h3>Inicia sesión para gestionar tus notas</h3>
                    <p>Tus apuntes manuales y las respuestas guardadas durante tus simulacros y sesiones de flashcards se sincronizan aquí.</p>
                    <button type="button" class="btn-action btn-primary" onclick="window.uiManager?.showAuthPromptModal()">
                        Iniciar sesión
                    </button>
                </div>
            `;
            return;
        }

        if (!this._hasLoadedOnce && this.service && typeof this.service.loadFullLibrary === 'function') {
            container.innerHTML = `
                <div class="repaso-dashboard-header">
                    <div class="repaso-header-top-row">
                        <h1 class="repaso-header-title">Mis Notas de Estudio</h1>
                    </div>
                    <p class="repaso-header-subtitle">Cargando tus apuntes sincronizados...</p>
                </div>
            `;
            await this.service.loadFullLibrary();
            this._hasLoadedOnce = true;
        }

        if (!document.getElementById('notes-list-container')) {
            container.innerHTML = `
                <div class="repaso-dashboard-header">
                    <div class="repaso-header-top-row">
                        <h1 class="repaso-header-title">Mis Notas de Estudio</h1>
                    </div>
                    <p class="repaso-header-subtitle">Centraliza tus apuntes personales y las explicaciones guardadas desde el Tutor IA.</p>
                </div>
                <div id="notes-toolbar" class="notes-toolbar">
                    <div class="notes-search-wrapper">
                        <i class="fas fa-search search-icon" aria-hidden="true"></i>
                        <input type="text" id="notes-search-input" placeholder="Buscar por título o contenido..." aria-label="Buscar en Mis Notas" oninput="window.repasoNotesUI.filterAndSortNotes()">
                    </div>
                    <div class="notes-sort-wrapper">
                        <label for="notes-sort-select">Ordenar:</label>
                        <select id="notes-sort-select" onchange="window.repasoNotesUI.filterAndSortNotes()">
                            <option value="recent">Recientes</option>
                            <option value="oldest">Más antiguas</option>
                            <option value="title">Título (A-Z)</option>
                        </select>
                    </div>
                </div>
                <div id="notes-list-container" class="notes-grid"></div>
            `;
        }

        this.filterAndSortNotes();
    }

    filterAndSortNotes() {
        const container = document.getElementById('notes-list-container');
        if (!container || !this.service) return;

        const data = this.service.getLibraryData() || {};
        let notes = [...(data.notes || [])];

        const searchInput = document.getElementById('notes-search-input');
        if (searchInput) {
            const query = searchInput.value.toLowerCase().trim();
            if (query) {
                notes = notes.filter(note =>
                    (note.title || '').toLowerCase().includes(query) ||
                    (note.content || '').toLowerCase().includes(query)
                );
            }
        }

        const sortSelect = document.getElementById('notes-sort-select');
        const sortBy = sortSelect ? sortSelect.value : 'recent';

        notes.sort((a, b) => {
            if (sortBy === 'recent') {
                return new Date(b.created_at || b.updated_at) - new Date(a.created_at || a.updated_at);
            }
            if (sortBy === 'oldest') {
                return new Date(a.created_at || a.updated_at) - new Date(b.created_at || b.updated_at);
            }
            if (sortBy === 'title') {
                return (a.title || '').localeCompare(b.title || '');
            }
            return 0;
        });

        let html = `
            <button type="button" class="library-add-note-btn" onclick="window.repasoNotesUI.openNoteModal()">
                <div class="add-icon-circle"><i class="fas fa-plus" aria-hidden="true"></i></div>
                <span class="add-note-label">Nueva Nota</span>
                <span class="add-note-sub">Crear apunte de estudio</span>
            </button>
        `;

        if (notes.length === 0) {
            const hasSearch = searchInput && searchInput.value.trim().length > 0;
            html += `
                <div class="notes-empty-inline">
                    <h4>${hasSearch ? 'Sin coincidencias para tu búsqueda' : 'Aún no tienes notas registradas'}</h4>
                    <p>${hasSearch ? 'Prueba con otro término o limpia el buscador.' : 'Crea apuntes con "Nueva Nota" o guarda explicaciones del Tutor IA durante tus simulacros y repasos.'}</p>
                </div>
            `;
        } else {
            html += notes.map(note => this._createNoteItemHTML(note)).join('');
        }

        container.innerHTML = html;
    }

    _createNoteItemHTML(note) {
        const escape = window.escapeHtml || ((s) => String(s || ''));
        const preview = (note.content || '').substring(0, 140).replace(/[*#>\-\[\]]/g, '').trim();
        const sourceLabel = note.source_type === 'chat'
            ? 'Tutor IA'
            : (note.source_type === 'flashcard' ? 'Repaso' : (note.source_type === 'quiz' ? 'Simulador' : 'Manual'));
        const dateStr = note.created_at
            ? new Date(note.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
            : '';

        let color = this._safeNoteColor(note.color);
        if (!note.color) {
            if (note.source_type === 'chat' || note.source_type === 'quiz') color = '#2563eb';
            else if (note.source_type === 'flashcard') color = '#0d9488';
            else color = '#64748b';
        }

        const noteId = escape(note.id);
        return `
            <article class="note-card" data-note-id="${noteId}" data-note-action="edit" style="--note-color: ${color};">
                <div class="note-card-accent"></div>
                <div class="note-card-actions">
                    <button type="button" class="note-card-action-btn edit" data-note-id="${noteId}" data-note-action="edit" title="Editar nota" aria-label="Editar nota">
                        <i class="fas fa-pen" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="note-card-action-btn delete" data-note-id="${noteId}" data-note-action="delete" title="Eliminar nota" aria-label="Eliminar nota">
                        <i class="fas fa-trash" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="note-card-content">
                    <h4 class="note-card-title">${escape(note.title || 'Sin título')}</h4>
                    <p class="note-card-preview">${escape(preview || 'Sin contenido...')}${note.content && note.content.length > 140 ? '...' : ''}</p>
                </div>
                <div class="note-card-footer">
                    <span class="note-card-badge">${sourceLabel}</span>
                    <span class="note-card-date">${dateStr}</span>
                </div>
            </article>
        `;
    }

    _safeNoteColor(value) {
        return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#64748b';
    }

    _renderNoteModal() {
        if (document.querySelector('.note-modal-overlay')) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay note-modal-overlay';
        modal.id = 'note-modal-overlay';
        modal.innerHTML = `
            <div class="modal-content note-modal" style="max-width: 650px;">
                <div class="modal-header note-modal-header">
                    <h2 id="note-modal-header-text">Ver Nota</h2>
                    <button type="button" class="modal-close-btn note-modal-close" onclick="window.repasoNotesUI.closeNoteModal()" aria-label="Cerrar modal">&times;</button>
                </div>

                <div class="modal-body note-modal-body" id="note-modal-viewer" style="display:block;">
                </div>

                <div class="modal-body note-modal-body" id="note-modal-editor" style="display:none; flex-direction:column; gap:0.75rem;">
                    <input type="text" id="note-editor-title" class="note-editor-title form-input" placeholder="Título de la nota" aria-label="Título de la nota">
                    <div class="note-editor-toolbar" style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                        <button type="button" class="note-toolbar-btn" onclick="window.repasoNotesUI.insertFormat('**', '**')" title="Negrita" aria-label="Negrita"><i class="fas fa-bold"></i></button>
                        <button type="button" class="note-toolbar-btn" onclick="window.repasoNotesUI.insertFormat('*', '*')" title="Cursiva" aria-label="Cursiva"><i class="fas fa-italic"></i></button>
                        <button type="button" class="note-toolbar-btn" onclick="window.repasoNotesUI.insertFormat('### ', '')" title="Subtítulo" aria-label="Subtítulo"><i class="fas fa-heading"></i></button>
                        <button type="button" class="note-toolbar-btn" onclick="window.repasoNotesUI.insertFormat('- ', '')" title="Lista" aria-label="Lista"><i class="fas fa-list-ul"></i></button>
                        <button type="button" class="note-toolbar-btn" onclick="window.repasoNotesUI.insertFormat('> ', '')" title="Cita" aria-label="Cita"><i class="fas fa-quote-left"></i></button>

                        <div style="margin-left:auto; display:flex; gap:0.3rem;" id="note-color-picker">
                            <input type="hidden" id="note-editor-color" value="">
                        </div>
                    </div>
                    <textarea id="note-editor-textarea" class="note-editor-textarea form-input" placeholder="Escribe aquí tu nota..." aria-label="Contenido de la nota"></textarea>
                </div>

                <div class="modal-footer note-modal-footer">
                    <div id="note-view-actions" style="display:flex; gap:0.75rem; align-items:center;">
                        <button type="button" class="btn-action btn-secondary-action note-delete-btn" id="note-modal-delete" onclick="window.repasoNotesUI.deleteNote(window.repasoNotesUI.editingNoteId)"><i class="fas fa-trash"></i> Eliminar</button>
                        <button type="button" class="btn-action btn-secondary-action" onclick="window.repasoNotesUI.closeNoteModal()">Cerrar</button>
                        <button type="button" class="btn-action btn-primary" onclick="window.repasoNotesUI.switchToEditor()"><i class="fas fa-edit"></i> Editar</button>
                    </div>
                    <div id="note-edit-actions" style="display:none; gap:0.75rem; align-items:center;">
                        <button type="button" class="btn-action btn-secondary-action" id="note-modal-cancel" onclick="window.repasoNotesUI.switchToViewer()">Cancelar</button>
                        <button type="button" class="btn-action btn-primary" id="note-modal-save" onclick="window.repasoNotesUI.saveNote()"><i class="fas fa-save"></i> Guardar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) this.closeNoteModal(); });
    }

    openNoteModal(noteId = null) {
        this.openNoteEditor(noteId);
    }

    openNoteEditor(noteId = null) {
        if (!noteId && typeof localStorage !== 'undefined' && !localStorage.getItem('authToken') && window.uiManager?.showAuthPromptModal) {
            window.uiManager.showAuthPromptModal();
            return;
        }

        this.editingNoteId = noteId;
        const viewer = document.getElementById('note-modal-viewer');
        const headerText = document.getElementById('note-modal-header-text');
        const escape = window.escapeHtml || ((s) => String(s || ''));

        if (noteId) {
            const data = this.service ? this.service.getLibraryData() : { notes: [] };
            const note = (data.notes || []).find(n => n.id == noteId);
            if (!note) return;

            document.getElementById('note-editor-title').value = note.title;
            document.getElementById('note-editor-textarea').value = note.content;
            this._renderColorOptions(note.color || '');
            viewer.innerHTML = `
                <h3 class="note-viewer-title" style="margin-top: 0; margin-bottom: 1rem; color: var(--text-main); font-size: 1.25rem; font-weight: 700; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; text-align: left;">${escape(note.title || 'Sin título')}</h3>
                <div class="markdown-content">${this._renderMarkdown(note.content)}</div>
            `;

            const sourceLabel = note.source_type === 'chat' ? 'Nota de Tutor IA' : (note.source_type === 'flashcard' ? 'Nota de Repaso' : 'Nota de Estudio');
            if (headerText) headerText.textContent = sourceLabel;

            this.switchToViewer();
        } else {
            document.getElementById('note-editor-title').value = '';
            document.getElementById('note-editor-textarea').value = '';
            this._renderColorOptions('#64748b');
            if (headerText) headerText.textContent = 'Nueva Nota';

            this.switchToEditor();
        }

        const overlay = document.getElementById('note-modal-overlay');
        if (overlay) overlay.classList.add('open', 'active');
        if (window.uiManager && typeof window.uiManager.pushModalState === 'function') {
            window.uiManager.pushModalState('note-modal-overlay');
        } else if (document.body && document.body.classList) {
            document.body.classList.add('modal-open');
        }
    }

    _renderColorOptions(selectedColor) {
        const picker = document.getElementById('note-color-picker');
        if (!picker || typeof document.createElement !== 'function') return;

        const options = ['#2563eb', '#0d9488', '#10b981', '#64748b', '#f43f5e', '#f59e0b'];
        picker.innerHTML = '';

        const colorInput = document.createElement('input');
        colorInput.type = 'hidden';
        colorInput.id = 'note-editor-color';
        colorInput.value = selectedColor;
        picker.appendChild(colorInput);

        options.forEach(color => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.style.cssText = `width:20px; height:20px; border-radius:50%; border:2px solid ${color === selectedColor ? 'var(--text-main)' : 'transparent'}; background:${color}; cursor:pointer;`;
            btn.onclick = () => {
                colorInput.value = color;
                Array.from(picker.children).forEach(c => {
                    if (c.tagName === 'BUTTON') c.style.borderColor = 'transparent';
                });
                btn.style.borderColor = 'var(--text-main)';
            };
            picker.appendChild(btn);
        });
    }

    switchToEditor() {
        const viewer = document.getElementById('note-modal-viewer');
        const editor = document.getElementById('note-modal-editor');
        const viewActions = document.getElementById('note-view-actions');
        const editActions = document.getElementById('note-edit-actions');
        const headerText = document.getElementById('note-modal-header-text');

        if (viewer) viewer.style.display = 'none';
        if (editor) {
            editor.style.display = 'flex';
            editor.style.flexDirection = 'column';
        }
        if (viewActions) viewActions.style.display = 'none';
        if (editActions) editActions.style.display = 'flex';
        if (headerText) {
            headerText.textContent = this.editingNoteId ? 'Editar Nota' : 'Nueva Nota';
        }
    }

    switchToViewer() {
        if (!this.editingNoteId) {
            this.closeNoteModal();
            return;
        }
        const viewer = document.getElementById('note-modal-viewer');
        const editor = document.getElementById('note-modal-editor');
        const viewActions = document.getElementById('note-view-actions');
        const editActions = document.getElementById('note-edit-actions');
        const headerText = document.getElementById('note-modal-header-text');

        if (viewer) viewer.style.display = 'block';
        if (editor) editor.style.display = 'none';
        if (viewActions) viewActions.style.display = 'flex';
        if (editActions) editActions.style.display = 'none';

        if (headerText && this.service) {
            const data = this.service.getLibraryData() || {};
            const note = (data.notes || []).find(n => n.id == this.editingNoteId);
            if (note) {
                const sourceLabel = note.source_type === 'chat' ? 'Nota de Tutor IA' : (note.source_type === 'flashcard' ? 'Nota de Repaso' : 'Nota de Estudio');
                headerText.textContent = sourceLabel;
            }
        }
    }

    insertFormat(prefix, suffix) {
        const textarea = document.getElementById('note-editor-textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);

        textarea.value = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }

    async saveNote() {
        const titleEl = document.getElementById('note-editor-title');
        const contentEl = document.getElementById('note-editor-textarea');
        const title = (titleEl ? titleEl.value.trim() : '') || 'Nota sin título';
        const content = contentEl ? contentEl.value.trim() : '';

        if (!content) {
            if (window.uiManager) window.uiManager.showToast('El contenido de la nota no puede estar vacío.');
            return;
        }

        const saveBtn = document.getElementById('note-modal-save');
        const cancelBtn = document.getElementById('note-modal-cancel');
        const originalHTML = saveBtn ? saveBtn.innerHTML : '';
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        }
        if (cancelBtn) cancelBtn.disabled = true;

        try {
            const method = this.editingNoteId ? 'PUT' : 'POST';
            const url = this.editingNoteId
                ? `${window.AppConfig.API_URL}/api/library/notes/${this.editingNoteId}`
                : `${window.AppConfig.API_URL}/api/library/notes`;

            const colorEl = document.getElementById('note-editor-color');
            const res = await window.NetworkService.fetch(url, {
                method,
                body: JSON.stringify({
                    title,
                    content,
                    color: colorEl ? colorEl.value : undefined,
                    sourceType: this.editingNoteId ? undefined : 'manual'
                })
            });

            if (res.ok) {
                if (this.service && typeof this.service.loadFullLibrary === 'function') {
                    await this.service.loadFullLibrary();
                }
                this._hasLoadedOnce = true;
                this.closeNoteModal();
                this.filterAndSortNotes();
            } else if (window.uiManager) {
                window.uiManager.showToast('Error al guardar la nota. Verifica tu conexión.');
            }
        } catch (err) {
            console.error('Error guardando nota:', err);
            if (window.uiManager) window.uiManager.showToast('Ocurrió un error al guardar la nota.');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalHTML;
            }
            if (cancelBtn) cancelBtn.disabled = false;
        }
    }

    async deleteNote(noteId) {
        if (!noteId) return;

        if (!window.confirmationModal && typeof ConfirmationModal !== 'undefined') {
            window.confirmationModal = new ConfirmationModal();
        }

        const confirmed = window.confirmationModal
            ? await window.confirmationModal.show('¿Estás seguro de eliminar esta nota?', 'Eliminar Nota', 'Eliminar', 'Cancelar')
            : confirm('¿Estás seguro de eliminar esta nota?');

        if (!confirmed) return;

        const deleteBtn = document.getElementById('note-modal-delete');
        const cardDeleteBtn = document.querySelector(`.note-card-action-btn.delete[data-note-id="${noteId}"]`);
        const targetBtn = deleteBtn || cardDeleteBtn;
        const originalHTML = targetBtn ? targetBtn.innerHTML : '';
        if (targetBtn) {
            targetBtn.disabled = true;
            targetBtn.innerHTML = deleteBtn ? '<i class="fas fa-spinner fa-spin"></i> Eliminando...' : '<i class="fas fa-spinner fa-spin"></i>';
        }

        try {
            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/library/notes/${noteId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                if (this.service && typeof this.service.loadFullLibrary === 'function') {
                    await this.service.loadFullLibrary();
                }
                this.closeNoteModal();
                this.filterAndSortNotes();
            } else if (window.uiManager) {
                window.uiManager.showToast('Error al eliminar la nota.');
            }
        } catch (err) {
            console.error('Error eliminando nota:', err);
            if (window.uiManager) window.uiManager.showToast('Ocurrió un error al eliminar la nota.');
        } finally {
            if (targetBtn) {
                targetBtn.disabled = false;
                targetBtn.innerHTML = originalHTML;
            }
        }
    }

    closeNoteModal() {
        const overlay = document.getElementById('note-modal-overlay');
        if (overlay) {
            overlay.classList.remove('open', 'active');
        }
        if (window.uiManager && typeof window.uiManager.popModalState === 'function') {
            window.uiManager.popModalState('note-modal-overlay');
        } else if (document.body && document.body.classList) {
            document.body.classList.remove('modal-open');
        }
        this.editingNoteId = null;
    }

    _renderMarkdown(text) {
        if (!text) return '';
        const escape = window.escapeHtml || ((s) => String(s || ''));
        return window.MarkdownRenderer
            ? window.MarkdownRenderer.render(text)
            : escape(text).replace(/\n/g, '<br>');
    }
}

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
        window.repasoNotesUI = new RepasoNotesUI();
        if (!window.libraryUI) {
            window.libraryUI = window.repasoNotesUI;
        }
        window.repasoNotesUI.init();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RepasoNotesUI };
}
