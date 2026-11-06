const mineduScoringService = require('./mineduScoringService');

const bounded = (value, max) => Math.min(max, Math.max(0, Number(value) || 0));

/** Education has global results, not reliable thematic classifications. */
function generateEducationDiagnostic(stats = {}) {
    const accuracy = bounded(stats.accuracy, 100);
    const avgScore = bounded(stats.avg_score, 20);
    const hasCount = stats.total_questions !== undefined;
    const total = hasCount ? bounded(stats.total_questions, Number.MAX_SAFE_INTEGER) : null;
    const hasHistory = hasCount ? total > 0 : accuracy > 0 || avgScore > 0;
    const target = stats.target || 'ASCENSO';
    const score90 = total > 0 && stats.total_correct !== undefined
        ? mineduScoringService.calculateMineduScore(stats.total_correct, total)
        : bounded(stats.minedu_score ?? avgScore * 4.5, 90);
    const evaluation = hasHistory && target === 'ASCENSO'
        ? mineduScoringService.evaluateScaleStatus(score90, stats.targetScale || 2)
        : null;

    let strengths = hasHistory
        ? `<p>Tu precisión global es <strong>${accuracy}%</strong> y tu nota promedio es <strong>${avgScore.toFixed(1)} / 20</strong>${total !== null ? ` en ${total} preguntas` : ''}.</p>`
        : '<p>Aún no hay resultados registrados para estimar tu rendimiento en la Carrera Pública Magisterial.</p>';
    let weaknesses = hasHistory
        ? '<p>Revisa las respuestas incorrectas y omitidas. Sin clasificación temática no es posible atribuir fortalezas o dificultades a un eje pedagógico concreto.</p>'
        : '<p>Completa una práctica para establecer tu punto de partida. La ausencia de datos no significa un desempeño bajo.</p>';
    let strategy = hasHistory
        ? 'Revisa tus errores en modo estudio, consulta al Tutor IA y conserva las conclusiones en Notas. Compara tu precisión en las siguientes sesiones.'
        : 'Inicia con un simulacro rápido de 10 preguntas y revisa tus resultados antes de continuar en modo estudio.';

    if (evaluation) {
        const reference = `${evaluation.targetScaleName}: ${evaluation.mineduScore.toFixed(1)} / 90 frente a ${evaluation.minPointsRequired} puntos de referencia`;
        if (evaluation.passed) strengths += `<p><strong>Proyección de práctica — ${reference}</strong>.</p>`;
        else weaknesses += `<p><strong>Brecha para Ascenso — ${evaluation.targetScaleName}:</strong> ${Math.abs(evaluation.gapPoints).toFixed(1)} pts respecto al corte configurado.</p>`;
        strategy += ` Para la ${evaluation.targetScaleName}, contrasta esta proyección con un simulacro completo de 60 preguntas; no garantiza el resultado de la prueba oficial.`;
    }

    return {
        source: 'heuristic',
        hasHistory,
        strengths,
        weaknesses,
        strategy,
        readinessIndex: hasHistory ? Math.round(accuracy) : 0,
        readinessLevel: !hasHistory ? 'Sin historial' : accuracy >= 80 ? 'Nivel Sobresaliente' : accuracy >= 65 ? 'Nivel Competente' : 'Nivel en Desarrollo',
        sprint: [
            { step: 1, title: 'Revisa tus resultados', desc: hasHistory ? 'Identifica las respuestas incorrectas y omitidas de tu última práctica.' : 'Resuelve una práctica breve para obtener resultados propios.' },
            { step: 2, title: 'Profundiza con el Tutor IA', desc: 'Usa la explicación cuando esté disponible y consulta tus dudas. Guarda lo útil en Notas.' },
            { step: 3, title: 'Compara tu progreso', desc: 'Repite una sesión del mismo modo y compara nota y precisión, sin inferir dominio por ejes.' }
        ],
        ...(evaluation ? { mineduEvaluation: evaluation } : {})
    };
}

module.exports = { generateEducationDiagnostic };
