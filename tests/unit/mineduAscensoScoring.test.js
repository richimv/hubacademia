/**
 * Tests for MINEDU Ascenso de Escala Magisterial Scoring Service
 * Validates Base 90 scoring, scale cutoffs (Escalas 2-8), dynamic thresholds, and evaluation logic.
 */

const mineduScoringService = require('../../src/domain/services/mineduScoringService');

describe('MINEDU Ascenso de Escala Magisterial Scoring Service', () => {

    describe('Scale Cutoffs and Scale Ladder (Escalas 2 a 8)', () => {
        it('should return exactly 7 scales from Escala 2 to Escala 8', () => {
            const ladder = mineduScoringService.getScaleLadder();
            expect(ladder).toHaveLength(7);
            expect(ladder.map(s => s.scale)).toEqual([2, 3, 4, 5, 6, 7, 8]);
        });

        it('should have exact official MINEDU cutoffs and vigesimal equivalents', () => {
            const expectedCutoffs = {
                2: { minPoints: 54, minCorrect: 36, vigesimalEquivalent: 12.0 },
                3: { minPoints: 57, minCorrect: 38, vigesimalEquivalent: 12.7 },
                4: { minPoints: 60, minCorrect: 40, vigesimalEquivalent: 13.3 },
                5: { minPoints: 63, minCorrect: 42, vigesimalEquivalent: 14.0 },
                6: { minPoints: 66, minCorrect: 44, vigesimalEquivalent: 14.7 },
                7: { minPoints: 69, minCorrect: 46, vigesimalEquivalent: 15.3 },
                8: { minPoints: 69, minCorrect: 46, vigesimalEquivalent: 15.3 }
            };

            for (const [scaleStr, expected] of Object.entries(expectedCutoffs)) {
                const scale = parseInt(scaleStr, 10);
                const cutoff = mineduScoringService.getScaleCutoff(scale);
                expect(cutoff.minPoints).toBe(expected.minPoints);
                expect(cutoff.minCorrect).toBe(expected.minCorrect);
                expect(cutoff.vigesimalEquivalent).toBeCloseTo(expected.vigesimalEquivalent, 1);
                expect(cutoff.maxPoints).toBe(90);
                expect(cutoff.totalQuestions).toBe(60);
            }
        });

        it('should handle edge cases and fallbacks for getScaleCutoff', () => {
            // Numbers out of range or invalid
            expect(mineduScoringService.getScaleCutoff(1).scale).toBe(2);
            expect(mineduScoringService.getScaleCutoff(0).scale).toBe(2);
            expect(mineduScoringService.getScaleCutoff(-5).scale).toBe(2);
            expect(mineduScoringService.getScaleCutoff(9).scale).toBe(8);
            expect(mineduScoringService.getScaleCutoff(99).scale).toBe(8);
            expect(mineduScoringService.getScaleCutoff(null).scale).toBe(2);
            expect(mineduScoringService.getScaleCutoff(undefined).scale).toBe(2);
            expect(mineduScoringService.getScaleCutoff('invalid').scale).toBe(2);

            // String parsing
            expect(mineduScoringService.getScaleCutoff('5').scale).toBe(5);
            expect(mineduScoringService.getScaleCutoff('7').scale).toBe(7);
        });
    });

    describe('calculateMineduScore (Base 90 Calculation)', () => {
        it('should calculate accurate scores for official 60-question exams (1.5 pts per correct answer)', () => {
            expect(mineduScoringService.calculateMineduScore(0, 60)).toBe(0);
            expect(mineduScoringService.calculateMineduScore(36, 60)).toBe(54.0);
            expect(mineduScoringService.calculateMineduScore(38, 60)).toBe(57.0);
            expect(mineduScoringService.calculateMineduScore(40, 60)).toBe(60.0);
            expect(mineduScoringService.calculateMineduScore(42, 60)).toBe(63.0);
            expect(mineduScoringService.calculateMineduScore(44, 60)).toBe(66.0);
            expect(mineduScoringService.calculateMineduScore(46, 60)).toBe(69.0);
            expect(mineduScoringService.calculateMineduScore(60, 60)).toBe(90.0);
        });

        it('should proportionally calculate Base 90 score for 10-question practice quizzes', () => {
            // 6 correct out of 10 = 60% = 54.0 points (Escala 2 cutoff)
            expect(mineduScoringService.calculateMineduScore(6, 10)).toBe(54.0);
            // 10 correct out of 10 = 100% = 90.0 points
            expect(mineduScoringService.calculateMineduScore(10, 10)).toBe(90.0);
            // 7 correct out of 10 = 70% = 63.0 points (Escala 5 cutoff)
            expect(mineduScoringService.calculateMineduScore(7, 10)).toBe(63.0);
            // 5 correct out of 10 = 50% = 45.0 points
            expect(mineduScoringService.calculateMineduScore(5, 10)).toBe(45.0);
        });

        it('should proportionally calculate Base 90 score for 20-question study mode quizzes', () => {
            // 12 correct out of 20 = 60% = 54.0 points
            expect(mineduScoringService.calculateMineduScore(12, 20)).toBe(54.0);
            // 14 correct out of 20 = 70% = 63.0 points
            expect(mineduScoringService.calculateMineduScore(14, 20)).toBe(63.0);
            // 20 correct out of 20 = 100% = 90.0 points
            expect(mineduScoringService.calculateMineduScore(20, 20)).toBe(90.0);
        });

        it('should safely handle boundary, null, and clamped conditions', () => {
            expect(mineduScoringService.calculateMineduScore(0, 0)).toBe(0);
            expect(mineduScoringService.calculateMineduScore(-5, 60)).toBe(0);
            expect(mineduScoringService.calculateMineduScore(null, 60)).toBe(0);
            expect(mineduScoringService.calculateMineduScore(undefined, 60)).toBe(0);
            expect(mineduScoringService.calculateMineduScore('abc', 60)).toBe(0);
            expect(mineduScoringService.calculateMineduScore(10, 0)).toBe(0);

            // Clamping: if correctAnswers exceeds totalQuestions
            expect(mineduScoringService.calculateMineduScore(70, 60)).toBe(90.0);
        });
    });

    describe('evaluateScaleStatus (Aprobación, Brecha y Escala Alcanzada)', () => {
        it('should evaluate passing when score meets exact cutoff', () => {
            const result = mineduScoringService.evaluateScaleStatus(54.0, 2);
            expect(result.passed).toBe(true);
            expect(result.targetScale).toBe(2);
            expect(result.minPointsRequired).toBe(54);
            expect(result.gapPoints).toBe(0);
            expect(result.achievedScale).toBe(2);
            expect(result.achievedScaleName).toBe('2.ª Escala');
            expect(result.message).toContain('Alcanzaste con exactitud');
        });

        it('should evaluate passing with surplus points and determine higher achieved scale', () => {
            // Target is Escala 3 (57 pts), but user scored 65.0 pts (achieving Escala 5: 63 pts)
            const result = mineduScoringService.evaluateScaleStatus(65.0, 3);
            expect(result.passed).toBe(true);
            expect(result.targetScale).toBe(3);
            expect(result.minPointsRequired).toBe(57);
            expect(result.gapPoints).toBe(8.0);
            expect(result.achievedScale).toBe(5);
            expect(result.achievedScaleName).toBe('5.ª Escala');
            expect(result.message).toContain('+8.0 pts');
        });

        it('should evaluate failing when score is below cutoff and indicate points needed', () => {
            // Target is Escala 4 (60 pts), user scored 51.0 pts
            const result = mineduScoringService.evaluateScaleStatus(51.0, 4);
            expect(result.passed).toBe(false);
            expect(result.targetScale).toBe(4);
            expect(result.minPointsRequired).toBe(60);
            expect(result.gapPoints).toBe(-9.0);
            expect(result.achievedScale).toBeNull();
            expect(result.achievedScaleName).toBeNull();
            expect(result.message).toContain('Te faltaron 9.0 pts');
        });

        it('should handle highest scale achieved (Escala 8)', () => {
            // Target is Escala 8 (69 pts), user scored 75.0 pts
            const result = mineduScoringService.evaluateScaleStatus(75.0, 8);
            expect(result.passed).toBe(true);
            expect(result.targetScale).toBe(8);
            expect(result.achievedScale).toBe(8);
            expect(result.achievedScaleName).toBe('8.ª Escala');
        });
    });
});
