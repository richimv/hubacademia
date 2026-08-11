/**
 * Configuración Centralizada de Límites de IA
 * Define las cuotas por cada plan (Free, Basic, Advanced).
 * Fuente de verdad única para el backend y frontend.
 */
const LIMITS = {
    free: {
        chat_standard: 5,
        daily_rag_limit: 0,
        monthly_flashcards: 0,
        simulator: 0,
        batch_import: 0
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

module.exports = { LIMITS };
