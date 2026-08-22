const UsageService = require('../../src/domain/services/usageService');

describe('UsageService', () => {
    it('delegates weekly renewal to UserRepository', async () => {
        const userRepository = {
            renewWeeklyLivesIfNeeded: jest.fn().mockResolvedValue(true)
        };
        const usageService = new UsageService(userRepository);

        await expect(usageService.renewWeeklyLivesIfNeeded('user-123')).resolves.toBe(true);
        expect(userRepository.renewWeeklyLivesIfNeeded).toHaveBeenCalledWith('user-123');
    });

    it('fails soft when renewal persistence fails', async () => {
        const userRepository = {
            renewWeeklyLivesIfNeeded: jest.fn().mockRejectedValue(new Error('DB unavailable'))
        };
        const usageService = new UsageService(userRepository);

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
});
