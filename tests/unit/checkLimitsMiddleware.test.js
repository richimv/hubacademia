const checkAILimits = require('../../src/application/middlewares/checkLimitsMiddleware');
const pool = require('../../src/infrastructure/database/db');

// Mock database pool
jest.mock('../../src/infrastructure/database/db');

describe('Check Limits Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let dbUser;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            user: { id: 1 },
            body: {},
            path: '',
            originalUrl: ''
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();

        const todayPer = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });

        // Default mock user
        dbUser = {
            subscription_tier: 'free',
            subscription_status: 'pending',
            usage_count: 5,
            max_free_limit: 50,
            daily_ai_usage: 0,
            last_usage_reset: todayPer,
            last_free_renewal: new Date().toISOString() // Avoid weekly reset block in middleware
        };

        // Robust mock implementation for database queries
        pool.query.mockImplementation(async (sql, params) => {
            if (sql.includes('SELECT') && sql.includes('subscription_tier')) {
                return { rows: [dbUser] };
            }
            if (sql.includes('SELECT') && sql.includes('last_free_renewal')) {
                return { rows: [{ usage_count: dbUser.usage_count, last_free_renewal: dbUser.last_free_renewal }] };
            }
            return { rows: [] };
        });
    });

    it('should set req.usageType to "usage_count" for free user with lives remaining', async () => {
        dbUser.subscription_tier = 'free';
        dbUser.usage_count = 5;

        const middleware = checkAILimits('chat_standard');
        await middleware(mockReq, mockRes, mockNext);

        expect(mockReq.usageType).toBe('usage_count');
        expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for free user with lives exhausted', async () => {
        dbUser.subscription_tier = 'free';
        dbUser.usage_count = 50;

        const middleware = checkAILimits('chat_standard');
        await middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ reason: 'FREE_LIVES_EXHAUSTED' })
        );
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should set req.usageType to "daily_ai_usage" for active premium user under limit', async () => {
        dbUser.subscription_tier = 'basic';
        dbUser.subscription_status = 'active';
        dbUser.daily_ai_usage = 5;

        const middleware = checkAILimits('chat_standard');
        await middleware(mockReq, mockRes, mockNext);

        expect(mockReq.usageType).toBe('daily_ai_usage');
        expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for active premium user who exceeded daily standard limit', async () => {
        dbUser.subscription_tier = 'basic';
        dbUser.subscription_status = 'active';
        dbUser.daily_ai_usage = 50; // standard limit for basic is 50

        const middleware = checkAILimits('chat_standard');
        await middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ reason: 'DAILY_LIMIT_EXHAUSTED' })
        );
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should enforce limits for ephemeral quiz_tutor chats (no longer bypasses)', async () => {
        // Ephemeral context
        mockReq.body = {
            ephemeral: true,
            context: {
                type: 'quiz_tutor'
            }
        };

        dbUser.subscription_tier = 'free';
        dbUser.usage_count = 50; // exhausted

        const middleware = checkAILimits('chat_standard');
        await middleware(mockReq, mockRes, mockNext);

        // Should verify and block because bypass is removed
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
    });
});
