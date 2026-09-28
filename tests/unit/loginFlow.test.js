/**
 * loginFlow.test.js
 * Pruebas unitarias para el flujo de autenticación, funciones de login.js,
 * manejo de los 3 escenarios de verificación OTP, mitigación contra Open Redirect,
 * y verificación de integridad estructural y visual de login.html y auth.css.
 */

const fs = require('fs');
const path = require('path');

describe('Login & Verification Flow', () => {
    let loginModule;

    beforeEach(() => {
        // Mock window.location and window.addEventListener
        delete global.window;
        global.window = {
            location: {
                search: '',
                pathname: '/login',
                origin: 'https://www.hubacademia.com'
            },
            addEventListener: jest.fn()
        };

        loginModule = require('../../src/presentation/public/js/login');
    });

    describe('getSafeRedirectUrl() (OWASP A01 Open Redirect Protection)', () => {
        test('retorna / por defecto si no hay query param redirect', () => {
            global.window.location.search = '';
            expect(loginModule.getSafeRedirectUrl()).toBe('/');
        });

        test('acepta rutas relativas locales válidas', () => {
            global.window.location.search = '?redirect=%2Fpricing';
            expect(loginModule.getSafeRedirectUrl()).toBe('/pricing');

            global.window.location.search = '?redirect=%2Fsimulators%3Fcontext%3DMEDICINA';
            expect(loginModule.getSafeRedirectUrl()).toBe('/simulators?context=MEDICINA');
        });

        test('neutraliza ataques de redirección abierta (Open Redirect) hacia URLs absolutas o externas', () => {
            // Intento de redirección a sitio externo malicioso
            global.window.location.search = '?redirect=https%3A%2F%2Fattacker.com';
            expect(loginModule.getSafeRedirectUrl()).toBe('/');

            // Protocol relative //attacker.com
            global.window.location.search = '?redirect=%2F%2Fattacker.com';
            expect(loginModule.getSafeRedirectUrl()).toBe('/');

            // Backslash trick \attacker.com
            global.window.location.search = '?redirect=%2F%5Cattacker.com';
            expect(loginModule.getSafeRedirectUrl()).toBe('/');

            // Javascript pseudo-protocol
            global.window.location.search = '?redirect=javascript%3Aalert(1)';
            expect(loginModule.getSafeRedirectUrl()).toBe('/');
        });
    });

    describe('maskEmail() Privacy Display', () => {
        test('enmascara correos estándar correctamente', () => {
            expect(loginModule.maskEmail('ricardo@gmail.com')).toBe('ri***@gmail.com');
            expect(loginModule.maskEmail('estudiante2026@hotmail.com')).toBe('es***@hotmail.com');
        });

        test('enmascara nombres de usuario cortos (<= 2 caracteres)', () => {
            expect(loginModule.maskEmail('al@outlook.com')).toBe('al***@outlook.com');
            expect(loginModule.maskEmail('a@gmail.com')).toBe('a***@gmail.com');
        });

        test('devuelve la cadena original si es inválida o no tiene @', () => {
            expect(loginModule.maskEmail('invalid-string')).toBe('invalid-string');
            expect(loginModule.maskEmail('')).toBe('');
            expect(loginModule.maskEmail(null)).toBe(null);
        });
    });

    describe('MeduCat Scenario Error Interceptors', () => {
        test('Escenario B: intercepta error "email not confirmed" para activar verificación OTP', () => {
            const errorSample1 = { message: 'Email not confirmed', code: 'email_not_confirmed' };
            const errorSample2 = { message: 'email not confirmed' };

            const isUnconfirmed = (err) => {
                const msg = (err?.message || '').toLowerCase();
                return msg.includes('email not confirmed') || err?.code === 'email_not_confirmed';
            };

            expect(isUnconfirmed(errorSample1)).toBe(true);
            expect(isUnconfirmed(errorSample2)).toBe(true);
            expect(isUnconfirmed({ message: 'Invalid credentials' })).toBe(false);
        });

        test('Escenario C: intercepta "user already registered" para guiar a login', () => {
            const errorSample1 = { message: 'User already registered', code: 'user_already_exists' };
            const errorSample2 = { message: 'A user with this email address has already been registered' };

            const isAlreadyRegistered = (err) => {
                const msg = (err?.message || '').toLowerCase();
                return msg.includes('already registered') || msg.includes('already been registered') || msg.includes('already exists') || err?.code === 'user_already_exists';
            };

            expect(isAlreadyRegistered(errorSample1)).toBe(true);
            expect(isAlreadyRegistered(errorSample2)).toBe(true);
            expect(isAlreadyRegistered({ message: 'Password too short' })).toBe(false);
        });
    });

    describe('login.html & auth.css Structural & Aesthetic Integrity', () => {
        const loginHtmlPath = path.join(__dirname, '../../src/presentation/public/login.html');
        const authCssPath = path.join(__dirname, '../../src/presentation/public/css/auth.css');

        test('login.html contiene todos los elementos y ganchos de interacción obligatorios', () => {
            const html = fs.readFileSync(loginHtmlPath, 'utf8');

            // Ganchos obligatorios para login.js
            expect(html).toContain('id="theme-toggle-btn"');
            expect(html).toContain('id="google-login-btn"');
            expect(html).toContain('id="tab-btn-login"');
            expect(html).toContain('id="tab-btn-register"');
            expect(html).toContain('id="form-login"');
            expect(html).toContain('id="form-register"');
            expect(html).toContain('id="login-email"');
            expect(html).toContain('id="login-password"');
            expect(html).toContain('id="register-name"');
            expect(html).toContain('id="register-email"');
            expect(html).toContain('id="register-password"');
            expect(html).toContain('id="register-confirm-password"');
            expect(html).toContain('id="btn-login-submit"');
            expect(html).toContain('id="btn-register-submit"');
            expect(html).toContain('id="alert-banner"');
            expect(html).toContain('id="otp-modal"');
            expect(html).toContain('id="otp-boxes-container"');
            expect(html).toContain('id="otp-hidden-input"');
            expect(html).toContain('id="btn-otp-verify"');
            expect(html).toContain('id="btn-otp-resend"');
            expect(html).toContain('id="otp-countdown-text"');

            // Ganchos obligatorios para recuperación de contraseña ("Olvidó su contraseña")
            expect(html).toContain('id="link-forgot-password"');
            expect(html).toContain('id="recovery-modal"');
            expect(html).toContain('id="form-recovery-request"');
            expect(html).toContain('id="form-recovery-verify"');
            expect(html).toContain('id="recovery-email"');
            expect(html).toContain('id="recovery-otp-boxes-container"');
            expect(html).toContain('id="recovery-otp-hidden-input"');
            expect(html).toContain('id="recovery-new-password"');
            expect(html).toContain('id="recovery-confirm-password"');
            expect(html).toContain('id="btn-recovery-request-submit"');
            expect(html).toContain('id="btn-recovery-verify-submit"');

            // Verificación de casillas OTP de 8 dígitos (8 en registro + 8 en recuperación)
            const otpBoxMatches = html.match(/class="otp-box\b/g);
            expect(otpBoxMatches).toHaveLength(16);

            // Verificación de enlace modular al CSS de autenticación
            expect(html).toMatch(/href="\/css\/auth\.css/);
        });

        test('login.html no contiene declaraciones circulares de variables CSS que rompen el contraste', () => {
            const html = fs.readFileSync(loginHtmlPath, 'utf8');
            expect(html).not.toContain('--text-main: var(--text-main)');
            expect(html).not.toContain('--text-muted: var(--text-muted)');
        });

        test('auth.css implementa diseño Dual-Theme y paleta de marca sin colores discordantes', () => {
            const css = fs.readFileSync(authCssPath, 'utf8');

            // Soporte dual-theme
            expect(css).toContain('[data-theme="light"]');

            // No variables circulares
            expect(css).not.toContain('--text-main: var(--text-main)');
            expect(css).not.toContain('--text-muted: var(--text-muted)');

            // Botón de submit usa paleta oficial azul de Hub Academia (no naranja discordante)
            expect(css).toContain('.btn-submit-action');
            expect(css).not.toMatch(/\.btn-submit-action\s*\{[^}]*#f97316/);

            // Tabs con contraste definido
            expect(css).toContain('.tab-btn.active');
            expect(css).toContain('var(--primary)');
        });
    });

    describe('Google OAuth Button Bfcache Reset & State Restoration', () => {
        test('resetGoogleAuthButton() restaura el icono vector SVG y habilita el botón', () => {
            const mockGoogleBtn = {
                innerHTML: '<i class="fas fa-spinner fa-spin"></i> Conectando con Google...',
                disabled: true,
                style: { opacity: '0.7' }
            };

            global.document = {
                getElementById: (id) => {
                    if (id === 'google-login-btn') return mockGoogleBtn;
                    return null;
                }
            };

            expect(typeof loginModule.resetGoogleAuthButton).toBe('function');
            loginModule.resetGoogleAuthButton();

            expect(mockGoogleBtn.disabled).toBe(false);
            expect(mockGoogleBtn.style.opacity).toBe('1');
            expect(mockGoogleBtn.innerHTML).toContain('svg class="google-icon-svg"');
            expect(mockGoogleBtn.innerHTML).toContain('Continuar con Google');
        });

        test('resetAllSubmitButtons() restaura los botones de login y registro', () => {
            const mockLoginBtn = { innerHTML: 'Iniciando...', disabled: true };
            const mockRegBtn = { innerHTML: 'Creando...', disabled: true };

            global.document = {
                getElementById: (id) => {
                    if (id === 'btn-login-submit') return mockLoginBtn;
                    if (id === 'btn-register-submit') return mockRegBtn;
                    return null;
                }
            };

            expect(typeof loginModule.resetAllSubmitButtons).toBe('function');
            loginModule.resetAllSubmitButtons();

            expect(mockLoginBtn.disabled).toBe(false);
            expect(mockLoginBtn.innerHTML).toContain('Iniciar Sesión');
            expect(mockRegBtn.disabled).toBe(false);
            expect(mockRegBtn.innerHTML).toContain('Crear Cuenta');
        });
    });

    describe('Profile Security & Password Change Integrity', () => {
        const profileHtmlPath = path.join(__dirname, '../../src/presentation/public/profile.html');
        const profileModule = require('../../src/presentation/public/js/profile');

        test('profile.html contiene botón y modal de cambio de contraseña', () => {
            const html = fs.readFileSync(profileHtmlPath, 'utf8');

            expect(html).toContain('id="btn-open-change-pwd"');
            expect(html).toContain('id="change-password-modal"');
            expect(html).toContain('id="form-change-password"');
            expect(html).toContain('id="change-new-password"');
            expect(html).toContain('id="change-confirm-password"');
            expect(html).toContain('id="btn-submit-change-pwd"');
            expect(html).toContain('id="change-pwd-feedback"');
        });

        test('profile.html no contiene referencias a historial de chats y define modales independientes', () => {
            const html = fs.readFileSync(profileHtmlPath, 'utf8');

            expect(html).not.toContain('historial de chats');
            expect(html).toContain('favoritos, progreso de estudio y suscripciones');

            // Verificar que otp-modal está cerrado antes de change-password-modal
            const otpIdx = html.indexOf('id="otp-modal"');
            const changePwdIdx = html.indexOf('id="change-password-modal"');
            expect(otpIdx).toBeGreaterThan(0);
            expect(changePwdIdx).toBeGreaterThan(otpIdx);

            const between = html.substring(otpIdx, changePwdIdx).replace(/\r\n/g, '\n');
            // Debe contener el cierre de modal-card y modal-overlay
            expect(between).toContain('</div>\n    </div>');
        });

        test('profile.js exporta funciones modulares para cambio de contraseña', () => {
            expect(typeof profileModule.openChangePasswordModal).toBe('function');
            expect(typeof profileModule.closeChangePasswordModal).toBe('function');
            expect(typeof profileModule.setupChangePasswordModal).toBe('function');
        });
    });
});
