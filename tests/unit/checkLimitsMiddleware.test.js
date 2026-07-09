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
            max_free_limit: 20,
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
        dbUser.usage_count = 20;

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
        dbUser.usage_count = 20; // exhausted

        const middleware = checkAILimits('chat_standard');
        await middleware(mockReq, mockRes, mockNext);

        // Should verify and block because bypass is removed
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fallback to non-RAG and daily_ai_usage for Basic user requesting a RAG chat', async () => {
        mockReq.body = { specialization: 'medicine' }; // RAG request
        dbUser.subscription_tier = 'basic';
        dbUser.subscription_status = 'active';
        dbUser.daily_ai_usage = 10;
        dbUser.daily_rag_usage = 0;

        const middleware = checkAILimits('chat_standard');
        await middleware(mockReq, mockRes, mockNext);

        expect(mockReq.useRag).toBe(false); // Basic has 0 RAG limit
        expect(mockReq.usageType).toBe('daily_ai_usage');
        expect(mockNext).toHaveBeenCalled();
    });

    it('should allow RAG and daily_rag_usage for Advanced user under RAG limit', async () => {
        mockReq.body = { specialization: 'medicine' }; // RAG request
        dbUser.subscription_tier = 'advanced';
        dbUser.subscription_status = 'active';
        dbUser.daily_ai_usage = 10;
        dbUser.daily_rag_usage = 5; // Under 25 RAG limit

        const middleware = checkAILimits('chat_standard');
        await middleware(mockReq, mockRes, mockNext);

        expect(mockReq.useRag).toBe(true);
        expect(mockReq.usageType).toBe('daily_rag_usage');
        expect(mockNext).toHaveBeenCalled();
    });

    it('should fallback to non-RAG and daily_ai_usage for Advanced user who exceeded RAG limit but is under standard limit', async () => {
        mockReq.body = { specialization: 'medicine' }; // RAG request
        dbUser.subscription_tier = 'advanced';
        dbUser.subscription_status = 'active';
        dbUser.daily_ai_usage = 10; // Under 100 limit
        dbUser.daily_rag_usage = 25; // Exceeded RAG limit

        const middleware = checkAILimits('chat_standard');
        await middleware(mockReq, mockRes, mockNext);

        expect(mockReq.useRag).toBe(false); // Fallback to no RAG
        expect(mockReq.usageType).toBe('daily_ai_usage');
        expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for Advanced user who exceeded RAG limit and standard daily AI limit', async () => {
        mockReq.body = { specialization: 'medicine' }; // RAG request
        dbUser.subscription_tier = 'advanced';
        dbUser.subscription_status = 'active';
        dbUser.daily_ai_usage = 100; // Exceeded standard limit
        dbUser.daily_rag_usage = 25; // Exceeded RAG limit

        const middleware = checkAILimits('chat_standard');
        await middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ reason: 'DAILY_LIMIT_EXHAUSTED' })
        );
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should disable RAG and charge 1 life for Free user with lives remaining', async () => {
        mockReq.body = { specialization: 'medicine' }; // RAG request
        dbUser.subscription_tier = 'free';
        dbUser.usage_count = 15; // 5 lives remaining (out of 20)

        const middleware = checkAILimits('chat_standard');
        await middleware(mockReq, mockRes, mockNext);

        expect(mockReq.useRag).toBe(false); // RAG always false for Free
        expect(mockReq.usageType).toBe('usage_count');
        expect(mockReq.cost).toBe(1);
        expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for Free user with lives exhausted requesting RAG', async () => {
        mockReq.body = { specialization: 'medicine' }; // RAG request
        dbUser.subscription_tier = 'free';
        dbUser.usage_count = 20; // 0 lives remaining

        const middleware = checkAILimits('chat_standard');
        await middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ reason: 'FREE_LIVES_EXHAUSTED' })
        );
        expect(mockNext).not.toHaveBeenCalled();
    });
});
