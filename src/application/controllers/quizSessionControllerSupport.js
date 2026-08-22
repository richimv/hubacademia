const ERROR_RESPONSES = {
    INVALID_QUIZ_SESSION_ID: [400, 'Identificador de sesión inválido.'],
    INVALID_OPTION_INDEX: [400, 'La opción seleccionada no es válida.'],
    QUIZ_QUESTIONS_REQUIRED: [422, 'No hay preguntas válidas para iniciar la sesión.'],
    INVALID_QUIZ_QUESTION: [422, 'El banco devolvió una pregunta inválida.'],
    QUIZ_SESSION_FORBIDDEN: [403, 'La sesión no pertenece al usuario actual.'],
    QUIZ_SESSION_NOT_FOUND: [404, 'La sesión del simulador no existe.'],
    QUIZ_QUESTION_NOT_FOUND: [404, 'La pregunta no pertenece a esta sesión.'],
    QUIZ_SESSION_EXPIRED: [410, 'La sesión del simulador expiró. Inicia un nuevo intento.'],
    QUIZ_SESSION_CLOSED: [409, 'La sesión del simulador ya fue cerrada.']
};

function secureQuizSessionsEnabled() {
    return String(process.env.SECURE_QUIZ_SESSIONS_ENABLED || '').toLowerCase() === 'true';
}

function sendQuizSessionError(res, error) {
    const mapped = ERROR_RESPONSES[error?.code || error?.message];
    if (!mapped) return false;
    res.status(mapped[0]).json({ success: false, error: mapped[1], code: error.code || error.message });
    return true;
}

module.exports = { secureQuizSessionsEnabled, sendQuizSessionError };
