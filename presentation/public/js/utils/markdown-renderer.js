/**
 * MarkdownRenderer — Unified Medical Tutor Renderer
 * Unifies the format across all chats (General, Audio, Flashcards) and Notes.
 */
window.MarkdownRenderer = {
    render(text) {
        if (!text) return '';

        // ✅ USAR MARKED SI ESTÁ DISPONIBLE (Soporte completo para Tablas, GFM, etc.)
        let html = '';
        if (window.marked && typeof window.marked.parse === 'function') {
            // Configurar para que respete saltos de línea simples
            window.marked.setOptions({
                gfm: true,
                breaks: true, // ✅ ESTA ES LA CLAVE: \n -> <br>
                headerIds: false,
                mangle: false
            });
            html = window.marked.parse(text);
        } else {
            // Fallback al renderizador básico si marked no cargó
            html = this._basicRender(text);
        }

        // ✅ ENVOLVER TABLAS PARA RESPONSIVIDAD (Scrolling Horizontal)
        return this.wrapTables(html);
    },

    wrapTables(html) {
        if (!html || !html.includes('<table')) return html;
        // Regex para envolver cada tabla en un div.table-wrapper
        return html.replace(/<table[\s\S]*?<\/table>/g, (match) => {
            return `<div class="table-wrapper">${match}</div>`;
        });
    },

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
    }
};
