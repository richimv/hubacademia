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
});
