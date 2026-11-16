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

/**
 * Construye series clasificadas por modalidad (rápido, estudio, simulacro real) para evolución de puntajes.
 */
function buildQuizEvolutionChartData(data = []) {
    const safeData = Array.isArray(data) ? data : [];
    return {
        labels: safeData.map(d => d.date_label),
        scores10: safeData.map(d => (d.total_questions <= 15) ? parseFloat(d.score_20).toFixed(1) : null),
        scores20: safeData.map(d => (d.total_questions > 15 && d.total_questions < 50) ? parseFloat(d.score_20).toFixed(1) : null),
        scoresReal: safeData.map(d => (d.total_questions >= 50) ? parseFloat(d.score_20).toFixed(1) : null),
        scores: safeData.map(d => parseFloat(d.score_20).toFixed(1))
    };
}

/**
 * Construye un filtro temporal SQL seguro y acotado a enteros positivos [1..3650].
 */
function buildSafeTimeFilter(days) {
    if (days === undefined || days === null || days === '') return '';
    const parsed = Number.parseInt(days, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return '';
    const safeDays = Math.min(parsed, 3650);
    return ` AND created_at >= NOW() - INTERVAL '${safeDays} days'`;
}

function extractSeenIds(body = {}) {
    if (Array.isArray(body?.seenIds)) return body.seenIds;
    if (Array.isArray(body?.excludeIds)) return body.excludeIds;
    return [];
}

function parseDemoExcludeIds(rawExcludeIds) {
    if (typeof rawExcludeIds !== 'string' || !rawExcludeIds.trim()) return [];
    return rawExcludeIds.split(',').filter(id => id && id.length > 30);
}

function handleStartQuizError(res, error, domainLabel = 'Simulador') {
    console.error(`❌ [Error] startQuiz (${domainLabel}):`, error);
    if (sendQuizSessionError(res, error)) return;
    if (error?.cause) {
        console.error('🔍 [Causa Original]:', error.cause);
    }

    if (error?.message === 'AI_REPLENISHMENT_FAILED' || error?.message === 'AI_GENERATION_EMPTY') {
        return res.status(500).json({
            success: false,
            error: 'Hubo un problema técnico al generar nuevas preguntas de IA. Por favor, intenta de nuevo en unos segundos.',
            technicalError: true
        });
    }

    if (error?.message === 'BANK_EXHAUSTED_AND_IA_FAILED') {
        return res.status(404).json({
            success: false,
            error: 'Has completado todas las preguntas disponibles para este tema.',
            noQuestions: true
        });
    }

    return res.status(500).json({ success: false, error: 'Error interno al iniciar el simulador.' });
}

module.exports = {
    secureQuizSessionsEnabled,
    sendQuizSessionError,
    buildQuizEvolutionChartData,
    buildSafeTimeFilter,
    extractSeenIds,
    parseDemoExcludeIds,
    handleStartQuizError
};
