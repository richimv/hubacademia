const db = require('../../infrastructure/database/db');

class UserPreferencesRepository {
    /**
     * Obtiene la configuración del simulador para un usuario y dominio específico.
     * @param {string} userId - UUID del usuario
     * @param {string} domain - E.g. 'medicine', 'education'
     * @returns {Promise<Object|null>} Objeto de configuración JSON o null si no existe
     */
    async findByUserAndDomain(userId, domain) {
        try {
            const query = `
                SELECT config_json
                FROM user_simulator_preferences
                WHERE user_id = $1 AND domain = $2;
            `;
            const res = await db.query(query, [userId, domain]);

            if (res.rows.length > 0) {
                return res.rows[0].config_json;
            }
            return null;
        } catch (error) {
            console.error('❌ [UserPreferencesRepository] Error en findByUserAndDomain:', error.message);
            throw error;
        }
    }

    /**
     * Inserta o actualiza (upsert) la configuración del simulador para un usuario.
     * @param {string} userId - UUID del usuario
     * @param {string} domain - Nombre del dominio (e.g. 'medicine', 'education')
     * @param {Object|string} configJson - Estado a persistir
     * @returns {Promise<Object|null>} Configuración persistida
     */
    async upsert(userId, domain, configJson) {
        try {
            const query = `
                INSERT INTO user_simulator_preferences (user_id, domain, config_json, updated_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (user_id, domain)
                DO UPDATE SET config_json = EXCLUDED.config_json, updated_at = EXCLUDED.updated_at
                RETURNING config_json;
            `;

            const serializedJson = typeof configJson === 'object' ? JSON.stringify(configJson) : configJson;
            const res = await db.query(query, [userId, domain, serializedJson]);
            return res.rows[0] ? res.rows[0].config_json : null;
        } catch (error) {
            console.error('❌ [UserPreferencesRepository] Error en upsert:', error.message);
            throw error;
        }
    }
}

module.exports = UserPreferencesRepository;
