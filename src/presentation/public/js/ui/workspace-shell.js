/** Shared study navigation. Session and sidebar stay owned by their existing modules. */
(() => {
    'use strict';
    function init() {
        if (!document.body.classList.contains('workspace-page')) return;
        const page = document.body.dataset.workspace;
        const focusedStudy = page === 'quiz' || page === 'flashcards';
        let header = document.querySelector('.main-header');
        if (!header) {
            header = document.createElement('header');
            header.className = 'main-header';
            header.innerHTML = '<div class="header-start"><a class="logo brand-link" href="/" aria-label="Hub Academia"><span class="brand-wordmark" aria-hidden="true"><img class="brand-image brand-image--dark" src="/assets/hubacademiadark.png" alt="" width="168" height="44"><img class="brand-image brand-image--light" src="/assets/hubacademialight.png" alt="" width="168" height="44"></span></a></div><div class="header-nav"><div id="user-session-controls"><button type="button" id="open-login-modal" class="btn-primary">Acceder</button></div></div>';
            document.body.prepend(header);
            // app.js exposes the same renderer used by every existing header.
            if (typeof window.updateHeaderUI === 'function') window.updateHeaderUI(window.sessionManager?.getUser() || null);
        }
        if (header.querySelector('.workspace-nav, .workspace-return')) return;
        const scope = document.createElement('span');
        scope.className = 'workspace-scope';
        scope.textContent = ({ simulator: 'Simuladores', quiz: 'Sesión de examen', repaso: 'Repaso y Notas', flashcards: 'Flashcards', library: 'Boletín IA', profile: 'Mi cuenta', admin: 'Gestión', dashboard: 'Analítica', resource: 'Lectura' })[page] || 'Estudio';
        header.querySelector('.header-start')?.append(scope);
        if (focusedStudy) {
            // Move the original control: its pause/exit handler remains the owner.
            const leave = document.getElementById(page === 'quiz' ? 'btn-top-exit' : 'btn-progress');
            if (!leave) return;
            leave.classList.add('workspace-return');
            if (!leave.hasAttribute('aria-label')) leave.setAttribute('aria-label', leave.textContent.trim());
            const useExistingExit = (event) => {
                event.preventDefault();
                leave.click();
            };
            header.querySelector('.logo')?.addEventListener('click', useExistingExit);
            header.insertBefore(leave, header.querySelector('.header-nav'));
            return;
        }
        const navigation = document.createElement('nav');
        navigation.className = 'workspace-nav';
        navigation.setAttribute('aria-label', 'Módulos de estudio');
        const items = [
            ['simulator', '/simulator-dashboard', 'Simuladores'],
            ['repaso', '/repaso', 'Flashcards'],
            ['notes', '/repaso?view=notes', 'Notas'],
            ['library', '/library', 'Boletín IA']
        ];
        items.forEach(([id, href, label]) => {
            const link = document.createElement('a');
            link.href = href;
            link.textContent = label;
            link.dataset.workspaceLink = id;
            navigation.append(link);
        });
        header.insertBefore(navigation, header.querySelector('.header-nav'));
        function markCurrent(view) {
            const notes = page === 'repaso' && (typeof view === 'string' ? view === 'notes' : new URLSearchParams(location.search).get('view') === 'notes');
            const active = notes ? 'notes' : page === 'resource' ? 'library' : page;
            navigation.querySelectorAll('a').forEach((link) => {
                if (link.dataset.workspaceLink === active) link.setAttribute('aria-current', 'page');
                else link.removeAttribute('aria-current');
            });
        }
        markCurrent();
        window.addEventListener('popstate', markCurrent);
        document.addEventListener('repaso:view-changed', (event) => markCurrent(event.detail.view));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
