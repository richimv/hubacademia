/**
 * DeckExplorer
 * Handles the sidebar tree navigation and recursive structure.
 */
class DeckExplorer {
    static sessionImages = []; // Tracking images uploaded during the current edit session

    constructor(manager) {
        this.manager = manager; // Reference to RepasoManager
        this.treeContainer = document.getElementById('deck-tree');
        this.expandedNodes = this._loadExpandedState(); // Restore from storage
        this.activeNodeId = null; // Current selection
        this.api = `${window.AppConfig.API_URL}/api/decks`;
        this.token = localStorage.getItem('authToken');
    }

    _loadExpandedState() {
        try {
            const saved = localStorage.getItem('repaso_explorer_expanded');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch (e) {
            return new Set();
        }
    }

    _saveExpandedState() {
        localStorage.setItem('repaso_explorer_expanded', JSON.stringify([...this.expandedNodes]));
        if (this.treeContainer) {
            localStorage.setItem('repaso_explorer_scroll', this.treeContainer.scrollTop);
        }
    }

    async init() {
        if (this.treeContainer) {
            this.treeContainer.addEventListener('scroll', () => {
                localStorage.setItem('repaso_explorer_scroll', this.treeContainer.scrollTop);
            });
        }
        await this.loadTree();
    }

    async loadTree() {
        try {
            // We need a way to get the FULL tree or at least flat list to build it.
            // Current /api/decks returns filtered list.
            // Strategy: Fetch ALL roots, then lazily fetch children?
            // BETTER: Fetch ALL decks flat list and build tree client-side for "Explorer" feel (if not huge).
            // Let's assume /api/decks without parentId returns ROOTS. 
            // We might need to adjust API to return ALL or handle recursion.
            // For now, let's stick to "Fetch Roots + Fetch Context Children".
            // Actually, for a tree, we need to know if a node has children.
            // The `children_count` property helps.

            // Fetch Roots first
            await this.renderRootLevel();

            // Restore expanded nodes recursively
            if (this.expandedNodes.size > 0) {
                await this.restoreExpandedState();
            }

            // Restore Scroll Position
            const savedScroll = localStorage.getItem('repaso_explorer_scroll');
            if (savedScroll && this.treeContainer) {
                setTimeout(() => {
                    this.treeContainer.scrollTop = parseInt(savedScroll);
                }, 100); // Small delay to ensure rendering finished
            }

        } catch (e) {
            console.error(e);
            this.treeContainer.innerHTML = '<div style="color:var(--accent-warning)">Error cargando árbol</div>';
        }
    }

    async fetchDecks(parentId = null) {
        return await this.manager.fetchDecksShared(parentId);
    }

    async renderRootLevel() {
        this.treeContainer.innerHTML = '';

        // 1. "Inicio" / All
        const rootItem = this.createTreeItem({ id: 'ROOT', name: 'Mis Mazos', icon: 'fas fa-home', children_count: 0 }, 0, true);
        this.treeContainer.appendChild(rootItem);

        // 1.5 "Comunidad" / Explorador Público
        const communityItem = this.createTreeItem({ id: 'COMMUNITY', name: 'Comunidad', icon: 'fas fa-globe', children_count: 0 }, 0, true);
        this.treeContainer.appendChild(communityItem);

        // 2. Fetch API Roots
        const decks = await this.fetchDecks(null);

        // Render System Decks first
        const systems = decks.filter(d => d.type === 'SYSTEM');
        const users = decks.filter(d => d.type !== 'SYSTEM');

        // Render standard nodes
        [...systems, ...users].forEach(deck => {
            const el = this.createTreeItem(deck, 0);
            this.treeContainer.appendChild(el);
        });
    }

    createTreeItem(deck, level, isRootLink = false) {
        const hasChildren = parseInt(deck.children_count || 0) > 0;
        const container = document.createElement('div');
        container.className = 'tree-node';
        container.dataset.id = deck.id;
        container.dataset.level = level; // Store level for child reference

        // Indentation
        const paddingLeft = level * 1.5;

        // Content
        const content = document.createElement('div');
        content.className = `tree-content ${this.activeNodeId === deck.id ? 'active' : ''}`;
        content.style.paddingLeft = `${paddingLeft}rem`;

        // Toggle Icon
        const toggle = document.createElement('span');
        toggle.className = 'tree-toggle';
        toggle.innerHTML = hasChildren ? '<i class="fas fa-chevron-right"></i>' : '<span style="width:12px; display:inline-block"></span>';

        if (hasChildren && !isRootLink) {
            toggle.onclick = (e) => {
                e.stopPropagation();
                this.toggleNode(deck.id, container);
            };
        }

        // Icon + Name
        const label = document.createElement('span');
        label.className = 'tree-label';
        label.style.cssText = 'display: inline-flex; align-items: center; white-space: nowrap;';

        const displayIcon = RepasoManager.renderColoredIcon(deck.icon, 'fas fa-folder');
        label.innerHTML = `<span style="margin-right:8px; width:20px; text-align:center;">${displayIcon}</span> <span style="white-space:nowrap;">${deck.name}</span>`;

        // Click Action -> Set Active & Load View
        content.onclick = () => {
            this.setActive(deck.id);
            if (isRootLink) {
                if (deck.id === 'COMMUNITY') {
                    this.manager.loadCommunity();
                } else {
                    this.manager.loadDashboard();
                }
            }
            else this.manager.loadFolder(deck.id);
        };

        // Quick Add Button (Hover)
        const addBtn = document.createElement('button');
        addBtn.className = 'tree-add-btn';
        addBtn.innerHTML = '<i class="fas fa-plus"></i>';
        addBtn.title = 'Crear Sub-mazo';
        addBtn.onclick = (e) => {
            e.stopPropagation();
            DeckExplorer.openCreateModal(deck.id);
        };

        content.appendChild(toggle);
        content.appendChild(label);
        if (this.token && !isRootLink && deck.type !== 'SYSTEM') content.appendChild(addBtn);

        container.appendChild(content);

        // Children Container (Hidden by default)
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';
        childrenContainer.style.display = 'none';
        childrenContainer.id = `children-${deck.id}`;
        container.appendChild(childrenContainer);

        return container;
    }

    async toggleNode(deckId, nodeElement, forceExpand = null) {
        if (!nodeElement) return;
        const childrenDiv = nodeElement.querySelector('.tree-children');
        const toggleIcon = nodeElement.querySelector('.tree-toggle i');

        // Determine if we should expand or collapse
        const currentlyExpanded = this.expandedNodes.has(deckId);
        const shouldExpand = forceExpand !== null ? forceExpand : !currentlyExpanded;

        if (!shouldExpand) {
            // --- Collapse ---
            childrenDiv.style.display = 'none';
            if (toggleIcon) toggleIcon.className = 'fas fa-chevron-right';
            this.expandedNodes.delete(deckId);
            this._saveExpandedState();
        } else {
            // --- Expand ---
            childrenDiv.style.display = 'block';
            if (toggleIcon) toggleIcon.className = 'fas fa-chevron-down';

            if (!childrenDiv.hasChildNodes()) {
                // Lazy Load
                const currentLevel = parseInt(nodeElement.dataset.level || 0);
                const loadingIndicator = document.createElement('div');
                loadingIndicator.style.cssText = `padding: 0.5rem 1.5rem; padding-left: ${(currentLevel + 1) * 1.5 + 1.5}rem; color: #64748b; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;`;
                loadingIndicator.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
                childrenDiv.appendChild(loadingIndicator);

                try {
                    const kids = await this.fetchDecks(deckId);
                    childrenDiv.innerHTML = ''; // Clear loading

                    if (kids.length > 0) {
                        kids.forEach(k => {
                            const childNode = this.createTreeItem(k, currentLevel + 1);
                            childrenDiv.appendChild(childNode);
                        });
                    } else {
                        const emptyState = document.createElement('div');
                        emptyState.style.cssText = `padding: 0.5rem 1.5rem; padding-left: ${(currentLevel + 1) * 1.5 + 1.5}rem; color: #475569; font-size: 0.85rem; font-style: italic;`;
                        emptyState.innerHTML = 'Sin sub-mazos';
                        childrenDiv.appendChild(emptyState);
                    }
                } catch (err) {
                    childrenDiv.innerHTML = `<div style="padding: 0.5rem 1.5rem; padding-left: ${(currentLevel + 1) * 1.5 + 1.5}rem; color: #ef4444; font-size: 0.85rem;">Error</div>`;
                }
            }

            // Always add to Set when expanding
            this.expandedNodes.add(deckId);
            this._saveExpandedState();

            // --- RECURSIVE RESTORATION ---
            // If we just loaded/expanded, check if any of these children were also expanded
            const kidsNodes = childrenDiv.querySelectorAll('.tree-node');
            for (const kid of kidsNodes) {
                const kidId = kid.dataset.id;
                if (this.expandedNodes.has(kidId)) {
                    await this.toggleNode(kidId, kid, true); // Force expand recursively
                }
            }
        }
    }

    async restoreExpandedState() {
        const roots = this.treeContainer.querySelectorAll('.tree-node');
        for (const node of roots) {
            const id = node.dataset.id;
            if (this.expandedNodes.has(id)) {
                await this.toggleNode(id, node, true); // Force expand root levels
            }
        }
    }

    setActive(id) {
        // UI Update
        if (this.activeNodeId) {
            const prev = document.querySelector(`.tree-node[data-id="${this.activeNodeId}"] > .tree-content`);
            if (prev) prev.classList.remove('active');
        }

        this.activeNodeId = id;
        const curr = document.querySelector(`.tree-node[data-id="${id}"] > .tree-content`);
        if (curr) curr.classList.add('active');
    }

    // --- Modals ---
    static ICON_OPTIONS = [
        { fa: 'fas fa-layer-group', color: '#60a5fa', label: 'Capas' },
        { fa: 'fas fa-folder', color: '#fbbf24', label: 'Carpeta' },
        { fa: 'fas fa-book-open', color: '#2dd4bf', label: 'Libro' },
        { fa: 'fas fa-brain', color: '#f472b6', label: 'Cerebro' },
        { fa: 'fas fa-stethoscope', color: '#22d3ee', label: 'Medicina' },
        { fa: 'fas fa-comments', color: '#a78bfa', label: 'Idiomas' },
        { fa: 'fas fa-lightbulb', color: '#fbbf24', label: 'Idea' },
        { fa: 'fas fa-graduation-cap', color: '#818cf8', label: 'Estudio' },
        { fa: 'fas fa-microscope', color: '#c084fc', label: 'Ciencia' },
        { fa: 'fas fa-pills', color: '#f87171', label: 'Farmacia' },
        { fa: 'fas fa-heartbeat', color: '#f87171', label: 'Cardio' },
        { fa: 'fas fa-dna', color: '#34d399', label: 'Genética' },
        { fa: 'fas fa-star', color: '#fbbf24', label: 'Favorito' },
        { fa: 'fas fa-pen-alt', color: '#fb923c', label: 'Escritura' },
    ];

    static renderIconPicker(selectedIcon = 'fas fa-layer-group') {
        const iconInput = document.getElementById('new-deck-icon');
        const grid = document.getElementById('icon-picker-grid');
        if (!grid || !iconInput) return;

        iconInput.value = selectedIcon;
        grid.innerHTML = '';

        DeckExplorer.ICON_OPTIONS.forEach(opt => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.title = opt.label;
            btn.dataset.icon = opt.fa;
            const isSelected = opt.fa === iconInput.value;
            btn.style.cssText = `width:40px; height:40px; border-radius:10px; border:2px solid ${isSelected ? opt.color : 'rgba(255,255,255,0.1)'}; background:${isSelected ? opt.color + '22' : 'rgba(255,255,255,0.05)'}; color:${opt.color}; font-size:1.1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;`;
            btn.innerHTML = `<i class="${opt.fa}"></i>`;

            btn.onclick = () => {
                iconInput.value = opt.fa;
                // Update selection visuals
                grid.querySelectorAll('button').forEach(b => {
                    const bOpt = DeckExplorer.ICON_OPTIONS.find(o => o.fa === b.dataset.icon);
                    const sel = b.dataset.icon === opt.fa;
                    b.style.borderColor = sel ? bOpt.color : 'rgba(255,255,255,0.1)';
                    b.style.background = sel ? bOpt.color + '22' : 'rgba(255,255,255,0.05)';
                });
            };
            grid.appendChild(btn);
        });
    }

    static COLOR_OPTIONS = [
        '#60a5fa', '#34d399', '#f472b6', '#22d3ee', '#a78bfa',
        '#fbbf24', '#818cf8', '#2dd4bf', '#fb923c', '#c084fc',
        '#f87171', '#fda4af', '#d4d4d8', '#67e8f9', '#94a3b8'
    ];

    static renderColorPicker(selectedColor) {
        const grid = document.getElementById('color-picker-grid');
        const colorInput = document.getElementById('new-deck-color');
        colorInput.value = selectedColor || ''; // Si es nulo, usará el del icono
        grid.innerHTML = '';

        // Opcion Default (Auto)
        const btnAuto = document.createElement('button');
        btnAuto.type = 'button';
        btnAuto.title = 'Color automático (basado en icono)';
        btnAuto.dataset.color = '';
        const isAutoSelected = colorInput.value === '';
        btnAuto.style.cssText = `width:30px; height:30px; border-radius:50%; border:2px solid ${isAutoSelected ? 'white' : 'transparent'}; background: linear-gradient(135deg, #60a5fa, #f472b6); cursor:pointer; transition:all 0.2s; position:relative;`;
        if (isAutoSelected) btnAuto.innerHTML = '<i class="fas fa-check" style="color:white; font-size:0.7rem; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-shadow: 0 0 2px black;"></i>';
        
        btnAuto.onclick = () => updateColorSelection('');
        grid.appendChild(btnAuto);

        DeckExplorer.COLOR_OPTIONS.forEach(color => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.color = color;
            const isSelected = color === colorInput.value;
            btn.style.cssText = `width:30px; height:30px; border-radius:50%; border:2px solid ${isSelected ? 'white' : 'transparent'}; background:${color}; cursor:pointer; transition:all 0.2s; position:relative; box-shadow: 0 2px 4px rgba(0,0,0,0.2);`;
            if (isSelected) btn.innerHTML = '<i class="fas fa-check" style="color:white; font-size:0.7rem; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-shadow: 0 0 2px black;"></i>';

            btn.onclick = () => updateColorSelection(color);
            grid.appendChild(btn);
        });

        function updateColorSelection(color) {
            colorInput.value = color;
            grid.querySelectorAll('button').forEach(b => {
                const isSel = b.dataset.color === color;
                b.style.borderColor = isSel ? 'white' : 'transparent';
                if (isSel) {
                    b.innerHTML = '<i class="fas fa-check" style="color:white; font-size:0.7rem; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-shadow: 0 0 2px black;"></i>';
                } else {
                    b.innerHTML = '';
                }
            });
        }
    }

    static openCreateModal(parentId = null) {
        if (window.uiManager && !window.uiManager.validateFreemiumAction(null, 'flashcards')) return;

        document.getElementById('create-deck-form').reset();
        document.getElementById('new-deck-id').value = '';
        document.getElementById('modal-deck-title').innerText = 'Crear Nuevo Mazo';
        document.getElementById('new-deck-parent').value = parentId || '';
        document.getElementById('new-deck-name').value = '';
        document.getElementById('new-deck-description').value = '';
        const submitBtn = document.getElementById('btn-save-deck');
        if (submitBtn) submitBtn.innerText = 'Crear';

        // Populate Pickers
        DeckExplorer.renderIconPicker('fas fa-layer-group');
        DeckExplorer.renderColorPicker('');

        document.getElementById('create-deck-modal').classList.add('active');
        if (window.uiManager && typeof window.uiManager.pushModalState === 'function') {
            window.uiManager.pushModalState('create-deck-modal');
        }
    }

    static closeCreateModal() {
        document.getElementById('create-deck-modal').classList.remove('active');
        if (window.uiManager && typeof window.uiManager.popModalState === 'function') {
            window.uiManager.popModalState('create-deck-modal');
        }
    }

    // --- Guide Modal ---
    static async openGuideModal(deckId, deckName) {
        const deck = window.repasoManager.currentDeck;
        if (!deck || deck.id !== deckId) return;

        document.getElementById('deck-guide-title').innerText = `Guía: ${deckName}`;
        const contentDiv = document.getElementById('deck-guide-content');
        const textarea = document.getElementById('deck-guide-textarea');

        // 🚀 LAZY LOADING: Fetch description only when opening the modal
        contentDiv.innerHTML = '<div style="padding: 2rem; text-align: center; color: #64748b;"><i class="fas fa-circle-notch fa-spin"></i> Cargando guía de estudio...</div>';
        
        try {
            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/decks/${deckId}/guide`);
            const data = await res.json();
            const description = data.description || '';
            
            // Actualizar objeto local para que 'Editar' tenga el contenido fresco
            deck.description = description;

            if (description.trim() === '') {
                contentDiv.innerHTML = '<span style="color: #64748b; font-style: italic;">No hay una guía de estudio definida para este mazo. Pulsa "Editar" para empezar.</span>';
            } else {
                contentDiv.innerHTML = window.MarkdownRenderer ? window.MarkdownRenderer.wrapTables(description) : description;
            }
            textarea.value = description;

        } catch (e) {
            console.error('Error loading guide:', e);
            contentDiv.innerHTML = '<span style="color: #ef4444;">Error al cargar la guía. Inténtalo de nuevo.</span>';
        }
        
        // Show view mode, hide edit mode
        document.getElementById('deck-guide-view-mode').style.display = 'block';
        document.getElementById('deck-guide-edit-mode').style.display = 'none';

        // Only allow edit if it's not a SYSTEM deck
        const canEdit = deck.type !== 'SYSTEM';
        const editBtn = document.getElementById('deck-guide-edit-btn');
        if (editBtn) editBtn.style.display = canEdit ? 'block' : 'none';

        document.getElementById('deck-guide-modal').classList.add('active');
        if (window.uiManager && typeof window.uiManager.pushModalState === 'function') {
            window.uiManager.pushModalState('deck-guide-modal');
        }
    }

    static closeGuideModal() {
        document.getElementById('deck-guide-modal').classList.remove('active');
        if (window.uiManager && typeof window.uiManager.popModalState === 'function') {
            window.uiManager.popModalState('deck-guide-modal');
        }
    }

    static copyGuideToClipboard() {
        const contentDiv = document.getElementById('deck-guide-content');
        if (!contentDiv) return;
        
        // Copiar texto plano para mayor compatibilidad
        const text = contentDiv.innerText || contentDiv.textContent;
        if (!text || text.includes('No hay una guía')) return;

        navigator.clipboard.writeText(text).then(() => {
            if (window.uiManager && window.uiManager.showToast) {
                window.uiManager.showToast('Texto de la guía copiado', 'success');
            }
        }).catch(err => {
            console.error('Error al copiar:', err);
        });
    }

    static async editGuideMode() {
        if (window.uiManager && !window.uiManager.validateFreemiumAction(null, 'flashcards')) return;

        DeckExplorer.sessionImages = []; // Reset session tracking
        document.getElementById('deck-guide-view-mode').style.display = 'none';
        document.getElementById('deck-guide-edit-mode').style.display = 'block';

        const description = window.repasoManager.currentDeck.description || '';

        // Initialize TinyMCE if not already done
        if (!window.tinymce.get('deck-guide-textarea')) {
            await window.tinymce.init({
                selector: '#deck-guide-textarea',
                height: 500,
                menubar: false,
                skin: 'oxide-dark',
                content_css: 'dark',
                plugins: 'lists link table code help wordcount image',
                toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent | table image | code help',
                images_upload_handler: async (blobInfo) => {
                    const user = window.sessionManager?.getUser();
                    const tier = (user?.subscriptionStatus || user?.subscription_tier || 'free').toLowerCase();
                    
                    const editor = window.tinymce.get('deck-guide-textarea');
                    if (editor) {
                        const content = editor.getContent();
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = content;
                        if (tempDiv.querySelectorAll('img').length >= 2) {
                            throw new Error('Límite de 2 imágenes por Guía alcanzado.');
                        }
                    }

                    const formData = new FormData();
                    formData.append('file', blobInfo.blob(), blobInfo.filename());

                    const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/cards/upload-image`, {
                        method: 'POST',
                        body: formData
                    });

                    const data = await res.json();
                    
                    if (res.status === 403) {
                        if (window.uiManager) window.uiManager.showPaywallModal(null, 'flashcards');
                        throw new Error('Créditos agotados. Suscríbete para continuar.');
                    }

                    if (res.ok && data.imageUrl) {
                        // Track this image for the current session
                        DeckExplorer.sessionImages.push(data.imageUrl);
                        return window.resolveImageUrl ? window.resolveImageUrl(data.imageUrl) : data.imageUrl;
                    } else {
                        throw new Error(data.error || 'Error al subir imagen');
                    }
                },
                setup: (editor) => {
                    editor.on('init', () => {
                        editor.setContent(description);
                    });
                }
            });
        } else {
            window.tinymce.get('deck-guide-textarea').setContent(description);
        }
    }

    static async cancelEditGuide() {
        // Cleanup: delete images uploaded during this session since we are canceling
        if (DeckExplorer.sessionImages.length > 0) {
            DeckExplorer._cleanupSessionImages(DeckExplorer.sessionImages);
        }
        DeckExplorer.sessionImages = [];
        
        document.getElementById('deck-guide-view-mode').style.display = 'block';
        document.getElementById('deck-guide-edit-mode').style.display = 'none';
    }

    static _cleanupSessionImages(urls) {
            window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/media/delete`, {
                method: 'DELETE',
                body: JSON.stringify({ url })
            }).catch(err => console.error('Error cleaning up session image:', err));
    }

    static async saveGuide() {
        const deck = window.repasoManager.currentDeck;
        if (!deck) return;

        // Get content from TinyMCE
        const newDescription = window.tinymce.get('deck-guide-textarea').getContent();
        const btn = document.querySelector('#deck-guide-edit-mode .btn-action[style*="background: #10b981"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btn.disabled = true;

        try {
            const token = localStorage.getItem('authToken');
            
            // Get all images in final HTML
            const finalImages = [];
            const imgRegex = /src="([^">]+storage\.googleapis\.com[^">]+)"/g;
            let match;
            while ((match = imgRegex.exec(newDescription)) !== null) {
                finalImages.push(match[1]);
            }

            // 1. Cleanup images that were uploaded in this session but deleted before saving
            const sessionOrphans = DeckExplorer.sessionImages.filter(url => !finalImages.includes(url));
            if (sessionOrphans.length > 0) {
                DeckExplorer._cleanupSessionImages(sessionOrphans);
            }
            DeckExplorer.sessionImages = [];

            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/decks/${deck.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: deck.name,
                    icon: deck.icon,
                    description: newDescription
                })
            });

            if (res.status === 403) {
                if (window.uiManager) window.uiManager.showPaywallModal(null, 'flashcards');
                return;
            }

            if (res.ok) {
                const data = await res.json();
                // Update local state
                deck.description = newDescription;
                window.uiManager.showToast('Guía actualizada correctamente', 'success');
                if (window.sessionManager) {
                    const user = window.sessionManager.getUser();
                    const tier = (user?.subscriptionStatus || user?.subscription_tier || 'free').toLowerCase();
                    if (tier === 'free' || tier === 'pending') {
                        await window.sessionManager.refreshUser();
                    }
                }
                // Re-render modal in view mode
                DeckExplorer.openGuideModal(deck.id, deck.name);
            } else {
                throw new Error('Error saving guide');
            }
        } catch (e) {
            console.error('Error saving guide', e);
            window.uiManager.showToast('Error al actualizar la guía', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// Global Export for onclicks
window.DeckExplorer = DeckExplorer;
