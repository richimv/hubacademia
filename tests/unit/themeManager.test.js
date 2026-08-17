/**
 * themeManager.test.js
 * Pruebas unitarias para el motor de temas centralizado (ThemeManager)
 */

describe('ThemeManager Engine', () => {
    let mockStorage = {};
    let mockDocumentElement;
    let ThemeManager;

    beforeEach(() => {
        mockStorage = {};

        // Mock localStorage
        global.localStorage = {
            getItem: jest.fn(key => mockStorage[key] || null),
            setItem: jest.fn((key, value) => {
                mockStorage[key] = String(value);
            }),
            removeItem: jest.fn(key => {
                delete mockStorage[key];
            }),
            clear: jest.fn(() => {
                mockStorage = {};
            })
        };

        // Mock DOM
        mockDocumentElement = {
            setAttribute: jest.fn(),
            getAttribute: jest.fn(attr => 'dark')
        };

        global.document = {
            documentElement: mockDocumentElement,
            querySelector: jest.fn(() => null),
            querySelectorAll: jest.fn(() => []),
            addEventListener: jest.fn(),
            readyState: 'complete'
        };

        global.window = {
            matchMedia: jest.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                addListener: jest.fn(),
                removeListener: jest.fn()
            }))
        };

        // Re-require ThemeManager module
        jest.isolateModules(() => {
            const module = require('../../src/presentation/public/js/utils/themeManager');
            ThemeManager = module.ThemeManager;
        });
    });

    test('debe inicializarse con dark mode por defecto si no hay preferencia guardada', () => {
        const manager = new ThemeManager();
        expect(manager.getTheme()).toBe('dark');
        expect(manager.isDark()).toBe(true);
        expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });

    test('debe cargar el tema guardado en localStorage', () => {
        mockStorage['hub_theme'] = 'light';
        const manager = new ThemeManager();
        expect(manager.getTheme()).toBe('light');
        expect(manager.isDark()).toBe(false);
        expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    });

    test('toggleTheme() debe alternar entre dark y light y persistir en localStorage', () => {
        const manager = new ThemeManager();
        expect(manager.getTheme()).toBe('dark');

        const newTheme = manager.toggleTheme();
        expect(newTheme).toBe('light');
        expect(manager.getTheme()).toBe('light');
        expect(manager.isDark()).toBe(false);
        expect(global.localStorage.setItem).toHaveBeenCalledWith('hub_theme', 'light');
        expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');

        const revertedTheme = manager.toggleTheme();
        expect(revertedTheme).toBe('dark');
        expect(manager.getTheme()).toBe('dark');
        expect(manager.isDark()).toBe(true);
        expect(global.localStorage.setItem).toHaveBeenCalledWith('hub_theme', 'dark');
    });

    test('setTheme() debe aplicar únicamente temas válidos (dark, light)', () => {
        const manager = new ThemeManager();
        manager.setTheme('light');
        expect(manager.getTheme()).toBe('light');

        // Intento de setear un tema inválido no debe modificar el estado
        manager.setTheme('invalid_neon');
        expect(manager.getTheme()).toBe('light');
    });

    test('onThemeChange() debe notificar a los suscriptores cuando cambia el tema', () => {
        const manager = new ThemeManager();
        const listener = jest.fn();
        manager.onThemeChange(listener);

        manager.toggleTheme();
        expect(listener).toHaveBeenCalledWith('light');

        manager.setTheme('dark');
        expect(listener).toHaveBeenCalledWith('dark');
    });
});
