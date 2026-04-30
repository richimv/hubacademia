/**
 * libraryUI.js — V2.1 Premium Editor
 * Controlador de Interfaz para "Mi Biblioteca"
 */
class LibraryUI {
    constructor() {
        this.service = window.libraryService;
        this.selectors = {
            btn: '.js-library-btn',
            drawer: '.library-drawer',
            listContainer: '#library-list-container'
        };

        this.currentTab = 'saved'; 
        this.currentFilter = 'all';
        this.isFullscreen = false;
        this.editingNoteId = null; // ID de la nota que se está editando

        this.typeLabels = {
            all: 'Todo',
            book: 'Libros',
            paper: 'Papers',
            norma: 'Normas',
            guia: 'Guías',
            video: 'Videos',
            course: 'Cursos',
            other: 'Otros'
        };
    }

    init() {
        console.log('🎨 LibraryUI V2.1: Iniciando...');

        window.addEventListener('library:state-changed', () => {
            this.updateAllButtons();
            if (this.isDrawerOpen()) this.renderDrawerList();
        });

        // ✅ NUEVO: Escuchar cambios de sesión para mostrar/ocultar el botón flotante dinámicamente
        if (window.sessionManager) {
            window.sessionManager.onStateChange((user) => {
                if (user) {
                    this._renderFloatingButton();
                    // ✅ RECARGA CRÍTICA: Sincronizar estado de biblioteca con el nuevo usuario
                    this.service.init().then(() => {
                        if (this.isDrawerOpen()) this.renderDrawerList();
                    });
                } else {
                    const toggleBtn = document.querySelector('.library-toggle');
                    if (toggleBtn) toggleBtn.remove();
                    this.toggleDrawer(false);
                }
            });
        }

        document.body.addEventListener('click', (e) => this._handleBodyClick(e));
        this._renderDrawerStructure();

        if (localStorage.getItem('authToken')) {
            this._renderFloatingButton();
        }

        this._initObserver();
        this.updateAllButtons();
        this._renderNoteModal();
    }

    _initObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1 && (node.classList.contains('js-library-btn') || node.querySelector(this.selectors.btn))) {
                            shouldUpdate = true;
                            break;
                        }
                    }
                }
                if (shouldUpdate) break;
            }
            if (shouldUpdate) this.updateAllButtons();
        });

        const mainContainer = document.getElementById('content-container') || document.body;
        observer.observe(mainContainer, { childList: true, subtree: true });
    }

    updateAllButtons() {
        document.querySelectorAll(this.selectors.btn).forEach(btn => {
            const { type, id, action } = btn.dataset;
            if (!type || !id || !action) return;

            let isActive = false;
            if (action === 'save') {
                isActive = this.service.isSaved(type, id);
                this._updateIcon(btn, isActive, 'fa-bookmark');
            } else if (action === 'favorite') {
                isActive = this.service.isFavorite(type, id);
                this._updateIcon(btn, isActive, 'fa-heart');
            }

            btn.classList.toggle('active', isActive);
        });
    }

    _updateIcon(btn, isActive, iconName) {
        const icon = btn.querySelector('i');
        if (!icon) return;
        icon.className = `${isActive ? 'fas' : 'far'} ${iconName}`;
    }

    _handleBodyClick(e) {
        const btn = e.target.closest(this.selectors.btn);
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            if (window.uiManager) {
                if (!window.uiManager.validateFreemiumAction(e)) return;
                window.uiManager.checkAuthAndExecute(() => {
                    btn.style.transform = "scale(1.2)";
                    setTimeout(() => btn.style.transform = "scale(1)", 200);
                    this.service.toggleItem(btn.dataset.type, btn.dataset.id, btn.dataset.action);
                });
            }
            return;
        }

        if (e.target.classList.contains('library-drawer-overlay')) {
            this.toggleDrawer(false);
        }
    }

    // --- DRAWER ---

    toggleDrawer(forceState) {
        const drawer = document.querySelector(this.selectors.drawer);
        if (!drawer) return;

        const isOpen = typeof forceState === 'boolean' ? forceState : !drawer.classList.contains('open');
        drawer.classList.toggle('open', isOpen);

        if (isOpen) {
            this.service.loadFullLibrary();
            this.renderDrawerList();
        } else {
            if (this.isFullscreen) this.toggleFullscreen();
        }
    }

    toggleFullscreen() {
        const drawer = document.querySelector(this.selectors.drawer);
        if (!drawer) return;

        this.isFullscreen = !this.isFullscreen;
        drawer.classList.toggle('fullscreen', this.isFullscreen);

        const expandIcon = drawer.querySelector('.library-expand-btn i');
        if (expandIcon) expandIcon.className = this.isFullscreen ? 'fas fa-compress' : 'fas fa-expand';

        const toggleBtn = document.querySelector('.library-toggle');
        if (toggleBtn) toggleBtn.style.display = this.isFullscreen ? 'none' : '';

        document.body.style.overflow = this.isFullscreen ? 'hidden' : '';

        this.renderDrawerList();
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        this.currentFilter = 'all';
        document.querySelectorAll('.library-tab').forEach(t =>
            t.classList.toggle('active', t.dataset.tab === tabName)
        );
        this.renderDrawerList();
    }

    switchFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.library-cat-btn').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.category === filter)
        );
        this._renderList(); 
    }

    renderDrawerList() {
        if (this.currentTab === 'notes') {
            this._renderNotesList();
            return;
        }

        const data = this.service.getLibraryData();
        const items = [];

        const processItems = (list, itemType) => {
            list.forEach(item => {
                const isSaved = this.service.isSaved(itemType, item.id);
                const isFav = this.service.isFavorite(itemType, item.id);
                const show = this.currentTab === 'saved' ? isSaved : isFav;
                if (show) {
                    items.push({ ...item, _uiType: itemType, _resourceType: item.resource_type || itemType });
                }
            });
        };

        processItems(data.courses || [], 'course');
        processItems(data.books || [], 'book');

        this._allItems = items;
        this._renderFilters(items);
        this._renderList();
    }

    _renderFilters(items) {
        const filterContainer = document.querySelector('.library-category-filters');
        if (!filterContainer) return;

        if (this.currentTab === 'notes') {
            filterContainer.style.display = 'none';
            return;
        }
        filterContainer.style.display = '';

        const counts = {};
        items.forEach(item => {
            const t = item._resourceType || 'other';
            counts[t] = (counts[t] || 0) + 1;
        });

        let filtersHTML = `<button class="library-cat-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-category="all" onclick="window.libraryUI.switchFilter('all')">Todo <span class="cat-count">${items.length}</span></button>`;

        Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
            const label = this.typeLabels[type] || type;
            filtersHTML += `<button class="library-cat-btn ${this.currentFilter === type ? 'active' : ''}" data-category="${type}" onclick="window.libraryUI.switchFilter('${type}')">${label} <span class="cat-count">${count}</span></button>`;
        });

        filterContainer.innerHTML = filtersHTML;

        // Soporte para scroll horizontal con rueda del ratón en PC
        filterContainer.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                filterContainer.scrollLeft += e.deltaY;
            }
        });
    }

    _renderList() {
        const container = document.querySelector(this.selectors.listContainer);
        if (!container) return;

        let items = this._allItems || [];
        if (this.currentFilter !== 'all') {
            items = items.filter(i => i._resourceType === this.currentFilter);
        }

        if (items.length === 0) {
            const icon = this.currentTab === 'saved' ? 'fa-bookmark' : 'fa-heart';
            container.innerHTML = `<div class="empty-state"><i class="far ${icon}"></i><p>No tienes items aquí aún.</p></div>`;
            return;
        }

        container.innerHTML = items.map(item => this._createDrawerItemHTML(item)).join('');
    }

    _renderNotesList() {
        const filterContainer = document.querySelector('.library-category-filters');
        if (filterContainer) filterContainer.style.display = 'none';

        const container = document.querySelector(this.selectors.listContainer);
        if (!container) return;

        const data = this.service.getLibraryData();
        const notes = data.notes || [];

        let html = `<button class="library-add-note-btn" onclick="window.libraryUI.openNoteEditor()"><i class="fas fa-plus"></i> Crear nota</button>`;

        if (notes.length === 0) {
            html += `<div class="empty-state"><i class="far fa-sticky-note"></i><p>No tienes notas guardadas.<br>Usa el ícono 🔖 en el chat para guardar respuestas.</p></div>`;
        } else {
            html += notes.map(note => this._createNoteItemHTML(note)).join('');
        }

        container.innerHTML = html;
    }

    _createDrawerItemHTML(item) {
        const typeLabel = item._uiType === 'course' ? 'Curso' : (item.resource_type || 'Recurso');
        const title = item.title || item.name || 'Sin título';

        const resolvedImg = item.image_url ? window.resolveImageUrl(item.image_url) : `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=random&color=fff`;
        const fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=6366f1&color=fff`;

        let clickAttr = '';
        if (item._uiType === 'course') {
            clickAttr = `onclick="window.location.href='course?id=${item.id}'"`;
        } else {
            const isPremium = item.is_premium === true || String(item.is_premium).toLowerCase() === 'true' || item.is_premium === 1;
            const titleEscaped = title.replace(/'/g, "\\'");
            clickAttr = `onclick="window.uiManager.unlockResource('${item.id}', '${item.type || 'book'}', ${isPremium}, '${titleEscaped}')"`;
        }

        return `
            <div class="library-item" ${clickAttr}>
                <img src="${resolvedImg}" alt="${title}" onerror="this.src='${fallbackImg}'">
                <div class="library-item-info">
                    <div class="library-item-title">${title}</div>
                    <div class="library-item-type">${typeLabel}</div>
                </div>
            </div>
        `;
    }

    _createNoteItemHTML(note) {
        const preview = (note.content || '').substring(0, 120).replace(/[*#>\-\[\]]/g, '').trim();
        const sourceLabel = note.source_type === 'chat' ? 'Chat' : (note.source_type === 'flashcard' ? 'Flashcard' : 'Manual');
        const dateStr = new Date(note.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
        
        let color = note.color || '#f59e0b';
        if (!note.color) {
            if (note.source_type === 'chat') color = '#3b82f6';
            else if (note.source_type === 'audio_assistant') color = '#8b5cf6';
            else if (note.source_type === 'flashcard') color = '#10b981';
            else color = '#64748b';
        }

        return `
            <div class="library-item note-item" data-note-id="${note.id}" onclick="window.libraryUI.openNoteEditor('${note.id}')" style="border-left: 4px solid ${color};">
                <div style="display:flex;align-items:center;justify-content:center;width:48px;height:48px;background:${color}22;border-radius:10px;flex-shrink:0;font-size:1.2rem;color:${color};">
                    <i class="fas fa-sticky-note"></i>
                </div>
                <div class="library-item-info">
                    <div class="library-item-title">${note.title}</div>
                    <div class="note-preview">${preview}...</div>
                    <div class="note-source" style="color:${color}; font-weight:600;">${sourceLabel} <span style="color:#94a3b8; font-weight:normal;">· ${dateStr}</span></div>
                </div>
            </div>
        `;
    }

    _renderDrawerStructure() {
        if (document.querySelector(this.selectors.drawer)) return;

        const div = document.createElement('div');
        div.className = 'library-drawer';
        div.innerHTML = `
            <div class="library-header">
                <span class="library-title">Mis Recursos</span>
                <div style="display:flex;align-items:center;gap:4px;">
                    <button class="library-expand-btn" onclick="window.libraryUI.toggleFullscreen()" title="Pantalla completa"><i class="fas fa-expand"></i></button>
                    <button class="close-drawer-btn" onclick="window.libraryUI.toggleDrawer(false)"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div class="library-tabs">
                <button class="library-tab active" data-tab="saved" onclick="window.libraryUI.switchTab('saved')">Guardados</button>
                <button class="library-tab" data-tab="favorites" onclick="window.libraryUI.switchTab('favorites')">Favoritos</button>
                <button class="library-tab" data-tab="notes" onclick="window.libraryUI.switchTab('notes')">Notas</button>
            </div>
            <div class="library-category-filters"></div>
            <div class="library-content">
                <div class="library-list" id="library-list-container">
                    <div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
                </div>
            </div>
        `;
        document.body.appendChild(div);
    }

    _renderFloatingButton() {
        if (document.querySelector('.library-toggle')) return;
        const btn = document.createElement('div');
        btn.className = 'library-toggle';
        btn.innerHTML = `<i class="fas fa-layer-group"></i>`;
        btn.onclick = () => this.toggleDrawer();
        document.body.appendChild(btn);
    }

    // --- NOTE MODAL / EDITOR ---

    _renderNoteModal() {
        if (document.querySelector('.note-modal-overlay')) return;

        const modal = document.createElement('div');
        modal.className = 'note-modal-overlay';
        modal.id = 'note-modal-overlay';
        modal.innerHTML = `
            <div class="note-modal">
                <div class="note-modal-header">
                    <h3 id="note-modal-header-text"><i class="fas fa-sticky-note"></i> Ver Nota</h3>
                    <button class="note-modal-close" onclick="window.libraryUI.closeNoteModal()"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="note-modal-body" id="note-modal-viewer" style="display:block;">
                </div>

                <div class="note-modal-body" id="note-modal-editor" style="display:none;">
                    <input type="text" id="note-editor-title" class="note-editor-title" placeholder="Título de la nota">
                    <div class="note-editor-toolbar" style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                        <button class="note-toolbar-btn" onclick="window.libraryUI.insertFormat('**', '**')" title="Negrita"><i class="fas fa-bold"></i></button>
                        <button class="note-toolbar-btn" onclick="window.libraryUI.insertFormat('*', '*')" title="Cursiva"><i class="fas fa-italic"></i></button>
                        <button class="note-toolbar-btn" onclick="window.libraryUI.insertFormat('### ', '')" title="Título"><i class="fas fa-heading"></i></button>
                        <button class="note-toolbar-btn" onclick="window.libraryUI.insertFormat('- ', '')" title="Lista"><i class="fas fa-list-ul"></i></button>
                        <button class="note-toolbar-btn" onclick="window.libraryUI.insertFormat('> ', '')" title="Cita"><i class="fas fa-quote-left"></i></button>
                        
                        <!-- Color Selector -->
                        <div style="margin-left:auto; display:flex; gap:0.3rem;" id="note-color-picker">
                            <input type="hidden" id="note-editor-color" value="">
                        </div>
                    </div>
                    <textarea id="note-editor-textarea" class="note-editor-textarea" placeholder="Escribe aquí tu nota..."></textarea>
                </div>

                <div class="note-modal-footer">
                    <div id="note-view-actions">
                        <button class="note-delete-btn" id="note-modal-delete" onclick="window.libraryUI.deleteNote(window.libraryUI.editingNoteId)"><i class="fas fa-trash"></i> Eliminar</button>
                        <button onclick="window.libraryUI.switchToEditor()"><i class="fas fa-edit"></i> Editar</button>
                    </div>
                    <div id="note-edit-actions" style="display:none;">
                        <button onclick="window.libraryUI.switchToViewer()">Cancelar</button>
                        <button class="active" style="background:var(--primary); color:white; border:none;" onclick="window.libraryUI.saveNote()">Guardar Cambios</button>
                    </div>
                    <button onclick="window.libraryUI.closeNoteModal()">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) this.closeNoteModal(); });
    }

    openNoteEditor(noteId = null) {
        this.editingNoteId = noteId;
        const viewer = document.getElementById('note-modal-viewer');
        const editor = document.getElementById('note-modal-editor');
        const viewActions = document.getElementById('note-view-actions');
        const editActions = document.getElementById('note-edit-actions');
        const headerText = document.getElementById('note-modal-header-text');

        if (noteId) {
            const data = this.service.getLibraryData();
            const note = (data.notes || []).find(n => n.id == noteId);
            if (!note) return;

            document.getElementById('note-editor-title').value = note.title;
            document.getElementById('note-editor-textarea').value = note.content;
            this._renderColorOptions(note.color || '');
            viewer.innerHTML = this._renderMarkdown(note.content);
            headerText.innerHTML = `<i class="fas fa-sticky-note"></i> Ver Nota`;
            
            this.switchToViewer();
        } else {
            document.getElementById('note-editor-title').value = '';
            document.getElementById('note-editor-textarea').value = '';
            const defaultNewColor = '#64748b'; // Lighter Slate for new notes
            this._renderColorOptions(defaultNewColor);
            headerText.innerHTML = `<i class="fas fa-plus"></i> Nueva Nota`;
            
            this.switchToEditor();
        }

        document.getElementById('note-modal-overlay').classList.add('open');
    }

    _renderColorOptions(selectedColor) {
        const picker = document.getElementById('note-color-picker');
        if (!picker) return;
        const colorInput = document.getElementById('note-editor-color');
        colorInput.value = selectedColor;

        const options = ['#3b82f6', '#8b5cf6', '#10b981', '#64748b', '#f43f5e', '#f59e0b', '#0ea5e9', '#d946ef', '#14b8a6'];
        picker.innerHTML = `<input type="hidden" id="note-editor-color" value="${selectedColor}">`;
        
        options.forEach(color => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.style.cssText = `width:20px; height:20px; border-radius:50%; border:2px solid ${color === colorInput.value ? 'white' : 'transparent'}; background:${color}; cursor:pointer;`;
            btn.onclick = () => {
                colorInput.value = color;
                Array.from(picker.children).forEach(c => {
                    if (c.tagName === 'BUTTON') c.style.borderColor = 'transparent';
                });
                btn.style.borderColor = 'white';
            };
            picker.appendChild(btn);
        });
    }

    switchToEditor() {
        document.getElementById('note-modal-viewer').style.display = 'none';
        document.getElementById('note-modal-editor').style.display = 'block';
        document.getElementById('note-view-actions').style.display = 'none';
        document.getElementById('note-edit-actions').style.display = 'block';
    }

    switchToViewer() {
        if (!this.editingNoteId) {
            this.closeNoteModal();
            return;
        }
        document.getElementById('note-modal-viewer').style.display = 'block';
        document.getElementById('note-modal-editor').style.display = 'none';
        document.getElementById('note-view-actions').style.display = 'block';
        document.getElementById('note-edit-actions').style.display = 'none';
    }

    insertFormat(prefix, suffix) {
        const textarea = document.getElementById('note-editor-textarea');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);
        
        textarea.value = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }

    async saveNote() {
        const title = document.getElementById('note-editor-title').value.trim() || 'Nota sin título';
        const content = document.getElementById('note-editor-textarea').value.trim();

        if (!content) {
            alert('El contenido no puede estar vacío.');
            return;
        }

        try {
            const method = this.editingNoteId ? 'PUT' : 'POST';
            const url = this.editingNoteId ? 
                `${window.AppConfig.API_URL}/api/library/notes/${this.editingNoteId}` : 
                `${window.AppConfig.API_URL}/api/library/notes`;

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ 
                    title, 
                    content, 
                    color: document.getElementById('note-editor-color') ? document.getElementById('note-editor-color').value : undefined,
                    sourceType: this.editingNoteId ? undefined : 'manual' 
                })
            });

            if (res.ok) {
                await this.service.loadFullLibrary();
                this.closeNoteModal();
            } else {
                alert('Error al guardar la nota. ¿Ejecutaste el script SQL?');
            }
        } catch (err) {
            console.error('Error guardando nota:', err);
        }
    }

    closeNoteModal() {
        document.getElementById('note-modal-overlay').classList.remove('open');
        this.editingNoteId = null;
    }

    _renderMarkdown(text) {
        if (!text) return '';
        
        // ✅ USAR RENDERIZADOR UNIFICADO
        return window.MarkdownRenderer ? window.MarkdownRenderer.render(text) : text.replace(/\n/g, '<br>');
    }

    async deleteNote(noteId) {
        if (!confirm('¿Eliminar esta nota?')) return;

        try {
            await fetch(`${window.AppConfig.API_URL}/api/library/notes/${noteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            this.service.loadFullLibrary();
            this.closeNoteModal();
        } catch (err) {
            console.error('Error eliminando nota:', err);
        }
    }

    isDrawerOpen() {
        const d = document.querySelector(this.selectors.drawer);
        return d && d.classList.contains('open');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.libraryService) {
        window.libraryUI = new LibraryUI();
        window.libraryService.init().then(() => {
            window.libraryUI.init();
        });
    } else {
        console.error('LibraryService not found!');
    }
});
