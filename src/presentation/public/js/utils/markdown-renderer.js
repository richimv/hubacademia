/**
 * MarkdownRenderer — Unified Medical Tutor Renderer
 * Unifies the format across all chats (General, Audio, Flashcards) and Notes.
 */
window.MarkdownRenderer = {
    /**
     * Renderiza texto Markdown a HTML.
     * @param {string} text - Contenido en Markdown.
     * @returns {string} HTML renderizado.
     */
    render(text) {
        if (!text) return '';

        // 1. JSON Safety Net: Si es un JSON crudo de la IA, extraer solo "respuesta"
        let cleanText = text;
        if (typeof text === 'string' && text.trimStart().startsWith('{')) {
            try {
                const parsed = JSON.parse(text);
                if (parsed && parsed.respuesta) cleanText = parsed.respuesta;
            } catch (e) { /* No es JSON, continuar */ }
        }

        let html = '';
        
        // Determinar si el contenido ya es HTML (generado por TinyMCE u otro origen)
        const isHtml = typeof cleanText === 'string' && cleanText.trimStart().startsWith('<');

        if (isHtml) {
            html = cleanText;
        } else if (window.marked && typeof window.marked.parse === 'function') {
            window.marked.setOptions({
                gfm: true,
                breaks: true,
                headerIds: false,
                mangle: false
            });
            try {
                html = window.marked.parse(cleanText);
            } catch (err) {
                console.error('❌ [MarkdownRenderer] Error con marked:', err);
                html = this._basicRender(cleanText);
            }
        } else {
            html = this._basicRender(cleanText);
        }

        // 3. Post-procesamiento via DOM (Tablas responsivas y Resolución de Imágenes)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        this._sanitizeDom(tempDiv);
        
        // Envolver tablas
        tempDiv.querySelectorAll('table').forEach(table => {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });

        // Resolver URLs de imágenes y hacerlas clicables
        tempDiv.querySelectorAll('img').forEach(img => {
            const rawSrc = img.getAttribute('src');
            let resolved = rawSrc;
            
            if (rawSrc && typeof window.resolveImageUrl === 'function') {
                resolved = window.resolveImageUrl(rawSrc);
                console.log(`🖼️ [MarkdownRenderer] Resolviendo: ${rawSrc} -> ${resolved}`);
                img.src = resolved;
            }

            // Bypass hotlinking block for external images
            img.referrerPolicy = 'no-referrer';
            img.setAttribute('referrerpolicy', 'no-referrer');

            // Hacerla interactiva con el Visor Inmersivo de Hub Academia
            img.style.cursor = 'zoom-in';
            img.title = 'Hacer clic para abrir en el Visor Inmersivo';
            img.onclick = (e) => {
                e.preventDefault();
                const ui = window.uiManager || (window.parent && window.parent.uiManager);
                if (ui && typeof ui.showMediaViewer === 'function') {
                    const title = img.alt || 'Visualizando recurso del chat';
                    ui.showMediaViewer(resolved, title);
                } else {
                    console.warn('⚠️ [MarkdownRenderer] uiManager no detectado, abriendo en pestaña nueva.');
                    window.open(resolved, '_blank');
                }
            };
            
            img.loading = 'lazy';
        });

        return tempDiv.innerHTML;
    },

    /**
     * Envuelve las tablas en un div con scroll horizontal para móviles.
     */
    wrapTables(html) {
        if (!html || !html.includes('<table')) return html;
        return html.replace(/<table[\s\S]*?<\/table>/g, (match) => {
            return `<div class="table-wrapper">${match}</div>`;
        });
    },

    /**
     * Renderizador básico (Regex) si marked.js no está cargado.
     */
    _basicRender(text) {
        return text
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^### (.*)$/gm, '<h3>$1</h3>')
            .replace(/^## (.*)$/gm, '<h2>$1</h2>')
            .replace(/^# (.*)$/gm, '<h1>$1</h1>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
            .replace(/^(?: {4,}|\t\t)[\*\-] (.*)$/gm, '<li class="li-l3">$1</li>')
            .replace(/((?:<li class="li-l3">[\s\S]*?<\/li>)+)/g, '<ul class="ul-l3">$1</ul>')
            .replace(/^(?: {2,}|\t)[\*\-] (.*)$/gm, '<li class="li-l2">$1</li>')
            .replace(/((?:<li class="li-l2">[\s\S]*?<\/li>(?:<ul class="ul-l3">[\s\S]*?<\/ul>)?)+)/g, '<ul class="ul-l2">$1</ul>')
            .replace(/^[\*\-] (.*)$/gm, '<li class="li-l1">$1</li>')
            .replace(/((?:<li class="li-l1">[\s\S]*?<\/li>(?:<ul class="ul-l2">[\s\S]*?<\/ul>)?)+)/g, '<ul class="ul-l1">$1</ul>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    },

    /**
     * Removes active content from rendered Markdown before it is inserted into the page.
     */
    _sanitizeDom(root) {
        if (!root || typeof root.querySelectorAll !== 'function') return;

        const blockedSelector = [
            'script',
            'style',
            'iframe',
            'object',
            'embed',
            'form',
            'input',
            'button',
            'select',
            'textarea',
            'meta',
            'link',
            'base'
        ].join(',');

        root.querySelectorAll(blockedSelector).forEach(node => node.remove());

        const urlAttrs = new Set(['href', 'src', 'xlink:href', 'action', 'formaction']);

        root.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                const name = attr.name.toLowerCase();
                const value = attr.value || '';

                if (name.startsWith('on') || name === 'srcdoc' || name === 'style') {
                    el.removeAttribute(attr.name);
                    return;
                }

                if (urlAttrs.has(name) && !this._isSafeUrl(value)) {
                    el.removeAttribute(attr.name);
                }
            });

            if (el.tagName === 'A' && el.getAttribute('target') === '_blank') {
                el.setAttribute('rel', 'noopener noreferrer');
            }
        });
    },

    _isSafeUrl(value) {
        const raw = String(value || '').trim();
        if (!raw) return true;

        if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) {
            return true;
        }

        const compact = raw.replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();
        if (compact.startsWith('javascript:') || compact.startsWith('vbscript:')) {
            return false;
        }

        if (compact.startsWith('data:')) {
            return /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(raw);
        }

        try {
            const url = new URL(raw, window.location.origin);
            return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
        } catch (e) {
            return false;
        }
    }
};
