/** Corporate navigation shared by pricing and legal pages; account UI stays in app.js. */
(() => {
    const init = () => {
        const header = document.querySelector('[data-public-header]');
        if (!header) return;
        header.className = 'exec-header';
        header.innerHTML = `<div class="exec-header-bar">
            <a class="exec-brand brand-link" href="/" aria-label="Hub Academia, inicio"><span class="brand-wordmark" aria-hidden="true"><img class="brand-image brand-image--dark" src="/assets/hubacademiadark.png" alt="" width="168" height="44"><img class="brand-image brand-image--light" src="/assets/hubacademialight.png" alt="" width="168" height="44"></span></a>
            <nav class="exec-nav" aria-label="Navegación principal"><a class="exec-nav-link" href="/#herramientas-section">Soluciones</a><a class="exec-nav-link" href="/library">Boletín IA</a><a class="exec-nav-link" href="/pricing">Pases de acceso</a></nav>
            <div class="exec-header-actions"><button type="button" id="theme-toggle-btn" class="theme-toggle-btn" aria-label="Cambiar tema"><i class="fas fa-sun" aria-hidden="true"></i></button><div id="user-session-controls"><a href="/login" id="open-login-modal" class="exec-login-btn">Acceder</a></div><button type="button" id="public-menu-toggle" class="exec-menu-toggle" aria-expanded="false" aria-controls="public-mobile-menu">Menú</button></div>
        </div><nav id="public-mobile-menu" class="exec-mobile-drawer" aria-label="Navegación móvil"><a href="/#herramientas-section">Soluciones</a><a href="/simulator-dashboard">Simuladores</a><a href="/repaso">Repaso y Notas</a><a href="/library">Boletín IA</a><a href="/pricing">Pases de acceso</a></nav>`;
        header.querySelectorAll('a').forEach(link => {
            if (link.getAttribute('href') === location.pathname) link.setAttribute('aria-current', 'page');
        });
        const toggle = document.getElementById('public-menu-toggle');
        const drawer = document.getElementById('public-mobile-menu');
        const close = (restoreFocus = false) => {
            toggle.setAttribute('aria-expanded', 'false');
            drawer.classList.remove('is-open');
            if (restoreFocus) toggle.focus();
        };
        toggle.addEventListener('click', () => {
            const open = toggle.getAttribute('aria-expanded') !== 'true';
            toggle.setAttribute('aria-expanded', String(open));
            drawer.classList.toggle('is-open', open);
        });
        drawer.addEventListener('click', event => { if (event.target.closest('a')) close(); });
        document.addEventListener('click', event => { if (!header.contains(event.target)) close(); });
        document.addEventListener('keydown', event => { if (event.key === 'Escape' && drawer.classList.contains('is-open')) close(true); });
        matchMedia('(min-width: 961px)').addEventListener('change', event => { if (event.matches) close(); });

        const footer = document.querySelector('[data-public-footer]');
        if (footer) footer.innerHTML = `<div class="public-footer-inner"><div><a class="exec-brand brand-link" href="/" aria-label="Hub Academia, inicio"><span class="brand-wordmark" aria-hidden="true"><img class="brand-image brand-image--dark" src="/assets/hubacademiadark.png" alt="" width="168" height="44"><img class="brand-image brand-image--light" src="/assets/hubacademialight.png" alt="" width="168" height="44"></span></a><p>Inteligencia artificial aplicada al conocimiento profesional.</p><a href="mailto:soporte@hubacademia.com">soporte@hubacademia.com</a></div><nav aria-label="Información institucional"><a href="/pricing">Pases de acceso</a><a href="/privacy">Privacidad</a><a href="/terms">Términos y condiciones</a></nav><p class="public-footer-location">Lima, Perú<br>© 2026 Hub Academia</p></div>`;

        const contents = document.querySelector('[data-legal-contents]');
        if (contents) document.querySelectorAll('.legal-section h2').forEach((heading, index) => {
            heading.id ||= 'legal-section-' + (index + 1);
            const link = document.createElement('a');
            link.href = '#' + heading.id;
            link.textContent = heading.textContent;
            contents.append(link);
        });
        if (typeof window.updateHeaderUI === 'function') window.updateHeaderUI(window.sessionManager?.getUser() || null);
        window.themeManager?.updateToggleButtons();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
