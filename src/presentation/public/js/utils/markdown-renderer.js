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

        // Pre-procesar tablas markdown contenidas en el HTML (TinyMCE/IA mix)
        html = this.renderMarkdownTables(html);

        // 3. Post-procesamiento via DOM (Tablas responsivas y Resolución de Imágenes)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        this._sanitizeDom(tempDiv);
        
        // Envolver tablas
        tempDiv.querySelectorAll('table').forEach(table => {
            if (table.classList) {
                table.classList.add('premium-table');
            } else if (typeof table.className === 'string' && !table.className.includes('premium-table')) {
                table.className = (table.className + ' premium-table').trim();
            }

            const parent = table.parentNode;
            const parentHasWrapper = parent && (
                (parent.classList && typeof parent.classList.contains === 'function' && parent.classList.contains('table-wrapper')) ||
                (typeof parent.className === 'string' && parent.className.includes('table-wrapper')) ||
                (typeof parent.getAttribute === 'function' && (parent.getAttribute('class') || '').includes('table-wrapper'))
            );

            if (!parentHasWrapper) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-wrapper';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
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
     * Envuelve las tablas en un div con scroll horizontal para móviles y añade clases premium.
     */
    wrapTables(html) {
        if (!html || !html.includes('<table')) return html;
        let processed = html.replace(/<table([\s\S]*?)>/gi, (match, attrs) => {
            if (!attrs.includes('premium-table')) {
                return `<table${attrs} class="premium-table">`;
            }
            return match;
        });
        return processed.replace(/<table[\s\S]*?<\/table>/gi, (match) => {
            return `<div class="table-wrapper">${match}</div>`;
        });
    },

    /**
     * Detecta y renderiza tablas en sintaxis Markdown mezcladas con HTML.
     */
    renderMarkdownTables(html) {
        if (typeof html !== 'string' || !html.includes('|')) return html;

        // 1. Normalizar saltos de línea para elementos de bloque y <br> (solo si separan filas)
        const normalized = html
            .replace(/<br\s*\/?>\s*(?=\|)/gi, '\n')
            .replace(/(\|\s*)<br\s*\/?>/gi, '$1\n')
            .replace(/(<\/p>|<\/div>|<\/h[1-6]>|<\/li>|<\/tr>)/gi, '$1\n')
            .replace(/(<p>|<div>|<h[1-6]>|<li>|<tr>)/gi, '\n$1');

        const lines = normalized.split('\n');
        let inTable = false;
        let tableRows = [];
        let resultLines = [];

        const cleanLine = (line) => {
            return line.replace(/^(?:<p>|<div>|<span[^>]*>)+/i, '')
                       .replace(/(?:<\/p>|<\/div>|<\/span>)+$/i, '')
                       .trim();
        };

        const isSeparatorRow = (line) => {
            const cleaned = cleanLine(line);
            return /^\|\s*[:\-]+\s*\|\s*([:\-]+\s*\|)*\s*$/.test(cleaned);
        };

        const isTableRow = (line) => {
            const cleaned = cleanLine(line);
            return cleaned.startsWith('|') && cleaned.endsWith('|') && cleaned.length > 2;
        };

        const parseRow = (line) => {
            const cleaned = cleanLine(line);
            const content = cleaned.substring(1, cleaned.length - 1);
            return content.split('|').map(cell => cell.trim());
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (isTableRow(line)) {
                if (!inTable) {
                    // Verificar si la siguiente línea es un separador de tabla
                    if (i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
                        inTable = true;
                        tableRows = [parseRow(line)];
                    } else {
                        resultLines.push(line);
                    }
                } else {
                    if (isSeparatorRow(line)) {
                        // Omitir fila separadora
                    } else {
                        tableRows.push(parseRow(line));
                    }
                }
            } else {
                if (inTable) {
                    resultLines.push(this._generateHtmlTable(tableRows));
                    inTable = false;
                    tableRows = [];
                }
                resultLines.push(line);
            }
        }

        if (inTable) {
            resultLines.push(this._generateHtmlTable(tableRows));
        }

        return resultLines.join('\n');
    },

    _generateHtmlTable(rows) {
        if (rows.length === 0) return '';

        let html = '<div class="table-wrapper"><table class="premium-table">';
        
        // Cabecera
        html += '<thead><tr>';
        rows[0].forEach(cell => {
            html += `<th>${this._parseCellInline(cell)}</th>`;
        });
        html += '</tr></thead>';

        // Cuerpo
        if (rows.length > 1) {
            html += '<tbody>';
            for (let i = 1; i < rows.length; i++) {
                html += '<tr>';
                rows[i].forEach(cell => {
                    html += `<td>${this._parseCellInline(cell)}</td>`;
                });
                html += '</tr>';
            }
            html += '</tbody>';
        }

        html += '</table></div>';
        return html;
    },

    /**
     * Parsea markdown básico de manera inline para celdas.
     */
    _parseCellInline(cell) {
        if (!cell) return '';
        return cell
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
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

        root.querySelectorAll(blockedSelector).forEach(node => {
            if (node.tagName.toLowerCase() === 'iframe') {
                const src = node.getAttribute('src') || '';
                const isYoutube = src.includes('youtube.com') || src.includes('youtu.be') || src.includes('youtube-nocookie.com');
                const isVimeo = src.includes('player.vimeo.com');
                if (isYoutube || isVimeo) {
                    return; // Keep safe video iframe
                }
            }
            node.remove();
        });

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
