/* global AuthApiService */ // Le decimos al linter que esta clase existe

class SessionManager {
    constructor() {
        this.currentUser = null;
        this.onStateChangeCallbacks = [];
        this.lastSyncTime = 0; // Para throttling global
        this.initSupabaseListener();
    }

    // ✅ Centralizar la escucha de Supabase
    initSupabaseListener() {
        if (window.supabaseClient) {
            window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
                console.log(`📡 [SessionGate] Evento: ${event}`);

                if (event === 'SIGNED_IN' && session) {
                    // 🛡️ BLOQUEO ATÓMICO: Evitar doble sincronización (One Tap vs Listener)
                    if (window._isGlobalSyncing || this.isSyncing) {
                        console.log('⏳ Sincronización en curso o bloqueada por throttle, ignorando evento.');
                        return;
                    }

                    // 🛡️ THROTTLING AGRESIVO: Evitar ráfagas de Supabase (especialmente en init)
                    const now = Date.now();
                    const throttleWindow = 5000; // 5 segundos de gracia entre intentos
                    if (now - this.lastSyncTime < throttleWindow) {
                        console.log('📡 [SessionGate] Sync bloqueado por ráfaga (5s throttle).');
                        return;
                    }

                    // Si ya tenemos el mismo usuario cargado y el token es igual, no re-sincronizar
                    if (this.currentUser && this.currentUser.id === session.user.id && localStorage.getItem('authToken') === session.access_token) {
                        console.log('📡 [SessionGate] Usuario y token ya vigentes, omitiendo sync.');
                        return;
                    }

                    try {
                        window._isGlobalSyncing = true;
                        window._isAuthenticating = true; 

                        // Sincronizar unificada
                        // ✅ NUEVO: Verificar si ya tenemos el mismo email sincronizado para evitar 429
                        if (this.currentUser && this.currentUser.email === session.user.email) {
                            console.log('📡 [SessionGate] Usuario ya sincronizado (Match por Email).');
                            return;
                        }

                        const syncResponse = await AuthApiService.syncGoogleUser(session.user);
                        
                        if (syncResponse && syncResponse.user) {
                            // console.log('✅ Usuario Sincronizado:', syncResponse.user.email);
                            this.currentUser = syncResponse.user;
                            this.lastSyncTime = Date.now(); // Marcar éxito para throttling
                            localStorage.setItem('authToken', session.access_token);
                            
                            // Notificar UI
                            this.notifyStateChange();
                            
                            // ✅ LIMPIEZA SEGURA: Solo borramos el hash DESPUÉS de una sincronización exitosa
                            if (window.location.hash.includes('access_token')) {
                                console.log('🧹 Limpiando URL (Login exitoso)');
                                window.history.replaceState(null, '', window.location.pathname);
                            }
                        }
                    } catch (err) {
                        console.error('❌ Error en ciclo de vida Auth:', err);
                    } finally {
                        window._isGlobalSyncing = false;
                        window._isAuthenticating = false;
                    }
                } else if (event === 'SIGNED_OUT') {
                    console.log('🚪 Sesión finalizada en Auth Provider.');
                    this.clearAllStates();
                }
            });
        }
    }

    // ✅ NUEVO: Limpieza Nuclear de Estados
    clearAllStates() {
        console.log('🧹 Limpieza nuclear de estados...');
        this.currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('sb-rayjtupppcbhzjizhamn-auth-token'); 
        
        // Limpiar cualquier cache de aplicaciones específicas
        sessionStorage.clear();
        
        this.notifyStateChange();
    }

    async initialize() {
        // 1. 🛡️ IMPORTANTE: NO borrar el hash aquí. 
        // Supabase necesita el hash en la URL para leer el token tras el redirect de Google.
        // Si lo borramos ahora, el login manual "muere" al regresar.

        // 2. Recuperar sesión local si existe
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                // No bloqueamos desesperadamente, intentamos recuperar
                this.currentUser = await AuthApiService.getMe();
            } catch (err) {
                this.currentUser = null;
                localStorage.removeItem('authToken');
            }
        }

        // Si no hay usuario tras initialize, notificamos para que aparezca el botón "Acceder"
        this.notifyStateChange();
    }

    // ✅ NUEVO: Método para refrescar sesión sin recargar (para actualizar vidas/tokens)
    async refreshUser() {
        if (!this.currentUser) return;
        try {
            console.log('🔄 Refrescando sesión de usuario en segundo plano...');
            const updatedUser = await AuthApiService.getMe();
                if (updatedUser) {
                // Solo notificar si cambió el conteo de uso o el tier (ahorro de renders)
                const usageChanged = this.currentUser.usageCount !== updatedUser.usageCount;
                const tierChanged = this.currentUser.subscriptionTier !== updatedUser.subscriptionTier;
                
                this.currentUser = updatedUser;
                if (usageChanged || tierChanged) {
                    this.notifyStateChange();
                }
                console.log('✅ Sesión refrescada. Vidas:', updatedUser.usageCount);
            }
        } catch (error) {
            console.warn('⚠️ Falló el refresco silencioso de sesión:', error);
            // No hacemos logout, solo ignoramos el error de red momentáneo
        }
    }

    // 🛡️ NUEVO: Método para validar activamente si el token caducó en el backend y forzar logout en la UI
    async validateSession() {
        if (!this.currentUser) return;
        try {
            // getMe() retorna destructivamente null si el servidor responde 401 (Expirado)
            const isValid = await AuthApiService.getMe();
            if (!isValid) {
                console.warn('🕒 Sesión local detectada como EXPIRADA por el servidor. Forzando cierre de sesión...');
                if (typeof window.handleLogout === 'function') {
                    window.handleLogout();
                } else {
                    this.logout();
                }
            }
        } catch (error) {
            // Ignorar errores de red temporales, solo destruir si el backend explícitamente rechaza el token
        }
    }

    login(token, user) {
        localStorage.setItem('authToken', token);
        this.currentUser = user;
        this.notifyStateChange();
    }

    setUser(user) {
        this.currentUser = user;
        this.notifyStateChange();
    }

    async logout() {
        try {
            // 1. Limpiar estado local de Supabase (y revocar si es posible)
            if (window.supabaseClient) {
                await window.supabaseClient.auth.signOut();
            }
        } catch (e) {
            console.warn('⚠️ Supabase Logout Warning:', e);
        }

        // 2. Limpieza Agresiva de LocalStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('sb-rayjtupppcbhzjizhamn-auth-token'); // Limpiar token específico de Supabase si se conoce
        // Opcional: Limpiar todo si es seguro para la app
        // localStorage.clear(); 

        this.currentUser = null;
        this.notifyStateChange();

        // 3. Redirigir solo cuando estemos limpios
        window.location.href = '/';
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    getUser() {
        return this.currentUser;
    }

    onStateChange(callback) {
        this.onStateChangeCallbacks.push(callback);
    }

    notifyStateChange() {
        this.onStateChangeCallbacks.forEach(cb => cb(this.currentUser));
    }

    checkSubscriptionStatus() {
        if (!this.currentUser) return;
        if (this.currentUser.role === 'admin') return;
        console.log(`👤 Verificando estatus: ${this.currentUser.subscriptionStatus}`);
    }
}

// Instancia global
window.sessionManager = new SessionManager();

window.sessionManager.onStateChange((user) => {
    if (user) {
        window.sessionManager.checkSubscriptionStatus();
    }
});