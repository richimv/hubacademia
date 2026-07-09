/**
 * NetworkService (Architecture v2.0)
 * Centralized hub for all API communications.
 * Handles automatic token injection, refreshing, and global error interceptors.
 */
class NetworkService {
    /**
     * Core request method that wraps fetch with auth logic.
     * @param {string} url - API Endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>}
     */
    static async fetch(url, options = {}) {
        if (url && typeof url !== 'string') {
            url = url.toString();
        }
        // 1. Asegurar que tenemos el token más fresco de Supabase
        let token = null;
        if (window.AuthApiService) {
            token = await window.AuthApiService.getValidToken();
        } else {
            token = localStorage.getItem('authToken');
        }

        // 2. Configurar Headers Centralizados
        const headers = {
            ...options.headers
        };

        // 🛡️ FIX: No forzar application/json si el body es FormData (permite que el browser ponga el boundary)
        if (!(options.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        if (token && token !== 'null' && token !== 'undefined') {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const fetchOptions = {
            ...options,
            headers
        };

        // Detectar si es un endpoint que consume vidas para free/pending
        const isConsumptionEndpoint = 
            (url.includes('/api/chat') && !url.includes('/conversations')) ||
            url.includes('/api/languages/') ||
            url.includes('/api/medico/') ||
            url.includes('/api/docente/') ||
            url.includes('/api/idiomas-simulator/') ||
            url.includes('/api/decks') ||
            url.includes('/api/analytics/diagnostic');

        const isWriteMethod = options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH';

        let optimisticallyDecremented = false;

        if (isConsumptionEndpoint && isWriteMethod && window.sessionManager) {
            const currentUser = window.sessionManager.getUser();
            if (currentUser && currentUser.subscriptionStatus !== 'active' && currentUser.role !== 'admin') {
                window.sessionManager.decrementUsage(1);
                optimisticallyDecremented = true;
            }
        }

        let retries = 1;
        while (true) {
            try {
                const response = await fetch(url, fetchOptions);

                // 3. INTERCEPTOR GLOBAL: Manejo de Errores de Autorización (Sesión Expirada)
                if (response.status === 401) {
                    console.warn(`⚠️ [NetworkService] Error de autorización (401) en: ${url}`);
                    
                    const currentToken = localStorage.getItem('authToken');
                    // Si ya no hay token en localStorage, no intentar desloguear (evita bucles infinitos)
                    if (!currentToken || currentToken === 'null' || currentToken === 'undefined') {
                        const error = new Error('Unauthorized');
                        error.status = response.status;
                        throw error;
                    }

                    // Si el backend dice que la sesión expiró, forzamos limpieza
                    if (window.sessionManager) {
                        // Notificar al usuario antes de redirigir si es posible
                        if (window.uiManager && window.uiManager.showToast) {
                            window.uiManager.showToast('Tu sesión ha expirado. Por seguridad, debes volver a ingresar.', 'warning');
                        }
                        
                        const isQuizPage = window.location.pathname.includes('quiz.html') || window.location.pathname.includes('simulator');
                        const isHomePage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
                        
                        // Esperar un poco para que el toast sea visible si no estamos en un flujo crítico
                        setTimeout(() => {
                            // Solo redireccionar si no estamos en la página de inicio y no es quiz
                            const shouldRedirect = !isQuizPage && !isHomePage;
                            window.sessionManager.logout(shouldRedirect);
                            
                            if (isQuizPage && window.uiManager && typeof window.uiManager.showAuthPromptModal === 'function') {
                                window.uiManager.showAuthPromptModal();
                            }
                        }, 2000);
                    }
                    
                    const error = new Error('Unauthorized');
                    error.status = response.status;
                    throw error;
                }

                // Sincronizar vidas en segundo plano tras respuesta exitosa, o revertir si falló
                if (response.ok && isConsumptionEndpoint && isWriteMethod && window.sessionManager) {
                    window.sessionManager.refreshUser().catch(() => {});
                } else if (!response.ok && optimisticallyDecremented && window.sessionManager) {
                    window.sessionManager.refreshUser().catch(() => {});
                }

                return response;
            } catch (error) {
                if (optimisticallyDecremented && window.sessionManager) {
                    window.sessionManager.refreshUser().catch(() => {});
                }

                // Manejo de errores de red (offline, DNS, Wake-Up delay, etc.)
                if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                    if (retries > 0) {
                        console.warn(`🔄 [NetworkService] Red inestable, aplicando Soft Fallback (Reintento en 800ms) para: ${url}`);
                        retries--;
                        await new Promise(res => setTimeout(res, 800));
                        continue; // Reintenta el ciclo
                    }

                    console.error('❌ [NetworkService] Error de conexión crítica tras reintentos:', error);
                    if (window.uiManager && window.uiManager.showToast) {
                        window.uiManager.showToast('Problema de conexión con el servidor.', 'error');
                    }
                }
                throw error;
            }
        }
    }

    /**
     * Helper para peticiones GET rápidas que devuelven JSON directamente.
     */
    static async get(url, options = {}) {
        const response = await this.fetch(url, { ...options, method: 'GET' });
        return response.json();
    }

    /**
     * Helper para peticiones POST rápidas.
     */
    static async post(url, body, options = {}) {
        const response = await this.fetch(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body)
        });
        return response.json();
    }
}

// Hacerlo disponible globalmente
window.NetworkService = NetworkService;
