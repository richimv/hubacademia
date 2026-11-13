/**
 * loginFlow.test.js
 * Pruebas unitarias para el flujo de autenticación, funciones de login.js,
 * mitigación contra Open Redirect y utilidades modulares de profile.js.
 */

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
        const profileModule = require('../../src/presentation/public/js/profile');

        test('profile.js exporta funciones modulares para cambio de contraseña', () => {
            expect(typeof profileModule.openChangePasswordModal).toBe('function');
            expect(typeof profileModule.closeChangePasswordModal).toBe('function');
            expect(typeof profileModule.setupChangePasswordModal).toBe('function');
        });
    });
});
