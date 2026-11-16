const db = require('../../infrastructure/database/db');

let globalTopicCache = null;
let globalTopicCacheTimestamp = 0;

class TopicRepository {
    constructor() {
        this.CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
    }

    clearCache() {
        globalTopicCache = null;
        globalTopicCacheTimestamp = 0;
    }

    static clearCache() {
        globalTopicCache = null;
        globalTopicCacheTimestamp = 0;
    }

    async findAll() {
        if (globalTopicCache && (Date.now() - globalTopicCacheTimestamp < this.CACHE_TTL_MS)) {
            return globalTopicCache;
        }

        const { rows } = await db.query(`
            SELECT 
                t.*,
                (
                    SELECT COALESCE(JSON_AGG(tr.resource_id), '[]')
                    FROM topic_resources tr
                    WHERE tr.topic_id = t.id
                ) as "bookIds"
            FROM topics t
            ORDER BY t.name;
        `);

        globalTopicCache = rows;
        globalTopicCacheTimestamp = Date.now();
        return rows;
    }

    async findById(id) {
        const { rows } = await db.query('SELECT * FROM topics WHERE id = $1', [id]);
        return rows[0];
    }

    async create(topicData) {
        const { name, bookIds } = topicData;
        const client = await db.pool().connect();
        try {
            await client.query('BEGIN');
            const tempTopicId = `TOPIC_${Date.now()}`;
            const topicRes = await client.query('INSERT INTO topics (topic_id, name) VALUES ($1, $2) RETURNING *', [tempTopicId, name]);
            const newTopic = topicRes.rows[0];

            if (bookIds && bookIds.length > 0) {
                const insertPromises = bookIds.map(bookId =>
                    client.query('INSERT INTO topic_resources (topic_id, resource_id) VALUES ($1, $2)', [newTopic.id, bookId])
                );
                await Promise.all(insertPromises);
            }
            await client.query('COMMIT');
            this.clearCache();
            return newTopic;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async update(id, topicData) {
        const { name, bookIds } = topicData;
        const client = await db.pool().connect();
        try {
            await client.query('BEGIN');
            const topicRes = await client.query('UPDATE topics SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
            const updatedTopic = topicRes.rows[0];

            await client.query('DELETE FROM topic_resources WHERE topic_id = $1', [id]);
            if (bookIds && bookIds.length > 0) {
                const insertPromises = bookIds.map(bookId => client.query('INSERT INTO topic_resources (topic_id, resource_id) VALUES ($1, $2)', [id, bookId]));
                await Promise.all(insertPromises);
            }
            await client.query('COMMIT');
            this.clearCache();
            return updatedTopic;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async delete(id) {
        const { rowCount } = await db.query('DELETE FROM topics WHERE id = $1', [id]);
        if (rowCount === 0) {
            throw new Error(`Tema con ID ${id} no encontrado para eliminar.`);
        }
        this.clearCache();
        return { success: true };
    }
}

module.exports = TopicRepository;
