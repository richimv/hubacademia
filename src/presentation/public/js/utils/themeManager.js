/**
 * themeManager.js
 * Gestor Centralizado de Temas (Dark Mode 🌙 / Light Mode ☀️)
 * Hub Academia v3.5
 * 
 * - Inicialización inmediata anti-FOUC (Flash of Unstyled Content).
 * - Persistencia en localStorage ('hub_theme').
 * - Sincronización con preferencias del SO (prefers-color-scheme).
 * - Sincronización automática de botones de toggle en Header y Sidebar.
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'hub_theme';
    const THEME_DARK = 'dark';
    const THEME_LIGHT = 'light';

    class ThemeManager {
        constructor() {
            this.theme = this._getInitialTheme();
            this.listeners = [];
            this._applyTheme(this.theme, false);
            this._setupMediaListener();
            this._setupDOMListeners();
        }

        /**
         * Verifica si la vista actual declara bloqueo de tema via data-theme-locked.
         * Se lee mediante dataset para mantener compatibilidad con HTML5 sin colisionar
         * con mocks heredados de getAttribute.
         */
        _getLockedTheme() {
            const root = typeof document !== 'undefined' ? document.documentElement : null;
            const locked = root && root.dataset ? root.dataset.themeLocked : null;
            return (locked === THEME_DARK || locked === THEME_LIGHT) ? locked : null;
        }

        /**
         * Indica si el tema de esta página está fijado por diseño.
         */
        isLocked() {
            return this._getLockedTheme() !== null;
        }

        /**
         * Obtiene el tema inicial desde bloqueo de página, localStorage o preferencia del sistema
         */
        _getInitialTheme() {
            const locked = this._getLockedTheme();
            if (locked) {
                return locked;
            }

            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved === THEME_DARK || saved === THEME_LIGHT) {
                    return saved;
                }
            } catch (e) {
                // Fallback silencioso si localStorage está bloqueado
            }

            // Por defecto en Hub Academia mantenemos Dark como predeterminado elegante
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                return THEME_LIGHT;
            }
            return THEME_DARK;
        }

        /**
         * Aplica el tema al elemento raíz <html>
         */
        _applyTheme(theme, save = true) {
            const locked = this._getLockedTheme();
            const effectiveTheme = locked || theme;
            const shouldPersist = Boolean(save && !locked);

            this.theme = effectiveTheme;
            document.documentElement.setAttribute('data-theme', effectiveTheme);
            
            // Compatibilidad con meta theme-color para navegadores móviles
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) {
                metaTheme.setAttribute('content', effectiveTheme === THEME_LIGHT ? '#f8fafc' : '#050507');
            }

            if (shouldPersist) {
                try {
                    localStorage.setItem(STORAGE_KEY, effectiveTheme);
                } catch (e) {}
            }

            this.updateToggleButtons();
            this._notifyListeners(effectiveTheme);
        }

        /**
         * Alterna entre modo claro y oscuro
         */
        toggleTheme() {
            const locked = this._getLockedTheme();
            if (locked) {
                return locked;
            }
            const next = this.theme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
            this._applyTheme(next, true);
            return next;
        }

        /**
         * Establece un tema específico
         */
        setTheme(theme) {
            if (this._getLockedTheme()) {
                return;
            }
            if (theme === THEME_DARK || theme === THEME_LIGHT) {
                this._applyTheme(theme, true);
            }
        }

        /**
         * Obtiene el tema actual
         */
        getTheme() {
            return this.theme;
        }

        /**
         * Comprueba si el tema actual es oscuro
         */
        isDark() {
            return this.theme === THEME_DARK;
        }

        /**
         * Actualiza los iconos y tooltips de todos los botones de alternancia en la página
         */
        updateToggleButtons() {
            const isDark = this.isDark();
            const iconClass = isDark ? 'fa-sun' : 'fa-moon';
            const labelText = isDark ? 'Modo Claro' : 'Modo Oscuro';
            const tooltipText = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

            // Botón del Header
            const headerBtns = document.querySelectorAll('#theme-toggle-btn, .theme-toggle-btn');
            headerBtns.forEach(btn => {
                btn.setAttribute('title', tooltipText);
                btn.setAttribute('aria-label', tooltipText);
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = `fas ${iconClass}`;
                }
            });

            // Botón del Sidebar
            const sidebarBtns = document.querySelectorAll('#sidebar-theme-toggle, .sidebar-theme-toggle');
            sidebarBtns.forEach(btn => {
                btn.setAttribute('title', tooltipText);
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = `fas ${iconClass}`;
                }
                const label = btn.querySelector('.sidebar-item-label, span');
                if (label && label.classList.contains('sidebar-item-label')) {
                    label.textContent = labelText;
                }
            });
        }

        /**
         * Suscribir callbacks a cambios de tema
         */
        onThemeChange(fn) {
            if (typeof fn === 'function') {
                this.listeners.push(fn);
            }
        }

        _notifyListeners(theme) {
            this.listeners.forEach(fn => {
                try {
                    fn(theme);
                } catch (err) {
                    console.warn('⚠️ Error en callback de tema:', err);
                }
            });
        }

        /**
         * Escuchar cambios en la configuración del sistema operativo
         */
        _setupMediaListener() {
            if (!window.matchMedia) return;
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e) => {
                if (this._getLockedTheme()) {
                    return;
                }
                // Solo auto-adaptar si el usuario no ha forzado manualmente en localStorage
                try {
                    if (!localStorage.getItem(STORAGE_KEY)) {
                        this._applyTheme(e.matches ? THEME_DARK : THEME_LIGHT, false);
                    }
                } catch (err) {}
            };
            if (mq.addEventListener) {
                mq.addEventListener('change', handler);
            } else if (mq.addListener) {
                mq.addListener(handler);
            }
        }

        /**
         * Configurar listeners para botones de toggle una vez cargado el DOM
         */
        _setupDOMListeners() {
            const initButtons = () => {
                this.updateToggleButtons();

                // Delegación de eventos para clicks en botones de tema
                document.addEventListener('click', (e) => {
                    const toggleBtn = e.target.closest('#theme-toggle-btn, .theme-toggle-btn, #sidebar-theme-toggle, .sidebar-theme-toggle');
                    if (toggleBtn) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.toggleTheme();
                    }
                });
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initButtons);
            } else {
                initButtons();
            }
        }
    }

    // Instancia singleton global
    if (typeof window !== 'undefined') {
        window.themeManager = new ThemeManager();
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { ThemeManager };
    }

})();
