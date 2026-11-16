const UserPreferencesRepository = require('../../src/domain/repositories/userPreferencesRepository');
const UserPreferencesService = require('../../src/domain/services/userPreferencesService');
const db = require('../../src/infrastructure/database/db');

jest.mock('../../src/infrastructure/database/db');

describe('UserPreferencesRepository & UserPreferencesService (4-Layer Decoupling)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('UserPreferencesRepository', () => {
        let repository;

        beforeEach(() => {
            repository = new UserPreferencesRepository();
        });

        it('findByUserAndDomain returns config_json when row exists and null when absent', async () => {
            const expectedConfig = { target: 'SERUMS', difficulty: 'Avanzado', areas: ['Medicina Interna'] };
            db.query.mockResolvedValueOnce({ rows: [{ config_json: expectedConfig }] });

            const found = await repository.findByUserAndDomain('user-1', 'medicine');
            expect(found).toEqual(expectedConfig);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('FROM user_simulator_preferences'),
                ['user-1', 'medicine']
            );

            db.query.mockResolvedValueOnce({ rows: [] });
            const missing = await repository.findByUserAndDomain('user-1', 'education');
            expect(missing).toBeNull();
        });

        it('upsert serializes object config_json and returns persisted row', async () => {
            const configObj = { target: 'ASCENSO', targetScale: 4 };
            db.query.mockResolvedValueOnce({ rows: [{ config_json: configObj }] });

            const saved = await repository.upsert('user-2', 'education', configObj);
            expect(saved).toEqual(configObj);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('ON CONFLICT (user_id, domain)'),
                ['user-2', 'education', JSON.stringify(configObj)]
            );
        });
    });

    describe('UserPreferencesService', () => {
        it('delegates getPreferences and savePreferences to UserPreferencesRepository without touching db', async () => {
            const mockRepo = {
                findByUserAndDomain: jest.fn().mockResolvedValue({ target: 'ENAM' }),
                upsert: jest.fn().mockResolvedValue({ target: 'ENAM', difficulty: 'Básico' })
            };
            const service = new UserPreferencesService(mockRepo);

            const loaded = await service.getPreferences('user-1', 'medicine');
            expect(loaded).toEqual({ target: 'ENAM' });
            expect(mockRepo.findByUserAndDomain).toHaveBeenCalledWith('user-1', 'medicine');

            const saved = await service.savePreferences('user-1', 'medicine', { target: 'ENAM', difficulty: 'Básico' });
            expect(saved).toEqual({ target: 'ENAM', difficulty: 'Básico' });
            expect(mockRepo.upsert).toHaveBeenCalledWith('user-1', 'medicine', { target: 'ENAM', difficulty: 'Básico' });
            expect(db.query).not.toHaveBeenCalled();
        });

        it('validates mandatory arguments in getPreferences and savePreferences', async () => {
            const service = new UserPreferencesService({
                findByUserAndDomain: jest.fn(),
                upsert: jest.fn()
            });

            await expect(service.getPreferences('', 'medicine')).rejects.toThrow('user_id and domain are required.');
            await expect(service.savePreferences('user-1', '', {})).rejects.toThrow('user_id, domain, and config_json are required.');
        });
    });
});
