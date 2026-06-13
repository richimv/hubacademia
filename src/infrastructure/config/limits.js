/**
 * Configuración Centralizada de Límites de IA
 * Define las cuotas por cada plan (Free, Basic, Advanced).
 * Fuente de verdad única para el backend y frontend.
 */
const LIMITS = {
    free: {
        chat_standard: 5,
        monthly_flashcards: 1,
        simulator: 0,
        batch_import: 1,
        audio_assistant: 5,
        self_evaluation: 15
    },
    basic: {
        chat_standard: 50,
        monthly_flashcards: 10,
        simulator: 15,
        batch_import: 10,
        audio_assistant: 50,
        self_evaluation: 15
    },
    advanced: {
        chat_standard: 100,
        monthly_flashcards: 30,
        simulator: 50,
        batch_import: 10,
        audio_assistant: 100,
        self_evaluation: 15
    }
};

module.exports = { LIMITS };
