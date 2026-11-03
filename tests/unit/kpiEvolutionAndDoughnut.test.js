/**
 * Tests for KPI Evolution Chart Score Categorization and Doughnut Chart Block Distribution
 */

describe('KPI Evolution & Doughnut Chart Aggregation', () => {

    describe('Evolution Chart Score Categorization by Mode', () => {
        const mockRawEvolutionData = [
            { date_label: '03/08', score_20: '12.0', total_questions: 10 },
            { date_label: '03/08', score_20: '14.0', total_questions: 12 },
            { date_label: '10/08', score_20: '16.0', total_questions: 20 },
            { date_label: '15/08', score_20: '15.5', total_questions: 22 },
            { date_label: '22/08', score_20: '17.0', total_questions: 60 },
            { date_label: '25/08', score_20: '18.0', total_questions: 100 }
        ];

        it('should correctly classify tests <= 15 questions as scores10 (Modo Rápido)', () => {
            const scores10 = mockRawEvolutionData.map(d => (d.total_questions <= 15) ? parseFloat(d.score_20).toFixed(1) : null);
            expect(scores10).toEqual(['12.0', '14.0', null, null, null, null]);
        });

        it('should correctly classify tests between 16 and 49 questions as scores20 (Modo Estudio)', () => {
            const scores20 = mockRawEvolutionData.map(d => (d.total_questions > 15 && d.total_questions < 50) ? parseFloat(d.score_20).toFixed(1) : null);
            expect(scores20).toEqual([null, null, '16.0', '15.5', null, null]);
        });

        it('should only classify tests >= 50 questions as scoresReal (Simulacros Reales)', () => {
            const scoresReal = mockRawEvolutionData.map(d => (d.total_questions >= 50) ? parseFloat(d.score_20).toFixed(1) : null);
            expect(scoresReal).toEqual([null, null, null, null, '17.0', '18.0']);
        });

        it('should correctly calculate vigesimal scores (0-20) for 3/10, 7/10, and 45/60', () => {
            const rawAttempts = [
                { score: 3, total_questions: 10 },
                { score: 7, total_questions: 10 },
                { score: 45, total_questions: 60 }
            ];

            const computedScores = rawAttempts.map(a => {
                const score20 = (a.score / a.total_questions) * 20;
                return score20.toFixed(1);
            });

            expect(computedScores).toEqual(['6.0', '14.0', '15.0']);
        });
    });

    describe('Doughnut Chart Distribution by Practiced Areas/Topics', () => {
        function mapRadarDataToAreas(radarData) {
            const doughnutData = {};
            radarData.forEach(d => {
                let cleanSubject = d.subject || 'General';
                if (cleanSubject.includes(',')) cleanSubject = cleanSubject.split(',')[0].trim();
                const totalCount = parseInt(d.total || 0, 10);
                if (totalCount > 0) {
                    doughnutData[cleanSubject] = (doughnutData[cleanSubject] || 0) + totalCount;
                }
            });
            return doughnutData;
        }

        it('should directly aggregate questions by their real practiced topics/areas in Education', () => {
            const mockEducationRadarData = [
                { subject: 'Enfoque por competencias', total: 5, correct: 4 },
                { subject: 'Constructivismo y socioconstructivismo', total: 6, correct: 5 },
                { subject: 'Planificación pedagógica', total: 8, correct: 7 }
            ];

            const result = mapRadarDataToAreas(mockEducationRadarData);

            expect(result).toEqual({
                'Enfoque por competencias': 5,
                'Constructivismo y socioconstructivismo': 6,
                'Planificación pedagógica': 8
            });
        });

        it('should directly aggregate questions by their real practiced topics/areas in Health (SERUMS)', () => {
            const mockHealthRadarData = [
                { subject: 'Salud Pública', total: 10, correct: 8 },
                { subject: 'Cuidado Integral de Salud', total: 12, correct: 9 },
                { subject: 'Ética e Interculturalidad', total: 6, correct: 5 }
            ];

            const result = mapRadarDataToAreas(mockHealthRadarData);

            expect(result).toEqual({
                'Salud Pública': 10,
                'Cuidado Integral de Salud': 12,
                'Ética e Interculturalidad': 6
            });
        });
    });
});