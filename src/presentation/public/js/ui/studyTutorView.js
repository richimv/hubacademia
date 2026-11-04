/** Shared Tutor presentation. No AI calls, quotas, histories or note persistence here. */
window.StudyTutorView = (() => {
    function mount({ id, prefix, contextLabel, welcome = '' }) {
        document.getElementById(id)?.remove();
        const panel = document.createElement('aside');
        panel.id = id;
        panel.className = 'tutor-chat-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Tutor IA de estudio');
        panel.setAttribute('aria-modal', 'false');
        panel.setAttribute('aria-hidden', 'true');
        panel.inert = true;
        panel.innerHTML = `
            <div class="tutor-chat-header">
                <div class="tutor-header-title">
                    <img src="/assets/hubifrente.png" alt="" class="tutor-header-avatar-img" width="32" height="32">
                    <div><span>Tutor IA</span><p class="tutor-context-label"></p></div>
                </div>
                <div class="tutor-header-actions">
                    <button type="button" id="${prefix}-expand" class="tutor-expand-btn" aria-label="Ampliar tutor" aria-pressed="false" title="Pantalla completa"><i class="fas fa-expand" aria-hidden="true"></i></button>
                    <button type="button" id="${prefix}-close" class="tutor-close-btn" aria-label="Cerrar tutor">&times;</button>
                </div>
            </div>
            <div class="tutor-notes-link"><span>Guarda las respuestas que quieras conservar.</span><a href="/repaso?view=notes" target="_blank" rel="noopener noreferrer">Mis Notas ↗</a></div>
            <div id="${prefix}-messages" class="tutor-messages-area" role="log" aria-live="polite" aria-relevant="additions"></div>
            <div class="tutor-input-area">
                <label class="tutor-sr-only" for="${prefix}-input">Tu pregunta para el Tutor IA</label>
                <textarea id="${prefix}-input" class="tutor-input-field" placeholder="Pregunta sobre lo que estás estudiando…" rows="1"></textarea>
                <button type="button" id="${prefix}-send" class="tutor-send-btn" aria-label="Enviar pregunta"><i class="fas fa-arrow-up" aria-hidden="true"></i></button>
            </div>
            <p class="tutor-disclaimer-text">El Tutor IA puede cometer errores. Contrasta la información importante.</p>`;
        panel.querySelector('.tutor-context-label').textContent = contextLabel;
        if (welcome) {
            const message = document.createElement('div');
            message.className = 'tutor-message tutor-message-bot';
            message.textContent = welcome;
            panel.querySelector('.tutor-messages-area').append(message);
        }
        document.body.append(panel);
        return panel;
    }

    function bindLifecycle(panel, close) {
        panel.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') { event.stopPropagation(); close(); }
            if (event.key !== 'Tab' || !panel.classList.contains('chat-fullscreen')) return;
            const controls = [...panel.querySelectorAll('button:not(:disabled), textarea:not(:disabled), a[href]')].filter((element) => element.offsetParent !== null);
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        });
    }

    function setOpen(panel, open) {
        if (open && panel.getAttribute('aria-hidden') === 'true') panel._returnFocus = document.activeElement;
        if (!open && panel._returnFocus?.isConnected) panel._returnFocus.focus();
        panel.inert = !open;
        panel.setAttribute('aria-hidden', String(!open));
        panel.setAttribute('aria-modal', String(open && panel.classList.contains('chat-fullscreen')));
    }

    function setExpanded(panel, button, expanded) {
        if (expanded && !panel.classList.contains('chat-fullscreen')) {
            panel._previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
        } else if (!expanded && panel.classList.contains('chat-fullscreen')) {
            document.body.style.overflow = panel._previousOverflow || '';
        }
        panel.classList.toggle('chat-fullscreen', expanded);
        panel.setAttribute('aria-modal', String(expanded && panel.classList.contains('active')));
        button.setAttribute('aria-pressed', String(expanded));
        const label = expanded ? 'Restaurar ventana del tutor' : 'Ampliar tutor';
        button.setAttribute('aria-label', label);
        button.title = label;
        const icon = button.querySelector('i');
        icon?.classList.toggle('fa-expand', !expanded);
        icon?.classList.toggle('fa-compress', expanded);
    }

    function setContext(panel, label) {
        const context = panel.querySelector('.tutor-context-label');
        if (context && label) { context.textContent = label; context.title = label; }
    }

    return { mount, bindLifecycle, setOpen, setExpanded, setContext };
})();
