const db = require('../../infrastructure/database/db');
const { normalizeText } = require('../utils/textUtils');

/**
 * Repositorio para manejar las operaciones de datos de las carreras desde Supabase.
 */
class CareerRepository {

    async findAll(filters = {}) {
        let query = 'SELECT * FROM careers';
        const params = [];
        if (filters.domain) {
            query += ' WHERE domain = $1';
            params.push(filters.domain);
        }
        query += ' ORDER BY name';
        const { rows } = await db.query(query, params);
        return rows;
    }

    async findById(id) {
        const { rows } = await db.query('SELECT * FROM careers WHERE id = $1', [id]);
        return rows[0];
    }

    /**
     * Busca una carrera por su nombre (usado por el LLM).
     * @param {string} query El nombre de la carrera a buscar.
     * @returns {Promise<object|null>} El objeto de la carrera encontrada o null.
     */
    async search(query) {
        const normalizedQuery = normalizeText(query);
        const { rows } = await db.query(
            "SELECT * FROM careers WHERE unaccent(name) ILIKE unaccent($1) LIMIT 1",
            [`%${normalizedQuery}%`]
        );
        return rows[0] || null;
    }

    async create(careerData) {
        const { name, area, image_url, domain = 'medicine' } = careerData;
        const tempCareerId = `CAREER_${Date.now()}`;

        const { rows } = await db.query(
            'INSERT INTO careers (career_id, name, area, image_url, domain) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [tempCareerId, name, area, image_url, domain]
        );
        return rows[0];
    }

    async update(id, careerData) {
        const { name, area, image_url, domain } = careerData;

        let query = 'UPDATE careers SET name = $1, area = $2';
        const params = [name, area];
        let pIndex = 3;

        if (image_url !== undefined) {
            query += `, image_url = $${pIndex++}`;
            params.push(image_url);
        }

        if (domain !== undefined) {
            query += `, domain = $${pIndex++}`;
            params.push(domain);
        }

        query += ` WHERE id = $${pIndex} RETURNING *`;
        params.push(id);

        const { rows } = await db.query(query, params);

        if (rows.length === 0) {
            throw new Error(`Carrera con ID ${id} no encontrada.`);
        }
        return rows[0];
    }

    async delete(id) {
        const { rowCount } = await db.query('DELETE FROM careers WHERE id = $1', [id]);
        if (rowCount === 0) {
            throw new Error(`Carrera con ID ${id} no encontrada para eliminar.`);
        }
        return { success: true };
    }
}

module.exports = CareerRepository;