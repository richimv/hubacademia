/**
 * sidebar.js
 * Inyector de Barra Lateral Global y Controlador de Navegación Plegable
 */

class GlobalSidebar {
    constructor() {
        this.collapsed = localStorage.getItem('sidebar_collapsed') === 'true';
        this.init();
    }

    init() {
        // Asegurar que sidebar.css esté cargado en la cabecera
        this._injectStyles();

        // Esperar a que el DOM esté listo
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
        if (document.querySelector('.global-sidebar')) return; // Evitar duplicar

        const token = localStorage.getItem('authToken');
        const initialDisplay = token ? 'flex' : 'none';
        const initialDisplayBlock = token ? 'block' : 'none';

        // Deshabilitar transiciones temporalmente para evitar parpadeos
        document.body.classList.add('no-transition');

        // Aplicar estado colapsado inicial en el body
        if (this.collapsed && window.innerWidth > 768) {
            document.body.classList.add('sidebar-collapsed');
        }

        // Crear la estructura HTML de la barra lateral
        const aside = document.createElement('aside');
        aside.className = 'global-sidebar no-transition';
        if (this.collapsed) aside.classList.add('collapsed');

        aside.innerHTML = `
            <!-- Sidebar Header -->
            <div class="sidebar-header">
                <span class="sidebar-header-title">Menú</span>
                <button type="button" class="sidebar-toggle-btn" id="sidebar-toggle-btn" title="Contraer menú">
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
                    
                    <a href="/simulators?domain=salud" class="sidebar-item" data-page="salud">
                        <i class="fas fa-stethoscope"></i>
                        <span class="sidebar-item-label">Módulo Salud</span>
                    </a>
                    
                    <a href="/simulators?domain=educacion" class="sidebar-item" data-page="educacion">
                        <i class="fas fa-graduation-cap"></i>
                        <span class="sidebar-item-label">Módulo Educación</span>
                    </a>
                    
                    <a href="/simulators?domain=idiomas" class="sidebar-item" data-page="idiomas">
                        <i class="fas fa-language"></i>
                        <span class="sidebar-item-label">Módulo Idiomas</span>
                    </a>
                    
                    <a href="/repaso" class="sidebar-item" data-page="flashcards">
                        <i class="fas fa-clone"></i>
                        <span class="sidebar-item-label">Flashcards</span>
                    </a>
                </div>

                <!-- Sección Biblioteca -->
                <div class="sidebar-section">
                    <span class="sidebar-section-title">Biblioteca</span>
                    
                    <a href="/library?tab=resources" class="sidebar-item" data-page="library-resources">
                        <i class="fas fa-book"></i>
                        <span class="sidebar-item-label">Biblioteca de Recursos</span>
                    </a>

                    <a href="/library?tab=saved" class="sidebar-item" data-page="library-saved" style="display: ${initialDisplay};">
                        <i class="fas fa-bookmark"></i>
                        <span class="sidebar-item-label">Guardados</span>
                    </a>
                    
                    <a href="/library?tab=favorites" class="sidebar-item" data-page="library-favorites" style="display: ${initialDisplay};">
                        <i class="fas fa-heart"></i>
                        <span class="sidebar-item-label">Mis Favoritos</span>
                    </a>
                    
                    <a href="/library?tab=notes" class="sidebar-item" data-page="library-notes" style="display: ${initialDisplay};">
                        <i class="fas fa-edit"></i>
                        <span class="sidebar-item-label">Notas</span>
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
                <span class="sidebar-section-title" style="padding: 0 0 0.5rem 0; text-align: center; width: 100%; display: block;">Síguenos</span>
                <div class="sidebar-socials-icons">
                    <a href="https://www.facebook.com/profile.php?id=61586735506660" target="_blank" rel="noopener noreferrer" class="sidebar-social-btn" title="Facebook">
                        <i class="fab fa-facebook-f"></i>
                    </a>
                    <a href="https://www.instagram.com/hubacademia_" target="_blank" rel="noopener noreferrer" class="sidebar-social-btn" title="Instagram">
                        <i class="fab fa-instagram"></i>
                    </a>
                    <a href="https://www.tiktok.com/@hub.academia" target="_blank" rel="noopener noreferrer" class="sidebar-social-btn" title="TikTok">
                        <i class="fab fa-tiktok"></i>
                    </a>
                </div>
            </div>
        `;

        // Insertar sidebar al inicio de body
        document.body.prepend(aside);

        // Crear e insertar backdrop para móviles
        const backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        document.body.appendChild(backdrop);

        // Ajustar el header con el botón de hamburguesa móvil
        this._setupMobileHeaderToggle();

        // Marcar el elemento activo basado en la página actual
        this.highlightActiveItem();

        // Configurar listeners de eventos
        this._setupEventListeners();

        // Sincronizar visibilidad de Cerrar Sesión con SessionManager
        this._syncAuthState();

        // Persist scroll position across page reloads
        this.restoreScroll();

        // Forzar reflow y reactivar transiciones después del renderizado inicial
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
            mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
            headerStart.prepend(mobileBtn);
        }
    }

    highlightActiveItem() {
        const pathname = window.location.pathname;
        const search = window.location.search;
        const hash = window.location.hash;
        
        let activePage = '';

        if (pathname === '/' || pathname === '/index.html' || pathname === '/index') {
            activePage = 'home';
        } else if (pathname.includes('simulator-dashboard') || pathname.includes('simulators') || pathname.includes('my-vocabulary') || pathname.includes('language-tutor')) {
            if (search.includes('domain=salud') || search.includes('context=MEDICINA')) {
                activePage = 'salud';
            } else if (search.includes('domain=educacion') || search.includes('context=EDUCACION')) {
                activePage = 'educacion';
            } else {
                activePage = 'idiomas';
            }
        } else if (pathname.includes('repaso') || pathname.includes('flashcards')) {
            activePage = 'flashcards';
        } else if (pathname.includes('library') || pathname.includes('biblioteca')) {
            if (search.includes('tab=favorites')) {
                activePage = 'library-favorites';
            } else if (search.includes('tab=notes')) {
                activePage = 'library-notes';
            } else if (search.includes('tab=saved')) {
                activePage = 'library-saved';
            } else {
                activePage = 'library-resources'; // resources is default
            }
        } else if (pathname.includes('profile')) {
            activePage = 'profile';
        }

        // Remover clases activas previas y asignar al actual
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

        // Persist scroll position on scroll
        const sidebarMenu = sidebar.querySelector('.sidebar-menu');
        if (sidebarMenu) {
            sidebarMenu.addEventListener('scroll', () => {
                if (this.isRestoringScroll) return;
                localStorage.setItem('sidebar_scroll_top', sidebarMenu.scrollTop);
            });
        }

        // Toggle Escritorio (Colapsar)
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

        // Toggle Móvil (Deslizar)
        if (mobileToggle) {
            mobileToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const isOpen = sidebar.classList.toggle('open');
                backdrop.classList.toggle('active', isOpen);
                document.body.classList.toggle('sidebar-open', isOpen);
            });
        }

        // Cerrar al hacer clic en el backdrop (móvil)
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                sidebar.classList.remove('open');
                backdrop.classList.remove('active');
                document.body.classList.remove('sidebar-open');
            });
        }

        // Interceptar y cerrar menú al hacer clic en cualquier opción (móvil/escritorio)
        sidebar.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Interceptar enlaces de biblioteca si ya estamos en la página de biblioteca
                const href = item.getAttribute('href');
                if (href && href.startsWith('/library') && window.location.pathname.includes('/library')) {
                    const urlParams = new URLSearchParams(href.split('?')[1] || '');
                    const tab = urlParams.get('tab') || 'resources';
                    if (window.libraryUI) {
                        e.preventDefault();
                        window.libraryUI.switchTab(tab);
                        this.highlightActiveItem();
                        if (window.innerWidth <= 768) {
                            sidebar.classList.remove('open');
                            backdrop.classList.remove('active');
                            document.body.classList.remove('sidebar-open');
                        }
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

        // Cerrar sesión
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.handleLogout) {
                    window.handleLogout();
                }
            });
        }

        // Escuchar cambios de hash para actualizar pestaña activa en profile
        window.addEventListener('hashchange', () => this.highlightActiveItem());
    }

    _syncAuthState() {
        const sync = (user) => {
            const accountSection = document.getElementById('sidebar-section-account');
            const sidebarFooter = document.querySelector('.sidebar-footer');

            const savedItem = document.querySelector('[data-page="library-saved"]');
            const favoritesItem = document.querySelector('[data-page="library-favorites"]');
            const notesItem = document.querySelector('[data-page="library-notes"]');

            const isLoggedIn = !!(user || localStorage.getItem('authToken'));
            const displayVal = isLoggedIn ? 'flex' : 'none';
            if (savedItem) savedItem.style.display = displayVal;
            if (favoritesItem) favoritesItem.style.display = displayVal;
            if (notesItem) notesItem.style.display = displayVal;

            if (isLoggedIn) {
                if (sidebarFooter) sidebarFooter.style.display = 'block';
                if (accountSection) accountSection.style.display = 'block';
            } else {
                if (sidebarFooter) sidebarFooter.style.display = 'none';
                if (accountSection) accountSection.style.display = 'none';
            }

            // Restaurar scroll de forma asíncrona después del cambio de visibilidad de los elementos
            this.restoreScroll();
        };

        if (window.sessionManager) {
            window.sessionManager.onStateChange(sync);
            // Sincronizar estado inicial
            sync(window.sessionManager.getUser());
        }
    }
}

// Iniciar automáticamente el singleton global
window.globalSidebar = new GlobalSidebar();
