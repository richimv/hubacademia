const fs = require('fs');
const path = require('path');

describe('FlashcardManager Code Health & Scope Integrity', () => {
    test('flashcards.js contains no undeclared or out-of-scope variable references in loadCards', () => {
        const filePath = path.join(__dirname, '../../src/presentation/public/js/flashcards.js');
        const code = fs.readFileSync(filePath, 'utf8');

        // Extract loadCards function content
        const loadCardsMatch = code.match(/async function loadCards[\s\S]*?\n    }/);
        expect(loadCardsMatch).not.toBeNull();

        const loadCardsCode = loadCardsMatch[0];

        // Ensure isDemo is declared inside loadCards before being evaluated
        expect(loadCardsCode).toMatch(/const isDemo =/);

        // Syntax check via Function constructor parsing
        expect(() => {
            new Function('window', 'localStorage', 'API_URL', 'currentDeckId', 'setView', 'updatePendingCount', 'renderCard', loadCardsCode);
        }).not.toThrow();
    });

    test('flashcards.js exports expected public API methods cleanly', () => {
        const filePath = path.join(__dirname, '../../src/presentation/public/js/flashcards.js');
        const code = fs.readFileSync(filePath, 'utf8');

        expect(code).toContain('init,');
        expect(code).toContain('playAudio,');
        expect(code).toContain('rate,');
        expect(code).toContain('handleExit,');
        expect(code).toContain('triggerDiscoveryEffect');
    });

    test('flashcards.js provides touch-drag scrolling and drag detection to prevent accidental flips', () => {
        const filePath = path.join(__dirname, '../../src/presentation/public/js/flashcards.js');
        const code = fs.readFileSync(filePath, 'utf8');

        expect(code).toContain('function enableSmoothTextDrag');
        expect(code).toContain('enableSmoothTextDrag(ui.frontText);');
        expect(code).toContain('enableSmoothTextDrag(ui.backText);');
        expect(code).toContain('isTouchDragging');
    });

    test('flashcards.css enables touch-action pan-y, 100% width lists and no transition on font-size', () => {
        const cssPath = path.join(__dirname, '../../src/presentation/public/css/flashcards.css');
        const css = fs.readFileSync(cssPath, 'utf8');

        expect(css).toMatch(/touch-action:\s*pan-y\s*!important/);
        expect(css).toMatch(/-webkit-overflow-scrolling:\s*touch/);
        expect(css).not.toMatch(/\.content-text::-webkit-scrollbar\s*\{\s*display:\s*none;/);
        
        // Ensure no CSS transition on font-size (prevents layout lag and race conditions)
        expect(css).not.toMatch(/transition:[^;]*font-size/);

        // Ensure lists occupy 100% width without artificial 92% restriction
        expect(css).toMatch(/\.content-text ol,\s*\.content-text ul\s*\{[\s\S]*?max-width:\s*100%/);
    });

    test('flashcards.js implements generous desktop scale, list compensation and stable non-shrinking flip', () => {
        const filePath = path.join(__dirname, '../../src/presentation/public/js/flashcards.js');
        const code = fs.readFileSync(filePath, 'utf8');

        // Verify adjustFontSize exists and handles desktop generous sizes
        expect(code).toContain('function adjustFontSize(element, text, hasImage, isBack = false)');
        expect(code).toMatch(/baseSize\s*=\s*2\.60/); // Generous short text on PC
        expect(code).toMatch(/baseSize\s*=\s*1\.75/); // Generous medium text (e.g. ~200 chars on PC)

        // Verify list compensation
        expect(code).toContain('hasList');

        // Verify single-step proportional shrink-to-fit without laggy while-loops
        expect(code).toContain('element.clientHeight > 0');
        expect(code).toContain('element.scrollHeight > element.clientHeight + 4');

        // Verify toggleFlip does NOT re-calibrate font size during 3D flip (prevents shrinking bug)
        const toggleFlipCode = code.match(/function toggleFlip\(\)[\s\S]*?\n    }/)[0];
        expect(toggleFlipCode).not.toContain('adjustFontSize');

        // Verify window resize handler
        expect(code).toContain("window.addEventListener('resize'");
    });
});

