const adminService = require('../../src/domain/services/adminService');
const adminRepository = require('../../src/domain/repositories/adminRepository');

jest.mock('../../src/domain/repositories/adminRepository');
jest.mock('../../src/infrastructure/database/db');

describe('AdminService - syncResource', () => {
    const url = 'https://drive.google.com/open?id=test_file_id';
    const title = 'Test Resource';
    const type = 'book';
    const thumb = 'https://storage.googleapis.com/thumbnails/test.jpg';
    const author = 'Test Author';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should insert a new resource when it does not exist', async () => {
        adminRepository.getResourceByUrl.mockResolvedValue(undefined);
        adminRepository.addResource.mockResolvedValue(undefined);

        const result = await adminService.syncResource(url, title, type, thumb, author);

        expect(adminRepository.getResourceByUrl).toHaveBeenCalledWith(url);
        expect(adminRepository.addResource).toHaveBeenCalledWith(
            expect.stringMatching(/^RES_\d+_\d+$/),
            title,
            author,
            url,
            type,
            thumb,
            'medicine',
            false,
            true,
            false
        );
        expect(result).toEqual({ action: 'inserted' });
    });

    it('should update the resource when it already exists', async () => {
        const mockExisting = { id: 42, image_url: 'old_thumb.jpg' };
        adminRepository.getResourceByUrl.mockResolvedValue(mockExisting);
        adminRepository.updateResource.mockResolvedValue(undefined);

        const result = await adminService.syncResource(url, title, type, thumb, author);

        expect(adminRepository.getResourceByUrl).toHaveBeenCalledWith(url);
        expect(adminRepository.updateResource).toHaveBeenCalledWith(
            mockExisting.id,
            title,
            type,
            thumb,
            'medicine',
            false,
            true,
            false
        );
        expect(result).toEqual({ action: 'updated' });
    });

    it('should fallback to update when DB insertion fails with code 23505 (unique_violation)', async () => {
        adminRepository.getResourceByUrl
            // First check: does not exist
            .mockResolvedValueOnce(undefined)
            // Second check (after unique violation catch): returns existing resource
            .mockResolvedValueOnce({ id: 100, image_url: 'existing_thumb.jpg' });

        const dbError = new Error('duplicate key value violates unique constraint');
        dbError.code = '23505';
        adminRepository.addResource.mockRejectedValue(dbError);
        adminRepository.updateResource.mockResolvedValue(undefined);

        const result = await adminService.syncResource(url, title, type, thumb, author);

        expect(adminRepository.getResourceByUrl).toHaveBeenCalledTimes(2);
        expect(adminRepository.addResource).toHaveBeenCalled();
        expect(adminRepository.updateResource).toHaveBeenCalledWith(
            100,
            title,
            type,
            thumb,
            'medicine',
            false,
            true,
            false
        );
        expect(result).toEqual({ action: 'updated' });
    });

    it('should propagate other database errors', async () => {
        adminRepository.getResourceByUrl.mockResolvedValue(undefined);
        const dbError = new Error('connection lost');
        dbError.code = '08003';
        adminRepository.addResource.mockRejectedValue(dbError);

        await expect(adminService.syncResource(url, title, type, thumb, author))
            .rejects.toThrow('connection lost');
    });

    it('should serialize concurrent sync calls for the same URL', async () => {
        let activeCalls = 0;
        let maxActiveCalls = 0;

        adminRepository.getResourceByUrl.mockImplementation(async () => {
            activeCalls++;
            maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
            // Simulate database response latency
            await new Promise(resolve => setTimeout(resolve, 50));
            activeCalls--;
            return { id: 123, image_url: 'thumb.jpg' };
        });
        adminRepository.updateResource.mockResolvedValue(undefined);

        // Run concurrent sync resource operations for the same URL
        const p1 = adminService.syncResource(url, title, type, thumb, author);
        const p2 = adminService.syncResource(url, title, type, thumb, author);

        await Promise.all([p1, p2]);

        // Max active concurrent calls querying db for the same URL should be 1 due to our locking/serialization
        expect(maxActiveCalls).toBe(1);
    });
});

describe('AdminService - update subscription consistency', () => {
    let mockUserRepo;

    beforeEach(() => {
        mockUserRepo = {
            findById: jest.fn(),
            update: jest.fn()
        };
        adminService.repositories.user = mockUserRepo;
    });

    it('should force free tier to pending status when active is requested', async () => {
        mockUserRepo.findById.mockResolvedValue({ id: 'u1', subscriptionTier: 'free', subscriptionStatus: 'inactive' });
        mockUserRepo.update.mockResolvedValue({ id: 'u1', subscriptionTier: 'free', subscriptionStatus: 'pending' });

        const result = await adminService.update('student', 'u1', {
            subscriptionTier: 'free',
            subscriptionStatus: 'active'
        });

        expect(mockUserRepo.update).toHaveBeenCalledWith('u1', expect.objectContaining({
            subscriptionTier: 'free',
            subscriptionStatus: 'pending',
            subscriptionExpiresAt: null
        }));
    });

    it('should force basic tier to active and calculate 2 months expiration if not provided', async () => {
        mockUserRepo.findById.mockResolvedValue({ id: 'u1', subscriptionTier: 'free', subscriptionStatus: 'pending' });
        mockUserRepo.update.mockResolvedValue({ id: 'u1', subscriptionTier: 'basic', subscriptionStatus: 'active' });

        const result = await adminService.update('student', 'u1', {
            subscriptionTier: 'basic'
        });

        const expectedExpires = new Date();
        expectedExpires.setMonth(expectedExpires.getMonth() + 2);

        expect(mockUserRepo.update).toHaveBeenCalledWith('u1', expect.objectContaining({
            subscriptionTier: 'basic',
            subscriptionStatus: 'active'
        }));
        
        const updateArg = mockUserRepo.update.mock.calls[0][1];
        expect(updateArg.subscriptionExpiresAt).toBeInstanceOf(Date);
        // Verificar que la diferencia es de aproximadamente 2 meses (en ms)
        const diffMonths = (updateArg.subscriptionExpiresAt - new Date()) / (1000 * 60 * 60 * 24 * 30);
        expect(diffMonths).toBeCloseTo(2, 0);
    });

    it('should force advanced tier to active and calculate 6 months expiration if not provided', async () => {
        mockUserRepo.findById.mockResolvedValue({ id: 'u1', subscriptionTier: 'free', subscriptionStatus: 'pending' });
        mockUserRepo.update.mockResolvedValue({ id: 'u1', subscriptionTier: 'advanced', subscriptionStatus: 'active' });

        const result = await adminService.update('student', 'u1', {
            subscriptionTier: 'advanced'
        });

        expect(mockUserRepo.update).toHaveBeenCalledWith('u1', expect.objectContaining({
            subscriptionTier: 'advanced',
            subscriptionStatus: 'active'
        }));

        const updateArg = mockUserRepo.update.mock.calls[0][1];
        expect(updateArg.subscriptionExpiresAt).toBeInstanceOf(Date);
        const diffMonths = (updateArg.subscriptionExpiresAt - new Date()) / (1000 * 60 * 60 * 24 * 30);
        expect(diffMonths).toBeCloseTo(6, 0);
    });

    it('should force tier to free and expires_at to null when expired status is set', async () => {
        mockUserRepo.findById.mockResolvedValue({ id: 'u1', subscriptionTier: 'basic', subscriptionStatus: 'active', subscriptionExpiresAt: new Date() });
        mockUserRepo.update.mockResolvedValue({ id: 'u1', subscriptionTier: 'free', subscriptionStatus: 'expired' });

        const result = await adminService.update('student', 'u1', {
            subscriptionStatus: 'expired'
        });

        expect(mockUserRepo.update).toHaveBeenCalledWith('u1', expect.objectContaining({
            subscriptionTier: 'free',
            subscriptionStatus: 'expired',
            subscriptionExpiresAt: null
        }));
    });
});

