const AuthService = require('../../domain/services/authService');

const mockFindById = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('../../domain/repositories/userRepository', () => {
    return jest.fn().mockImplementation(() => {
        return {
            findById: mockFindById,
            create: mockCreate,
            update: mockUpdate,
            delete: mockDelete
        };
    });
});

jest.mock('../../infrastructure/config/supabaseClient');

describe('AuthService', () => {
    let authService;

    beforeEach(() => {
        jest.clearAllMocks();
        authService = new AuthService();
    });

    describe('syncGoogleUser', () => {
        it('should sync Google user successfully', async () => {
            const googleUser = {
                id: 'sb-user-id',
                email: 'test@example.com',
                name: 'Test User'
            };

            const expectedUser = {
                id: 'sb-user-id',
                email: 'test@example.com',
                name: 'Test User',
                role: 'student'
            };

            mockCreate.mockResolvedValue(expectedUser);

            const result = await authService.syncGoogleUser(googleUser);

            expect(result).toEqual(expectedUser);
            expect(mockCreate).toHaveBeenCalledWith({
                id: googleUser.id,
                email: googleUser.email,
                name: googleUser.name,
                role: 'student'
            });
        });

        it('should assign admin role if email is in the admin list', async () => {
            const adminUser = {
                id: 'admin-id',
                email: 'hubacademia01@gmail.com',
                name: 'Admin User'
            };

            const expectedUser = {
                id: 'admin-id',
                email: 'hubacademia01@gmail.com',
                name: 'Admin User',
                role: 'admin'
            };

            mockCreate.mockResolvedValue(expectedUser);

            const result = await authService.syncGoogleUser(adminUser);

            expect(result.role).toBe('admin');
            expect(mockCreate).toHaveBeenCalledWith({
                id: adminUser.id,
                email: adminUser.email,
                name: adminUser.name,
                role: 'admin'
            });
        });
    });

    describe('updateProfile', () => {
        it('should update profile if name change restriction is not violated', async () => {
            const userId = 'user-123';
            const user = {
                id: userId,
                name: 'Old Name',
                lastNameChangeAt: null,
                role: 'student'
            };

            mockFindById.mockResolvedValue(user);
            mockUpdate.mockResolvedValue({
                ...user,
                name: 'New Name'
            });

            const result = await authService.updateProfile(userId, { name: 'New Name' });

            expect(result.name).toBe('New Name');
            expect(mockUpdate).toHaveBeenCalledWith(userId, {
                name: 'New Name',
                last_name_change_at: expect.any(Date)
            });
        });

        it('should throw error if user changed name within 7 days', async () => {
            const userId = 'user-123';
            const lastChange = new Date();
            lastChange.setDate(lastChange.getDate() - 3); // 3 days ago

            const user = {
                id: userId,
                name: 'Old Name',
                lastNameChangeAt: lastChange.toISOString(),
                role: 'student'
            };

            mockFindById.mockResolvedValue(user);

            await expect(authService.updateProfile(userId, { name: 'New Name' }))
                .rejects.toThrow(/Solo puedes cambiar tu nombre una vez por semana/);
        });

        it('should allow admin to change name even if changed within 7 days', async () => {
            const userId = 'admin-123';
            const lastChange = new Date();
            lastChange.setDate(lastChange.getDate() - 3);

            const user = {
                id: userId,
                name: 'Old Admin',
                lastNameChangeAt: lastChange.toISOString(),
                role: 'admin'
            };

            mockFindById.mockResolvedValue(user);
            mockUpdate.mockResolvedValue({
                ...user,
                name: 'New Admin'
            });

            const result = await authService.updateProfile(userId, { name: 'New Admin' });

            expect(result.name).toBe('New Admin');
        });
    });
});
