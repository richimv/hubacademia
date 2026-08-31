describe('MarkdownRenderer - KaTeX Math & Science Rendering', () => {
    beforeEach(() => {
        jest.resetModules();

        class MockNode {
            constructor(tagName = 'DIV') {
                this.tagName = tagName.toUpperCase();
                this._attributesMap = new Map();
                this.childNodes = [];
                this.parentNode = null;
                this.className = '';
                this.style = {};
            }

            get attributes() {
                const arr = [];
                this._attributesMap.forEach((val, name) => {
                    arr.push({ name, value: val });
                });
                return arr;
            }

            setAttribute(name, val) {
                this._attributesMap.set(name.toLowerCase(), String(val));
            }

            getAttribute(name) {
                return this._attributesMap.get(name.toLowerCase()) || null;
            }

            removeAttribute(name) {
                this._attributesMap.delete(name.toLowerCase());
            }

            remove() {
                if (this.parentNode) {
                    this.parentNode.removeChild(this);
                }
            }

            appendChild(node) {
                node.parentNode = this;
                this.childNodes.push(node);
            }

            removeChild(node) {
                const index = this.childNodes.indexOf(node);
                if (index > -1) {
                    this.childNodes.splice(index, 1);
                    node.parentNode = null;
                }
            }

            querySelectorAll(selector) {
                const results = [];
                const search = (node) => {
                    if (node !== this) {
                        const tag = (node.tagName || '').toLowerCase();
                        if (selector.split(',').map(s => s.trim().toLowerCase()).includes(tag)) {
                            results.push(node);
                        }
                    }
                    node.childNodes.forEach(search);
                };
                search(this);
                return results;
            }

            get innerHTML() {
                return this._rawHTML || '';
            }

            set innerHTML(val) {
                this._rawHTML = val;
            }
        }

        global.window = {
            marked: {
                setOptions: jest.fn(),
                parse: jest.fn(text => text)
            },
            katex: {
                renderToString: jest.fn((expr, opts) => {
                    const tag = opts?.displayMode ? 'div' : 'span';
                    return `<${tag} class="katex-rendered">${expr}</${tag}>`;
                })
            }
        };

        global.document = {
            createElement: (tag) => new MockNode(tag)
        };

        require('../../src/presentation/public/js/utils/markdown-renderer');
    });

    afterEach(() => {
        delete global.window;
        delete global.document;
    });

    test('Extrae y protege expresiones matemáticas inline ($...$)', () => {
        const text = 'La función $x^2$ y la integral $\\int f(x) dx$ son continuas.';
        const { processedText, mathExpressions } = global.window.MarkdownRenderer._extractMath(text);

        expect(processedText).toContain('%%MATH_INLINE_0%%');
        expect(processedText).toContain('%%MATH_INLINE_1%%');
        expect(mathExpressions).toHaveLength(2);
        expect(mathExpressions[0].expr).toBe('x^2');
        expect(mathExpressions[0].display).toBe(false);
        expect(mathExpressions[1].expr).toBe('\\int f(x) dx');
    });

    test('Extrae y protege ecuaciones en bloque display ($$...$$ y \\[...\\])', () => {
        const text = `Ecuación cuadrática:
$$\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$$
Y otra forma:
\\[E = mc^2\\]`;

        const { processedText, mathExpressions } = global.window.MarkdownRenderer._extractMath(text);

        expect(processedText).toContain('%%MATH_DISPLAY_0%%');
        expect(processedText).toContain('%%MATH_DISPLAY_1%%');
        expect(mathExpressions).toHaveLength(2);
        expect(mathExpressions[0].display).toBe(true);
        expect(mathExpressions[1].display).toBe(true);
        expect(mathExpressions[1].expr).toBe('E = mc^2');
    });

    test('No confunde precios o montos en dólares con expresiones matemáticas', () => {
        const text = 'El precio es de $100 ni $50 dólares por persona.';
        const { processedText, mathExpressions } = global.window.MarkdownRenderer._extractMath(text);

        expect(mathExpressions).toHaveLength(0);
        expect(processedText).toBe(text);
    });

    test('Soporta fórmulas químicas en notación LaTeX', () => {
        const text = 'La reacción del bicarbonato es $\\mathrm{H_2O + CO_2 \\rightarrow H_2CO_3}$.';
        const { processedText, mathExpressions } = global.window.MarkdownRenderer._extractMath(text);

        expect(mathExpressions).toHaveLength(1);
        expect(mathExpressions[0].expr).toBe('\\mathrm{H_2O + CO_2 \\rightarrow H_2CO_3}');
    });

    test('Renderiza texto completo con KaTeX sin que Markdown altere subíndices (_) o asteriscos (*)', () => {
        const input = 'Para $x_1 * x_2 = \\frac{x^3}{3} + C$, se tiene que $n=2$.';
        const html = global.window.MarkdownRenderer.render(input);

        expect(html).toContain('katex-rendered');
        expect(html).toContain('x_1 * x_2 = \\frac{x^3}{3} + C');
        expect(global.window.katex.renderToString).toHaveBeenCalled();
    });

    test('Decodifica entidades HTML y normaliza dobles barras en fórmulas LaTeX', () => {
        const repaired = global.window.MarkdownRenderer._sanitizeMathExpression('&lt; \\\\frac{x^2}{2} &gt;');
        expect(repaired).toBe('< \\frac{x^2}{2} >');
    });

    test('Envuelve ecuaciones display con saltos \\\\ en entorno aligned', () => {
        const repaired = global.window.MarkdownRenderer._sanitizeMathExpression('\\int x dx = \\\\ \\frac{x^2}{2} + C', true);
        expect(repaired).toContain('\\begin{aligned}');
        expect(repaired).toContain('\\end{aligned}');
    });

    test('Fallback defensivo cuando KaTeX aún no está cargado en window', () => {
        delete global.window.katex;
        const input = 'La integral es $\\int x^2 dx$.';
        const html = global.window.MarkdownRenderer.render(input);

        expect(html).toContain('class="katex-math"');
        expect(html).toContain('data-math="%5Cint%20x%5E2%20dx"');
    });
});
