const {
    isDisposableEmail,
    validateEmail,
    suggestEmailDomain,
    evaluatePasswordRules,
    validatePassword,
    validateName,
    validateOtpToken,
    validateAuthForm,
    DISPOSABLE_EMAIL_DOMAINS
} = require('../../src/presentation/public/js/utils/authValidation');

describe('AuthValidation Utility Suite', () => {
    describe('isDisposableEmail', () => {
        test('identifies disposable domains correctly', () => {
            expect(isDisposableEmail('test@tempmail.com')).toBe(true);
            expect(isDisposableEmail('student@10minutemail.com')).toBe(true);
            expect(isDisposableEmail('attacker@guerrillamail.com')).toBe(true);
            expect(isDisposableEmail('user@yopmail.com')).toBe(true);
            expect(isDisposableEmail('bot@mailinator.com')).toBe(true);
        });

        test('allows legitimate email domains', () => {
            expect(isDisposableEmail('ricardo@gmail.com')).toBe(false);
            expect(isDisposableEmail('doctor@hotmail.com')).toBe(false);
            expect(isDisposableEmail('profesor@outlook.com')).toBe(false);
            expect(isDisposableEmail('postulante@yahoo.es')).toBe(false);
            expect(isDisposableEmail('estudiante@upch.pe')).toBe(false);
            expect(isDisposableEmail('medico@minsa.gob.pe')).toBe(false);
        });

        test('handles invalid inputs gracefully', () => {
            expect(isDisposableEmail('')).toBe(false);
            expect(isDisposableEmail(null)).toBe(false);
            expect(isDisposableEmail(undefined)).toBe(false);
            expect(isDisposableEmail('invalid-email-format')).toBe(false);
        });
    });

    describe('validateEmail', () => {
        test('accepts valid RFC emails', () => {
            expect(validateEmail('test@example.com')).toBe(true);
            expect(validateEmail('ricardo.villa@gmail.com')).toBe(true);
            expect(validateEmail('user+tag@domain.co.uk')).toBe(true);
        });

        test('rejects invalid email formats', () => {
            expect(validateEmail('plainaddress')).toBe(false);
            expect(validateEmail('@missingusername.com')).toBe(false);
            expect(validateEmail('username@.com')).toBe(false);
            expect(validateEmail('user@domain')).toBe(false);
            expect(validateEmail('user with space@domain.com')).toBe(false);
            expect(validateEmail('')).toBe(false);
            expect(validateEmail(null)).toBe(false);
        });

        test('rejects emails with control characters or newlines', () => {
            expect(validateEmail('user\n@domain.com')).toBe(false);
            expect(validateEmail('user\x00@domain.com')).toBe(false);
        });
    });

    describe('suggestEmailDomain', () => {
        test('suggests corrected domains for common typos', () => {
            expect(suggestEmailDomain('juan@gmil.com')).toBe('juan@gmail.com');
            expect(suggestEmailDomain('maria@gmai.com')).toBe('maria@gmail.com');
            expect(suggestEmailDomain('carlos@hotmial.com')).toBe('carlos@hotmail.com');
            expect(suggestEmailDomain('ana@outlok.com')).toBe('ana@outlook.com');
            expect(suggestEmailDomain('pedro@yaho.com')).toBe('pedro@yahoo.com');
        });

        test('returns null for correct domains or unknown domains', () => {
            expect(suggestEmailDomain('juan@gmail.com')).toBe(null);
            expect(suggestEmailDomain('maria@outlook.com')).toBe(null);
            expect(suggestEmailDomain('doctor@hospital.org')).toBe(null);
            expect(suggestEmailDomain(null)).toBe(null);
        });
    });

    describe('evaluatePasswordRules', () => {
        test('evaluates incomplete passwords correctly', () => {
            const result = evaluatePasswordRules('short');
            expect(result.hasMinLength).toBe(false);
            expect(result.hasNumber).toBe(false);
            expect(result.hasUpper).toBe(false);
            expect(result.hasLower).toBe(true);
            expect(result.noSpaces).toBe(true);
            expect(result.isComplete).toBe(false);
        });

        test('evaluates valid compliant passwords', () => {
            const result = evaluatePasswordRules('Medicina2026!');
            expect(result.hasMinLength).toBe(true);
            expect(result.hasNumber).toBe(true);
            expect(result.hasUpper).toBe(true);
            expect(result.hasLower).toBe(true);
            expect(result.noSpaces).toBe(true);
            expect(result.hasValidChars).toBe(true);
            expect(result.isComplete).toBe(true);
        });

        test('detects spaces in password', () => {
            const result = evaluatePasswordRules('Medicina 2026!');
            expect(result.noSpaces).toBe(false);
            expect(result.isComplete).toBe(false);
        });
    });

    describe('validatePassword', () => {
        test('login mode allows standard passwords (min 6 chars)', () => {
            expect(validatePassword('secret').valid).toBe(true);
            expect(validatePassword('12345').valid).toBe(false);
            expect(validatePassword('12345').error).toContain('al menos 6 caracteres');
        });

        test('register mode (isNewPassword: true) enforces strong rules', () => {
            // Missing number
            expect(validatePassword('PasswordSecure', { isNewPassword: true }).valid).toBe(false);
            // Missing uppercase
            expect(validatePassword('password123', { isNewPassword: true }).valid).toBe(false);
            // Missing lowercase
            expect(validatePassword('PASSWORD123', { isNewPassword: true }).valid).toBe(false);
            // Too short
            expect(validatePassword('Pass1', { isNewPassword: true }).valid).toBe(false);
            // Has spaces
            expect(validatePassword('Pass 12345', { isNewPassword: true }).valid).toBe(false);
            // Valid strong password
            expect(validatePassword('Educacion2026*', { isNewPassword: true }).valid).toBe(true);
        });

        test('rejects control characters in any mode', () => {
            expect(validatePassword('pass\x00word').valid).toBe(false);
            expect(validatePassword('pass\x1Fword', { isNewPassword: true }).valid).toBe(false);
        });
    });

    describe('validateName', () => {
        test('accepts valid Spanish names and accents', () => {
            expect(validateName('Ricardo Villa').valid).toBe(true);
            expect(validateName('María José Peña-Gómez').valid).toBe(true);
            expect(validateName('Dr. Carlos O\'Connor').valid).toBe(true);
        });

        test('rejects names with script injection or HTML tags', () => {
            expect(validateName('<script>alert(1)</script>').valid).toBe(false);
            expect(validateName('Robert"; DROP TABLE users;--').valid).toBe(false);
            expect(validateName('Carlos {admin}').valid).toBe(false);
        });

        test('enforces length boundaries (2 to 60 chars)', () => {
            expect(validateName('A').valid).toBe(false);
            expect(validateName('A'.repeat(61)).valid).toBe(false);
            expect(validateName('Al').valid).toBe(true);
        });
    });

    describe('validateOtpToken', () => {
        test('accepts valid 6, 7 and 8-digit OTP codes', () => {
            expect(validateOtpToken('123456').valid).toBe(true);
            expect(validateOtpToken('1234567').valid).toBe(true);
            expect(validateOtpToken('12345678').valid).toBe(true);
        });

        test('rejects non-numeric or malformed tokens', () => {
            expect(validateOtpToken('12345').valid).toBe(false);
            expect(validateOtpToken('123456789').valid).toBe(false);
            expect(validateOtpToken('12345a').valid).toBe(false);
            expect(validateOtpToken('abcdefgh').valid).toBe(false);
            expect(validateOtpToken('').valid).toBe(false);
            expect(validateOtpToken(null).valid).toBe(false);
        });
    });

    describe('validateAuthForm', () => {
        test('validates full registration form successfully', () => {
            const res = validateAuthForm({
                isRegister: true,
                name: 'Carlos Mendoza',
                email: 'carlos@gmail.com',
                password: 'ClaveSegura2026!',
                confirmPassword: 'ClaveSegura2026!'
            });
            expect(res.valid).toBe(true);
        });

        test('detects password mismatch in registration', () => {
            const res = validateAuthForm({
                isRegister: true,
                name: 'Carlos Mendoza',
                email: 'carlos@gmail.com',
                password: 'ClaveSegura2026!',
                confirmPassword: 'DifferentPassword123!'
            });
            expect(res.valid).toBe(false);
            expect(res.error).toContain('Las contraseñas no coinciden');
        });

        test('blocks disposable emails during registration', () => {
            const res = validateAuthForm({
                isRegister: true,
                name: 'Fake User',
                email: 'fake@tempmail.com',
                password: 'ClaveSegura2026!',
                confirmPassword: 'ClaveSegura2026!'
            });
            expect(res.valid).toBe(false);
            expect(res.error).toContain('proveedores de correo electrónico desechable');
        });

        test('validates login form successfully', () => {
            const res = validateAuthForm({
                isRegister: false,
                email: 'estudiante@hubacademia.com',
                password: 'password123'
            });
            expect(res.valid).toBe(true);
        });
    });
});
