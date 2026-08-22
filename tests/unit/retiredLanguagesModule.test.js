const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../..');

function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Retired language-learning module boundaries', () => {
    test('simulator assets contain no obsolete context, API or vocabulary UI', () => {
        const files = [
            'src/presentation/public/js/simulator-dash.js',
            'src/presentation/public/simulator-dashboard.html',
            'src/presentation/public/css/simulator-dashboard.css',
            'src/presentation/public/css/simulators.css'
        ];
        const source = files.map(read).join('\n');

        expect(source).not.toMatch(/IDIOMAS|\/api\/languages|idiomas-simulator/i);
        expect(source).not.toMatch(/my-vocabulary|language-tutor|vocab-table|lesson-editor/i);
    });

    test('server exposes no obsolete frontend aliases', () => {
        const source = read('src/infrastructure/config/server.js');

        expect(source).not.toMatch(/language-tutor|my-vocabulary/i);
    });

    test('flashcard tutor prompt has no dedicated language-learning branch', () => {
        const source = read('src/domain/prompts/chatPrompts.js');

        expect(source).not.toMatch(/Si la tarjeta es de \*\*Idiomas\*\*/i);
    });

    test('obsolete category is normalized while active categories are preserved', () => {
        const deckController = require('../../src/application/controllers/deckController');

        expect(deckController._normalizeCategory('Idiomas')).toBe('General');
        expect(deckController._normalizeCategory('Educación')).toBe('Educación');
        expect(deckController._normalizeCategory('Tecnología')).toBe('Tecnología');
    });

    test('TTS voice resolution has no dependency on the retired repository', () => {
        const source = read('src/domain/services/ttsService.js');

        expect(source).not.toMatch(/LanguageRepository|languageRepository/);
    });
});
