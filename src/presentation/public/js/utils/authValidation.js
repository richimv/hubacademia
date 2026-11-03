/**
 * authValidation.js
 * Utilidades de validación para el flujo de autenticación de Hub Academia.
 * 
 * Implementa estándares de ciberseguridad (OWASP Top 10, NIST SP 800-63B, MeduCat Standard):
 * - Filtrado de dominios de correos temporales/desechables (Anti-Abuse).
 * - Sugerencias heurísticas de errores tipográficos en dominios de correo populares.
 * - Validación robusta de contraseñas con feedback en tiempo real.
 * - Validación de nombres de usuario contra scripts, etiquetas HTML y códigos de control.
 * - Validación de códigos OTP numéricos (6 a 8 dígitos) para Supabase Auth.
 * 
 * Compatible con entornos de navegador (window.AuthValidation) y Node.js (module.exports / Jest).
 */

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        root.AuthValidation = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
    'use strict';

    /**
     * Lista negra de dominios de correo electrónico temporal/desechable
     * Alineada con los estándares de ciberseguridad de MeduCat y Hub Academia
     */
    const DISPOSABLE_EMAIL_DOMAINS = new Set([
        '10minutemail.com', '10minutemail.net', 'tempmail.com', 'tempmail.net',
        'guerrillamail.com', 'guerrillamail.net', 'guerrillamailblock.com',
        'mailinator.com', 'trashmail.com', 'trashmail.net', 'sharklasers.com',
        'yopmail.com', 'yopmail.fr', 'yopmail.net', 'dispostable.com',
        'getairmail.com', 'throwawaymail.com', 'crazymailing.com',
        'maildrop.cc', 'mohmal.com', 'fakemailgenerator.com', 'emailondeck.com',
        'inboxkitten.com', 'temp-mail.org', 'nada.ltd', 'burnermail.io',
        'mohmal.in', 'tempail.com', 'mytemp.email', 'disposablemail.com'
    ]);

    /**
     * Diccionario de sugerencias tipográficas en dominios populares
     */
    const COMMON_DOMAIN_TYPOS = {
        'gmil.com': 'gmail.com',
        'gmaill.com': 'gmail.com',
        'gmai.com': 'gmail.com',
        'gamil.com': 'gmail.com',
        'gmial.com': 'gmail.com',
        'hotmial.com': 'hotmail.com',
        'hotmaill.com': 'hotmail.com',
        'hotmai.com': 'hotmail.com',
        'outlok.com': 'outlook.com',
        'outloo.com': 'outlook.com',
        'yaho.com': 'yahoo.com',
        'yahooo.com': 'yahoo.com'
    };

    /**
     * Valida si un correo electrónico pertenece a un proveedor desechable o temporal.
     * @param {string} email
     * @returns {boolean}
     */
    function isDisposableEmail(email) {
        if (!email || typeof email !== 'string' || !email.includes('@')) return false;
        const parts = email.trim().toLowerCase().split('@');
        const domain = parts[parts.length - 1];
        return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false;
    }

    /**
     * Valida si una cadena cumple con el formato estándar de correo electrónico RFC 5322 simplificado.
     * @param {string} email
     * @returns {boolean}
     */
    function validateEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const trimmed = email.trim();
        if (trimmed.length < 5 || trimmed.length > 254) return false;
        // Prevenir caracteres de control o bytes nulos
        if (/[\x00-\x1F\x7F\s]/.test(trimmed)) return false;
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(trimmed);
    }

    /**
     * Detecta errores tipográficos frecuentes en el dominio del correo y sugiere el correcto.
     * @param {string} email
     * @returns {string|null} Sugerencia o null si no hay error conocido.
     */
    function suggestEmailDomain(email) {
        if (!email || typeof email !== 'string' || !email.includes('@')) return null;
        const parts = email.trim().toLowerCase().split('@');
        if (parts.length !== 2) return null;
        const [user, domain] = parts;
        if (COMMON_DOMAIN_TYPOS[domain]) {
            return `${user}@${COMMON_DOMAIN_TYPOS[domain]}`;
        }
        return null;
    }

    /**
     * Evalúa los requisitos de seguridad de una contraseña en tiempo real.
     * @param {string} password
     * @returns {object} Estado de cada regla
     */
    function evaluatePasswordRules(password) {
        if (!password || typeof password !== 'string') {
            return {
                hasMinLength: false,
                hasNumber: false,
                hasUpper: false,
                hasLower: false,
                noSpaces: true,
                hasValidChars: true,
                isComplete: false
            };
        }

        const hasMinLength = password.length >= 8;
        const hasNumber = /\d/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const noSpaces = !/\s/.test(password);
        const hasNoControlChars = !/[\x00-\x1F\x7F]/.test(password);

        // Caracteres permitidos: Letras latinas, dígitos y símbolos de teclado comunes
        const hasValidChars = hasNoControlChars && /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]+$/.test(password);

        const isComplete =
            hasMinLength &&
            hasNumber &&
            hasUpper &&
            hasLower &&
            noSpaces &&
            hasValidChars &&
            password.length <= 100;

        return {
            hasMinLength,
            hasNumber,
            hasUpper,
            hasLower,
            noSpaces,
            hasValidChars,
            isComplete
        };
    }

    /**
     * Valida los requisitos de seguridad de la contraseña según el contexto (nuevo registro vs login).
     * @param {string} password
     * @param {object} [options]
     * @param {boolean} [options.isNewPassword=false]
     * @returns {{ valid: boolean, error?: string }}
     */
    function validatePassword(password, options = {}) {
        if (!password || typeof password !== 'string') {
            return { valid: false, error: 'Por favor ingresa tu contraseña.' };
        }

        // Prevenir inyección de bytes nulos o caracteres de control ASCII
        if (/[\x00-\x1F\x7F]/.test(password)) {
            return {
                valid: false,
                error: 'La contraseña contiene caracteres de control o códigos no válidos.'
            };
        }

        const isNew = options.isNewPassword === true;

        if (isNew) {
            if (/\s/.test(password)) {
                return { valid: false, error: 'La contraseña no debe contener espacios en blanco.' };
            }

            if (password.length < 8) {
                return { valid: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
            }

            if (password.length > 100) {
                return { valid: false, error: 'La contraseña no puede exceder los 100 caracteres.' };
            }

            if (!/[A-Z]/.test(password)) {
                return {
                    valid: false,
                    error: 'La contraseña debe incluir al menos una letra mayúscula (A-Z).'
                };
            }

            if (!/[a-z]/.test(password)) {
                return {
                    valid: false,
                    error: 'La contraseña debe incluir al menos una letra minúscula (a-z).'
                };
            }

            if (!/\d/.test(password)) {
                return {
                    valid: false,
                    error: 'La contraseña debe incluir al menos un número (0-9).'
                };
            }

            const validCharsRegex = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]+$/;
            if (!validCharsRegex.test(password)) {
                return {
                    valid: false,
                    error: 'La contraseña contiene símbolos no permitidos. Usa letras, números y símbolos comunes.'
                };
            }

            return { valid: true };
        }

        // Modo login: verificación mínima sin romper acceso a cuentas preexistentes
        if (password.length < 6) {
            return { valid: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
        }

        return { valid: true };
    }

    /**
     * Valida que el nombre de usuario sea válido, tenga entre 2 y 60 caracteres
     * y no contenga caracteres de inyección, scripts o etiquetas HTML.
     * @param {string} name
     * @returns {{ valid: boolean, error?: string }}
     */
    function validateName(name) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return { valid: false, error: 'Por favor ingresa tu nombre completo o apodo.' };
        }
        const trimmed = name.trim();
        if (trimmed.length < 2) {
            return { valid: false, error: 'El nombre debe tener al menos 2 caracteres.' };
        }
        if (trimmed.length > 60) {
            return { valid: false, error: 'El nombre no puede exceder los 60 caracteres.' };
        }

        // Prevenir inyección de scripts HTML (<, >, ;, {, }, $, etc.), barras y códigos de control
        if (/[\x00-\x1F\x7F<>{};$`\\]/.test(trimmed)) {
            return { valid: false, error: 'El nombre contiene caracteres o códigos no permitidos.' };
        }

        // Permitir letras (alfabéticos latinos, acentos, diacríticos), espacios, puntos, guiones y apóstrofes
        const nameRegex = /^[\p{L}\s.'-]+$/u;
        if (!nameRegex.test(trimmed)) {
            return {
                valid: false,
                error: 'El nombre solo puede contener letras, espacios, puntos o guiones.'
            };
        }

        return { valid: true };
    }

    /**
     * Valida que un código OTP sea un número de entre 6 y 8 dígitos válido.
     * Supabase Auth envía códigos numéricos de 8 dígitos para registro con confirmación activa.
     * @param {string} token
     * @returns {{ valid: boolean, error?: string }}
     */
    function validateOtpToken(token) {
        if (!token || typeof token !== 'string') {
            return { valid: false, error: 'Por favor ingresa el código de verificación.' };
        }
        const clean = token.trim();
        if (clean.length < 6 || clean.length > 8) {
            return { valid: false, error: 'El código de verificación debe tener entre 6 y 8 dígitos.' };
        }
        if (!/^\d{6,8}$/.test(clean)) {
            return { valid: false, error: 'El código debe contener únicamente números.' };
        }
        return { valid: true };
    }

    /**
     * Valida de forma integral el formulario de autenticación (Login o Registro).
     * @param {object} params
     * @param {string} params.email
     * @param {string} params.password
     * @param {boolean} params.isRegister
     * @param {string} [params.name]
     * @param {string} [params.confirmPassword]
     * @returns {{ valid: boolean, error?: string }}
     */
    function validateAuthForm(params) {
        const { email, password, isRegister, name, confirmPassword } = params || {};

        if (isRegister) {
            if (!name || name.trim().length === 0) {
                return { valid: false, error: 'Por favor ingresa tu nombre completo.' };
            }
            const nameValidation = validateName(name);
            if (!nameValidation.valid) {
                return nameValidation;
            }
        }

        if (!email || email.trim().length === 0) {
            return { valid: false, error: 'Por favor ingresa tu correo electrónico.' };
        }

        if (!validateEmail(email)) {
            return { valid: false, error: 'El formato de correo electrónico ingresado no es válido.' };
        }

        if (isRegister && isDisposableEmail(email)) {
            return {
                valid: false,
                error: 'No se permiten registros con proveedores de correo electrónico desechable o temporal.'
            };
        }

        const pwdValidation = validatePassword(password, { isNewPassword: !!isRegister });
        if (!pwdValidation.valid) {
            return pwdValidation;
        }

        if (isRegister && confirmPassword !== undefined) {
            if (!confirmPassword || confirmPassword.length === 0) {
                return { valid: false, error: 'Por favor confirma tu contraseña.' };
            }
            if (password !== confirmPassword) {
                return { valid: false, error: 'Las contraseñas no coinciden. Por favor verifícalas.' };
            }
        }

        return { valid: true };
    }

    return {
        DISPOSABLE_EMAIL_DOMAINS,
        COMMON_DOMAIN_TYPOS,
        isDisposableEmail,
        validateEmail,
        suggestEmailDomain,
        evaluatePasswordRules,
        validatePassword,
        validateName,
        validateOtpToken,
        validateAuthForm
    };
}));
