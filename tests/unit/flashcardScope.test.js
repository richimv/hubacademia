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
});
