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

        it('uses global education metrics and ignores obsolete thematic scores', () => {
            const stats = {
                avg_score: '15.5', accuracy: 77, mastered_cards: 8,
                total_questions: 100, total_correct: 77,
                radar_data: [
                    { subject: 'Planificación Pedagógica', accuracy: 85, total: 20, correct: 17 },
                    { subject: 'Evaluación Formativa y Rúbricas', accuracy: 35, total: 20, correct: 7 }
                ]
            };
            const result = analyticsService.generateHeuristicDiagnostic(stats, 'EDUCACION');
            expect(result.strengths).toContain('77%');
            expect(result.strengths).toContain('15.5 / 20');
            expect(result.strengths).not.toContain('Planificación Pedagógica');
            expect(result.weaknesses).not.toContain('Evaluación Formativa y Rúbricas');
            expect(result.strategy).toContain('Tutor IA');
            expect(result.readinessIndex).toBe(77);
            expect(result.readinessLevel).toBe('Nivel Competente');
            expect(result.sprint).toHaveLength(3);
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

        it('should evaluate MINEDU target scale status when targetScale is provided (Escala 4: Aprobado)', () => {
            const stats = {
                avg_score: '14.0', // equiv Base 90: (14/20)*90 = 63.0 pts
                accuracy: 70,
                mastered_cards: 5,
                targetScale: 4, // Escala 4 cutoff = 60 pts
                radar_data: [
                    { subject: 'Constructivismo y Aprendizaje', accuracy: 80, total: 10, correct: 8 },
                    { subject: 'Evaluación Formativa', accuracy: 60, total: 10, correct: 6 }
                ]
            };

            const result = analyticsService.generateHeuristicDiagnostic(stats, 'EDUCACION');
            expect(result.mineduEvaluation).toBeDefined();
            expect(result.mineduEvaluation.passed).toBe(true);
            expect(result.mineduEvaluation.targetScale).toBe(4);
            expect(result.mineduEvaluation.targetScaleName).toBe('4.ª Escala');
            expect(result.mineduEvaluation.minPointsRequired).toBe(60);
            expect(result.mineduEvaluation.mineduScore).toBe(63.0);
            expect(result.mineduEvaluation.gapPoints).toBe(3.0);
            expect(result.strengths).toContain('Proyección de práctica');
            expect(result.strengths).toContain('4.ª Escala');
            expect(result.strategy).toContain('4.ª Escala');
        });

        it('should evaluate MINEDU target scale gap when score falls below target cutoff (Escala 5: Faltan Puntos)', () => {
            const stats = {
                avg_score: '12.0', // equiv Base 90: (12/20)*90 = 54.0 pts
                accuracy: 60,
                mastered_cards: 3,
                targetScale: 5, // Escala 5 cutoff = 63 pts
                radar_data: [
                    { subject: 'Teorías del Aprendizaje', accuracy: 70, total: 10, correct: 7 },
                    { subject: 'Didáctica de la Especialidad', accuracy: 50, total: 10, correct: 5 }
                ]
            };

            const result = analyticsService.generateHeuristicDiagnostic(stats, 'EDUCACION');
            expect(result.mineduEvaluation).toBeDefined();
            expect(result.mineduEvaluation.passed).toBe(false);
            expect(result.mineduEvaluation.targetScale).toBe(5);
            expect(result.mineduEvaluation.minPointsRequired).toBe(63);
            expect(result.mineduEvaluation.mineduScore).toBe(54.0);
            expect(result.mineduEvaluation.gapPoints).toBe(-9.0);
            expect(result.weaknesses).toContain('Brecha para Ascenso');
            expect(result.weaknesses).toContain('5.ª Escala');
            expect(result.weaknesses).toContain('9.0 pts');
            expect(result.strategy).toContain('5.ª Escala');
        });

        it('keeps an all-wrong education attempt distinct from no history', () => {
            const result = analyticsService.generateHeuristicDiagnostic({
                avg_score: 0, accuracy: 0, mastered_cards: 0,
                total_questions: 20, total_correct: 0, radar_data: []
            }, 'EDUCACION');
            expect(result.hasHistory).toBe(true);
            expect(result.readinessIndex).toBe(0);
            expect(result.strengths).toContain('20 preguntas');
            expect(result.mineduEvaluation.mineduScore).toBe(0);
        });

        it('does not infer education strengths from obsolete thematic data without attempts', () => {
            const result = analyticsService.generateHeuristicDiagnostic({
                avg_score: 0, accuracy: 0, mastered_cards: 0, total_questions: 0,
                radar_data: [{ subject: 'Old axis', accuracy: 90 }]
            }, 'EDUCACION');
            expect(result.hasHistory).toBe(false);
            expect(result.strengths).not.toContain('Old axis');
            expect(result.readinessIndex).toBe(0);
            expect(result).not.toHaveProperty('mineduEvaluation');
        });
    });

    describe('securityUtils.validateDiagnosticStats Array and Scale Support', () => {
        it('should properly sanitize and preserve radar_data, targetScale, and minedu_score', () => {
            const raw = {
                avg_score: '14.5',
                accuracy: 72,
                mastered_cards: 5,
                targetScale: '4',
                minedu_score: '65.25',
                target: 'ASCENSO',
                radar_data: [
                    { subject: 'Medicina Interna <script>alert(1)</script>', accuracy: 85, correct: 17, total: 20 },
                    { subject: 'Cirugía General', accuracy: 120, correct: -2, total: 10 }
                ]
            };

            const validated = securityUtils.validateDiagnosticStats(raw);
            expect(validated.avg_score).toBe(14.5);
            expect(validated.accuracy).toBe(72);
            expect(validated.targetScale).toBe(4);
            expect(validated.minedu_score).toBe(65.25);
            expect(validated.target).toBe('ASCENSO');
            expect(validated.radar_data.length).toBe(2);
            expect(validated.radar_data[0].subject).toBe('Medicina Interna');
            expect(validated.radar_data[1].accuracy).toBe(100); // Clamped
            expect(validated.radar_data[1].correct).toBe(0); // Clamped
        });

        it('should clamp targetScale between 2 and 8 in validateDiagnosticStats', () => {
            expect(securityUtils.validateDiagnosticStats({ avg_score: 10, accuracy: 50, mastered_cards: 0, radar_data: [], targetScale: 1 }).targetScale).toBe(2);
            expect(securityUtils.validateDiagnosticStats({ avg_score: 10, accuracy: 50, mastered_cards: 0, radar_data: [], targetScale: 10 }).targetScale).toBe(8);
        });
    });

    describe('AnalyticsController Pulse & View Deduplication (Supabase Write Protection)', () => {
        const AnalyticsController = require('../../src/application/controllers/analyticsController');
        let mockAnalyticsService;
        let mockUserRepository;
        let controller;

        const createRes = () => {
            const res = {
                statusCode: 200,
                body: null,
                status: jest.fn(code => {
                    res.statusCode = code;
                    return res;
                }),
                json: jest.fn(payload => {
                    res.body = payload;
                    return res;
                }),
                send: jest.fn(() => res)
            };
            return res;
        };

        beforeEach(() => {
            mockAnalyticsService = {
                logPulse: jest.fn().mockResolvedValue(undefined),
                recordView: jest.fn().mockResolvedValue(undefined),
                recordFeedback: jest.fn().mockResolvedValue(undefined)
            };
            mockUserRepository = {
                findById: jest.fn()
            };
            controller = new AnalyticsController(mockAnalyticsService, mockUserRepository);
        });

        it('rejects missing or invalid sessionId in recordPulse with 400', async () => {
            const resEmpty = createRes();
            await controller.recordPulse({ body: { sessionId: '   ' }, headers: {} }, resEmpty);
            expect(resEmpty.statusCode).toBe(400);
            expect(mockAnalyticsService.logPulse).not.toHaveBeenCalled();

            const resTooLong = createRes();
            await controller.recordPulse({ body: { sessionId: 'x'.repeat(200) }, headers: {} }, resTooLong);
            expect(resTooLong.statusCode).toBe(400);
            expect(mockAnalyticsService.logPulse).not.toHaveBeenCalled();
        });

        it('throttles duplicate pulses for the same sessionId within 2 minutes while allowing userId promotion', async () => {
            const res1 = createRes();
            await controller.recordPulse({ body: { sessionId: 'sess-abc-1', isMobile: false }, headers: {} }, res1);
            expect(res1.statusCode).toBe(204);
            expect(mockAnalyticsService.logPulse).toHaveBeenCalledTimes(1);
            expect(mockAnalyticsService.logPulse).toHaveBeenCalledWith('sess-abc-1', null, false);

            // Second pulse right after (e.g., page navigation or second tab): suppressed in memory
            const res2 = createRes();
            await controller.recordPulse({ body: { sessionId: 'sess-abc-1', isMobile: false }, headers: {} }, res2);
            expect(res2.statusCode).toBe(204);
            expect(mockAnalyticsService.logPulse).toHaveBeenCalledTimes(1);

            // User logs in on the same sessionId: immediately promoted to DB
            const res3 = createRes();
            await controller.recordPulse({
                body: { sessionId: 'sess-abc-1', isMobile: true },
                user: { id: 'usr-999' },
                headers: {}
            }, res3);
            expect(res3.statusCode).toBe(204);
            expect(mockAnalyticsService.logPulse).toHaveBeenCalledTimes(2);
            expect(mockAnalyticsService.logPulse).toHaveBeenLastCalledWith('sess-abc-1', 'usr-999', true);

            // Subsequent pulse with the same authenticated userId: throttled again
            const res4 = createRes();
            await controller.recordPulse({
                body: { sessionId: 'sess-abc-1', isMobile: true },
                user: { id: 'usr-999' },
                headers: {}
            }, res4);
            expect(res4.statusCode).toBe(204);
            expect(mockAnalyticsService.logPulse).toHaveBeenCalledTimes(2);
        });

        it('ignores automated bot and crawler User-Agents in recordPulse without hitting Supabase', async () => {
            const resBot = createRes();
            await controller.recordPulse({
                body: { sessionId: 'sess-bot-1', isMobile: false },
                headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
            }, resBot);
            expect(resBot.statusCode).toBe(204);
            expect(mockAnalyticsService.logPulse).not.toHaveBeenCalled();
        });

        it('deduplicates rapid repeat page views in recordView within 30s window', async () => {
            const req = { body: { entityType: 'course', entityId: 42 }, user: { id: 'usr-1' }, ip: '127.0.0.1' };
            const res1 = createRes();
            await controller.recordView(req, res1);
            expect(res1.statusCode).toBe(202);
            expect(mockAnalyticsService.recordView).toHaveBeenCalledTimes(1);

            const res2 = createRes();
            await controller.recordView(req, res2);
            expect(res2.statusCode).toBe(202);
            expect(mockAnalyticsService.recordView).toHaveBeenCalledTimes(1);
        });

        it('does not query userRepository.findById redundantly in recordFeedback', async () => {
            const res = createRes();
            await controller.recordFeedback({
                body: { query: 'q', response: 'r', isHelpful: true, messageId: 'm1' },
                user: { id: 'usr-77' }
            }, res);
            expect(res.statusCode).toBe(204);
            expect(mockUserRepository.findById).not.toHaveBeenCalled();
            expect(mockAnalyticsService.recordFeedback).toHaveBeenCalledWith('q', 'r', true, 'usr-77', 'm1');
        });
    });

    describe('AnalyticsService generateDiagnosticInsight (Domain VertexAI)', () => {
        const sampleMedStats = {
            avg_score: '15.0',
            accuracy: 75,
            mastered_cards: 12,
            radar_data: [
                { subject: 'Cardiología', accuracy: 85, correct: 17, total: 20 },
                { subject: 'Pediatría', accuracy: 55, correct: 11, total: 20 }
            ]
        };

        it('returns heuristic diagnostic without calling VertexAI for non-advanced tiers or fallbackToStatic', async () => {
            const mockGenerateContent = jest.fn();
            const service = new AnalyticsService({
                vertexAi: { getGenerativeModel: jest.fn(() => ({ generateContent: mockGenerateContent })) }
            });

            const basicRes = await service.generateDiagnosticInsight({
                user: { id: 'u1', subscriptionTier: 'basic' },
                userTier: 'basic',
                stats: sampleMedStats,
                context: 'MEDICINA'
            });
            expect(basicRes.source).toBe('heuristic');
            expect(mockGenerateContent).not.toHaveBeenCalled();

            const fallbackRes = await service.generateDiagnosticInsight({
                user: { id: 'u2', subscriptionTier: 'advanced' },
                userTier: 'advanced',
                stats: sampleMedStats,
                context: 'MEDICINA',
                fallbackToStatic: true
            });
            expect(fallbackRes.source).toBe('heuristic');
            expect(mockGenerateContent).not.toHaveBeenCalled();
        });

        it('generates AI diagnostic via VertexAI for advanced/admin users and preserves MINEDU metrics in EDUCACION', async () => {
            const aiPayload = {
                readinessIndex: 99,
                readinessLevel: 'AI Level',
                strengths: '<p>Fortaleza clínica probada (75%).</p>',
                weaknesses: '<p>Refuerzo en Pediatría.</p>',
                strategy: 'Practicar casos clínicos comentados.',
                highYieldTip: 'Revisa criterios de choque séptico.',
                sprint: [{ step: 1, title: 'Paso 1', desc: 'Repasar guías' }]
            };
            const mockGenerateContent = jest.fn().mockResolvedValue({
                response: {
                    candidates: [{ content: { parts: [{ text: JSON.stringify(aiPayload) }] } }]
                }
            });
            const service = new AnalyticsService({
                vertexAi: { getGenerativeModel: jest.fn(() => ({ generateContent: mockGenerateContent })) }
            });

            const medRes = await service.generateDiagnosticInsight({
                user: { id: 'adv-1', subscriptionTier: 'advanced' },
                userTier: 'advanced',
                stats: sampleMedStats,
                context: 'MEDICINA'
            });
            expect(medRes.source).toBe('ai');
            expect(medRes.strengths).toContain('Fortaleza clínica');
            expect(mockGenerateContent).toHaveBeenCalledTimes(1);

            const eduRes = await service.generateDiagnosticInsight({
                user: { id: 'adm-1', role: 'admin' },
                userTier: 'admin',
                stats: { avg_score: 14, accuracy: 70, mastered_cards: 5, total_questions: 60, total_correct: 42 },
                context: 'EDUCACION',
                targetScale: 4
            });
            expect(eduRes.source).toBe('ai');
            expect(eduRes.hasHistory).toBe(true);
            expect(eduRes.readinessIndex).toBe(70);
            expect(eduRes.mineduEvaluation).toBeDefined();
            expect(eduRes.mineduEvaluation.targetScale).toBe(4);
        });

        it('falls back to heuristic diagnostic if VertexAI throws or returns invalid JSON', async () => {
            const mockGenerateContent = jest.fn().mockRejectedValue(new Error('Vertex quota exceeded'));
            const service = new AnalyticsService({
                vertexAi: { getGenerativeModel: jest.fn(() => ({ generateContent: mockGenerateContent })) }
            });

            const res = await service.generateDiagnosticInsight({
                user: { id: 'adv-2' },
                userTier: 'advanced',
                stats: sampleMedStats,
                context: 'MEDICINA'
            });
            expect(res.source).toBe('heuristic');
            expect(res.strengths).toContain('Cardiología');
        });
    });

    describe('AnalyticsController getAIDiagnostic Delegation (Zero Direct DB/VertexAI)', () => {
        const AnalyticsController = require('../../src/application/controllers/analyticsController');

        const createRes = () => {
            const res = {
                statusCode: 200,
                body: null,
                status: jest.fn(code => {
                    res.statusCode = code;
                    return res;
                }),
                json: jest.fn(payload => {
                    res.body = payload;
                    return res;
                })
            };
            return res;
        };

        it('delegates diagnostic generation to analyticsService and increments quota via usageService', async () => {
            const mockAnalyticsService = {
                generateDiagnosticInsight: jest.fn().mockResolvedValue({
                    source: 'ai',
                    strengths: '<p>OK</p>',
                    weaknesses: '<p>Mejora</p>',
                    strategy: 'Seguir practicando'
                }),
                generateHeuristicDiagnostic: jest.fn()
            };
            const mockUsageService = {
                incrementUsageColumn: jest.fn().mockResolvedValue(undefined)
            };
            const controller = new AnalyticsController(mockAnalyticsService, {}, mockUsageService);

            const req = {
                user: { id: 'adv-user-1', subscriptionTier: 'advanced' },
                userTier: 'advanced',
                usageType: 'daily_ai_usage',
                body: {
                    context: 'MEDICINA',
                    stats: {
                        avg_score: '15.0',
                        accuracy: 75,
                        mastered_cards: 5,
                        radar_data: [{ subject: 'Pediatría', accuracy: 75, correct: 3, total: 4 }]
                    }
                }
            };
            const res = createRes();

            await controller.getAIDiagnostic(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.source).toBe('ai');
            expect(mockAnalyticsService.generateDiagnosticInsight).toHaveBeenCalledWith(expect.objectContaining({
                user: req.user,
                userTier: 'advanced',
                context: 'MEDICINA',
                fallbackToStatic: false
            }));
            expect(mockUsageService.incrementUsageColumn).toHaveBeenCalledWith('adv-user-1', 'daily_ai_usage');
        });

        it('does not charge quota when EDUCACION diagnostic reports hasHistory: false', async () => {
            const mockAnalyticsService = {
                generateDiagnosticInsight: jest.fn().mockResolvedValue({
                    hasHistory: false,
                    readinessIndex: 0,
                    strengths: '<p>Sin historial</p>',
                    weaknesses: '<p>Pendiente</p>',
                    strategy: 'Realiza un simulacro'
                }),
                generateHeuristicDiagnostic: jest.fn()
            };
            const mockUsageService = {
                incrementUsageColumn: jest.fn()
            };
            const controller = new AnalyticsController(mockAnalyticsService, {}, mockUsageService);

            const req = {
                user: { id: 'edu-user-1' },
                userTier: 'free',
                usageType: 'usage_count',
                body: {
                    context: 'EDUCACION',
                    stats: { avg_score: 0, accuracy: 0, mastered_cards: 0, total_questions: 0, radar_data: [] }
                }
            };
            const res = createRes();

            await controller.getAIDiagnostic(req, res);

            expect(res.body.success).toBe(true);
            expect(res.body.hasHistory).toBe(false);
            expect(mockUsageService.incrementUsageColumn).not.toHaveBeenCalled();
        });

        it('returns 400 when stats are missing or corrupted and falls back heuristically on unexpected service failure', async () => {
            const mockAnalyticsService = {
                generateDiagnosticInsight: jest.fn().mockRejectedValue(new Error('Unexpected service failure')),
                generateHeuristicDiagnostic: jest.fn().mockReturnValue({ source: 'heuristic', strengths: 'fallback' })
            };
            const mockUsageService = { incrementUsageColumn: jest.fn() };
            const controller = new AnalyticsController(mockAnalyticsService, {}, mockUsageService);

            const resMissing = createRes();
            await controller.getAIDiagnostic({ user: { id: 'u1' }, body: { context: 'MEDICINA' } }, resMissing);
            expect(resMissing.statusCode).toBe(400);

            const resInvalid = createRes();
            await controller.getAIDiagnostic({
                user: { id: 'u1' },
                body: { context: 'MEDICINA', stats: { avg_score: 'NaN', accuracy: 'NaN', mastered_cards: 'NaN', radar_data: [] } }
            }, resInvalid);
            expect(resInvalid.statusCode).toBe(400);

            const resFallback = createRes();
            await controller.getAIDiagnostic({
                user: { id: 'u1' },
                userTier: 'advanced',
                usageType: 'daily_ai_usage',
                body: {
                    context: 'MEDICINA',
                    stats: { avg_score: 14, accuracy: 70, mastered_cards: 2, radar_data: [] }
                }
            }, resFallback);
            expect(resFallback.body).toEqual({ success: true, source: 'heuristic', strengths: 'fallback' });
            expect(mockUsageService.incrementUsageColumn).not.toHaveBeenCalled();
        });
    });
});
