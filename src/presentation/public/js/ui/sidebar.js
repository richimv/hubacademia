/**
 * sidebar.js
 * Inyector de Barra Lateral Global y Controlador de Navegación Plegable
 * Taxonomía corporativa: Principal + Herramientas + Mi Cuenta + Planes
 */

class GlobalSidebar {
    constructor() {
        this.collapsed = localStorage.getItem('sidebar_collapsed') === 'true';
        this.init();
    }

    init() {
        this._injectStyles();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.render());
        } else {
            this.render();
        }
    }

    _injectStyles() {
        if (!document.querySelector('link[href*="sidebar.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/css/sidebar.css?v=' + (window.AppConfig?.VERSION || '1.0');
            document.head.appendChild(link);
        }
    }

    render() {
        if (document.querySelector('.global-sidebar')) return;

        const token = localStorage.getItem('authToken');
        const initialDisplayBlock = token ? 'block' : 'none';

        document.body.classList.add('no-transition');

        if (this.collapsed && window.innerWidth > 768) {
            document.body.classList.add('sidebar-collapsed');
        }

        const aside = document.createElement('aside');
        aside.className = 'global-sidebar no-transition';
        if (this.collapsed) aside.classList.add('collapsed');

        aside.innerHTML = `
            <!-- Sidebar Header -->
            <div class="sidebar-header">
                <span class="sidebar-header-title">Hub Academia</span>
                <button type="button" class="sidebar-toggle-btn" id="sidebar-toggle-btn" title="Contraer menú" aria-label="Contraer menú lateral">
                    <i class="fas fa-bars"></i>
                </button>
            </div>

            <!-- Sidebar Menu -->
            <div class="sidebar-menu">
                <!-- Sección Principal -->
                <div class="sidebar-section">
                    <span class="sidebar-section-title">Principal</span>

                    <a href="/" class="sidebar-item" data-page="home">
                        <i class="fas fa-house-chimney"></i>
                        <span class="sidebar-item-label">Inicio</span>
                    </a>
                </div>

                <!-- Sección Herramientas -->
                <div class="sidebar-section" id="sidebar-section-tools">
                    <span class="sidebar-section-title">Herramientas</span>

                    <a href="https://docentes.hubacademia.com/" target="_blank" rel="noopener noreferrer" class="sidebar-item" data-page="docentes-inicial" title="Plataforma especializada para Educación Inicial">
                        <i class="fas fa-chalkboard-user"></i>
                        <span class="sidebar-item-label">Docentes Inicial</span>
                        <span class="sidebar-external-badge" aria-hidden="true">↗</span>
                    </a>

                    <a href="/simulator-dashboard" class="sidebar-item" data-page="simuladores">
                        <i class="fas fa-clipboard-check"></i>
                        <span class="sidebar-item-label">Simuladores de Exámenes</span>
                    </a>

                    <a href="/repaso" class="sidebar-item" data-page="repaso">
                        <i class="fas fa-layer-group"></i>
                        <span class="sidebar-item-label">Repaso y Notas</span>
                    </a>

                    <a href="/library" class="sidebar-item" data-page="library">
                        <i class="fas fa-book-open"></i>
                        <span class="sidebar-item-label">Boletín IA</span>
                    </a>
                </div>

                <!-- Sección Mi Cuenta -->
                <div class="sidebar-section" id="sidebar-section-account" style="display: ${initialDisplayBlock};">
                    <span class="sidebar-section-title">Mi Cuenta</span>

                    <a href="/profile" class="sidebar-item" data-page="profile">
                        <i class="fas fa-user-cog"></i>
                        <span class="sidebar-item-label">Mi Perfil</span>
                    </a>
                </div>

                <!-- Sección Planes y Precios -->
                <div class="sidebar-section" id="sidebar-section-pricing">
                    <span class="sidebar-section-title">Planes</span>
                    <a href="/pricing" class="sidebar-item" data-page="pricing">
                        <i class="fas fa-credit-card"></i>
                        <span class="sidebar-item-label">Planes y Precios</span>
                    </a>
                </div>
            </div>

            <!-- Sidebar Footer -->
            <div class="sidebar-footer" style="display: ${initialDisplayBlock};">
                <button type="button" class="sidebar-item logout-item" id="sidebar-logout-btn" style="width: 100%; text-align: left; background: transparent; border: none;">
                    <i class="fas fa-sign-out-alt"></i>
                    <span class="sidebar-item-label">Cerrar sesión</span>
                </button>
            </div>

            <!-- Sidebar Socials -->
            <div class="sidebar-socials-container">
                <span class="sidebar-section-title" style="padding: 0 0 0.5rem 0; text-align: center; width: 100%; display: block;">Comunidad</span>
                <div class="sidebar-socials-icons">
                    <a href="https://www.facebook.com/profile.php?id=61593284876205" target="_blank" rel="noopener noreferrer" class="sidebar-social-btn sidebar-social-fb" title="Facebook" aria-label="Facebook">
                        <i class="fab fa-facebook-f"></i>
                    </a>
                    <a href="https://www.tiktok.com/@hubacademia" target="_blank" rel="noopener noreferrer" class="sidebar-social-btn sidebar-social-tt" title="TikTok" aria-label="TikTok">
                        <i class="fab fa-tiktok"></i>
                    </a>
                </div>
            </div>
        `;

        document.body.prepend(aside);

        const backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        document.body.appendChild(backdrop);

        this._setupMobileHeaderToggle();
        this.highlightActiveItem();
        this._setupEventListeners();
        this._syncAuthState();

        if (window.themeManager) {
            window.themeManager.updateToggleButtons();
        }

        this.restoreScroll();

        document.body.offsetHeight;
        setTimeout(() => {
            document.body.classList.remove('no-transition');
            aside.classList.remove('no-transition');
        }, 50);
    }

    restoreScroll() {
        const sidebarMenu = document.querySelector('.sidebar-menu');
        if (sidebarMenu) {
            const savedScroll = localStorage.getItem('sidebar_scroll_top');
            if (savedScroll) {
                this.isRestoringScroll = true;
                sidebarMenu.scrollTop = parseInt(savedScroll, 10);
                requestAnimationFrame(() => {
                    if (sidebarMenu) {
                        sidebarMenu.scrollTop = parseInt(savedScroll, 10);
                        setTimeout(() => {
                            this.isRestoringScroll = false;
                        }, 150);
                    }
                });
            }
        }
    }

    _setupMobileHeaderToggle() {
        const headerStart = document.querySelector('.header-start');
        if (headerStart && !document.getElementById('mobile-sidebar-toggle')) {
            const mobileBtn = document.createElement('button');
            mobileBtn.type = 'button';
            mobileBtn.className = 'mobile-sidebar-toggle-btn';
            mobileBtn.id = 'mobile-sidebar-toggle';
            mobileBtn.setAttribute('aria-label', 'Abrir menú lateral');
            mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
            headerStart.prepend(mobileBtn);
        }
    }

    highlightActiveItem() {
        const pathname = window.location.pathname;
        let activePage = '';

        if (pathname === '/' || pathname === '/index.html' || pathname === '/index') {
            activePage = 'home';
        } else if (pathname.includes('simulator-dashboard') || pathname.includes('simulators') || pathname.includes('quiz')) {
            activePage = 'simuladores';
        } else if (pathname.includes('repaso') || pathname.includes('flashcards')) {
            activePage = 'repaso';
        } else if (pathname.includes('library') || pathname.includes('biblioteca') || pathname.includes('resource')) {
            activePage = 'library';
        } else if (pathname.includes('profile')) {
            activePage = 'profile';
        } else if (pathname.includes('pricing')) {
            activePage = 'pricing';
        }

        document.querySelectorAll('.sidebar-item').forEach(item => {
            const match = item.dataset.page === activePage;
            item.classList.toggle('active', match);
        });
    }

    _setupEventListeners() {
        const sidebar = document.querySelector('.global-sidebar');
        const backdrop = document.querySelector('.sidebar-backdrop');
        const desktopToggle = document.getElementById('sidebar-toggle-btn');
        const mobileToggle = document.getElementById('mobile-sidebar-toggle');
        const logoutBtn = document.getElementById('sidebar-logout-btn');

        const sidebarMenu = sidebar.querySelector('.sidebar-menu');
        if (sidebarMenu) {
            sidebarMenu.addEventListener('scroll', () => {
                if (this.isRestoringScroll) return;
                localStorage.setItem('sidebar_scroll_top', sidebarMenu.scrollTop);
            });
        }

        if (desktopToggle) {
            desktopToggle.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    backdrop.classList.remove('active');
                    document.body.classList.remove('sidebar-open');
                } else {
                    this.collapsed = !this.collapsed;
                    localStorage.setItem('sidebar_collapsed', this.collapsed ? 'true' : 'false');

                    document.body.classList.toggle('sidebar-collapsed', this.collapsed);
                    sidebar.classList.toggle('collapsed', this.collapsed);
                }
            });
        }

        if (mobileToggle) {
            mobileToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const isOpen = sidebar.classList.toggle('open');
                backdrop.classList.toggle('active', isOpen);
                document.body.classList.toggle('sidebar-open', isOpen);
            });
        }

        if (backdrop) {
            backdrop.addEventListener('click', () => {
                sidebar.classList.remove('open');
                backdrop.classList.remove('active');
                document.body.classList.remove('sidebar-open');
            });
        }

        sidebar.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const href = item.getAttribute('href');
                const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '/index' || window.location.pathname === '';

                if (href && (href.startsWith('/#') || href.startsWith('#')) && isHomePage) {
                    const targetHash = href.startsWith('/#') ? href.substring(1) : href;
                    const targetEl = document.querySelector(targetHash);
                    if (targetEl) {
                        e.preventDefault();
                        if (window.innerWidth <= 768) {
                            sidebar.classList.remove('open');
                            backdrop.classList.remove('active');
                            document.body.classList.remove('sidebar-open');
                        }
                        history.pushState(null, '', targetHash);
                        this.highlightActiveItem();
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        return;
                    }
                }

                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    backdrop.classList.remove('active');
                    document.body.classList.remove('sidebar-open');
                }
            });
        });

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.handleLogout) {
                    window.handleLogout();
                }
            });
        }

        window.addEventListener('hashchange', () => this.highlightActiveItem());
    }

    _syncAuthState() {
        const sync = (user) => {
            const accountSection = document.getElementById('sidebar-section-account');
            const sidebarFooter = document.querySelector('.sidebar-footer');
            const isLoggedIn = !!(user || localStorage.getItem('authToken'));

            if (isLoggedIn) {
                if (sidebarFooter) sidebarFooter.style.display = 'block';
                if (accountSection) accountSection.style.display = 'block';
            } else {
                if (sidebarFooter) sidebarFooter.style.display = 'none';
                if (accountSection) accountSection.style.display = 'none';
            }

            this.restoreScroll();
        };

        if (window.sessionManager) {
            window.sessionManager.onStateChange(sync);
            sync(window.sessionManager.getUser());
        }
    }
}

window.globalSidebar = new GlobalSidebar();
