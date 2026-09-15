/**
 * @file mineduScoringService.js
 * @description Servicio puro de dominio para el cálculo oficial del concurso de 
 * Ascenso de Escala Magisterial del MINEDU (Prueba Nacional - Base 90 puntos).
 * 
 * Reglas Oficiales MINEDU:
 * - Total de preguntas: 60 (casuística pedagógica y especialidad)
 * - Puntaje por respuesta correcta: 1.5 puntos
 * - Puntaje por respuesta incorrecta o no respondida: 0 puntos
 * - Puntaje máximo posible: 90 puntos
 * 
 * Puntajes mínimos requeridos por Escala:
 * - 2.ª Escala: 54 puntos (36 aciertos / equiv. 12.0/20)
 * - 3.ª Escala: 57 puntos (38 aciertos / equiv. 12.7/20)
 * - 4.ª Escala: 60 puntos (40 aciertos / equiv. 13.3/20)
 * - 5.ª Escala: 63 puntos (42 aciertos / equiv. 14.0/20)
 * - 6.ª Escala: 66 puntos (44 aciertos / equiv. 14.7/20)
 * - 7.ª Escala: 69 puntos (46 aciertos / equiv. 15.3/20)
 * - 8.ª Escala: 69 puntos (46 aciertos / equiv. 15.3/20)
 */

const MINEDU_SCALE_CUTOFFS = Object.freeze({
    2: { scale: 2, name: '2.ª Escala', minPoints: 54, minCorrect: 36, maxPoints: 90, totalQuestions: 60, vigesimalEquivalent: 12.0 },
    3: { scale: 3, name: '3.ª Escala', minPoints: 57, minCorrect: 38, maxPoints: 90, totalQuestions: 60, vigesimalEquivalent: 12.7 },
    4: { scale: 4, name: '4.ª Escala', minPoints: 60, minCorrect: 40, maxPoints: 90, totalQuestions: 60, vigesimalEquivalent: 13.3 },
    5: { scale: 5, name: '5.ª Escala', minPoints: 63, minCorrect: 42, maxPoints: 90, totalQuestions: 60, vigesimalEquivalent: 14.0 },
    6: { scale: 6, name: '6.ª Escala', minPoints: 66, minCorrect: 44, maxPoints: 90, totalQuestions: 60, vigesimalEquivalent: 14.7 },
    7: { scale: 7, name: '7.ª Escala', minPoints: 69, minCorrect: 46, maxPoints: 90, totalQuestions: 60, vigesimalEquivalent: 15.3 },
    8: { scale: 8, name: '8.ª Escala', minPoints: 69, minCorrect: 46, maxPoints: 90, totalQuestions: 60, vigesimalEquivalent: 15.3 }
});

class MineduScoringService {
    /**
     * Calcula la nota oficial sobre base 90 proporcionalmente al número de preguntas.
     * @param {number} correctAnswers - Número de aciertos
     * @param {number} totalQuestions - Total de preguntas evaluadas
     * @returns {number} Puntaje oficial redondeado a 1 decimal
     */
    calculateMineduScore(correctAnswers, totalQuestions) {
        const correct = Number(correctAnswers) || 0;
        const total = Number(totalQuestions) || 0;

        if (total <= 0 || correct <= 0) return 0;
        const validCorrect = Math.min(correct, total);

        const score90 = (validCorrect / total) * 90;
        return Math.round(score90 * 10) / 10;
    }

    /**
     * Obtiene la información oficial de corte para una escala específica.
     * @param {number|string} targetScale - Número de escala (2 a 8)
     * @returns {Object} Configuración y umbrales de la escala
     */
    getScaleCutoff(targetScale) {
        const scaleNum = parseInt(targetScale, 10);
        if (!scaleNum || isNaN(scaleNum) || scaleNum < 2) {
            return MINEDU_SCALE_CUTOFFS[2];
        }
        if (scaleNum > 8) {
            return MINEDU_SCALE_CUTOFFS[8];
        }
        return MINEDU_SCALE_CUTOFFS[scaleNum] || MINEDU_SCALE_CUTOFFS[2];
    }

    /**
     * Evalúa el rendimiento frente a la escala objetivo del docente.
     * @param {number} mineduScore - Puntaje obtenido sobre 90
     * @param {number|string} targetScale - Escala a la que aspira
     * @returns {Object} Diagnóstico de aprobación, brecha y escala alcanzada
     */
    evaluateScaleStatus(mineduScore, targetScale) {
        const cutoff = this.getScaleCutoff(targetScale);
        const score = Math.max(0, Number(mineduScore) || 0);
        const passed = score >= cutoff.minPoints;
        const gapPoints = Math.round((score - cutoff.minPoints) * 10) / 10;

        // Determinar la escala más alta alcanzada
        let achievedScale = null;
        let achievedScaleName = null;

        // Evaluamos de la más alta (8/7) a la más baja (2)
        for (let s = 8; s >= 2; s--) {
            if (score >= MINEDU_SCALE_CUTOFFS[s].minPoints) {
                achievedScale = s;
                achievedScaleName = MINEDU_SCALE_CUTOFFS[s].name;
                break;
            }
        }

        let message = '';
        if (passed) {
            if (gapPoints > 0) {
                message = `¡Superaste el mínimo de la ${cutoff.name} por +${gapPoints.toFixed(1)} pts!`;
            } else {
                message = `¡Alcanzaste con exactitud el puntaje mínimo de la ${cutoff.name}!`;
            }
        } else {
            const needed = Math.abs(gapPoints);
            message = `Te faltaron ${needed.toFixed(1)} pts para alcanzar el mínimo de la ${cutoff.name} (${cutoff.minPoints} pts).`;
        }

        return {
            passed,
            targetScale: cutoff.scale,
            targetScaleName: cutoff.name,
            minPointsRequired: cutoff.minPoints,
            vigesimalThreshold: cutoff.vigesimalEquivalent,
            mineduScore: score,
            gapPoints,
            achievedScale,
            achievedScaleName,
            message
        };
    }

    /**
     * Retorna la lista inmutable de todas las escalas para representación visual.
     * @returns {Array<Object>}
     */
    getScaleLadder() {
        return Object.values(MINEDU_SCALE_CUTOFFS);
    }
}

module.exports = new MineduScoringService();
