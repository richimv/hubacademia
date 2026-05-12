const db = require('../../infrastructure/database/db');
const { normalizeText } = require('../utils/textUtils');

class CourseRepository {

    async findAll(filters = {}) {
        let query = `
            SELECT 
                c.id,
                c.course_id,
                c.name,
                c.image_url, 
                c.domain,
                (
                    SELECT COALESCE(JSON_AGG(cc.career_id), '[]')
                    FROM course_careers cc
                    WHERE cc.course_id = c.id
                ) AS "careerIds"
            FROM courses c
        `;
        const params = [];
        if (filters.domain) {
            query += ' WHERE c.domain = $1';
            params.push(filters.domain);
        }
        query += ' ORDER BY c.name ASC';
        const { rows } = await db.query(query, params);
        return rows;
    }

    async findById(id) {
        // ✅ SOLUCIÓN: Obtener el curso con sus temas y materiales (libros) anidados.
        // Usamos subconsultas y JSON_AGG para construir la estructura completa en una sola consulta.
        const query = `
            SELECT 
                c.*,
                (
                    SELECT COALESCE(JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', t.id,
                            'name', t.name,
                            'unit', ct.unit_name
                        ) ORDER BY ct.unit_name, t.name
                    ), '[]')
                    FROM course_topics ct
                    JOIN topics t ON t.id = ct.topic_id
                    WHERE ct.course_id = c.id
                ) AS topics,
                (
                    SELECT COALESCE(JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', r.id, 
                            'title', r.title, 
                            'author', r.author,
                            'image_url', r.image_url,
                            'type', r.resource_type,
                            'url', r.url,
                            'is_premium', r.is_premium
                        )
                    ), '[]')
                    FROM course_books cb
                    JOIN resources r ON r.id = cb.resource_id
                    WHERE cb.course_id = c.id
                ) AS materials,
                (
                    SELECT COALESCE(JSON_AGG(cc.career_id), '[]')
                    FROM course_careers cc
                    WHERE cc.course_id = c.id
                ) AS "careerIds"
            FROM courses c
            WHERE c.id = $1
        `;
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }

    /**
     * Búsqueda principal de cursos.
     * Busca en nombres de cursos, códigos, nombres de temas y nombres de docentes.
     * @param {string} query - Término de búsqueda.
     * @returns {Promise<Array>} - Lista de cursos que coinciden.
     */
    async search(query) {
        // ✅ BÚSQUEDA INTELIGENTE V3: FUZZY SEARCH (pg_trgm)
        // Soporta errores tipográficos ("cadiologia" -> "cardiología") usando trigramas.

        const cleanQuery = normalizeText(query).trim();
        if (!cleanQuery) return [];

        // Configuración de umbral de similitud (0.0 - 1.0)
        // 0.3 suele ser un buen balance para errores tipográficos moderados.
        // Pero usamos un filtrado híbrido: Coincidencia exacta O Similitud > X.

        const params = [cleanQuery];

        // Detección de intención genérica "Ver todos los cursos"
        const isGenericCourseQuery = ['curso', 'cursos', 'course', 'courses', 'clase', 'clases'].includes(cleanQuery.toLowerCase());

        /*
           ESTRATEGIA DE RANKING:
           1. Coincidencia Exacta de Frase (ILIKE) -> 100 pts
           2. Similitud de Trigramas (similarity) -> Score variable (0-1) * 100
        */

        const sqlQuery = `
            SELECT DISTINCT 
                c.id, 
                c.name, 
                c.image_url, 
                c.course_id,
                (
                    CASE 
                        -- Prioridad 0: Intención Genérica 'Curso' -> 50 pts
                        ${isGenericCourseQuery ? `WHEN 1=1 THEN 50` : ''}

                        -- Prioridad 1: Coincidencia exacta o parcial fuerte (LIKE)
                        WHEN unaccent(lower(c.name)) LIKE unaccent(lower('%' || $1 || '%')) THEN 100
                        
                        -- Prioridad 2: Similitud Difusa (Trigramas)
                        -- Multiplicamos por 100 para normalizar con el puntaje anterior.
                        ELSE (similarity(unaccent(lower(c.name)), unaccent(lower($1))) * 80)
                    END
                ) as relevance_score
            FROM courses c
            LEFT JOIN course_topics ct ON c.id = ct.course_id
            LEFT JOIN topics t ON t.id = ct.topic_id
            WHERE 
                -- ✅ NUEVO: Si la query es "cursos", traer todo (o los mejores)
                ${isGenericCourseQuery ? `(1=1) OR` : ''}

                -- 1. Coincidencia clásica (rápida)
                unaccent(lower(c.name)) LIKE unaccent(lower('%' || $1 || '%')) 
                OR unaccent(lower(t.name)) LIKE unaccent(lower('%' || $1 || '%'))
                
                -- 2. Coincidencia difusa (Typos)
                OR word_similarity(unaccent(lower($1)), unaccent(lower(c.name))) > 0.3
                OR word_similarity(unaccent(lower($1)), unaccent(lower(t.name))) > 0.3
            ORDER BY relevance_score DESC, c.name ASC
            LIMIT 20
        `;

        try {
            // Nota: Configurar el límite de word_similarity localmente para esta query si fuera necesario
            // await db.query("SET pg_trgm.word_similarity_threshold = 0.3"); 

            const { rows } = await db.query(sqlQuery, params);
            return rows;
        } catch (error) {
            console.error("Error en búsqueda fuzzy:", error);
            return [];
        }
    }
    async findByCareerId(careerId) {
        // ✅ NUEVO: Buscar cursos por ID exacto de carrera usando la tabla de unión.
        const query = `
            SELECT c.* 
            FROM courses c
            JOIN course_careers cc ON c.id = cc.course_id
            WHERE cc.career_id = $1
            ORDER BY c.name ASC
        `;
        const { rows } = await db.query(query, [careerId]);
        return rows;
    }

    async create(courseData) {
        // ✅ LÓGICA REHECHA: Esta función ahora es simple y correcta.
        const { name, topicIds, bookIds, units, careerIds, image_url, domain = 'medicine' } = courseData;

        const client = await db.pool().connect();
        try {
            await client.query('BEGIN');
            // 1. Insertar el curso principal.
            const tempCourseId = `C-${Date.now()}`; // Valor temporal para satisfacer la restricción NOT NULL.
            // ✅ FIX: Incluir image_url y domain en el insert
            const courseRes = await client.query('INSERT INTO courses (name, course_id, image_url, domain) VALUES ($1, $2, $3, $4) RETURNING *', [name, tempCourseId, image_url, domain]);
            const newCourse = courseRes.rows[0];

            /* 2. Insertar temas. (DESACTIVADO: El usuario solicitó eliminar la relación curso-temas)
            if (units && units.length > 0) {
                // ...
            }
            */

            // 3. Insertar las relaciones con los libros en la tabla de unión.
            if (bookIds && bookIds.length > 0) {
                const bookPromises = bookIds.map(bookId => client.query('INSERT INTO course_books (course_id, resource_id) VALUES ($1, $2)', [newCourse.id, bookId]));
                await Promise.all(bookPromises);
            }

            // 4. ✅ NUEVO: Insertar relaciones con carreras
            if (careerIds && careerIds.length > 0) {
                const careerPromises = careerIds.map(careerId => client.query('INSERT INTO course_careers (course_id, career_id) VALUES ($1, $2)', [newCourse.id, careerId]));
                await Promise.all(careerPromises);
            }

            // 5. Confirmar la transacción si todo fue exitoso.
            await client.query('COMMIT');
            return newCourse;
        } catch (e) {
            // 6. Si algo falla, revertir todos los cambios.
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async update(id, courseData) {
        // ✅ SOLUCIÓN: Usar una transacción para actualizar el curso y sus relaciones.
        const { name, topicIds, bookIds, units, careerIds, image_url, domain } = courseData;
        const client = await db.pool().connect();
        try {
            await client.query('BEGIN');
            
            let queryFields = ['name = $1'];
            let params = [name];
            let pIndex = 2;

            if (image_url !== undefined) {
                queryFields.push(`image_url = $${pIndex++}`);
                params.push(image_url);
            }

            if (domain !== undefined) {
                queryFields.push(`domain = $${pIndex++}`);
                params.push(domain);
            }

            params.push(id);
            const updateQuery = `UPDATE courses SET ${queryFields.join(', ')} WHERE id = $${pIndex} RETURNING *`;
            const courseRes = await client.query(updateQuery, params);
            const updatedCourse = courseRes.rows[0];

            // 2. Relations... (Rest of method)

            /* DESACTIVADO... */

            await client.query('DELETE FROM course_books WHERE course_id = $1', [id]);
            if (bookIds && bookIds.length > 0) {
                const bookPromises = bookIds.map(bookId => client.query('INSERT INTO course_books (course_id, resource_id) VALUES ($1, $2)', [id, bookId]));
                await Promise.all(bookPromises);
            }

            // ✅ NUEVO: Actualizar carreras
            await client.query('DELETE FROM course_careers WHERE course_id = $1', [id]);
            if (careerIds && careerIds.length > 0) {
                const careerPromises = careerIds.map(careerId => client.query('INSERT INTO course_careers (course_id, career_id) VALUES ($1, $2)', [id, careerId]));
                await Promise.all(careerPromises);
            }

            await client.query('COMMIT');
            return updatedCourse;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async delete(id) {
        const { rowCount } = await db.query('DELETE FROM courses WHERE id = $1', [id]);
        if (rowCount === 0) {
            throw new Error(`Curso con ID ${id} no encontrado para eliminar.`);
        }
        return { success: true };
    }

    /**
     * Encuentra todos los cursos que pertenecen a carreras que coinciden parcialmente con un nombre.
     * Ej: "ingenieria" encontrará cursos de "Ingeniería de Software" e "Ingeniería Civil".
     * @param {string} categoryName - El nombre parcial de la categoría de carrera.
     * @returns {Promise<Array>} - Una lista de cursos.
     */
    async findByCareerCategory(categoryName) {
        // ✅ ARQUITECTURA: Reemplazo del Stored Procedure por consulta JOIN explicita con el nuevo esquema.
        const query = `
            SELECT DISTINCT c.* 
            FROM courses c
            JOIN course_careers cc ON c.id = cc.course_id
            JOIN careers car ON car.id = cc.career_id
            WHERE car.name ILIKE $1
        `;
        const values = [`%${categoryName}%`];
        try {
            const { rows } = await db.query(query, values);
            return rows;
        } catch (error) {
            console.error(`Error en findByCareerCategory buscando "${categoryName}":`, error);
            return [];
        }
    }
}

module.exports = CourseRepository;
