/**
 * guestSessionManager.test.js
 * Pruebas unitarias para GuestSessionManager (Límites y ciclo de vida de caché para visitantes)
 */

const { GuestSessionManager } = require('../../src/presentation/public/js/sessionManager.js');

describe('GuestSessionManager Engine', () => {
    let mockStorage = {};

    beforeEach(() => {
        mockStorage = {};

        // Mock localStorage
        global.localStorage = {
            getItem: jest.fn(key => (key in mockStorage ? mockStorage[key] : null)),
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

        global.window = {
            supabaseClient: null,
            location: { pathname: '/', href: '/' }
        };
    });

    it('should allow taking a demo when count is 0', () => {
        expect(GuestSessionManager.canTakeDailyDemo()).toBe(true);
    });

    it('should record demo attempt and block second attempt on the same day (1 demo/day limit)', () => {
        expect(GuestSessionManager.canTakeDailyDemo()).toBe(true);
        GuestSessionManager.recordDemoAttempt();

        expect(global.localStorage.getItem('demo_sessions_count')).toBe('1');
        expect(GuestSessionManager.canTakeDailyDemo()).toBe(false);
    });

    it('should save and retrieve guest demo stats within the same day', () => {
        const mockStats = {
            avgScore: '14.5',
            accuracy: 75,
            correct: 7,
            incorrect: 3,
            areaStats: { 'Salud Pública': { correct: 3, total: 4 } }
        };

        GuestSessionManager.saveGuestStats('MEDICINA', mockStats);
        const retrieved = GuestSessionManager.getGuestStats('MEDICINA');

        expect(retrieved).not.toBeNull();
        expect(retrieved.avgScore).toBe('14.5');
        expect(retrieved.accuracy).toBe(75);
        expect(retrieved.savedAtDate).toBe(GuestSessionManager.getTodayDateStr());
    });

    it('should automatically clean expired guest data when date changes (1-day TTL data retention)', () => {
        const yesterdayStr = '2026-08-19';
        global.localStorage.setItem('demo_sessions_date', yesterdayStr);
        global.localStorage.setItem('demo_sessions_count', '1');
        global.localStorage.setItem('guest_demo_stats_medicina', JSON.stringify({ avgScore: '15.0' }));
        global.localStorage.setItem('guest_demo_stats_educacion', JSON.stringify({ avgScore: '18.0' }));

        // Al cambiar de día, las estadísticas previas caducan y el contador se resetea a 0
        expect(GuestSessionManager.canTakeDailyDemo()).toBe(true);
        expect(global.localStorage.getItem('demo_sessions_count')).toBe('0');
        expect(global.localStorage.getItem('guest_demo_stats_medicina')).toBeNull();
        expect(global.localStorage.getItem('guest_demo_stats_educacion')).toBeNull();
        expect(GuestSessionManager.getGuestStats('MEDICINA')).toBeNull();
    });
});
