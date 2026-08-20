const db = require('../../infrastructure/database/db');

class TopicRepository {
    constructor() {
        this.cache = null;
        this.cacheTimestamp = 0;
        this.CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
    }

    clearCache() {
        this.cache = null;
        this.cacheTimestamp = 0;
    }

    async findAll() {
        if (this.cache && (Date.now() - this.cacheTimestamp < this.CACHE_TTL_MS)) {
            return this.cache;
        }

        // ✅ SOLUCIÓN: Hacer que findAll() obtenga también los IDs de los libros/recursos asociados.
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

        this.cache = rows;
        this.cacheTimestamp = Date.now();
        return rows;
    }

    async findById(id) {
        const { rows } = await db.query('SELECT * FROM topics WHERE id = $1', [id]);
        return rows[0];
    }

    async create(topicData) {
        // ✅ SOLUCIÓN: La lógica de creación debe manejar la tabla de unión 'topic_resources'.
        const { name, description, bookIds } = topicData; // 'bookIds' viene del formulario de admin.
        const client = await db.pool().connect();
        try {
            await client.query('BEGIN');
            // ✅ SOLUCIÓN TEMPORAL: Generar un 'topic_id' de texto para satisfacer la restricción NOT NULL.
            // La solución ideal es eliminar la columna 'topic_id' de la tabla 'topics' en la base de datos.
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
        // ✅ SOLUCIÓN: La lógica de actualización debe manejar la tabla de unión 'topic_resources'.
        const { name, description, bookIds } = topicData;
        const client = await db.pool().connect();
        try {
            await client.query('BEGIN');
            // ✅ SOLUCIÓN: Eliminar la actualización de 'updated_at' porque la columna no existe en la tabla 'topics'.
            const topicRes = await client.query('UPDATE topics SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
            const updatedTopic = topicRes.rows[0];

            await client.query('DELETE FROM topic_resources WHERE topic_id = $1', [id]); // Limpiar relaciones antiguas
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