/**
 * Tests unitarios para la optimización RAG y citaciones con página en Quiz Tutor
 * Valida normalización de namespaces, formateo de citas, parseo resiliente y propagación de controladores.
 */

const ragService = require('../../src/domain/services/ragService');
const tutorAiService = require('../../src/domain/services/tutorAiService');
const chatPrompts = require('../../src/domain/prompts/chatPrompts');
const ChatController = require('../../src/application/controllers/chatController');

describe('Quiz Tutor RAG Optimization & Page Citation Suite', () => {

    describe('RagService - Namespaces and Resource Formatting', () => {
        test('normalizeNamespace normaliza correctamente variaciones en español e inglés', () => {
            expect(ragService.normalizeNamespace('medicina')).toBe('medicine');
            expect(ragService.normalizeNamespace('salud')).toBe('medicine');
            expect(ragService.normalizeNamespace('clinica')).toBe('medicine');
            expect(ragService.normalizeNamespace('clínica')).toBe('medicine');
            expect(ragService.normalizeNamespace('medicine')).toBe('medicine');

            expect(ragService.normalizeNamespace('educacion')).toBe('education');
            expect(ragService.normalizeNamespace('educación')).toBe('education');
            expect(ragService.normalizeNamespace('docente')).toBe('education');
            expect(ragService.normalizeNamespace('cneb')).toBe('education');
            expect(ragService.normalizeNamespace('education')).toBe('education');

            expect(ragService.normalizeNamespace('')).toBe('general');
            expect(ragService.normalizeNamespace(null)).toBe('general');
            expect(ragService.normalizeNamespace('random')).toBe('random');
        });

        test('_cleanResourceTitle limpia nombres de archivo con extensiones y guiones bajos', () => {
            expect(ragService._cleanResourceTitle(null, 'Harrison_Medicina_Interna_19va_Ed.pdf')).toBe('Harrison Medicina Interna 19va Ed');
            expect(ragService._cleanResourceTitle('RVM_094-2020-MINEDU.pdf')).toBe('RVM 094 2020 MINEDU');
            expect(ragService._cleanResourceTitle('', '', 'Fuente Oficial')).toBe('Fuente Oficial');
        });

        test('_formatResults genera texto con (Pág. X) y extrae lista estructurada de fuentes únicas', () => {
            const mockMatches = [
                {
                    content: 'El tratamiento de primera línea según la norma es amoxicilina 500mg.',
                    metadata: {
                        title: 'NTS_139_MINSA',
                        source: 'NTS_139_MINSA.pdf',
                        page: 18
                    },
                    score: 0.88
                },
                {
                    content: 'En pacientes alérgicos a la penicilina, usar eritromicina.',
                    metadata: {
                        title: 'NTS_139_MINSA',
                        source: 'NTS_139_MINSA.pdf',
                        page: 18 // Misma página (debe deduplicarse en sources)
                    },
                    score: 0.85
                },
                {
                    content: 'Enfoque por competencias según el currículo nacional.',
                    metadata: {
                        title: 'CNEB_2017',
                        source: 'CNEB_2017.pdf',
                        page: 42
                    },
                    score: 0.79
                }
            ];

            const result = ragService._formatResults(mockMatches, 'medicine');

            // Verifica compatibilidad como objeto y string
            expect(result).toBeDefined();
            expect(typeof result.contextText).toBe('string');
            expect(result.toString()).toBe(result.contextText);

            // Verifica inclusión de títulos limpios y páginas en el texto
            expect(result.contextText).toContain('FUENTE 1: [NTS 139 MINSA (Pág. 18)]');
            expect(result.contextText).toContain('FUENTE 3: [CNEB 2017 (Pág. 42)]');

            // Verifica fuentes únicas estructuradas (deben ser 2 únicas: NTS Pág 18 y CNEB Pág 42)
            expect(result.sources).toHaveLength(2);
            expect(result.sources[0].fuente).toBe('NTS 139 MINSA');
            expect(result.sources[0].pagina).toBe(18);
            expect(result.sources[1].fuente).toBe('CNEB 2017');
            expect(result.sources[1].pagina).toBe(42);
        });

        test('_formatResults maneja resultados vacíos de forma segura', () => {
            const emptyResult = ragService._formatResults([], 'education');
            expect(emptyResult.contextText).toBe('');
            expect(emptyResult.sources).toEqual([]);
            expect(emptyResult.matchesCount).toBe(0);
            expect(emptyResult.toString()).toBe('');
        });
    });

    describe('TutorAiService - Response Parsing with Citations', () => {
        test('Parsea citas estructuradas devueltas directamente en el JSON por Gemini', () => {
            const rawModelOutput = JSON.stringify({
                intencion: 'consulta_medica',
                respuesta: 'De acuerdo con la Norma Técnica N° 139-MINSA (Pág. 18), el diagnóstico debe fundamentarse clínicamente.',
                sugerencias: ['¿Cuáles son las contraindicaciones?'],
                citas: [
                    { fuente: 'NTS N° 139-MINSA', pagina: 18 }
                ],
                idioma_detectado: 'es'
            });

            const parsed = tutorAiService._parseAiResponse(rawModelOutput);

            expect(parsed.intencion).toBe('consulta_medica');
            expect(parsed.respuesta).toContain('Norma Técnica N° 139-MINSA (Pág. 18)');
            expect(parsed.citas).toHaveLength(1);
            expect(parsed.citas[0]).toEqual({ fuente: 'NTS N° 139-MINSA', pagina: 18 });
        });

        test('Extrae citas usando boundary regex semántico cuando el texto tiene comillas internas sin escapar', () => {
            const unescapedRaw = `{"intencion": "consulta_docente", "respuesta": "El docente reflexiona: "debemos evaluar de forma formativa" y según el CNEB (Pág. 45) promover la retroalimentación.", "sugerencias": [], "citas": [{"fuente": "Currículo Nacional CNEB", "pagina": 45}], "idioma_detectado": "es"}`;

            const parsed = tutorAiService._parseAiResponse(unescapedRaw);

            expect(parsed.intencion).toBe('consulta_docente');
            expect(parsed.respuesta).toContain('debemos evaluar de forma formativa');
            expect(parsed.citas).toHaveLength(1);
            expect(parsed.citas[0].fuente).toBe('Currículo Nacional CNEB');
            expect(parsed.citas[0].pagina).toBe(45);
        });
    });

    describe('ChatController - Response Enrichment with RAG Citations', () => {
        test('enrichResponse propaga citas, sources, ragSources y contextUsed en la salida de la API', async () => {
            const fakeController = new ChatController({ chatService: {}, analyticsService: {}, usageService: {} });

            const mockLlmResult = {
                intencion: 'consulta_quiz',
                confianza: 0.95,
                respuesta: 'La respuesta correcta es la A según RVM 094-2020 (Pág. 12).',
                citas: [{ fuente: 'RVM 094-2020-MINEDU', pagina: 12 }],
                sources: 'RVM 094 2020 MINEDU (Pág. 12)',
                ragSources: [{ title: 'RVM 094 2020 MINEDU', page: 12, score: 0.91 }],
                contextUsed: true,
                idioma_detectado: 'es',
                sugerencias: ['Ver criterios de evaluación']
            };

            const enriched = await fakeController.enrichResponse('¿Por qué es la A?', mockLlmResult);

            expect(enriched.respuesta).toBe(mockLlmResult.respuesta);
            expect(enriched.citas).toEqual([{ fuente: 'RVM 094-2020-MINEDU', pagina: 12 }]);
            expect(enriched.sources).toBe('RVM 094 2020 MINEDU (Pág. 12)');
            expect(enriched.ragSources).toHaveLength(1);
            expect(enriched.contextUsed).toBe(true);
            expect(enriched.sugerencias).toEqual(['Ver criterios de evaluación']);
        });

        test('enrichResponse bloquea citas y sources cuando contextUsed es false (Usuario Free/Basic sin RAG)', async () => {
            const fakeController = new ChatController({ chatService: {}, analyticsService: {}, usageService: {} });

            // Simulamos que el LLM intentó colar citas aunque no hubo RAG (usuario Free/Basic)
            const mockLlmResult = {
                intencion: 'consulta_quiz',
                confianza: 0.90,
                respuesta: 'La respuesta correcta es la C según el CNEB.',
                citas: [{ fuente: 'CNEB Inventado', pagina: 32 }],
                sources: 'Biblioteca Magisterial',
                ragSources: [],
                contextUsed: false,
                idioma_detectado: 'es',
                sugerencias: []
            };

            const enriched = await fakeController.enrichResponse('¿Por qué es la C?', mockLlmResult);

            expect(enriched.citas).toEqual([]);
            expect(enriched.sources).toBeNull();
            expect(enriched.ragSources).toEqual([]);
            expect(enriched.contextUsed).toBe(false);
        });
    });

    describe('ChatPrompts - Citation Rules with Page Mandatory', () => {
        test('Prompt de medicina instruye citar página mínima y llenar array citas cuando hay RAG', () => {
            const prompt = chatPrompts.buildPrompt('medicine', 'ENAM', '--- FUENTE 1: [Harrison (Pág. 340)] ---', { hasRagContext: true });
            expect(prompt).toContain('Pág.');
            expect(prompt).toContain('citas');
            expect(prompt).toContain('BIBLIOTECA MÉDICA DIGITAL (RAG)');
        });

        test('Prompt de educación instruye citar documento oficial y número de página cuando hay RAG', () => {
            const prompt = chatPrompts.buildPrompt('education', 'ASCENSO', '--- FUENTE 1: [CNEB (Pág. 45)] ---', { hasRagContext: true });
            expect(prompt).toContain('Pág.');
            expect(prompt).toContain('citas');
            expect(prompt).toContain('BIBLIOTECA MAGISTERIAL (RAG - MINEDU)');
        });

        test('Prompt en modo SIN RAG prohíbe terminantemente inventar páginas y exige citas vacías', () => {
            const prompt = chatPrompts.buildPrompt('education', 'ASCENSO', '', { hasRagContext: false });
            expect(prompt).toContain('MODO GENERAL EXPERTO - SIN RAG VECTORIAL');
            expect(prompt).toContain('PROHIBICIÓN ABSOLUTA DE CITAR PÁGINAS');
            expect(prompt).toContain('"citas": []');
            expect(prompt).toContain('PROHIBICIÓN DE CÓDIGOS DE CASOS');
            expect(prompt).not.toContain('BIBLIOTECA MAGISTERIAL (RAG - MINEDU)');
        });
    });
});
