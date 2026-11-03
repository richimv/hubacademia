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

        // 1. JSON Safety Net & Normalización: Extraer la respuesta real si viene en JSON o con bloques de código
        let cleanText = this._extractCleanResponse(text);

        // 2. Extraer y proteger expresiones matemáticas LaTeX ($$...$$, \[...\], $...$, \(...\))
        const { processedText, mathExpressions } = this._extractMath(cleanText);

        let html = '';
        
        // Determinar si el contenido ya es HTML (generado por TinyMCE u otro origen)
        const isHtml = typeof processedText === 'string' && processedText.trimStart().startsWith('<');

        if (isHtml) {
            html = processedText;
        } else if (window.marked && typeof window.marked.parse === 'function') {
            window.marked.setOptions({
                gfm: true,
                breaks: true,
                headerIds: false,
                mangle: false
            });
            try {
                html = window.marked.parse(processedText);
            } catch (err) {
                console.error('❌ [MarkdownRenderer] Error con marked:', err);
                html = this._basicRender(processedText);
            }
        } else {
            html = this._basicRender(processedText);
        }

        // Pre-procesar tablas markdown contenidas en el HTML (TinyMCE/IA mix)
        html = this.renderMarkdownTables(html);

        // 3. Post-procesamiento y Sanitización DOM (Tablas responsivas y Resolución de Imágenes)
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

        // 4. Restaurar y renderizar fórmulas matemáticas con KaTeX (Preserva íntegramente las coordenadas style="top:...")
        return this._restoreMath(tempDiv.innerHTML, mathExpressions);
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
        let parsed = text
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^### (.*)$/gm, '<h3>$1</h3>')
            .replace(/^## (.*)$/gm, '<h2>$1</h2>')
            .replace(/^# (.*)$/gm, '<h1>$1</h1>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
            // Listas ordenadas (1., 2., 3.)
            .replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>')
            .replace(/((?:<li>[\s\S]*?<\/li>\n?)+)/g, '<ol>$1</ol>')
            // Listas no ordenadas (anidadas y nivel 1) con soporte para guiones, asteriscos, más y viñetas
            .replace(/^(?: {4,}|\t\t)[\*\-\+\•·⁃◦] (.*)$/gm, '<li class="li-l3">$1</li>')
            .replace(/((?:<li class="li-l3">[\s\S]*?<\/li>)+)/g, '<ul class="ul-l3">$1</ul>')
            .replace(/^(?: {2,}|\t)[\*\-\+\•·⁃◦] (.*)$/gm, '<li class="li-l2">$1</li>')
            .replace(/((?:<li class="li-l2">[\s\S]*?<\/li>(?:<ul class="ul-l3">[\s\S]*?<\/ul>)?)+)/g, '<ul class="ul-l2">$1</ul>')
            .replace(/^[\*\-\+\•·⁃◦] (.*)$/gm, '<li>$1</li>')
            .replace(/((?:<li>[\s\S]*?<\/li>\n?)+)/g, '<ul>$1</ul>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Reemplazar saltos de línea restantes que no estén dentro de listas o encabezados
        return parsed.replace(/\n(?!(?:<\/li>|<\/ol>|<\/ul>|<\/h[1-6]>|<\/pre>))/g, '<br>');
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

                if (name.startsWith('on') || name === 'srcdoc') {
                    el.removeAttribute(attr.name);
                    return;
                }

                if (name === 'style') {
                    // Permitir estilos inline legítimos en elementos matemáticos de KaTeX
                    const isKaTeX = (el.classList && (
                        el.classList.contains('katex') || 
                        el.classList.contains('pstrut') || 
                        el.classList.contains('vlist') || 
                        el.classList.contains('sizing') ||
                        el.classList.contains('mfrac')
                    )) || (typeof el.closest === 'function' && el.closest('.katex'));

                    if (!isKaTeX) {
                        el.removeAttribute(attr.name);
                    }
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
    },

    /**
     * Extrae de forma resiliente la respuesta limpia si el texto contiene JSON,
     * bloques de código ```json o texto con secuencias de escape.
     */
    _extractCleanResponse(text) {
        if (!text || typeof text !== 'string') return text || '';
        let clean = text.trim();

        // 1. Si está envuelto en bloque ```json ... ``` o ``` ... ```
        const jsonBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
            const inner = jsonBlockMatch[1].trim();
            if (inner.startsWith('{') && inner.endsWith('}')) {
                try {
                    const p = JSON.parse(inner);
                    if (p && p.respuesta) return this._normalizeText(p.respuesta);
                } catch (e) {}
            }
        }

        // 2. Si es un JSON directo
        if (clean.startsWith('{') && clean.endsWith('}')) {
            try {
                const p = JSON.parse(clean);
                if (p && p.respuesta) return this._normalizeText(p.respuesta);
            } catch (e) {}
        }

        // 3. Extracción resiliente de "respuesta" por delimitación semántica
        // Evita truncamiento prematuro cuando el texto incluye comillas internas o símbolos especiales
        const respKeyMatch = clean.match(/"respuesta"\s*:\s*"/i);
        if (respKeyMatch) {
            const valStartIndex = respKeyMatch.index + respKeyMatch[0].length;
            const remainder = clean.substring(valStartIndex);
            const boundaryRegex = /",\s*"(?:sugerencias|idioma_detectado|intencion|confianza|sources|contextUsed)"\s*:|"\s*\}\s*$/i;
            const boundaryMatch = remainder.match(boundaryRegex);
            let extracted = '';
            if (boundaryMatch) {
                extracted = remainder.substring(0, boundaryMatch.index);
            } else {
                const lastBraceIdx = remainder.lastIndexOf('}');
                if (lastBraceIdx !== -1) {
                    const quoteBefore = remainder.lastIndexOf('"', lastBraceIdx);
                    extracted = quoteBefore !== -1 ? remainder.substring(0, quoteBefore) : remainder.substring(0, lastBraceIdx);
                } else {
                    extracted = remainder;
                }
            }
            if (extracted) {
                return this._normalizeText(extracted);
            }
        }

        return this._normalizeText(clean);
    },

    /**
     * Normaliza saltos de línea y secuencias de escape literales (\n, \", etc.).
     */
    _normalizeText(text) {
        if (!text || typeof text !== 'string') return '';
        let normalized = text;
        
        // Convertir secuencias literales '\\n' que llegaron como texto a saltos de línea reales '\n'
        // preservando comandos LaTeX que inician con 'n' (\neq, \nabla, \nu, \neg, etc.)
        const latexNRemainders = 'eq|abla|eg|u|otin|i|ull|exists|rightarrow|leftarrow|subseteq|supseteq|less|gtr|leq|geq|sim|cong|mid|atural';
        const latexNRegex = new RegExp(`\\\\n(?!(?:${latexNRemainders})\\b)`, 'g');
        normalized = normalized.replace(latexNRegex, '\n');

        if (normalized.includes('\\"')) {
            normalized = normalized.replace(/\\"/g, '"');
        }

        // Normalizar viñetas Unicode (•, ·, ⁃, ◦) a guiones Markdown estándar (- )
        normalized = normalized.replace(/^[ \t]*[•·⁃◦][ \t]+/gm, '- ');

        return normalized.trim();
    },

    /**
     * Extrae y protege expresiones matemáticas LaTeX para evitar que Markdown las altere.
     */
    _extractMath(text) {
        if (!text || typeof text !== 'string') return { processedText: '', mathExpressions: [] };

        const mathExpressions = [];

        // 1. Proteger bloques display math ($$...$$ o \[...\])
        let processedText = text
            .replace(/\$\$([\s\S]+?)\$\$/g, (match, expr) => {
                const id = `%%MATH_DISPLAY_${mathExpressions.length}%%`;
                mathExpressions.push({ id, expr: expr.trim(), display: true });
                return id;
            })
            .replace(/\\\[([\s\S]+?)\\\]/g, (match, expr) => {
                const id = `%%MATH_DISPLAY_${mathExpressions.length}%%`;
                mathExpressions.push({ id, expr: expr.trim(), display: true });
                return id;
            });

        // 2. Proteger inline math: \(...\) o $...$ (sin espacios iniciales/finales y excluyendo precios)
        processedText = processedText
            .replace(/\\\(([\s\S]+?)\\\)/g, (match, expr) => {
                const id = `%%MATH_INLINE_${mathExpressions.length}%%`;
                mathExpressions.push({ id, expr: expr.trim(), display: false });
                return id;
            })
            .replace(/(^|[^\\])\$([^\$\s\n](?:[^\$\n]*?[^\$\s\n])?)\$/g, (match, prefix, expr) => {
                // Ignorar números puros con símbolos de moneda como $100 o $50.00
                if (/^\d+([.,]\d+)?$/.test(expr.trim())) {
                    return match;
                }
                const id = `%%MATH_INLINE_${mathExpressions.length}%%`;
                mathExpressions.push({ id, expr: expr.trim(), display: false });
                return prefix + id;
            });

        return { processedText, mathExpressions };
    },

    /**
     * Sanitiza y normaliza expresiones matemáticas y químicas para asegurar compatibilidad estricta con KaTeX.
     */
    _sanitizeMathExpression(expr, display = false) {
        if (!expr || typeof expr !== 'string') return '';
        let s = expr.trim();

        // 1. Decodificar entidades HTML si provienen de TinyMCE u otro editor
        s = s
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&plusmn;/g, '\\pm')
            .replace(/&times;/g, '\\times')
            .replace(/&divide;/g, '\\div')
            .replace(/&ne;/g, '\\neq')
            .replace(/&le;/g, '\\le')
            .replace(/&ge;/g, '\\ge');

        // 2. Normalizar barras dobles accidentales de serialización JSON (ej: \\frac -> \frac)
        s = s.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

        // 3. Manejo de saltos de línea \\ en modo display:
        // Si contiene saltos \\ sin estar dentro de un entorno multilínea (aligned, matrix, cases, etc.)
        if (display && s.includes('\\\\') && !/\\begin\{(aligned|matrix|bmatrix|pmatrix|vmatrix|cases|gather|split)\}/i.test(s)) {
            s = `\\begin{aligned} ${s} \\end{aligned}`;
        }

        return s;
    },

    /**
     * Restaura las expresiones matemáticas protegidas renderizándolas con KaTeX (o fallback HTML).
     */
    _restoreMath(html, mathExpressions) {
        if (!html || !mathExpressions || mathExpressions.length === 0) return html;

        let restored = html;

        mathExpressions.forEach(item => {
            let renderedMath = '';

            if (typeof window !== 'undefined' && window.katex && typeof window.katex.renderToString === 'function') {
                try {
                    const cleanExpr = this._sanitizeMathExpression(item.expr, item.display);
                    renderedMath = window.katex.renderToString(cleanExpr, {
                        displayMode: item.display,
                        throwOnError: false,
                        strict: 'ignore',
                        output: 'html'
                    });
                } catch (err) {
                    console.warn('⚠️ [MarkdownRenderer] Error renderizando con KaTeX:', err.message);
                    renderedMath = `<span class="katex-math" data-math="${encodeURIComponent(item.expr)}" data-display="${item.display}">$${item.expr}$</span>`;
                }
            } else {
                // Fallback defensivo si KaTeX aún no cargó en el DOM
                renderedMath = `<span class="katex-math" data-math="${encodeURIComponent(item.expr)}" data-display="${item.display}">$${item.expr}$</span>`;
                this._ensureKaTeXLoaded();
            }

            if (item.display) {
                renderedMath = `<div class="katex-display-wrapper">${renderedMath}</div>`;
            }

            restored = restored.replace(item.id, () => renderedMath);
        });

        return restored;
    },

    /**
     * Renderiza cualquier ecuación pendiente en un contenedor DOM una vez cargado KaTeX.
     */
    renderMathInElement(container) {
        if (!container || typeof window === 'undefined' || !window.katex) return;

        const mathElements = container.querySelectorAll('.katex-math');
        mathElements.forEach(el => {
            const raw = decodeURIComponent(el.getAttribute('data-math') || '');
            const isDisplay = el.getAttribute('data-display') === 'true';
            if (raw) {
                try {
                    const cleanExpr = this._sanitizeMathExpression(raw, isDisplay);
                    const rendered = window.katex.renderToString(cleanExpr, {
                        displayMode: isDisplay,
                        throwOnError: false,
                        strict: 'ignore',
                        output: 'html'
                    });
                    el.outerHTML = isDisplay 
                        ? `<div class="katex-display-wrapper">${rendered}</div>`
                        : rendered;
                } catch (e) {
                    console.warn('⚠️ [MarkdownRenderer] Error en renderMathInElement:', e);
                }
            }
        });
    },

    /**
     * Inyecta de forma asíncrona los assets de KaTeX si no están en el documento.
     */
    _ensureKaTeXLoaded() {
        if (typeof document === 'undefined' || typeof document.getElementById !== 'function' || !document.head) return;
        if (this._katexLoading || (typeof window !== 'undefined' && window.katex)) return;
        this._katexLoading = true;

        if (!document.getElementById('katex-css')) {
            const link = document.createElement('link');
            link.id = 'katex-css';
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
            document.head.appendChild(link);
        }

        if (!document.getElementById('katex-js')) {
            const script = document.createElement('script');
            script.id = 'katex-js';
            script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
            script.onload = () => {
                this._katexLoading = false;
                this.renderMathInElement(document.body);
            };
            document.head.appendChild(script);
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = typeof window !== 'undefined' ? window.MarkdownRenderer : null;
}
