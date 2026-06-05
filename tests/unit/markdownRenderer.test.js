describe('MarkdownRenderer URL safety', () => {
    beforeEach(() => {
        jest.resetModules();
        
        // Mock DOM for sanitization tests in pure Node environment
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

            insertBefore(newNode, referenceNode) {
                const index = this.childNodes.indexOf(referenceNode);
                if (index > -1) {
                    newNode.parentNode = this;
                    this.childNodes.splice(index, 0, newNode);
                } else {
                    this.appendChild(newNode);
                }
            }

            get textContent() {
                return this.childNodes.map(n => n.textContent || '').join('');
            }

            set innerHTML(html) {
                this.childNodes = [];
                // Basic HTML tag parser
                const tagRegex = /<([a-zA-Z0-9]+)([^>]*)>(.*?)<\/\1>|<([a-zA-Z0-9]+)([^>]*)\/?>/g;
                let match;
                let lastIndex = 0;
                while ((match = tagRegex.exec(html)) !== null) {
                    const textBefore = html.substring(lastIndex, match.index);
                    if (textBefore) {
                        const txt = new MockNode('#text');
                        txt.nodeValue = textBefore;
                        this.appendChild(txt);
                    }

                    const tagName = match[1] || match[4];
                    const attrsStr = match[2] || match[5];
                    const content = match[3];

                    const node = new MockNode(tagName);
                    if (attrsStr) {
                        const attrRegex = /([a-zA-Z0-9:-]+)="([^"]*)"/g;
                        let attrMatch;
                        while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
                            node.setAttribute(attrMatch[1], attrMatch[2]);
                        }
                    }
                    if (content) {
                        node.innerHTML = content;
                    }
                    this.appendChild(node);
                    lastIndex = tagRegex.lastIndex;
                }
                const remainingText = html.substring(lastIndex);
                if (remainingText) {
                    const txt = new MockNode('#text');
                    txt.nodeValue = remainingText;
                    this.appendChild(txt);
                }
            }

            get innerHTML() {
                if (this.tagName === '#TEXT') {
                    return this.nodeValue || '';
                }
                return this.childNodes.map(node => {
                    if (node.tagName === '#TEXT') {
                        return node.nodeValue || '';
                    }
                    const attrs = node.attributes
                        .map(attr => `${attr.name}="${attr.value}"`)
                        .join(' ');
                    const attrsStr = attrs ? ' ' + attrs : '';
                    const selfClosing = ['img', 'br', 'hr', 'input'].includes(node.tagName.toLowerCase());
                    if (selfClosing) {
                        return `<${node.tagName.toLowerCase()}${attrsStr}>`;
                    }
                    return `<${node.tagName.toLowerCase()}${attrsStr}>${node.innerHTML}</${node.tagName.toLowerCase()}>`;
                }).join('');
            }

            querySelectorAll(selector) {
                const tags = selector.split(',').map(s => s.trim().toLowerCase());
                const results = [];
                const traverse = (node) => {
                    if (node.tagName !== '#TEXT') {
                        if (tags.includes('*') || tags.includes(node.tagName.toLowerCase())) {
                            results.push(node);
                        }
                    }
                    node.childNodes.forEach(traverse);
                };
                this.childNodes.forEach(traverse);
                return results;
            }
        }

        global.document = {
            createElement: (tag) => new MockNode(tag)
        };

        global.window = {
            location: {
                origin: 'https://www.hubacademia.com'
            }
        };
        require('../../src/presentation/public/js/utils/markdown-renderer');
    });

    afterEach(() => {
        delete global.window;
        delete global.document;
    });

    it('allows expected safe URL formats', () => {
        const { _isSafeUrl } = window.MarkdownRenderer;

        expect(_isSafeUrl('/assets/logo.png')).toBe(true);
        expect(_isSafeUrl('assets/logo.png')).toBe(true);
        expect(_isSafeUrl('https://www.hubacademia.com/resource')).toBe(true);
        expect(_isSafeUrl('mailto:soporte@hubacademia.com')).toBe(true);
        expect(_isSafeUrl('tel:+511234567')).toBe(true);
        expect(_isSafeUrl('data:image/png;base64,AAAA')).toBe(true);
    });

    it('blocks active or unexpected URL protocols', () => {
        const { _isSafeUrl } = window.MarkdownRenderer;

        expect(_isSafeUrl('javascript:alert(1)')).toBe(false);
        expect(_isSafeUrl('java\nscript:alert(1)')).toBe(false);
        expect(_isSafeUrl('vbscript:msgbox(1)')).toBe(false);
        expect(_isSafeUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
        expect(_isSafeUrl('data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+')).toBe(false);
        expect(_isSafeUrl('ftp://example.com/file')).toBe(false);
    });

    it('sanitizes unsafe elements but preserves safe video iframes', () => {
        // Unsafe elements should be removed
        const unsafeInput = '<script>alert(1)</script><p>Hello</p><iframe src="https://attacker.com/malicious"></iframe>';
        const unsafeRendered = window.MarkdownRenderer.render(unsafeInput);
        expect(unsafeRendered).not.toContain('<script>');
        expect(unsafeRendered).not.toContain('attacker.com');
        expect(unsafeRendered).toContain('<p>Hello</p>');

        // Safe YouTube iframe should be preserved
        const youtubeInput = '<p>Video:</p><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315"></iframe>';
        const youtubeRendered = window.MarkdownRenderer.render(youtubeInput);
        expect(youtubeRendered).toContain('<p>Video:</p>');
        expect(youtubeRendered).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');

        // Safe Vimeo iframe should be preserved
        const vimeoInput = '<iframe src="https://player.vimeo.com/video/12345"></iframe>';
        const vimeoRendered = window.MarkdownRenderer.render(vimeoInput);
        expect(vimeoRendered).toContain('https://player.vimeo.com/video/12345');
    });
});
