const db = require('../../infrastructure/database/db');
const crypto = require('crypto');

class IdiomasSimulatorRepository {

    async findQuestionsInBankBatch(target, topics, limit = 5, userId, career = null, difficulty = null, sessionSeenIds = []) {
        const seenQuery = `SELECT question_id FROM user_question_history WHERE user_id = $1 AND seen_at > NOW() - INTERVAL '24 hours'`;
        const seenRes = await db.query(seenQuery, [userId]);
        let seenIds = seenRes.rows.map(r => r.question_id);

        if (sessionSeenIds && Array.isArray(sessionSeenIds) && sessionSeenIds.length > 0) {
            seenIds = [...new Set([...seenIds, ...sessionSeenIds])];
        }

        console.log(`🔎 [IdiomasRepo] Usuario ${userId} ha visto ${seenIds.length} preguntas (24h + sesión actual).`);

        const filterTopics = topics && topics.length > 0 && !topics.includes('*') && !topics.includes('ALL') && !topics.includes('all');
        let whereClauses = `WHERE domain = 'languages' AND ($2::text IS NULL OR target = $2)`;
        if (filterTopics) {
            whereClauses += ` AND unaccent(UPPER(topic)) = ANY(SELECT unaccent(UPPER(unnest($1::text[]))))`;
        }

        const params = [topics, target];
        let paramIdx = 3;

        if (career) {
            whereClauses += ` AND (career IS NULL OR career = $${paramIdx}) `;
            params.push(career);
            paramIdx++;
        }

        if (difficulty) {
            whereClauses += ` AND difficulty = $${paramIdx} `;
            params.push(difficulty);
            paramIdx++;
        }

        if (seenIds.length > 0) {
            whereClauses += ` AND id <> ALL($${paramIdx}::uuid[]) `;
            params.push(seenIds);
            paramIdx++;
        }

        const query = `
            WITH BalancedPool AS (
                SELECT id, question_text, options, correct_option_index, explanation, explanation_image_url, image_url, domain, topic, audio_text,
                       ROW_NUMBER() OVER(PARTITION BY topic ORDER BY RANDOM()) as rn
                FROM question_bank
                ${whereClauses}
            )
            SELECT id, question_text, options, correct_option_index, explanation, explanation_image_url, image_url, domain, topic, audio_text
            FROM BalancedPool 
            WHERE rn <= CASE 
                WHEN array_length($1::text[], 1) >= 5 THEN 1 
                WHEN array_length($1::text[], 1) >= 2 THEN 3 
                ELSE $${paramIdx} 
            END
            ORDER BY RANDOM() 
            LIMIT $${paramIdx}
        `;
        params.push(limit);

        const res = await db.query(query, params);

        if (res.rows.length > 0) {
            try {
                const fetchedIds = res.rows.map(r => r.id);
                await db.query(`UPDATE question_bank SET times_used = times_used + 1 WHERE id = ANY($1::uuid[])`, [fetchedIds]);
            } catch (err) {
                console.error("❌ Error actualizando times_used:", err.message);
            }
        }

        return res.rows.map(row => ({
            id: row.id,
            question_text: row.question_text,
            options: row.options,
            correct_option_index: row.correct_option_index,
            explanation: row.explanation,
            explanation_image_url: row.explanation_image_url,
            image_url: row.image_url,
            topic: row.topic,
            audio_text: row.audio_text
        }));
    }

    async getRandomDemoQuestions(limit = 10, excludeIds = [], target = null) {
        let query = `
            SELECT id, question_text, options, correct_option_index, explanation, explanation_image_url, image_url, domain, topic, target, audio_text
            FROM question_bank
            WHERE domain = 'languages'
        `;
        const params = [];
        let paramIdx = 1;

        if (target) {
            query += ` AND target = $${paramIdx} `;
            params.push(target);
            paramIdx++;
        }

        if (excludeIds && excludeIds.length > 0) {
            query += ` AND id <> ALL($${paramIdx}::uuid[]) `;
            params.push(excludeIds);
            paramIdx++;
        }

        query += ` ORDER BY RANDOM() LIMIT $${paramIdx}`;
        params.push(limit);

        const res = await db.query(query, params);
        return res.rows;
    }

    async saveQuestionBankBatch(questions, defaultTopic, target, defaultCareer = null) {
        if (!questions || questions.length === 0) return [];

        const query = `
            INSERT INTO question_bank (topic, domain, target, difficulty, question_text, options, correct_option_index, explanation, explanation_image_url, image_url, question_hash, times_used, career, visual_support_recommendation, audio_text)
            VALUES ($1, 'languages', $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, $11, $12, $13)
            ON CONFLICT (question_hash) DO UPDATE SET 
                times_used = question_bank.times_used + 1,
                career = EXCLUDED.career,
                explanation_image_url = EXCLUDED.explanation_image_url,
                image_url = EXCLUDED.image_url,
                visual_support_recommendation = EXCLUDED.visual_support_recommendation,
                audio_text = EXCLUDED.audio_text
            RETURNING id;
        `;

        const newIds = [];

        for (const q of questions) {
            const exactTopic = q.topic || defaultTopic;
            const exactCareer = q.career || defaultCareer;
            const difficultyVal = q.difficulty || 'Senior';

            const normTopic = String(exactTopic || 'General').toLowerCase().trim();
            const normText = String(q.question_text || '').toLowerCase().trim();
            const rawString = `${normTopic}-${normText}-${JSON.stringify(q.options)}`;
            const hash = crypto.createHash('md5').update(rawString).digest('hex');

            try {
                const res = await db.query(query, [
                    exactTopic,
                    target,
                    difficultyVal,
                    q.question_text,
                    JSON.stringify(q.options),
                    q.correct_option_index,
                    q.explanation,
                    q.explanation_image_url || null,
                    q.image_url || null,
                    hash,
                    exactCareer,
                    q.visual_support_recommendation || null,
                    q.audio_text || null
                ]);
                if (res.rows.length > 0) {
                    newIds.push(res.rows[0].id);
                }
            } catch (e) {
                console.error("Error guardando pregunta de idiomas:", e.message);
            }
        }
        return newIds;
    }

    async saveQuizHistory(userId, quizData) {
        const query = `
            INSERT INTO quiz_history (user_id, topic, difficulty, score, total_questions, weak_points, area_stats, target, career)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id;
        `;
        const weakPoints = quizData.score < quizData.totalQuestions ? [quizData.topic] : [];
        const values = [
            userId,
            quizData.topic,
            quizData.difficulty || 'Senior',
            quizData.score,
            quizData.totalQuestions,
            weakPoints,
            quizData.areaStats || '{}',
            quizData.target || 'MCER',
            quizData.career || null
        ];
        const res = await db.query(query, values);
        const quizHistoryId = res.rows[0].id;

        if (quizData.questions && Array.isArray(quizData.questions)) {
            for (const q of quizData.questions) {
                if (q.id) {
                    try {
                        const checkQuery = `SELECT id, times_seen FROM user_question_history WHERE user_id = $1 AND question_id = $2`;
                        const checkRes = await db.query(checkQuery, [userId, q.id]);
                        if (checkRes.rows.length > 0) {
                            const row = checkRes.rows[0];
                            await db.query(
                                `UPDATE user_question_history SET seen_at = NOW(), times_seen = $1 WHERE id = $2`,
                                [row.times_seen + 1, row.id]
                            );
                        } else {
                            await db.query(
                                `INSERT INTO user_question_history (user_id, question_id, seen_at, times_seen) VALUES ($1, $2, NOW(), 1)`,
                                [userId, q.id]
                            );
                        }
                    } catch (err) {
                        console.error("❌ Error actualizando user_question_history en IdiomasRepo:", err.message);
                    }
                }
            }
        }

        return quizHistoryId;
    }

    async getQuizEvolution(userId, target, limit, timeFilter = '', areas = null, career = null) {
        let filter = '';
        const params = [userId];

        if (target) {
            params.push(target);
            filter += ` AND target = $${params.length}`;
        } else {
            filter += ` AND target IN ('MCER', 'TOEFL', 'IELTS', 'TECH_ENGLISH', 'CELI', 'CILS')`;
        }

        if (career) {
            params.push(career);
            if (career === 'en-US') {
                filter += ` AND (career = $${params.length} OR career IS NULL)`;
            } else {
                filter += ` AND career = $${params.length}`;
            }
        }

        if (limit) {
            if (limit === 'real') {
                filter += ` AND total_questions >= 50`;
            } else {
                params.push(parseInt(limit, 10));
                filter += ` AND total_questions = $${params.length}`;
            }
        }

        if (areas && Array.isArray(areas) && areas.length > 0) {
            params.push(areas);
            filter += ` AND jsonb_typeof(area_stats) = 'object' AND EXISTS (
                SELECT 1 FROM jsonb_each(area_stats) 
                WHERE unaccent(UPPER(key)) = ANY(SELECT unaccent(UPPER(unnest($${params.length}::text[]))))
            )`;
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

    async getBasicQuizStats(userId, topicFilter, params, timeFilter = '', areas = null) {
        const queryParams = [...params];
        let areaFilter = '';
        if (areas && Array.isArray(areas) && areas.length > 0) {
            queryParams.push(areas);
            areaFilter = ` AND jsonb_typeof(area_stats) = 'object' AND EXISTS (
                SELECT 1 FROM jsonb_each(area_stats) 
                WHERE unaccent(UPPER(key)) = ANY(SELECT unaccent(UPPER(unnest($${queryParams.length}::text[]))))
            )`;
        }

        const query = `
            SELECT 
                COALESCE(SUM(total_questions), 0) as total_questions,
                COALESCE(SUM(score), 0) as total_correct,
                COUNT(*) as total_games
            FROM quiz_history
            WHERE user_id = $1 ${topicFilter} ${timeFilter} ${areaFilter}
        `;
        const res = await db.query(query, queryParams);
        return res.rows[0];
    }

    async getTopicAnalysis(userId, topicFilter, params, timeFilter = '', areas = null) {
        const queryParams = [...params];
        let areaFilter = '';
        if (areas && Array.isArray(areas) && areas.length > 0) {
            queryParams.push(areas);
            areaFilter = ` AND unaccent(UPPER(key)) = ANY(SELECT unaccent(UPPER(unnest($${queryParams.length}::text[]))))`;
        }

        const query = `
            SELECT 
                key as subtema,
                SUM((value->>'correct')::int) as correct_answers,
                SUM((value->>'total')::int) as total_answers
            FROM quiz_history, jsonb_each(area_stats)
            WHERE user_id = $1 ${topicFilter} ${timeFilter} ${areaFilter} AND jsonb_typeof(area_stats) = 'object'
            GROUP BY key
            HAVING SUM((value->>'total')::int) > 0
            ORDER BY (SUM((value->>'correct')::int)::float / SUM((value->>'total')::int)) DESC
        `;
        const res = await db.query(query, queryParams);
        return res.rows;
    }

    async getTopicAnalysisFallback(userId, topicFilter, params) {
        const query = `
            SELECT topic, AVG(score) as avg_s 
            FROM quiz_history 
            WHERE user_id = $1 ${topicFilter} 
            GROUP BY topic 
            ORDER BY avg_s DESC
        `;
        const res = await db.query(query, params);
        return res.rows;
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
                WHERE qs.target IN ('MCER', 'TOEFL', 'IELTS', 'TECH_ENGLISH', 'CELI', 'CILS')
            )
            SELECT * FROM RankedScores WHERE rn = 1
            ORDER BY score DESC
            LIMIT 10;
        `;
        const result = await db.query(query);
        return result.rows;
    }
}

module.exports = new IdiomasSimulatorRepository();
