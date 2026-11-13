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

    test('flashcards.js exports expected public API methods cleanly and evaluates without ReferenceError', () => {
        const filePath = path.join(__dirname, '../../src/presentation/public/js/flashcards.js');
        const code = fs.readFileSync(filePath, 'utf8');

        expect(code).toContain('init,');
        expect(code).not.toContain('playAudio');
        expect(code).toContain('rate,');
        expect(code).toContain('handleExit,');
        expect(code).toContain('triggerDiscoveryEffect');

        // Test runtime execution of FlashcardManager IIFE in mocked DOM sandbox
        const vm = require('vm');
        const sandbox = {
            window: {
                addEventListener: jest.fn(),
                AppConfig: { API_URL: 'http://localhost:3000' }
            },
            document: {
                addEventListener: jest.fn(),
                getElementById: jest.fn().mockReturnValue({
                    querySelector: jest.fn().mockReturnValue({}),
                    querySelectorAll: jest.fn().mockReturnValue([]),
                    addEventListener: jest.fn(),
                    classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() }
                })
            },
            localStorage: { getItem: jest.fn(), setItem: jest.fn() },
            sessionStorage: { getItem: jest.fn(), setItem: jest.fn() },
            console,
            setTimeout,
            clearTimeout
        };
        vm.createContext(sandbox);

        let exportedManager;
        expect(() => {
            exportedManager = vm.runInContext(code + '\n;FlashcardManager;', sandbox);
        }).not.toThrow();

        expect(exportedManager).toBeDefined();
        expect(typeof exportedManager.init).toBe('function');
        expect(typeof exportedManager.rate).toBe('function');
        expect(typeof exportedManager.handleExit).toBe('function');
        expect(typeof exportedManager.triggerDiscoveryEffect).toBe('function');
        expect(exportedManager.playAudio).toBeUndefined();
    });
});

