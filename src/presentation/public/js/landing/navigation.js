/** Mobile navigation, section tracking and the legacy ?openChat=true link. */
export function initMobileMenu() {
    const toggle = document.getElementById('exec-mobile-menu-btn');
    const drawer = document.getElementById('exec-mobile-drawer');
    if (!toggle || !drawer) return;
    function setOpen(open, restoreFocus = false) {
        drawer.hidden = !open;
        drawer.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = open ? 'Cerrar' : 'Menú';
        if (restoreFocus) toggle.focus();
    }
    toggle.addEventListener('click', () => setOpen(drawer.hidden));
    drawer.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !drawer.hidden) setOpen(false, true);
    });
    document.addEventListener('click', (event) => {
        if (!drawer.hidden && !drawer.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
    });
    window.matchMedia('(min-width: 961px)').addEventListener('change', (event) => {
        if (event.matches) setOpen(false);
    });
}

export function initGuide() {
    function openGuide() {
        if (window.chatbot && typeof window.chatbot.toggleChat === 'function') {
            if (!window.chatbot.isOpen) window.chatbot.toggleChat();
        } else {
            document.getElementById('chatbot-toggle')?.click();
        }
    }
    const url = new URL(window.location.href);
    if (url.searchParams.get('openChat') !== 'true') return;
    let opened = false;
    function openWhenReady() {
        if (opened || !window.chatbot) return;
        opened = true;
        openGuide();
        url.searchParams.delete('openChat');
        window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    window.addEventListener('load', openWhenReady, { once: true });
    window.sessionManager?.onStateChange(openWhenReady);
    openWhenReady();
}

export function initNavigation() {
    initSectionLinks();
    if (!('IntersectionObserver' in window)) return;
    const links = [...document.querySelectorAll('.exec-nav-link[href^="#"]')];
    const observer = new IntersectionObserver((entries) => {
        const active = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!active) return;
        links.forEach((link) => {
            if (link.hash === `#${active.target.id}`) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    links.forEach((link) => { const section = document.querySelector(link.hash); if (section) observer.observe(section); });
    const hero = document.getElementById('hero-section');
    if (hero) observer.observe(hero);
}

/** Recalculate the destination while panels/media change the document's geometry. */
function initSectionLinks() {
    const root = document.documentElement;
    let frame = 0;
    let active = false;
    const cancel = () => {
        if (!active) return;
        cancelAnimationFrame(frame);
        active = false;
        root.classList.remove('landing-anchor-scroll');
        document.dispatchEvent(new Event('landing:anchor-settled'));
    };
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchstart', cancel, { passive: true });
    document.addEventListener('keydown', event => {
        if (['Escape', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancel();
    });
    document.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a[href^="#"]');
        if (!link || link.target === '_blank' || link.hash.length < 2) return;
        let target;
        try { target = document.getElementById(decodeURIComponent(link.hash.slice(1))); } catch { return; }
        if (!target) return;
        event.preventDefault();
        cancel();
        root.classList.add('landing-anchor-scroll');
        active = true;
        const start = window.scrollY;
        const started = performance.now();
        const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280;
        let settleFrames = 3;
        const destination = () => {
            const header = document.querySelector('.exec-header');
            const offset = header?.getBoundingClientRect().bottom || 0;
            const top = target.getBoundingClientRect().top + window.scrollY - offset - 16;
            return Math.max(0, Math.min(top, document.documentElement.scrollHeight - innerHeight));
        };
        const step = now => {
            if (!active) return;
            const progress = duration ? Math.min(1, (now - started) / duration) : 1;
            const eased = 1 - Math.pow(1 - progress, 3);
            window.scrollTo(0, start + (destination() - start) * eased);
            if (progress < 1 || settleFrames-- > 0) {
                frame = requestAnimationFrame(step);
                return;
            }
            active = false;
            history.pushState(history.state, '', link.hash);
            if (event.detail === 0) {
                const hadTabIndex = target.hasAttribute('tabindex');
                if (!hadTabIndex) target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
                if (!hadTabIndex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
            }
            root.classList.remove('landing-anchor-scroll');
            document.dispatchEvent(new Event('landing:anchor-settled'));
        };
        // Start the timeline on this click; video seeking resumes after navigation settles.
        step(started);
    });
}
