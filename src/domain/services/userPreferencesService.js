const UserPreferencesRepository = require('../repositories/userPreferencesRepository');

class UserPreferencesService {
    constructor(userPreferencesRepository = new UserPreferencesRepository()) {
        this.userPreferencesRepository = userPreferencesRepository;
    }

    /**
     * Retrieves the simulator configuration for a user in a specific domain.
     * @param {string} userId - UUID matching auth.users
     * @param {string} domain - E.g. 'medicine', 'education'
     * @returns {Promise<Object|null>} JSON configuration object or null if not found
     */
    async getPreferences(userId, domain) {
        if (!userId || !domain) throw new Error('user_id and domain are required.');

        try {
            return await this.userPreferencesRepository.findByUserAndDomain(userId, domain);
        } catch (error) {
            console.error('❌ [UserPreferencesService] Error en getPreferences:', error.message);
            throw error;
        }
    }

    /**
     * Upserts (Inserts or Updates) the simulator configuration for a user.
     * @param {string} userId - UUID
     * @param {string} domain - Domain name (e.g. 'medicine')
     * @param {Object} configJson - The state to persist
     * @returns {Promise<Object|null>}
     */
    async savePreferences(userId, domain, configJson) {
        if (!userId || !domain || !configJson) {
            throw new Error('user_id, domain, and config_json are required.');
        }

        try {
            return await this.userPreferencesRepository.upsert(userId, domain, configJson);
        } catch (error) {
            console.error('❌ [UserPreferencesService] Error en savePreferences:', error.message);
            throw error;
        }
    }
}

module.exports = UserPreferencesService;
