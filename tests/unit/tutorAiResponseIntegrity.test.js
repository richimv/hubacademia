/**
 * Tests de Integridad de Respuesta para TutorAiService y MarkdownRenderer
 * Verifica que las respuestas pedagógicas, clínicas y científicas no sufran truncamiento
 * cuando contienen comillas internas no escapadas, fórmulas LaTeX o bloques de código.
 */

const tutorAiService = require('../../src/domain/services/tutorAiService');

// Setup para MarkdownRenderer en entorno Node
class MockNode {
    constructor(tagName = 'DIV') {
        this.tagName = tagName.toUpperCase();
        this._attributesMap = new Map();
        this.childNodes = [];
        this.parentNode = null;
        this.className = '';
        this.style = {};
    }
    setAttribute(name, val) { this._attributesMap.set(name.toLowerCase(), String(val)); }
    getAttribute(name) { return this._attributesMap.get(name.toLowerCase()) || null; }
    removeAttribute(name) { this._attributesMap.delete(name.toLowerCase()); }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    appendChild(node) { node.parentNode = this; this.childNodes.push(node); }
    removeChild(node) {
        const index = this.childNodes.indexOf(node);
        if (index > -1) {
            this.childNodes.splice(index, 1);
            node.parentNode = null;
        }
    }
    querySelectorAll() { return []; }
    get innerHTML() { return this._rawHTML || ''; }
    set innerHTML(val) { this._rawHTML = val; }
}

global.window = {
    location: { href: 'http://localhost' },
    marked: {
        setOptions: jest.fn(),
        parse: jest.fn(text => text)
    },
    katex: {
        renderToString: jest.fn(expr => `<span>${expr}</span>`)
    }
};

global.document = {
    createElement: (tag) => new MockNode(tag)
};

const MarkdownRenderer = require('../../src/presentation/public/js/utils/markdown-renderer');

describe('TutorAiService & MarkdownRenderer - Response Integrity & Resilient Parsing', () => {

    describe('TutorAiService._parseAiResponse', () => {
        test('No trunca la respuesta ante comillas dobles sin escapar dentro del texto (Caso real de usuario)', () => {
            // Simula la respuesta exacta devuelta por el modelo con comillas en la opción C
            const rawModelOutput = `{"intencion": "clasificacion_pedagogica", "respuesta": "¡Excelente que hayas identificado la opción [A] como la correcta! Vamos a analizar en profundidad por qué esta intervención docente es la más pertinente para fomentar la formulación de hipótesis en los niños, enmarcada en la competencia "Indaga mediante métodos científicos para construir conocimientos" del Currículo Nacional de la Educación Básica (CNEB).

Análisis de la Situación y la Competencia
El caso nos presenta una situación cotidiana en el huerto escolar: los niños observan hojas con huecos. El objetivo de la docente es aprovechar este descubrimiento para impulsar el desarrollo de la competencia de indagación.

¿Por qué la alternativa [C] no es la más pertinente?
En la opción C, la docente responde: "Miren bien, ¿no serán los animalitos que viven en el jardín los que se comen las hojas?", proponiendo una posible respuesta ("los animalitos") antes de que los niños investiguen. Esta intervención es directiva y corta la autonomía de indagación.", "sugerencias": ["¿Cómo orientar la formulación de hipótesis?", "Ver rúbrica CNEB"], "idioma_detectado": "es"}`;

            const result = tutorAiService._parseAiResponse(rawModelOutput);

            expect(result).toBeDefined();
            expect(result.intencion).toBe('clasificacion_pedagogica');
            // Debe contener el inicio, la parte conflictiva con comillas, y la parte final después de las comillas
            expect(result.respuesta).toContain('¡Excelente que hayas identificado la opción [A]');
            expect(result.respuesta).toContain('proponiendo una posible respuesta ("los animalitos")');
            expect(result.respuesta).toContain('Esta intervención es directiva y corta la autonomía de indagación.');
            // Sugerencias deben haberse recuperado correctamente
            expect(result.sugerencias).toHaveLength(2);
            expect(result.sugerencias[0]).toBe('¿Cómo orientar la formulación de hipótesis?');
            expect(result.idioma_detectado).toBe('es');
        });

        test('Parsea adecuadamente JSON estándar válido sin alteraciones', () => {
            const validJson = JSON.stringify({
                intencion: 'consulta_medica',
                respuesta: 'La dosis recomendada según la NTS N° 141-MINSA es de 500mg cada 8 horas.',
                sugerencias: ['Ver dosis pediátrica', 'Contraindicaciones'],
                idioma_detectado: 'es'
            });

            const result = tutorAiService._parseAiResponse(validJson);

            expect(result.intencion).toBe('consulta_medica');
            expect(result.respuesta).toBe('La dosis recomendada según la NTS N° 141-MINSA es de 500mg cada 8 horas.');
            expect(result.sugerencias).toEqual(['Ver dosis pediátrica', 'Contraindicaciones']);
        });

        test('Parsea JSON envuelto en bloques de código markdown ```json ... ``` con comillas internas', () => {
            const rawWithFences = "```json\n" +
                '{"intencion": "consulta_docente", "respuesta": "El docente señala: \\"Vamos a reflexionar sobre el caso\\" y luego añade "Debemos ser claros". Fin de la explicación.", "sugerencias": [], "idioma_detectado": "es"}' +
                "\n```";

            const result = tutorAiService._parseAiResponse(rawWithFences);

            expect(result.intencion).toBe('consulta_docente');
            expect(result.respuesta).toContain('El docente señala:');
            expect(result.respuesta).toContain('Debemos ser claros');
            expect(result.respuesta).toContain('Fin de la explicación.');
        });

        test('Preserva comandos matemáticos LaTeX y saltos de línea sin corromper la sintaxis', () => {
            const mathOutput = `{"intencion": "consulta_ciencias", "respuesta": "Para calcular el límite:\\n$$\\\\lim_{x \\\\to 0} \\\\frac{\\\\sin x}{x} = 1$$\\nNótese que $x \\\\neq 0$ y el gradiente $\\\\nabla f$ es continuo.", "sugerencias": [], "idioma_detectado": "es"}`;

            const result = tutorAiService._parseAiResponse(mathOutput);

            expect(result.respuesta).toContain('\\lim_{x \\to 0}');
            expect(result.respuesta).toContain('\\frac{\\sin x}{x} = 1');
            expect(result.respuesta).toContain('\\neq');
            expect(result.respuesta).toContain('\\nabla');
        });

        test('Maneja respuestas en texto plano sin estructura JSON (fallback seguro)', () => {
            const plainText = 'Esta es una respuesta directa sin JSON del modelo.';
            const result = tutorAiService._parseAiResponse(plainText);

            expect(result.respuesta).toBe('Esta es una respuesta directa sin JSON del modelo.');
            expect(result.intencion).toBe('consulta');
            expect(result.sugerencias).toEqual([]);
        });
    });

    describe('MarkdownRenderer._cleanAiResponse', () => {
        test('Extrae el texto completo en el frontend incluso con comillas dobles internas no escapadas', () => {
            const rawFrontendInput = `{"intencion": "docente", "respuesta": "La opción [C] afirma: "Miren bien", pero la opción correcta es la [A] porque promueve la indagación activa en los niños.", "sugerencias": ["Opción B"]}`;

            const cleaned = MarkdownRenderer._extractCleanResponse(rawFrontendInput);

            expect(cleaned).toContain('La opción [C] afirma:');
            expect(cleaned).toContain('Miren bien');
            expect(cleaned).toContain('promueve la indagación activa en los niños.');
        });

        test('Limpia correctamente JSON envuelto en bloques markdown en frontend', () => {
            const rawFrontendInput = '```json\n{"respuesta": "Contenido normal de la respuesta."}\n```';

            const cleaned = MarkdownRenderer._extractCleanResponse(rawFrontendInput);

            expect(cleaned).toBe('Contenido normal de la respuesta.');
        });

        test('Preserva texto plano que no contiene estructura JSON', () => {
            const plain = 'Texto plano para el chat.';
            const cleaned = MarkdownRenderer._extractCleanResponse(plain);

            expect(cleaned).toBe('Texto plano para el chat.');
        });
    });
});
