class AuthApiService {

    // ✅ Obtener URL de forma segura usando la config global
    static getApiUrl() {
        if (window.AppConfig && window.AppConfig.API_URL) {
            return window.AppConfig.API_URL;
        }
        return 'https://tutor-ia-backend.onrender.com';
    }

    // ✅ Verificar si un token JWT está expirado localmente
    static isTokenExpired(token) {
        if (!token) return true;
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return true;
            // base64url decode
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (!payload.exp) return true;
            // Restar 60 segundos de margen de seguridad para evitar fallar al final de la petición
            return Date.now() / 1000 > (payload.exp - 60);
        } catch (e) {
            return true;
        }
    }

    // ✅ Obtener Token Fresco (Supabase -> LocalStorage)
    static async getValidToken() {
        if (window.supabaseClient) {
            try {
                // Intentar recuperar la sesión actual de la SDK de Supabase (Fuente de verdad)
                let { data: { session }, error } = await window.supabaseClient.auth.getSession();
                
                // Si la sesión existe pero el token ya expiró o expirará pronto, forzar refreshSession
                if (session && session.access_token && this.isTokenExpired(session.access_token)) {
                    console.log("🕒 [AuthApiService] Token de acceso Supabase expirado. Forzando refresco de sesión...");
                    const refreshResult = await window.supabaseClient.auth.refreshSession();
                    if (refreshResult.data && refreshResult.data.session) {
                        session = refreshResult.data.session;
                    }
                }
                
                // Si getSession no devolvió nada, pero hay un token registrado localmente, intentar forzar refreshSession
                if (!session) {
                    const localToken = localStorage.getItem('authToken');
                    if (localToken && localToken !== 'undefined' && localToken !== 'null') {
                        console.log("🕒 [AuthApiService] Sesión ausente pero token local presente. Intentando recuperar mediante refreshSession...");
                        const refreshResult = await window.supabaseClient.auth.refreshSession();
                        if (refreshResult.data && refreshResult.data.session) {
                            session = refreshResult.data.session;
                        }
                    }
                }

                if (session && session.access_token) {
                    const freshToken = session.access_token;
                    localStorage.setItem('authToken', freshToken);
                    return freshToken;
                }
            } catch (e) {
                console.warn("AuthApiService: Error recuperando o refrescando sesión de Supabase", e);
            }
        }
        
        // Fallback: Si no hay SDK o falló, usar localStorage pero validar que no sea basura ni esté expirado
        const localToken = localStorage.getItem('authToken');
        if (!localToken || localToken === 'undefined' || localToken === 'null' || this.isTokenExpired(localToken)) {
            return null;
        }
        return localToken;
    }

    // ✅ ÚNICO MÉTODO DE ACCESO: Sincronización Google OAuth
    static async syncGoogleUser(supabaseUser) {
        const API_URL = this.getApiUrl();
        const payload = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'Usuario Google'
        };

        const response = await window.NetworkService.fetch(`${API_URL}/api/auth/sync`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al sincronizar usuario');
        }

        return await response.json();
    }

    // ✅ Obtener perfil del usuario (getMe)
    static async getMe() {
        const token = await this.getValidToken();
        if (!token) return null;

        const API_URL = this.getApiUrl();
        try {
            const response = await window.NetworkService.fetch(`${API_URL}/api/auth/me`);
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('authToken');
                    return null;
                }
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Error de conexión verificando sesión:', error);
            return null;
        }
    }

    /**
     * Eliminar cuenta de usuario (Google-Only: no requiere password)
     */
    static async deleteAccount() {
        const token = await this.getValidToken();
        if (!token) throw new Error('No hay sesión activa.');

        const API_URL = this.getApiUrl();
        const response = await window.NetworkService.fetch(`${API_URL}/api/auth/delete-account`, {
            method: 'DELETE'
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || `Error del servidor (${response.status})`);
        }
        return data;
    }

    static async updateProfile(name) {
        const token = await this.getValidToken();
        if (!token) throw new Error('No hay sesión activa.');

        const API_URL = this.getApiUrl();
        const response = await window.NetworkService.fetch(`${API_URL}/api/auth/profile`, {
            method: 'PUT',
            body: JSON.stringify({ name })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || `Error del servidor (${response.status})`);
        }
        return data;
    }
}