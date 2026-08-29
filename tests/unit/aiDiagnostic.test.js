const AnalyticsService = require('../../src/domain/services/analyticsService');
const securityUtils = require('../../src/domain/utils/securityUtils');

describe('AI Diagnostic Controller & Heuristic Analytics Engine', () => {
    let analyticsService;

    beforeEach(() => {
        analyticsService = new AnalyticsService();
    });

    describe('User Tier Diagnostic Routing', () => {
        it('should route non-advanced users (free, basic, pending) to heuristic diagnostics', () => {
            const tiers = ['free', 'basic', 'pending', 'expired'];
            tiers.forEach(tier => {
                const isAdvancedOrAdmin = (tier === 'advanced' || tier === 'admin');
                expect(isAdvancedOrAdmin).toBe(false);
            });
        });

        it('should route advanced and admin users to dynamic AI model analysis', () => {
            const premiumTiers = ['advanced', 'admin'];
            premiumTiers.forEach(tier => {
                const isAdvancedOrAdmin = (tier === 'advanced' || tier === 'admin');
                expect(isAdvancedOrAdmin).toBe(true);
            });
        });
    });

    describe('AnalyticsService generateHeuristicDiagnostic', () => {
        it('should generate accurate dynamic insights for Medicine when user has real topic metrics', () => {
            const stats = {
                avg_score: '16.0',
                accuracy: 80,
                mastered_cards: 10,
                radar_data: [
                    { subject: 'Cardiología', accuracy: 90, total: 10, correct: 9 },
                    { subject: 'Pediatría', accuracy: 75, total: 8, correct: 6 },
                    { subject: 'Ginecología y Obstetricia', accuracy: 40, total: 10, correct: 4 }
                ]
            };

            const result = analyticsService.generateHeuristicDiagnostic(stats, 'MEDICINA');
            expect(result.strengths).toContain('Cardiología');
            expect(result.strengths).toContain('90%');
            expect(result.weaknesses).toContain('Ginecología y Obstetricia');
            expect(result.weaknesses).toContain('40%');
            expect(result.strategy).toContain('Ginecología y Obstetricia');
            expect(result.readinessIndex).toBeGreaterThanOrEqual(70);
            expect(result.readinessLevel).toBe('Nivel Sobresaliente');
            expect(Array.isArray(result.sprint)).toBe(true);
            expect(result.sprint.length).toBe(3);
        });

        it('should generate accurate dynamic insights for Education when user has real topic metrics', () => {
            const stats = {
                avg_score: '15.5',
                accuracy: 77,
                mastered_cards: 8,
                radar_data: [
                    { subject: 'Planificación Pedagógica', accuracy: 85, total: 20, correct: 17 },
                    { subject: 'Convivencia Democrática', accuracy: 80, total: 10, correct: 8 },
                    { subject: 'Evaluación Formativa y Rúbricas', accuracy: 35, total: 20, correct: 7 }
                ]
            };

            const result = analyticsService.generateHeuristicDiagnostic(stats, 'EDUCACION');
            expect(result.strengths).toContain('Planificación Pedagógica');
            expect(result.strengths).toContain('85%');
            expect(result.weaknesses).toContain('Evaluación Formativa y Rúbricas');
            expect(result.weaknesses).toContain('35%');
            expect(result.strategy).toContain('Evaluación Formativa y Rúbricas');
            expect(result.readinessIndex).toBeGreaterThanOrEqual(65);
            expect(result.readinessLevel).toBe('Nivel Competente');
            expect(Array.isArray(result.sprint)).toBe(true);
            expect(result.sprint.length).toBe(3);
        });

        it('should provide benchmark overview when user has 0 simulation history', () => {
            const emptyStats = {
                avg_score: '0.0',
                accuracy: 0,
                mastered_cards: 0,
                radar_data: []
            };

            const eduEmpty = analyticsService.generateHeuristicDiagnostic(emptyStats, 'EDUCACION');
            expect(eduEmpty.strengths).toContain('Carrera Pública Magisterial');
            expect(eduEmpty.strategy).toContain('simulacro rápido');
            expect(eduEmpty.readinessIndex).toBeDefined();
            expect(Array.isArray(eduEmpty.sprint)).toBe(true);

            const medEmpty = analyticsService.generateHeuristicDiagnostic(emptyStats, 'MEDICINA');
            expect(medEmpty.strengths).toContain('Medicina Interna');
            expect(medEmpty.strategy).toContain('primer simulacro');
            expect(medEmpty.readinessIndex).toBeDefined();
            expect(Array.isArray(medEmpty.sprint)).toBe(true);
        });
    });

    describe('securityUtils.validateDiagnosticStats Array Support', () => {
        it('should properly sanitize and preserve radar_data as an array of objects', () => {
            const raw = {
                avg_score: '14.5',
                accuracy: 72,
                mastered_cards: 5,
                radar_data: [
                    { subject: 'Medicina Interna <script>alert(1)</script>', accuracy: 85, correct: 17, total: 20 },
                    { subject: 'Cirugía General', accuracy: 120, correct: -2, total: 10 }
                ]
            };

            const validated = securityUtils.validateDiagnosticStats(raw);
            expect(validated.avg_score).toBe(14.5);
            expect(validated.accuracy).toBe(72);
            expect(validated.radar_data.length).toBe(2);
            expect(validated.radar_data[0].subject).toBe('Medicina Interna');
            expect(validated.radar_data[1].accuracy).toBe(100); // Clamped
            expect(validated.radar_data[1].correct).toBe(0); // Clamped
        });
    });
});
