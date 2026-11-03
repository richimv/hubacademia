/**
 * login.js
 * Controlador de la interfaz de autenticación (Login, Registro, Google OAuth y Verificación OTP).
 * Hub Academia v3.0 - Cumple con DESIGN_SYSTEM.md, SECURITY_STANDARDS.md y SISTEMA_AUTENTICACION.md.
 */

(function () {
    'use strict';

    // Referencias DOM
    let tabLoginBtn, tabRegisterBtn;
    let loginForm, registerForm;
    let googleLoginBtn;
    let alertBanner, alertText, alertClose;
    let otpModal, otpBoxes, otpHiddenInput, otpVerifyBtn, otpResendBtn, otpCountdownText, otpEmailDisplay, otpFeedback, otpCloseBtn;
    let otpCountdownInterval = null;
    let otpCountdownSeconds = 0;
    let currentOtpEmail = '';

    /**
     * Obtiene el cliente de Supabase
     */
    function getSupabase() {
        if (typeof window.getSupabaseClient === 'function') {
            return window.getSupabaseClient();
        }
        if (window.supabaseClient) {
            return window.supabaseClient;
        }
        if (typeof supabase !== 'undefined' && window.AppConfig) {
            window.supabaseClient = supabase.createClient(window.AppConfig.SUPABASE_URL, window.AppConfig.SUPABASE_ANON_KEY);
            return window.supabaseClient;
        }
        return null;
    }

    /**
     * Sanitiza y obtiene la URL de redirección segura contra Open Redirects (OWASP A01)
     */
    function getSafeRedirectUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        if (!redirect) return '/';
        // Solo permitir rutas relativas locales seguras
        if (redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('\\')) {
            return redirect;
        }
        return '/';
    }

    /**
     * Enmascara el correo para privacidad (ej. ri***@gmail.com)
     */
    function maskEmail(raw) {
        if (!raw || !raw.includes('@')) return raw;
        const [name, domain] = raw.split('@');
        if (name.length <= 2) return `${name}***@${domain}`;
        return `${name.substring(0, 2)}***@${domain}`;
    }

    /**
     * Muestra alerta contextual en el formulario
     */
    function showAlert(message, type = 'error') {
        if (!alertBanner || !alertText) return;
        alertText.textContent = message;
        alertBanner.className = `alert-banner alert-${type}`;
        alertBanner.style.display = 'flex';
        alertBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Oculta alerta contextual
     */
    function hideAlert() {
        if (alertBanner) {
            alertBanner.style.display = 'none';
        }
    }

    /**
     * Cambia entre pestaña Iniciar Sesión y Crear Cuenta
     */
    function switchTab(mode) {
        hideAlert();
        if (mode === 'register') {
            tabLoginBtn.classList.remove('active');
            tabRegisterBtn.classList.add('active');
            loginForm.style.display = 'none';
            registerForm.style.display = 'flex';
            const nameInput = document.getElementById('register-name');
            if (nameInput) nameInput.focus();
        } else {
            tabRegisterBtn.classList.remove('active');
            tabLoginBtn.classList.add('active');
            registerForm.style.display = 'none';
            loginForm.style.display = 'flex';
            const emailInput = document.getElementById('login-email');
            if (emailInput) emailInput.focus();
        }
    }

    /**
     * Configura el botón de visualización de contraseña (Eye Toggle)
     */
    function setupPasswordToggles() {
        document.querySelectorAll('.btn-toggle-password').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                const icon = btn.querySelector('i');
                if (!input || !icon) return;

                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }

    /**
     * Evalúa las reglas de contraseña en tiempo real y actualiza la lista visual
     */
    function setupRealtimePasswordValidator() {
        const passwordInput = document.getElementById('register-password');
        if (!passwordInput || !window.AuthValidation) return;

        const rulesList = document.getElementById('password-rules-list');
        if (!rulesList) return;

        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            const status = window.AuthValidation.evaluatePasswordRules(val);

            updateRuleElement('rule-length', status.hasMinLength);
            updateRuleElement('rule-upper', status.hasUpper);
            updateRuleElement('rule-lower', status.hasLower);
            updateRuleElement('rule-number', status.hasNumber);
            updateRuleElement('rule-spaces', status.noSpaces && val.length > 0);
        });
    }

    function updateRuleElement(ruleId, isMet) {
        const el = document.getElementById(ruleId);
        if (!el) return;
        const icon = el.querySelector('i');
        if (isMet) {
            el.classList.add('met');
            if (icon) {
                icon.className = 'fas fa-check-circle rule-icon';
            }
        } else {
            el.classList.remove('met');
            if (icon) {
                icon.className = 'far fa-circle rule-icon';
            }
        }
    }

    /**
     * Configura sugerencias de dominio y advertencias de emails desechables
     */
    function setupEmailTypoAndDisposableGuards() {
        if (!window.AuthValidation) return;

        const setupInput = (inputId, suggestionContainerId, isRegister = false) => {
            const input = document.getElementById(inputId);
            const container = document.getElementById(suggestionContainerId);
            if (!input || !container) return;

            const check = () => {
                const email = (input.value || '').trim();
                container.innerHTML = '';
                container.style.display = 'none';

                if (!email || !email.includes('@')) return;

                // 1. Advertencia de email desechable en registro
                if (isRegister && window.AuthValidation.isDisposableEmail(email)) {
                    container.innerHTML = '<span class="disposable-warning"><i class="fas fa-exclamation-triangle"></i> No se admiten correos temporales ni desechables.</span>';
                    container.style.display = 'block';
                    return;
                }

                // 2. Sugerencia tipográfica (ej. gmil -> gmail)
                const suggestion = window.AuthValidation.suggestEmailDomain(email);
                if (suggestion) {
                    const pill = document.createElement('div');
                    pill.className = 'typo-suggestion-pill';
                    pill.innerHTML = `<i class="fas fa-magic"></i> ¿Quisiste decir <strong>${suggestion}</strong>?`;
                    pill.addEventListener('click', () => {
                        input.value = suggestion;
                        container.innerHTML = '';
                        container.style.display = 'none';
                        input.focus();
                    });
                    container.appendChild(pill);
                    container.style.display = 'block';
                }
            };

            input.addEventListener('blur', check);
            input.addEventListener('input', () => {
                if (container.style.display === 'block') {
                    // Ocultar mientras tipea de nuevo
                    container.style.display = 'none';
                }
            });
        };

        setupInput('login-email', 'login-email-suggestion', false);
        setupInput('register-email', 'register-email-suggestion', true);
    }

    const GOOGLE_BTN_DEFAULT_HTML = `
        <svg class="google-icon-svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>Continuar con Google</span>
    `;

    /**
     * Restablece el botón de Google OAuth a su estado inicial.
     * Previene que el botón quede bloqueado con spinner permanente al regresar vía bfcache (Back button).
     */
    function resetGoogleAuthButton() {
        if (!googleLoginBtn && typeof document !== 'undefined') {
            googleLoginBtn = document.getElementById('google-login-btn');
        }
        if (googleLoginBtn) {
            googleLoginBtn.innerHTML = GOOGLE_BTN_DEFAULT_HTML;
            googleLoginBtn.disabled = false;
            googleLoginBtn.style.opacity = '1';
        }
    }

    /**
     * Restablece los botones de envío estándar si una petición fue interrumpida por navegación.
     */
    function resetAllSubmitButtons() {
        const loginBtn = document.getElementById('btn-login-submit');
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
            loginBtn.disabled = false;
        }
        const regBtn = document.getElementById('btn-register-submit');
        if (regBtn) {
            regBtn.innerHTML = '<i class="fas fa-user-plus"></i> Crear Cuenta';
            regBtn.disabled = false;
        }
    }

    // Escuchadores contra bfcache (Back-Forward Cache) y retorno de visibilidad de pestaña
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('pageshow', () => {
            resetGoogleAuthButton();
            resetAllSubmitButtons();
        });

        window.addEventListener('focus', () => {
            resetGoogleAuthButton();
            resetAllSubmitButtons();
        });
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                resetGoogleAuthButton();
                resetAllSubmitButtons();
            }
        });
    }

    /**
     * Manejador de Login con Google OAuth (1-clic)
     */
    function setupGoogleAuth() {
        if (!googleLoginBtn) return;

        googleLoginBtn.addEventListener('click', async () => {
            const client = getSupabase();
            if (!client) {
                showAlert('El servicio de autenticación se está inicializando. Por favor reintenta en breve.');
                return;
            }

            googleLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando con Google...';
            googleLoginBtn.disabled = true;
            googleLoginBtn.style.opacity = '0.7';

            try {
                // Generar URL de redirección limpia cumpliendo RFC 6749
                const safePath = getSafeRedirectUrl();
                const redirectParam = safePath && safePath !== '/' ? `?redirect=${encodeURIComponent(safePath)}` : '';
                const cleanRedirectUrl = window.location.origin + window.location.pathname + redirectParam;

                const { data, error } = await client.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: cleanRedirectUrl,
                        queryParams: { prompt: 'select_account' }
                    }
                });

                if (error) throw error;
                if (data && data.url) {
                    window.location.href = data.url;
                }
            } catch (err) {
                console.error('❌ Error OAuth Google:', err);
                showAlert(err.message || 'Error al conectar con Google. Por favor intenta de nuevo.');
                resetGoogleAuthButton();
            }
        });
    }

    /**
     * Manejador de Login con Email y Contraseña
     */
    function setupEmailLoginForm() {
        if (!loginForm) return;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert();

            const emailInput = document.getElementById('login-email');
            const pwdInput = document.getElementById('login-password');
            const submitBtn = document.getElementById('btn-login-submit');

            const email = (emailInput?.value || '').trim();
            const password = pwdInput?.value || '';

            // Validación previa
            if (window.AuthValidation) {
                const validation = window.AuthValidation.validateAuthForm({
                    email,
                    password,
                    isRegister: false
                });
                if (!validation.valid) {
                    showAlert(validation.error || 'Datos de inicio de sesión inválidos.');
                    return;
                }
            }

            const client = getSupabase();
            if (!client) {
                showAlert('Servicio de autenticación no disponible. Recarga la página.');
                return;
            }

            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...';
            submitBtn.disabled = true;

            try {
                const { data, error } = await client.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) {
                    const errLower = (error.message || '').toLowerCase();
                    // 🛡️ ESCENARIO B: El usuario vuelve después e intenta login con cuenta no verificada
                    if (errLower.includes('email not confirmed') || error.code === 'email_not_confirmed') {
                        console.warn('⚠️ [Login] Cuenta no confirmada detectada (Escenario B). Abriendo modal OTP.');
                        openOtpModal(email, false); // abre modal OTP prellenado
                        return;
                    }

                    if (errLower.includes('invalid login credentials') || errLower.includes('invalid credentials')) {
                        throw new Error('Correo o contraseña incorrectos. Verifica tus datos.');
                    }

                    throw error;
                }

                // Login exitoso
                if (data?.session) {
                    submitBtn.innerHTML = '<i class="fas fa-check"></i> ¡Bienvenido!';
                    // El listener de SessionManager se encargará de sync y redirección
                    setTimeout(() => {
                        window.location.href = getSafeRedirectUrl();
                    }, 500);
                }
            } catch (err) {
                console.error('❌ Error Login:', err);
                showAlert(err.message || 'Error al iniciar sesión.');
            } finally {
                submitBtn.innerHTML = originalHTML;
                submitBtn.disabled = false;
            }
        });
    }

    /**
     * Manejador de Registro con Email y Contraseña
     */
    function setupRegisterForm() {
        if (!registerForm) return;

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert();

            const nameInput = document.getElementById('register-name');
            const emailInput = document.getElementById('register-email');
            const pwdInput = document.getElementById('register-password');
            const confirmInput = document.getElementById('register-confirm-password');
            const submitBtn = document.getElementById('btn-register-submit');

            const name = (nameInput?.value || '').trim();
            const email = (emailInput?.value || '').trim();
            const password = pwdInput?.value || '';
            const confirmPassword = confirmInput?.value || '';

            // Validación previa
            if (window.AuthValidation) {
                const validation = window.AuthValidation.validateAuthForm({
                    name,
                    email,
                    password,
                    confirmPassword,
                    isRegister: true
                });
                if (!validation.valid) {
                    showAlert(validation.error || 'Por favor completa todos los campos correctamente.');
                    return;
                }
            }

            const client = getSupabase();
            if (!client) {
                showAlert('Servicio de autenticación no disponible. Recarga la página.');
                return;
            }

            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando cuenta...';
            submitBtn.disabled = true;

            try {
                const { data, error } = await client.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                            name: name
                        }
                    }
                });

                if (error) {
                    const errLower = (error.message || '').toLowerCase();
                    // 🛡️ ESCENARIO C: Usuario intenta registrarse con un correo ya existente
                    if (errLower.includes('already registered') || errLower.includes('already been registered') || errLower.includes('already exists') || errLower.includes('user already exists') || error.code === 'user_already_exists') {
                        console.info('ℹ️ [Register] Usuario ya registrado (Escenario C). Conmutando a login.');
                        showAlert('Esta cuenta ya existe. Por favor ingresa tu contraseña para iniciar sesión.', 'info');
                        switchTab('login');
                        const loginEmail = document.getElementById('login-email');
                        if (loginEmail) {
                            loginEmail.value = email;
                        }
                        const loginPwd = document.getElementById('login-password');
                        if (loginPwd) loginPwd.focus();
                        return;
                    }

                    throw error;
                }

                // 🛡️ ESCENARIO A: Registro exitoso con email no confirmado
                // Abrir el modal de OTP con cooldown activo de 60s
                console.log('✅ [Register] Registro iniciado en Supabase. Abriendo modal OTP...');
                openOtpModal(email, false);

            } catch (err) {
                console.error('❌ Error Register:', err);
                showAlert(err.message || 'Error al crear la cuenta.');
            } finally {
                submitBtn.innerHTML = originalHTML;
                submitBtn.disabled = false;
            }
        });
    }

    /**
     * Modal de Verificación de OTP (8 dígitos)
     */
    function setupOtpModal() {
        otpModal = document.getElementById('otp-modal');
        otpBoxes = Array.from(document.querySelectorAll('.otp-box'));
        otpHiddenInput = document.getElementById('otp-hidden-input');
        otpVerifyBtn = document.getElementById('btn-otp-verify');
        otpResendBtn = document.getElementById('btn-otp-resend');
        otpCountdownText = document.getElementById('otp-countdown-text');
        otpEmailDisplay = document.getElementById('otp-email-display');
        otpFeedback = document.getElementById('otp-feedback');
        otpCloseBtn = document.getElementById('otp-close-btn');

        if (!otpModal || !otpHiddenInput) return;

        // Foco automático en el input oculto al hacer clic en las casillas
        const otpContainer = document.getElementById('otp-boxes-container');
        if (otpContainer) {
            otpContainer.addEventListener('click', () => {
                otpHiddenInput.focus();
            });
        }

        // Manejar teclado en el input oculto
        otpHiddenInput.addEventListener('input', () => {
            const rawVal = otpHiddenInput.value.replace(/[^0-9]/g, '').slice(0, 8);
            otpHiddenInput.value = rawVal;
            renderOtpBoxes(rawVal);

            if (otpFeedback) otpFeedback.style.display = 'none';

            // Habilitar botón si tiene entre 6 y 8 dígitos
            if (otpVerifyBtn) {
                otpVerifyBtn.disabled = rawVal.length < 6;
            }

            // Auto-verificar si llega a 8 dígitos
            if (rawVal.length === 8) {
                handleOtpVerification();
            }
        });

        // Manejar eventos de verificación y reenvío
        if (otpVerifyBtn) {
            otpVerifyBtn.addEventListener('click', handleOtpVerification);
        }

        if (otpResendBtn) {
            otpResendBtn.addEventListener('click', handleOtpResend);
        }

        if (otpCloseBtn) {
            otpCloseBtn.addEventListener('click', closeOtpModal);
        }
    }

    function renderOtpBoxes(value) {
        if (!otpBoxes || otpBoxes.length === 0) return;
        otpBoxes.forEach((box, idx) => {
            const digit = value[idx] || '';
            const digitEl = box.querySelector('.otp-digit');
            if (digitEl) digitEl.textContent = digit;

            if (digit) {
                box.classList.add('filled');
            } else {
                box.classList.remove('filled');
            }

            if (idx === value.length && value.length < 8) {
                box.classList.add('active');
            } else {
                box.classList.remove('active');
            }
        });
    }

    function showOtpFeedback(message, type = 'error') {
        if (!otpFeedback) return;
        otpFeedback.textContent = message;
        otpFeedback.className = `otp-feedback otp-feedback-${type}`;
        otpFeedback.style.display = 'block';
    }

    /**
     * Inicia la cuenta regresiva de 60 segundos
     */
    function startOtpCooldown(seconds = 60) {
        if (otpCountdownInterval) {
            clearInterval(otpCountdownInterval);
        }

        otpCountdownSeconds = seconds;
        updateOtpCooldownUI();

        otpCountdownInterval = setInterval(() => {
            otpCountdownSeconds -= 1;
            updateOtpCooldownUI();

            if (otpCountdownSeconds <= 0) {
                clearInterval(otpCountdownInterval);
                otpCountdownInterval = null;
            }
        }, 1000);
    }

    function updateOtpCooldownUI() {
        if (!otpCountdownText || !otpResendBtn) return;

        if (otpCountdownSeconds > 0) {
            otpCountdownText.style.display = 'inline';
            otpCountdownText.innerHTML = `Reenviar nuevo código en <strong>${otpCountdownSeconds}s</strong>`;
            otpResendBtn.style.display = 'none';
        } else {
            otpCountdownText.style.display = 'none';
            otpResendBtn.style.display = 'inline-flex';
            otpResendBtn.disabled = false;
        }
    }

    /**
     * Abre el modal OTP
     */
    function openOtpModal(email, autoResend = false) {
        currentOtpEmail = email;
        if (otpEmailDisplay) {
            otpEmailDisplay.textContent = maskEmail(email);
        }
        if (otpHiddenInput) {
            otpHiddenInput.value = '';
            renderOtpBoxes('');
        }
        if (otpFeedback) otpFeedback.style.display = 'none';
        if (otpVerifyBtn) otpVerifyBtn.disabled = true;

        if (otpModal) {
            otpModal.style.display = 'flex';
        }

        startOtpCooldown(60);

        setTimeout(() => {
            if (otpHiddenInput) otpHiddenInput.focus();
        }, 200);

        if (autoResend) {
            handleOtpResend();
        }
    }

    function closeOtpModal() {
        if (otpCountdownInterval) {
            clearInterval(otpCountdownInterval);
            otpCountdownInterval = null;
        }
        if (otpModal) {
            otpModal.style.display = 'none';
        }
    }

    /**
     * Valida el código OTP con Supabase
     */
    async function handleOtpVerification() {
        const client = getSupabase();
        if (!client || !currentOtpEmail) return;

        const token = (otpHiddenInput?.value || '').trim();
        if (window.AuthValidation) {
            const val = window.AuthValidation.validateOtpToken(token);
            if (!val.valid) {
                showOtpFeedback(val.error || 'Código incorrecto.', 'error');
                return;
            }
        }

        const originalBtnHTML = otpVerifyBtn ? otpVerifyBtn.innerHTML : '';
        if (otpVerifyBtn) {
            otpVerifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
            otpVerifyBtn.disabled = true;
        }
        if (otpFeedback) otpFeedback.style.display = 'none';

        try {
            // Verificar OTP tipo signup o email
            const { data, error } = await client.auth.verifyOtp({
                email: currentOtpEmail,
                token: token,
                type: 'signup'
            });

            if (error) {
                // Fallback secundario a type: 'email' si fuera necesario
                const retry = await client.auth.verifyOtp({
                    email: currentOtpEmail,
                    token: token,
                    type: 'email'
                });
                if (retry.error) throw retry.error;
            }

            // Éxito
            showOtpFeedback('¡Correo verificado con éxito! 🎉', 'success');
            if (otpVerifyBtn) {
                otpVerifyBtn.innerHTML = '<i class="fas fa-check"></i> ¡Verificado!';
            }

            setTimeout(() => {
                closeOtpModal();
                // Redirigir a destino seguro
                window.location.href = getSafeRedirectUrl();
            }, 1000);

        } catch (err) {
            console.error('❌ Error Verificando OTP:', err);
            showOtpFeedback(err.message || 'Código incorrecto o expirado.', 'error');
            if (otpVerifyBtn) {
                otpVerifyBtn.innerHTML = originalBtnHTML;
                otpVerifyBtn.disabled = false;
            }
        }
    }

    /**
     * Reenvía un nuevo código OTP
     */
    async function handleOtpResend() {
        const client = getSupabase();
        if (!client || !currentOtpEmail) return;

        if (otpResendBtn) {
            otpResendBtn.disabled = true;
            otpResendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        }

        try {
            const { error } = await client.auth.resend({
                type: 'signup',
                email: currentOtpEmail
            });

            if (error) throw error;

            showOtpFeedback('Se ha enviado un nuevo código a tu correo.', 'success');
            startOtpCooldown(60);
            if (otpHiddenInput) {
                otpHiddenInput.value = '';
                renderOtpBoxes('');
                otpHiddenInput.focus();
            }
        } catch (err) {
            console.error('❌ Error reenviando OTP:', err);
            showOtpFeedback(err.message || 'No se pudo reenviar el código. Intenta nuevamente.', 'error');
        } finally {
            if (otpResendBtn) {
                otpResendBtn.innerHTML = '<i class="fas fa-redo"></i> ¿No recibiste el código? Reenviar';
            }
        }
    }

    /**
     * Modal y Flujo de Recuperación de Contraseña (Forgot Password Flow)
     * Soporta tanto el ingreso de código OTP de 8 dígitos como el enlace directo de Supabase
     */
    let recoveryTargetEmail = '';
    let isDirectRecoverySession = false;

    function setupPasswordRecovery() {
        const recoveryLink = document.getElementById('link-forgot-password');
        const recoveryModal = document.getElementById('recovery-modal');
        const recoveryCloseBtn = document.getElementById('recovery-close-btn');
        const formRequest = document.getElementById('form-recovery-request');
        const requestEmailInput = document.getElementById('recovery-email');
        const requestFeedback = document.getElementById('recovery-request-feedback');
        const btnRequestSubmit = document.getElementById('btn-recovery-request-submit');

        const formVerify = document.getElementById('form-recovery-verify');
        const verifyEmailDisplay = document.getElementById('recovery-email-display');
        const recoveryOtpBoxes = Array.from(document.querySelectorAll('#recovery-otp-boxes-container .otp-box'));
        const recoveryOtpHidden = document.getElementById('recovery-otp-hidden-input');
        const recoveryOtpContainer = document.getElementById('recovery-otp-boxes-container');
        const recoveryNewPwdInput = document.getElementById('recovery-new-password');
        const recoveryConfirmPwdInput = document.getElementById('recovery-confirm-password');
        const recoveryVerifyFeedback = document.getElementById('recovery-verify-feedback');
        const btnVerifySubmit = document.getElementById('btn-recovery-verify-submit');
        const recoveryModalTitle = document.getElementById('recovery-modal-title');
        const recoveryModalSubtitle = document.getElementById('recovery-modal-subtitle');

        if (!recoveryModal) return;

        function openRecoveryModal(prefillEmail = '') {
            recoveryTargetEmail = prefillEmail || (document.getElementById('login-email')?.value || '').trim();
            if (requestEmailInput) {
                requestEmailInput.value = recoveryTargetEmail;
            }
            if (formRequest) formRequest.style.display = 'flex';
            if (formVerify) formVerify.style.display = 'none';
            if (requestFeedback) requestFeedback.style.display = 'none';
            if (recoveryVerifyFeedback) recoveryVerifyFeedback.style.display = 'none';
            if (recoveryModalTitle) recoveryModalTitle.textContent = 'Recuperar Contraseña';
            if (recoveryModalSubtitle) recoveryModalSubtitle.textContent = 'Te enviaremos un código para restablecer tu clave';
            recoveryModal.style.display = 'flex';

            setTimeout(() => {
                if (requestEmailInput) requestEmailInput.focus();
            }, 150);
        }

        function openDirectRecoveryModal() {
            isDirectRecoverySession = true;
            if (formRequest) formRequest.style.display = 'none';
            if (formVerify) formVerify.style.display = 'flex';
            if (recoveryModalTitle) recoveryModalTitle.textContent = 'Nueva Contraseña';
            if (recoveryModalSubtitle) recoveryModalSubtitle.textContent = 'Ingresa y confirma tu nueva clave de acceso';
            
            const otpGroup = recoveryOtpContainer ? recoveryOtpContainer.closest('.form-group') : null;
            if (otpGroup) otpGroup.style.display = 'none';
            const infoBox = formVerify.querySelector('.otp-info-box');
            if (infoBox) infoBox.style.display = 'none';

            recoveryModal.style.display = 'flex';
            setTimeout(() => {
                if (recoveryNewPwdInput) recoveryNewPwdInput.focus();
            }, 150);
        }

        function closeRecoveryModal() {
            recoveryModal.style.display = 'none';
            if (recoveryOtpHidden) recoveryOtpHidden.value = '';
            if (recoveryNewPwdInput) recoveryNewPwdInput.value = '';
            if (recoveryConfirmPwdInput) recoveryConfirmPwdInput.value = '';
            isDirectRecoverySession = false;
        }

        if (recoveryLink) {
            recoveryLink.addEventListener('click', (e) => {
                e.preventDefault();
                openRecoveryModal();
            });
        }

        if (recoveryCloseBtn) {
            recoveryCloseBtn.addEventListener('click', closeRecoveryModal);
        }

        if (recoveryOtpContainer && recoveryOtpHidden) {
            recoveryOtpContainer.addEventListener('click', () => {
                recoveryOtpHidden.focus();
            });

            recoveryOtpHidden.addEventListener('input', () => {
                const rawVal = recoveryOtpHidden.value.replace(/[^0-9]/g, '').slice(0, 8);
                recoveryOtpHidden.value = rawVal;
                
                recoveryOtpBoxes.forEach((box, idx) => {
                    const digit = rawVal[idx] || '';
                    const digitEl = box.querySelector('.otp-digit');
                    if (digitEl) digitEl.textContent = digit;

                    if (digit) box.classList.add('filled');
                    else box.classList.remove('filled');

                    if (idx === rawVal.length && rawVal.length < 8) box.classList.add('active');
                    else box.classList.remove('active');
                });

                if (recoveryVerifyFeedback) recoveryVerifyFeedback.style.display = 'none';
            });
        }

        if (recoveryNewPwdInput && window.AuthValidation) {
            recoveryNewPwdInput.addEventListener('input', () => {
                const val = recoveryNewPwdInput.value;
                const status = window.AuthValidation.evaluatePasswordRules(val);

                updateRuleElement('rec-rule-length', status.hasMinLength);
                updateRuleElement('rec-rule-upper', status.hasUpper);
                updateRuleElement('rec-rule-lower', status.hasLower);
                updateRuleElement('rec-rule-number', status.hasNumber);
                updateRuleElement('rec-rule-spaces', status.noSpaces && val.length > 0);
            });
        }

        if (formRequest) {
            formRequest.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = (requestEmailInput?.value || '').trim();

                if (!email || !email.includes('@')) {
                    if (requestFeedback) {
                        requestFeedback.textContent = 'Por favor ingresa un correo electrónico válido.';
                        requestFeedback.className = 'otp-feedback otp-feedback-error';
                        requestFeedback.style.display = 'block';
                    }
                    return;
                }

                const client = getSupabase();
                if (!client) {
                    if (requestFeedback) {
                        requestFeedback.textContent = 'Servicio de autenticación no disponible. Recarga la página.';
                        requestFeedback.className = 'otp-feedback otp-feedback-error';
                        requestFeedback.style.display = 'block';
                    }
                    return;
                }

                const origText = btnRequestSubmit ? btnRequestSubmit.innerHTML : '';
                if (btnRequestSubmit) {
                    btnRequestSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando código...';
                    btnRequestSubmit.disabled = true;
                }
                if (requestFeedback) requestFeedback.style.display = 'none';

                try {
                    const redirectUrl = window.location.origin + '/login';
                    const { error } = await client.auth.resetPasswordForEmail(email, {
                        redirectTo: redirectUrl
                    });

                    if (error) throw error;

                    recoveryTargetEmail = email;
                    if (verifyEmailDisplay) verifyEmailDisplay.textContent = maskEmail(email);

                    formRequest.style.display = 'none';
                    formVerify.style.display = 'flex';
                    if (recoveryModalTitle) recoveryModalTitle.textContent = 'Restablecer Clave';
                    if (recoveryModalSubtitle) recoveryModalSubtitle.textContent = 'Ingresa el código de 8 dígitos y tu nueva clave';

                    if (recoveryOtpHidden) {
                        recoveryOtpHidden.value = '';
                        recoveryOtpHidden.focus();
                    }
                } catch (err) {
                    console.error('❌ Error solicitando reseteo de clave:', err);
                    if (requestFeedback) {
                        requestFeedback.textContent = err.message || 'Error al enviar código. Intenta nuevamente.';
                        requestFeedback.className = 'otp-feedback otp-feedback-error';
                        requestFeedback.style.display = 'block';
                    }
                } finally {
                    if (btnRequestSubmit) {
                        btnRequestSubmit.innerHTML = origText;
                        btnRequestSubmit.disabled = false;
                    }
                }
            });
        }

        if (formVerify) {
            formVerify.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newPassword = recoveryNewPwdInput?.value || '';
                const confirmPassword = recoveryConfirmPwdInput?.value || '';
                const token = (recoveryOtpHidden?.value || '').trim();

                const showFeedback = (msg, isError = true) => {
                    if (!recoveryVerifyFeedback) return;
                    recoveryVerifyFeedback.textContent = msg;
                    recoveryVerifyFeedback.className = `otp-feedback otp-feedback-${isError ? 'error' : 'success'}`;
                    recoveryVerifyFeedback.style.display = 'block';
                };

                if (window.AuthValidation) {
                    const val = window.AuthValidation.validatePassword(newPassword, { isNewPassword: true });
                    if (!val.valid) {
                        showFeedback(val.error);
                        return;
                    }
                    if (newPassword !== confirmPassword) {
                        showFeedback('Las contraseñas no coinciden. Por favor verifica que ambas sean idénticas.');
                        return;
                    }
                } else {
                    if (!newPassword || newPassword.length < 8) {
                        showFeedback('La contraseña debe tener al menos 8 caracteres.');
                        return;
                    }
                    if (newPassword !== confirmPassword) {
                        showFeedback('Las contraseñas no coinciden.');
                        return;
                    }
                }

                if (!isDirectRecoverySession) {
                    if (token.length < 6) {
                        showFeedback('Por favor ingresa el código de seguridad recibido.');
                        return;
                    }
                }

                const client = getSupabase();
                if (!client) {
                    showFeedback('Servicio de autenticación no disponible.');
                    return;
                }

                const origBtnHTML = btnVerifySubmit ? btnVerifySubmit.innerHTML : '';
                if (btnVerifySubmit) {
                    btnVerifySubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
                    btnVerifySubmit.disabled = true;
                }

                try {
                    if (!isDirectRecoverySession) {
                        const { data: verifyData, error: verifyErr } = await client.auth.verifyOtp({
                            email: recoveryTargetEmail,
                            token: token,
                            type: 'recovery'
                        });

                        if (verifyErr) throw verifyErr;
                    }

                    const { data: updateData, error: updateErr } = await client.auth.updateUser({
                        password: newPassword
                    });

                    if (updateErr) throw updateErr;

                    showFeedback('¡Contraseña restablecida con éxito! 🎉 Redirigiendo...', false);
                    if (btnVerifySubmit) {
                        btnVerifySubmit.innerHTML = '<i class="fas fa-check"></i> ¡Listo!';
                    }

                    setTimeout(() => {
                        closeRecoveryModal();
                        window.location.href = getSafeRedirectUrl();
                    }, 1500);

                } catch (err) {
                    console.error('❌ Error restableciendo clave:', err);
                    showFeedback(err.message || 'Código inválido o sesión expirada.');
                    if (btnVerifySubmit) {
                        btnVerifySubmit.innerHTML = origBtnHTML;
                        btnVerifySubmit.disabled = false;
                    }
                }
            });
        }

        const client = getSupabase();
        if (client && client.auth && typeof client.auth.onAuthStateChange === 'function') {
            client.auth.onAuthStateChange((event, session) => {
                if (event === 'PASSWORD_RECOVERY') {
                    console.info('🔑 [Auth] Evento PASSWORD_RECOVERY detectado en cliente Supabase.');
                    openDirectRecoveryModal();
                }
            });
        }

        if (typeof window !== 'undefined' && window.location && window.location.hash) {
            if (window.location.hash.includes('type=recovery')) {
                console.info('🔑 [Auth] Hash type=recovery detectado.');
                openDirectRecoveryModal();
            }
        }

        return {
            openRecoveryModal,
            closeRecoveryModal,
            openDirectRecoveryModal
        };
    }

    /**
     * Inicialización principal al cargar el DOM
     */
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            tabLoginBtn = document.getElementById('tab-btn-login');
            tabRegisterBtn = document.getElementById('tab-btn-register');
            loginForm = document.getElementById('form-login');
            registerForm = document.getElementById('form-register');
            googleLoginBtn = document.getElementById('google-login-btn');
            alertBanner = document.getElementById('alert-banner');
            alertText = document.getElementById('alert-text');
            alertClose = document.getElementById('alert-close');

            if (alertClose) {
                alertClose.addEventListener('click', hideAlert);
            }

            if (tabLoginBtn && tabRegisterBtn) {
                tabLoginBtn.addEventListener('click', () => switchTab('login'));
                tabRegisterBtn.addEventListener('click', () => switchTab('register'));
            }

            // Revisar si la URL pide registro por query param (?mode=register)
            if (typeof window !== 'undefined' && window.location) {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('mode') === 'register') {
                    switchTab('register');
                }
            }

            setupPasswordToggles();
            setupRealtimePasswordValidator();
            setupEmailTypoAndDisposableGuards();
            setupGoogleAuth();
            setupEmailLoginForm();
            setupRegisterForm();
            setupOtpModal();
            setupPasswordRecovery();

            // 🛡️ Redirigir automáticamente si el usuario ya cuenta con sesión activa
            if (typeof window !== 'undefined' && window.sessionManager) {
                if (window.sessionManager.currentUser && !window.sessionManager.currentUser._isOptimistic) {
                    window.location.href = getSafeRedirectUrl();
                } else if (typeof window.sessionManager.onStateChange === 'function') {
                    window.sessionManager.onStateChange((user) => {
                        if (user && !user._isOptimistic) {
                            window.location.href = getSafeRedirectUrl();
                        }
                    });
                }
            }
        });
    }

    // Exportación modular para pruebas
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            getSafeRedirectUrl,
            maskEmail,
            resetGoogleAuthButton,
            resetAllSubmitButtons,
            setupPasswordRecovery,
            GOOGLE_BTN_DEFAULT_HTML
        };
    }
})();
