describe('CORS Dynamic Origins Verification', () => {
    const allowedOrigins = [
        'http://localhost:3000',
        'https://chatbot-tutor-uc.vercel.app',
        'https://hubacademia.vercel.app',
        'https://hubacademia.com',
        'https://www.hubacademia.com'
    ];

    const verifyOrigin = (origin) => {
        if (!origin) return true;
        const isLocal = origin.startsWith('http://localhost:') || 
                        origin.startsWith('http://127.0.0.1:') || 
                        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/.test(origin);
                        
        return isLocal || allowedOrigins.includes(origin);
    };

    test('should allow empty origin (native mobile apps)', () => {
        expect(verifyOrigin(null)).toBe(true);
        expect(verifyOrigin(undefined)).toBe(true);
    });

    test('should allow production web domains', () => {
        expect(verifyOrigin('https://hubacademia.com')).toBe(true);
        expect(verifyOrigin('https://www.hubacademia.com')).toBe(true);
        expect(verifyOrigin('https://hubacademia.vercel.app')).toBe(true);
        expect(verifyOrigin('https://chatbot-tutor-uc.vercel.app')).toBe(true);
    });

    test('should allow local development environments (web preview/Expo ports)', () => {
        expect(verifyOrigin('http://localhost:8081')).toBe(true);
        expect(verifyOrigin('http://localhost:3000')).toBe(true);
        expect(verifyOrigin('http://localhost:19006')).toBe(true);
        expect(verifyOrigin('http://127.0.0.1:8081')).toBe(true);
    });

    test('should allow local IP addresses for physical device testing', () => {
        expect(verifyOrigin('http://192.168.1.15:8081')).toBe(true);
        expect(verifyOrigin('http://192.168.0.100:19000')).toBe(true);
    });

    test('should deny unauthorized third-party domains', () => {
        expect(verifyOrigin('https://hackerdomain.com')).toBe(false);
        expect(verifyOrigin('http://localhost.hacker.com')).toBe(false);
        expect(verifyOrigin('http://192.168.1111.1:8081')).toBe(false);
    });
});
