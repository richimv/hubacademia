const adminService = require('../../domain/services/adminService');
const adminRepository = require('../../domain/repositories/adminRepository');

jest.mock('../../domain/repositories/adminRepository');
jest.mock('../../infrastructure/database/db');

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
