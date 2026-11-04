const rateLimit = require('express-rate-limit');

/**
 * Limitador global para la mayoría de las rutas de la API.
 * Permite un número razonable de peticiones para el uso normal de la aplicación.
 */
const globalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // Flexible para desarrollo y producción
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        const ip = req.ip || req.connection?.remoteAddress || '';
        return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || req.hostname === 'localhost';
    },
    message: { error: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo después de 15 minutos.' }
});

/**
 * Limitador para las rutas de autenticación (/auth/sync).
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 intentos por IP cada 15 minutos
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        const ip = req.ip || req.connection?.remoteAddress || '';
        return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || req.hostname === 'localhost';
    },
    message: { error: 'Demasiados intentos de autenticación desde esta IP, por favor intente de nuevo después de 5 minutos.' }
});

// Public support consumes provider quota, not academic credits. Memory store is per instance.
const platformSupportLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 12,
    standardHeaders: true,
    legacyHeaders: false,
    skip: req => ['quiz_tutor', 'flashcard_tutor'].includes(req.body?.context?.type),
    message: { error: 'Has enviado varias consultas seguidas. Espera un minuto para volver a escribir a Hubi.' }
});

module.exports = {
    platformSupportLimiter,
    globalApiLimiter,
    authLimiter
};
