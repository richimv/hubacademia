/**
 * Tests for KPI Evolution Chart Score Categorization (Controllers) and Doughnut/Radar Aggregation (SimulatorDash)
 */

const docenteController = require('../../src/application/controllers/docenteController');
const medicoController = require('../../src/application/controllers/medicoController');
const docenteRepository = require('../../src/domain/repositories/docenteRepository');
const medicoRepository = require('../../src/domain/repositories/medicoRepository');
const { SimulatorDash } = require('../../src/presentation/public/js/simulator-dash');

jest.mock('../../src/domain/repositories/docenteRepository');
jest.mock('../../src/domain/repositories/medicoRepository');

describe('KPI Evolution & Doughnut Chart Aggregation (Real Modules)', () => {
    const mockRawEvolutionData = [
        { date_label: '03/08', score: 6, score_20: '12.0', total_questions: 10 },
        { date_label: '03/08', score: 8, score_20: '14.0', total_questions: 12 },
        { date_label: '10/08', score: 16, score_20: '16.0', total_questions: 20 },
        { date_label: '15/08', score: 17, score_20: '15.5', total_questions: 22 },
        { date_label: '22/08', score: 51, score_20: '17.0', total_questions: 60 },
        { date_label: '25/08', score: 90, score_20: '18.0', total_questions: 100 }
    ];

    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('Evolution Chart Score Categorization via Real Controllers', () => {
        it('docenteController.getEvolution classifies scores10, scores20, scoresReal and computes scoresMinedu', async () => {
            docenteRepository.getQuizEvolution.mockResolvedValue(mockRawEvolutionData);

            await docenteController.getEvolution(
                { user: { id: 'teacher-1' }, query: { target: 'ASCENSO', career: 'EBR - Primaria' } },
                mockRes
            );

            expect(mockRes.json).toHaveBeenCalledTimes(1);
            const { success, chart } = mockRes.json.mock.calls[0][0];
            expect(success).toBe(true);
            expect(chart.scores10).toEqual(['12.0', '14.0', null, null, null, null]);
            expect(chart.scores20).toEqual([null, null, '16.0', '15.5', null, null]);
            expect(chart.scoresReal).toEqual([null, null, null, null, '17.0', '18.0']);
            expect(chart.scores).toEqual(['12.0', '14.0', '16.0', '15.5', '17.0', '18.0']);
            expect(chart.scoresMinedu[0]).toBe(54);
            expect(chart.scoresMinedu[4]).toBe(76.5);
        });

        it('medicoController.getEvolution classifies scores10, scores20, and scoresReal consistently', async () => {
            medicoRepository.getQuizEvolution.mockResolvedValue(mockRawEvolutionData);

            await medicoController.getEvolution(
                { user: { id: 'med-1' }, query: { target: 'SERUMS', areas: 'Salud Pública,Investigación' } },
                mockRes
            );

            expect(mockRes.json).toHaveBeenCalledTimes(1);
            const { success, chart } = mockRes.json.mock.calls[0][0];
            expect(success).toBe(true);
            expect(chart.scores10).toEqual(['12.0', '14.0', null, null, null, null]);
            expect(chart.scores20).toEqual([null, null, '16.0', '15.5', null, null]);
            expect(chart.scoresReal).toEqual([null, null, null, null, '17.0', '18.0']);
            expect(chart.scores).toEqual(['12.0', '14.0', '16.0', '15.5', '17.0', '18.0']);
        });
    });

    describe('Doughnut & Radar Chart Aggregation via SimulatorDash', () => {
        it('aggregateDoughnutData aggregates questions by primary topic in Education (splitting compound names)', () => {
            const mockEducationRadarData = [
                { subject: 'Enfoque por competencias', total: 5, correct: 4 },
                { subject: 'Constructivismo y socioconstructivismo, Didáctica', total: 6, correct: 5 },
                { subject: 'Planificación pedagógica', total: 8, correct: 7 },
                { subject: 'Planificación pedagógica', total: 2, correct: 1 }
            ];

            const result = SimulatorDash.aggregateDoughnutData(mockEducationRadarData);

            expect(result).toEqual({
                'Enfoque por competencias': 5,
                'Constructivismo y socioconstructivismo': 6,
                'Planificación pedagógica': 10
            });
        });

        it('aggregateDoughnutData aggregates questions by topic in Health (SERUMS) and ignores zero totals', () => {
            const mockHealthRadarData = [
                { subject: 'Salud Pública', total: 10, correct: 8 },
                { subject: 'Cuidado Integral de Salud', total: 12, correct: 9 },
                { subject: 'Ética e Interculturalidad', total: 6, correct: 5 },
                { subject: 'Investigación', total: 0, correct: 0 }
            ];

            const result = SimulatorDash.aggregateDoughnutData(mockHealthRadarData);

            expect(result).toEqual({
                'Salud Pública': 10,
                'Cuidado Integral de Salud': 12,
                'Ética e Interculturalidad': 6
            });
        });

        it('aggregateRadarMap computes correct/total fallback from accuracy when correct count is absent', () => {
            const result = SimulatorDash.aggregateRadarMap([
                { subject: 'Salud Pública, Epidemiología', total: 20, accuracy: 75 },
                { subject: 'Salud Pública', total: 10, correct: 8 }
            ]);

            expect(result).toEqual({
                'Salud Pública': { correct: 23, total: 30 }
            });
        });
    });
});
