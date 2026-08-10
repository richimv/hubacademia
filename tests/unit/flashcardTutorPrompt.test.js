const CHAT_PROMPTS = require('../../src/domain/prompts/chatPrompts');

describe('Flashcard Tutor Prompt Builder & Isolation', () => {
    test('buildPrompt for flashcard_tutor does NOT contain medical disclaimers or course catalog boilerplate', () => {
        const prompt = CHAT_PROMPTS.buildPrompt('flashcard_tutor', 'GENERAL', '');

        // Validar que NO contiene frases contaminantes
        expect(prompt).not.toContain('consulta médica');
        expect(prompt).not.toContain('Estamos ampliando nuestro catálogo académico');
        expect(prompt).not.toContain('BIBLIOTECA MÉDICA DIGITAL');
        expect(prompt).not.toContain('Cita explícitamente si es MINSA o GPC');

        // Validar que contiene las instrucciones multidisciplinarias
        expect(prompt).toContain('Tutor Académico y Mentor de Aprendizaje');
        expect(prompt).toContain('Derecho');
        expect(prompt).toContain('Medicina/Salud');
        expect(prompt).toContain('Educación');
        expect(prompt).toContain('Idiomas');
        expect(prompt).toContain('Tecnología / Programación');
    });

    test('buildPrompt for flashcard_tutor includes context and format instructions', () => {
        const contextStr = 'ÁREA TEMÁTICA: Derecho\nMAZO: Derecho Constitucional';
        const prompt = CHAT_PROMPTS.buildPrompt('flashcard_tutor', 'GENERAL', contextStr);

        expect(prompt).toContain('[CONTEXTO DE APOYO]');
        expect(prompt).toContain('ÁREA TEMÁTICA: Derecho');
        expect(prompt).toContain('[TABLAS COMPARATIVAS]');
        expect(prompt).toContain('tutor_academico');
    });
});
