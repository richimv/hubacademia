const UserRepository = require('../../src/domain/repositories/userRepository');
const db = require('../../src/infrastructure/database/db');

// Mock database
jest.mock('../../src/infrastructure/database/db');

describe('UserRepository', () => {
    let userRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        userRepository = new UserRepository();
    });

    describe('findById', () => {
        it('should map database row to User model correctly including new limit usage fields', async () => {
            const mockRow = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: 'hash123',
                role: 'student',
                name: 'Test Student',
                subscription_status: 'active',
                payment_id: 'pay-456',
                usage_count: 5,
                max_free_limit: 20,
                subscription_tier: 'basic',
                subscription_expires_at: '2026-12-31',
                daily_simulator_usage: 2,
                daily_ai_usage: 10,
                daily_arena_usage: 3,
                last_usage_reset: '2026-06-02',
                last_name_change_at: null,
                monthly_flashcards_usage: 4,
                daily_import_usage: 1,
                last_free_renewal: '2026-06-12T12:00:00Z'
            };

            db.query.mockResolvedValue({ rows: [mockRow] });

            const result = await userRepository.findById('user-123');

            expect(db.query).toHaveBeenCalledWith(
                'SELECT * FROM users WHERE id = $1',
                ['user-123']
            );
            expect(result.id).toBe('user-123');
            expect(result.email).toBe('test@example.com');
            expect(result.monthlyFlashcardsUsage).toBe(4);
            expect(result.dailyImportUsage).toBe(1);
            expect(result.lastFreeRenewal).toBe('2026-06-12T12:00:00Z');
        });
    });

    describe('update', () => {
        it('should generate SQL containing new usage fields and execute query', async () => {
            const mockRow = { id: 'user-123', name: 'Updated Name' };
            db.query.mockResolvedValue({ rows: [mockRow] });

            await userRepository.update('user-123', {
                name: 'Updated Name',
                monthlyFlashcardsUsage: 5,
                dailyImportUsage: 2
            });

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('monthly_flashcards_usage = $'),
                expect.any(Array)
            );
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('daily_import_usage = $'),
                expect.any(Array)
            );
        });
    });
});
