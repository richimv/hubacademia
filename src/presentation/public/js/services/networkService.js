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

        let retries = 1;
        while (true) {
            try {
                const response = await fetch(url, fetchOptions);

                // 3. INTERCEPTOR GLOBAL: Manejo de Errores de Autorización (Sesión Expirada)
                if (response.status === 401) {
                    console.warn(`⚠️ [NetworkService] Error de autorización (401) en: ${url}`);
                    
                    // Si el backend dice que la sesión expiró, forzamos limpieza
                    if (window.sessionManager) {
                        // Notificar al usuario antes de redirigir si es posible
                        if (window.uiManager && window.uiManager.showToast) {
                            window.uiManager.showToast('Tu sesión ha expirado. Por seguridad, debes volver a ingresar.', 'warning');
                        }
                        
                        const isQuizPage = window.location.pathname.includes('quiz.html') || window.location.pathname.includes('simulator');
                        // Esperar un poco para que el toast sea visible si no estamos en un flujo crítico
                        setTimeout(() => {
                            window.sessionManager.logout(!isQuizPage);
                            if (isQuizPage && window.uiManager && typeof window.uiManager.showAuthPromptModal === 'function') {
                                window.uiManager.showAuthPromptModal();
                            }
                        }, 2000);
                    }
                    
                    const error = new Error('Unauthorized');
                    error.status = response.status;
                    throw error;
                }

                return response;
            } catch (error) {
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
