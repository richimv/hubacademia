const UsageService = require('../../src/domain/services/usageService');

describe('UsageService', () => {
    it('delegates monthly renewal to UserRepository', async () => {
        const userRepository = {
            renewFreeLivesIfNeeded: jest.fn().mockResolvedValue(true),
            renewWeeklyLivesIfNeeded: jest.fn().mockResolvedValue(true)
        };
        const usageService = new UsageService(userRepository);

        await expect(usageService.renewFreeLivesIfNeeded('user-123')).resolves.toBe(true);
        expect(userRepository.renewFreeLivesIfNeeded).toHaveBeenCalledWith('user-123');

        await expect(usageService.renewWeeklyLivesIfNeeded('user-123')).resolves.toBe(true);
    });

    it('fails soft when renewal persistence fails', async () => {
        const userRepository = {
            renewFreeLivesIfNeeded: jest.fn().mockRejectedValue(new Error('DB unavailable')),
            renewWeeklyLivesIfNeeded: jest.fn().mockRejectedValue(new Error('DB unavailable'))
        };
        const usageService = new UsageService(userRepository);

        await expect(usageService.renewFreeLivesIfNeeded('user-123')).resolves.toBe(false);
        await expect(usageService.renewWeeklyLivesIfNeeded('user-123')).resolves.toBe(false);
    });

    it('delegates free usage consumption to an atomic repository operation', async () => {
        const userRepository = {
            findById: jest.fn().mockResolvedValue({
                role: 'student',
                subscriptionTier: 'free',
                subscriptionStatus: 'pending'
            }),
            consumeFreeUsage: jest.fn().mockResolvedValue({ allowed: true, usage: 4, limit: 10 })
        };
        const usageService = new UsageService(userRepository);

        await expect(usageService.checkAndIncrementUsage('user-123', 2)).resolves.toEqual({
            allowed: true,
            plan: 'free',
            usage: 4,
            limit: 10
        });
        expect(userRepository.consumeFreeUsage).toHaveBeenCalledWith('user-123', 2);
    });

    it('returns LIMIT_REACHED when the atomic reservation is rejected', async () => {
        const userRepository = {
            findById: jest.fn().mockResolvedValue({
                role: 'student',
                subscriptionTier: 'free',
                subscriptionStatus: 'pending'
            }),
            consumeFreeUsage: jest.fn().mockResolvedValue({ allowed: false, usage: 10, limit: 10 })
        };
        const usageService = new UsageService(userRepository);

        await expect(usageService.checkAndIncrementUsage('user-123')).resolves.toEqual({
            allowed: false,
            plan: 'free',
            usage: 10,
            limit: 10,
            reason: 'LIMIT_REACHED'
        });
    });

    it('rejects zero or negative usage amounts', async () => {
        const usageService = new UsageService({});
        await expect(usageService.checkAndIncrementUsage('user-123', 0)).rejects.toThrow('entero positivo');
    });

    it('delegates findLimitsProfileById, expireSubscription, resetDailyUsage and resetMonthlyFlashcards to UserRepository', async () => {
        const userRepository = {
            findLimitsProfileById: jest.fn().mockResolvedValue({ subscription_tier: 'basic' }),
            expireSubscription: jest.fn().mockResolvedValue(true),
            resetDailyUsage: jest.fn().mockResolvedValue(true),
            resetMonthlyFlashcards: jest.fn().mockResolvedValue({ reset: true, month: '2026-11' })
        };
        const usageService = new UsageService(userRepository);

        await expect(usageService.findLimitsProfileById('user-1')).resolves.toEqual({ subscription_tier: 'basic' });
        await expect(usageService.expireSubscription('user-1')).resolves.toBe(true);
        await expect(usageService.resetDailyUsage('user-1', { todayDate: '2026-11-16' })).resolves.toBe(true);
        await expect(usageService.resetMonthlyFlashcards('user-1', '2026-11')).resolves.toEqual({ reset: true, month: '2026-11' });

        expect(userRepository.findLimitsProfileById).toHaveBeenCalledWith('user-1');
        expect(userRepository.expireSubscription).toHaveBeenCalledWith('user-1');
        expect(userRepository.resetDailyUsage).toHaveBeenCalledWith('user-1', { todayDate: '2026-11-16' });
        expect(userRepository.resetMonthlyFlashcards).toHaveBeenCalledWith('user-1', '2026-11');
    });
});
