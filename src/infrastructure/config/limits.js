/**
 * Configuración Centralizada de Límites de IA y Políticas de Consumo
 * Define las cuotas por cada plan (Free, Basic, Advanced) y la política freemium.
 * Fuente de verdad única para el backend y frontend.
 */

const FREE_PLAN_CONFIG = Object.freeze({
    RENEWAL_INTERVAL_DAYS: 30, // Renovación mensual (cada 30 días) para maximizar conversión a planes pagos
    MAX_LIVES: 10
});

const LIMITS = {
    free: {
        chat_standard: 5,
        daily_rag_limit: 0,
        monthly_flashcards: 0,
        simulator: 0,
        batch_import: 0,
        max_free_limit: FREE_PLAN_CONFIG.MAX_LIVES,
        free_renewal_interval_days: FREE_PLAN_CONFIG.RENEWAL_INTERVAL_DAYS
    },
    basic: {
        chat_standard: 50,
        daily_rag_limit: 0,
        monthly_flashcards: 0,
        simulator: 15,
        batch_import: 3
    },
    advanced: {
        chat_standard: 100,
        daily_rag_limit: 25,
        monthly_flashcards: 30,
        simulator: 50,
        batch_import: 10
    }
};

module.exports = {
    LIMITS,
    FREE_PLAN_CONFIG
};
