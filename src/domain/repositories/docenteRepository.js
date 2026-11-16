const db = require('../../infrastructure/database/db');
const { sanitizeUuidList, packDemoBatch, mapQuestionRow } = require('../utils/quizPackingUtils');

class DocenteRepository {

    async findQuestionsInBankBatch(target, _topics, limit = 10, userId, career = null, difficulty = null, sessionSeenIds = [], mode = null) {
        let seenIds = [];
        const isRealMock = mode === 'real';

        if (!isRealMock && userId) {
            try {
                const seenQuery = `SELECT question_id FROM user_question_history WHERE user_id = $1 AND seen_at > NOW() - INTERVAL '24 hours'`;
                const seenRes = await db.query(seenQuery, [userId]);
                seenIds = (seenRes && seenRes.rows) ? seenRes.rows.map(r => r.question_id) : [];
            } catch (err) {
                console.warn(`[DocenteRepo] Error consultando user_question_history:`, err?.message);
            }
        }

        if (sessionSeenIds && Array.isArray(sessionSeenIds) && sessionSeenIds.length > 0) {
            seenIds = [...new Set([...seenIds, ...sessionSeenIds])];
        }

        seenIds = sanitizeUuidList(seenIds);

        console.log(`🔎 [DocenteRepo] Usuario ${userId} solicitando lote de ${limit} (${isRealMock ? 'Simulacro Real: anti-repetición 24h omitido' : seenIds.length + ' vistas excluidas'}).`);

        const topics = ['*'];
        let whereClauses = `WHERE qb.domain = 'education' AND ($2::text IS NULL OR qb.target = $2)`;

        const params = [topics, target];
        let paramIdx = 3;

        if (career) {
            whereClauses += ` AND (qb.career IS NULL OR qb.career = $${paramIdx}) `;
            params.push(career);
            paramIdx++;
        }

        const isMixtoDifficulty = !difficulty || ['MIXTO', 'TODOS', 'ALL', 'MIXED', 'DEFAULT', 'GENERAL'].includes(String(difficulty).toUpperCase().trim());
        if (!isMixtoDifficulty) {
            whereClauses += ` AND qb.difficulty = $${paramIdx} `;
            params.push(difficulty);
            paramIdx++;
        }

        if (seenIds.length > 0) {
            whereClauses += ` AND qb.id <> ALL($${paramIdx}::uuid[]) AND (qb.case_id IS NULL OR qb.case_id NOT IN (SELECT case_id FROM question_bank WHERE id = ANY($${paramIdx}::uuid[]) AND case_id IS NOT NULL)) `;
            params.push(seenIds);
            paramIdx++;
        }

        // Selección ligera de IDs candidatos antes del JOIN pesado con textos y casuísticas (Late Row Lookup)
        const query = `
            WITH CandidateIds AS (
                SELECT qb.id
                FROM question_bank qb
                ${whereClauses}
                AND ($1::text[] IS NOT NULL)
                ORDER BY RANDOM()
                LIMIT $${paramIdx}
            )
            SELECT qb.id, qb.question_text, qb.options, qb.correct_option_index, qb.explanation, 
                   qb.explanation_image_url, qb.image_url, qb.domain, qb.topic,
                   qb.case_id, qb.case_order,
                   cs.code as case_code, cs.title as case_title, cs.description_text as case_description,
                   cs.image_url as case_image_url
            FROM CandidateIds ci
            JOIN question_bank qb ON qb.id = ci.id
            LEFT JOIN case_scenarios cs ON qb.case_id = cs.id
        `;
        params.push(limit);

        const res = await db.query(query, params);
        let questions = res.rows;

        // Si alguna pregunta pertenece a una casuística, recuperar todas sus preguntas hermanas de forma contigua
        const caseIdsInBatch = [...new Set(questions.filter(q => q.case_id).map(q => q.case_id))];
        if (caseIdsInBatch.length > 0) {
            try {
                let siblingQuery = `
                    SELECT qb.id, qb.question_text, qb.options, qb.correct_option_index, qb.explanation, 
                           qb.explanation_image_url, qb.image_url, qb.domain, qb.topic,
                           qb.case_id, qb.case_order,
                           cs.code as case_code, cs.title as case_title, cs.description_text as case_description,
                           cs.image_url as case_image_url
                    FROM question_bank qb
                    JOIN case_scenarios cs ON qb.case_id = cs.id
                    WHERE qb.case_id = ANY($1::uuid[])
                `;
                const siblingParams = [caseIdsInBatch];
                if (career) {
                    siblingQuery += ` AND (qb.career = $2 OR qb.career IS NULL)`;
                    siblingParams.push(career);
                }
                siblingQuery += ` ORDER BY qb.case_id, qb.case_order ASC`;

                const siblingRes = await db.query(siblingQuery, siblingParams);
                const siblingQuestions = siblingRes.rows;

                const caseMap = new Map();
                siblingQuestions.forEach(q => {
                    if (!caseMap.has(q.case_id)) caseMap.set(q.case_id, []);
                    caseMap.get(q.case_id).push(q);
                });

                const finalQuestions = [];
                const visitedCases = new Set();

                for (const q of questions) {
                    if (q.case_id) {
                        if (!visitedCases.has(q.case_id)) {
                            visitedCases.add(q.case_id);
                            const siblings = caseMap.get(q.case_id) || [q];
                            finalQuestions.push(...siblings);
                        }
                    } else {
                        finalQuestions.push(q);
                    }
                }
                questions = finalQuestions;
            } catch (siblingErr) {
                console.warn("⚠️ [docenteRepository] Error al agrupar casos pedagógicos:", siblingErr.message);
            }
        }

        // Salvaguarda resiliente: si las preguntas no vistas son insuficientes para el cupo mínimo solicitado
        if (questions.length < limit && seenIds.length > 0) {
            try {
                const currentQuestionIds = questions.map(q => q.id).filter(Boolean);
                let fallbackWhere = `WHERE qb.domain = 'education' AND ($2::text IS NULL OR qb.target = $2)`;
                const fallbackParams = [topics, target];
                let fbIdx = 3;
                if (career) {
                    fallbackWhere += ` AND (qb.career IS NULL OR qb.career = $${fbIdx}) `;
                    fallbackParams.push(career);
                    fbIdx++;
                }
                if (!isMixtoDifficulty) {
                    fallbackWhere += ` AND qb.difficulty = $${fbIdx} `;
                    fallbackParams.push(difficulty);
                    fbIdx++;
                }
                if (currentQuestionIds.length > 0) {
                    fallbackWhere += ` AND qb.id <> ALL($${fbIdx}::uuid[]) `;
                    fallbackParams.push(currentQuestionIds);
                    fbIdx++;
                }
                const needed = Math.max(1, limit - questions.length);
                const fallbackQuery = `
                    WITH FallbackIds AS (
                        SELECT qb.id
                        FROM question_bank qb
                        ${fallbackWhere}
                        AND ($1::text[] IS NOT NULL)
                        ORDER BY RANDOM()
                        LIMIT $${fbIdx}
                    )
                    SELECT qb.id, qb.question_text, qb.options, qb.correct_option_index, qb.explanation, 
                           qb.explanation_image_url, qb.image_url, qb.domain, qb.topic,
                           qb.case_id, qb.case_order,
                           cs.code as case_code, cs.title as case_title, cs.description_text as case_description,
                           cs.image_url as case_image_url
                    FROM FallbackIds fi
                    JOIN question_bank qb ON qb.id = fi.id
                    LEFT JOIN case_scenarios cs ON qb.case_id = cs.id
                `;
                fallbackParams.push(needed);
                const fallbackRes = await db.query(fallbackQuery, fallbackParams);
                if (fallbackRes.rows && fallbackRes.rows.length > 0) {
                    console.log(`ℹ️ [DocenteRepo] Reciclando ${fallbackRes.rows.length} preguntas del banco por límite alcanzado de preguntas no vistas en 24h.`);
                    questions = [...questions, ...fallbackRes.rows];
                }
            } catch (fbErr) {
                console.warn("⚠️ [DocenteRepo] Error en fallback de preguntas:", fbErr.message);
            }
        }

        return questions.map(row => mapQuestionRow(row, false));
    }

    packDemoBatch(candidateRows, siblingRows, limit) {
        return packDemoBatch(candidateRows, siblingRows, limit);
    }

    async getRandomDemoQuestions(limit = 10, excludeIds = [], target = null, career = null, difficulty = null, _areas = null) {
        const sanitizedExcludeIds = sanitizeUuidList(excludeIds);

        let whereClause = `WHERE qb.domain = 'education'`;
        const params = [];
        let paramIdx = 1;

        if (target) {
            whereClause += ` AND qb.target = $${paramIdx} `;
            params.push(target);
            paramIdx++;
        }

        if (career) {
            whereClause += ` AND (qb.career IS NULL OR qb.career = $${paramIdx}) `;
            params.push(career);
            paramIdx++;
        }

        const isMixtoDifficulty = !difficulty || ['MIXTO', 'TODOS', 'ALL', 'MIXED', 'DEFAULT', 'GENERAL'].includes(String(difficulty).toUpperCase().trim());
        if (!isMixtoDifficulty) {
            whereClause += ` AND qb.difficulty = $${paramIdx} `;
            params.push(difficulty);
            paramIdx++;
        }

        if (sanitizedExcludeIds.length > 0) {
            whereClause += ` AND qb.id <> ALL($${paramIdx}::uuid[]) `;
            params.push(sanitizedExcludeIds);
            paramIdx++;
        }

        const candidatePoolLimit = Math.max(limit * 3, 30);
        params.push(candidatePoolLimit);

        const query = `
            WITH DemoCandidateIds AS (
                SELECT qb.id
                FROM question_bank qb
                ${whereClause}
                ORDER BY RANDOM()
                LIMIT $${paramIdx}
            )
            SELECT qb.id, qb.question_text, qb.options, qb.correct_option_index, qb.explanation, 
                   qb.explanation_image_url, qb.image_url, qb.domain, qb.topic, qb.target,
                   qb.case_id, qb.case_order,
                   cs.code as case_code, cs.title as case_title, cs.description_text as case_description,
                   cs.image_url as case_image_url
            FROM DemoCandidateIds dci
            JOIN question_bank qb ON qb.id = dci.id
            LEFT JOIN case_scenarios cs ON qb.case_id = cs.id
        `;

        const res = await db.query(query, params);
        const candidateRows = res.rows;

        let siblingRows = [];
        const caseIdsInBatch = [...new Set(candidateRows.filter(q => q.case_id).map(q => q.case_id))];
        if (caseIdsInBatch.length > 0) {
            try {
                const siblingRes = await db.query(`
                    SELECT qb.id, qb.question_text, qb.options, qb.correct_option_index, qb.explanation, 
                           qb.explanation_image_url, qb.image_url, qb.domain, qb.topic, qb.target,
                           qb.case_id, qb.case_order,
                           cs.code as case_code, cs.title as case_title, cs.description_text as case_description,
                           cs.image_url as case_image_url
                    FROM question_bank qb
                    JOIN case_scenarios cs ON qb.case_id = cs.id
                    WHERE qb.case_id = ANY($1::uuid[])
                    ORDER BY qb.case_id, qb.case_order ASC, qb.created_at ASC
                `, [caseIdsInBatch]);
                siblingRows = siblingRes.rows;
            } catch (e) {
                console.error("⚠️ Error consultando demo case siblings en DocenteRepo:", e.message);
            }
        }

        const questions = this.packDemoBatch(candidateRows, siblingRows, limit);
        return questions.map(row => mapQuestionRow(row, true));
    }

    async saveQuizHistory(userId, quizData) {
        const totalQ = quizData.totalQuestions || quizData.total_questions || (quizData.questions ? quizData.questions.length : 10);
        const scoreInt = Math.round(Number(quizData.score) || 0);
        const finalTopic = quizData.topic || 'Multi-Área';
        const weakPoints = [];
        const finalDifficulty = (quizData.difficulty && quizData.difficulty !== 'MIXTO') ? quizData.difficulty : 'Senior';
        const values = [
            userId,
            finalTopic,
            finalDifficulty,
            scoreInt,
            totalQ,
            weakPoints,
            quizData.areaStats || '{}',
            quizData.target || 'ASCENSO',
            quizData.career || null
        ];
        let query = `
            INSERT INTO quiz_history (user_id, topic, difficulty, score, total_questions, weak_points, area_stats, target, career)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, TRUE AS inserted;
        `;
        if (quizData.sourceSessionId) {
            values.push(quizData.sourceSessionId);
            query = `
                WITH inserted_row AS (
                    INSERT INTO quiz_history (
                        user_id, topic, difficulty, score, total_questions, weak_points,
                        area_stats, target, career, source_session_id
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (source_session_id) WHERE source_session_id IS NOT NULL DO NOTHING
                    RETURNING id
                )
                SELECT id, TRUE AS inserted FROM inserted_row
                UNION ALL
                SELECT id, FALSE AS inserted FROM quiz_history WHERE source_session_id = $10
                LIMIT 1;
            `;
        }
        const res = await db.query(query, values);
        const firstRow = (res && res.rows && res.rows[0]) ? res.rows[0] : { id: null, inserted: true };
        const quizHistoryId = firstRow.id;
        const wasCreated = firstRow.inserted !== false;

        const isRealMock = quizData.mode === 'real' || totalQ >= 50;

        if (wasCreated && quizData.questions && Array.isArray(quizData.questions)) {
            if (isRealMock) {
                console.log(`ℹ️ [DocenteRepo] Simulacro Real (${totalQ}qs): No se marca bloqueo anti-repetición 24h para permitir práctica libre e ilimitada.`);
            } else {
                const questionIds = [...new Set(quizData.questions.map(q => q && q.id).filter(Boolean))];
                if (questionIds.length > 0) {
                    try {
                        const placeholders = questionIds.map((_, idx) => `($1, $${idx + 2}, NOW(), 1)`).join(', ');
                        await db.query(
                            `INSERT INTO user_question_history (user_id, question_id, seen_at, times_seen)
                             VALUES ${placeholders}
                             ON CONFLICT (user_id, question_id)
                             DO UPDATE SET
                                 seen_at = NOW(),
                                 times_seen = user_question_history.times_seen + 1`,
                            [userId, ...questionIds]
                        );
                    } catch (err) {
                        console.error("❌ Error actualizando user_question_history en DocenteRepo:", err.message);
                    }
                }
            }
        }

        return { attemptId: quizHistoryId, wasCreated };
    }

    async getQuizEvolution(userId, target, limit, timeFilter = '', _areas = null, career = null) {
        let filter = '';
        const params = [userId];

        if (target) {
            params.push(target);
            filter += ` AND target = $${params.length}`;
        } else {
            filter += ` AND target IN ('NOMBRAMIENTO', 'ASCENSO', 'ACCESO_CARGOS')`;
        }

        if (career) {
            params.push(career);
            if (career === 'EBR - Primaria') {
                filter += ` AND (career = $${params.length} OR career IS NULL)`;
            } else {
                filter += ` AND career = $${params.length}`;
            }
        }

        if (limit) {
            if (limit === 'real' || limit === '100' || limit === '60') {
                filter += ` AND total_questions >= 50`;
            } else if (parseInt(limit, 10) === 10 || limit === 'arcade') {
                filter += ` AND total_questions <= 15`;
            } else if (parseInt(limit, 10) === 20 || limit === 'study') {
                filter += ` AND total_questions > 15 AND total_questions < 50`;
            } else {
                params.push(parseInt(limit, 10));
                filter += ` AND total_questions = $${params.length}`;
            }
        }

        const query = `
            SELECT 
                to_char(created_at, 'DD/MM') as date_label,
                score,
                total_questions,
                (score::float / NULLIF(total_questions, 0)) * 20 as score_20
            FROM quiz_history
            WHERE user_id = $1 ${filter} ${timeFilter}
            ORDER BY created_at DESC
            LIMIT 10
        `;

        const res = await db.query(query, params);
        return res.rows.reverse();
    }

    async incrementSimulatorUsage(userId) {
        const query = `UPDATE users SET daily_simulator_usage = daily_simulator_usage + 1 WHERE id = $1`;
        await db.query(query, [userId]);
    }

    async getBasicQuizStats(userId, topicFilter, params, timeFilter = '') {
        const { rows } = await db.query(
            'SELECT COALESCE(SUM(total_questions),0) AS total_questions, COALESCE(SUM(score),0) AS total_correct, COUNT(*) AS total_games FROM quiz_history WHERE user_id = $1 ' + topicFilter + timeFilter, params
        );
        return rows[0];
    }

    async getLeaderboard() {
        const query = `
            WITH RankedScores AS (
                SELECT 
                    u.name,
                    qs.score,
                    qs.topic,
                    qs.difficulty,
                    qs.created_at,
                    ROW_NUMBER() OVER(PARTITION BY qs.user_id ORDER BY qs.score DESC) as rn
                FROM quiz_history qs
                JOIN users u ON qs.user_id = u.id
                WHERE qs.target IN ('NOMBRAMIENTO', 'ASCENSO', 'ACCESO_CARGOS')
            )
            SELECT * FROM RankedScores WHERE rn = 1
            ORDER BY score DESC
            LIMIT 10;
        `;
        const result = await db.query(query);
        return result.rows;
    }
}

module.exports = new DocenteRepository();
