/**
 * MarkdownRenderer — Unified Medical Tutor Renderer
 * Unifies the format across all chats (General, Audio, Flashcards) and Notes.
 */
window.MarkdownRenderer = {
    render(text) {
        if (!text) return '';

        let formatted = text
            // 1. Colapsar saltos de línea excesivos
            .replace(/\n{3,}/g, '\n\n')
            
            // 2. Títulos
            .replace(/^### (.*)$/gm, '<h3>$1</h3>')
            .replace(/^## (.*)$/gm, '<h2>$1</h2>')
            .replace(/^# (.*)$/gm, '<h1>$1</h1>')
            
            // 3. Bloques de código (opcional, pero útil)
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            
            // 4. Citas
            .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
            
            // 5. Listas Anidadas (Nivel 3 - 4+ espacios)
            .replace(/^(?: {4,}|\t\t)[\*\-] (.*)$/gm, '<li class="li-l3">$1</li>')
            .replace(/((?:<li class="li-l3">[\s\S]*?<\/li>)+)/g, '<ul class="ul-l3">$1</ul>')
            
            // 6. Listas Anidadas (Nivel 2 - 2 espacios)
            .replace(/^(?: {2,}|\t)[\*\-] (.*)$/gm, '<li class="li-l2">$1</li>')
            .replace(/((?:<li class="li-l2">[\s\S]*?<\/li>(?:<ul class="ul-l3">[\s\S]*?<\/ul>)?)+)/g, '<ul class="ul-l2">$1</ul>')
            
            // 7. Listas Nivel 1 (0 espacios)
            .replace(/^[\*\-] (.*)$/gm, '<li class="li-l1">$1</li>')
            .replace(/((?:<li class="li-l1">[\s\S]*?<\/li>(?:<ul class="ul-l2">[\s\S]*?<\/ul>)?)+)/g, '<ul class="ul-l1">$1</ul>')
            
            // 8. Formato de texto
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            
            // 9. Saltos de línea y Limpieza
            .replace(/\n/g, '<br>');

        // Limpieza de saltos post-bloque para evitar espaciado doble indeseado
        formatted = formatted
            .replace(/<\/h1><br>/g, '</h1>')
            .replace(/<\/h2><br>/g, '</h2>')
            .replace(/<\/h3><br>/g, '</h3>')
            .replace(/<\/ul><br>/g, '</ul>')
            .replace(/<\/blockquote><br>/g, '</blockquote>')
            .replace(/<hr><br>/g, '<hr>');

        return formatted;
    }
};
