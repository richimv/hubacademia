const db = require('../../infrastructure/database/db');

class AnalyticsRepository {
    async getSearchHistory() {
        const { rows } = await db.query('SELECT query, results_count, is_educational_query, created_at FROM search_history');
        // Mapear para que coincida con el formato que espera el servicio de ML
        return rows.map(row => ({
            query: row.query,
            resultsCount: row.results_count,
            isEducationalQuery: row.is_educational_query,
            timestamp: row.created_at
        }));
    }

    async getFeedback() {
        return [];
    }

    /**
     * Valida y acota el número de días para intervalos SQL parametrizados.
     * @param {number|string} days
     * @param {number} defaultDays
     * @returns {number}
     */
    _sanitizeDays(days, defaultDays = 30) {
        const parsed = Number.parseInt(days, 10);
        if (!Number.isFinite(parsed) || parsed < 1) return defaultDays;
        return Math.min(parsed, 3650);
    }

    /**
     * Obtiene el historial de búsquedas agrupado por día para los top 5 términos.
     */
    async getSearchHistoryTimeSeries(days) {
        const safeDays = this._sanitizeDays(days);
        const topTermsQuery = `
            SELECT query
            FROM search_history
            WHERE created_at >= NOW() - ($1 || ' days')::interval
            GROUP BY query
            ORDER BY COUNT(*) DESC
            LIMIT 5
        `;

        const timeSeriesQuery = `
            WITH TopTerms AS (${topTermsQuery})
            SELECT DATE(created_at) as date, query, COUNT(*) as count
            FROM search_history
            WHERE created_at >= NOW() - ($1 || ' days')::interval
            AND query IN (SELECT query FROM TopTerms)
            GROUP BY DATE(created_at), query
            ORDER BY date ASC;
        `;

        const { rows } = await db.query(timeSeriesQuery, [safeDays]);
        return rows;
    }

    /**
     * Obtiene la serie temporal para una lista específica de queries.
     */
    async getTimeSeriesForQueries(queries, days) {
        if (!queries || queries.length === 0) return [];
        const safeDays = this._sanitizeDays(days);
        const placeholders = queries.map((_, i) => `$${i + 2}`).join(', ');
        const safeQuery = `
            SELECT DATE(created_at) as date, query, COUNT(*) as count
            FROM search_history
            WHERE created_at >= NOW() - ($1 || ' days')::interval
            AND query IN (${placeholders})
            GROUP BY DATE(created_at), query
            ORDER BY date ASC;
        `;

        const { rows } = await db.query(safeQuery, [safeDays, ...queries]);
        return rows;
    }

    async recordView(entityType, entityId, userId) {
        const query = `
            INSERT INTO page_views(entity_type, entity_id, user_id, created_at)
            VALUES($1, $2, $3, NOW())
        `;
        await db.query(query, [entityType, entityId, userId]);
    }

    async getFeaturedBooks(limit = 10) {
        const query = `
            SELECT r.*, COUNT(pv.id) as view_count
            FROM resources r
            LEFT JOIN page_views pv ON r.id = pv.entity_id AND pv.entity_type = r.resource_type
            GROUP BY r.id
            ORDER BY view_count DESC
            LIMIT $1
        `;
        const { rows } = await db.query(query, [limit]);
        return rows;
    }

    async getFeaturedCourses(limit = 10) {
        const query = `
            SELECT c.*, COUNT(pv.id) as view_count
            FROM courses c
            LEFT JOIN page_views pv ON c.id = pv.entity_id AND pv.entity_type = 'course'
            GROUP BY c.id
            ORDER BY view_count DESC
            LIMIT $1
        `;
        const { rows } = await db.query(query, [limit]);
        return rows;
    }

    // ===============================================
    // NUEVOS METODOS (MIGRADOS DESDE ANALYTICSSERVICE)
    // ===============================================

    async recordSearchWithIntent(queryText, resultsCount, isEducationalQuery, userId, source) {
        const query = `
            INSERT INTO search_history(query, results_count, is_educational_query, user_id, source)
            VALUES($1, $2, $3, $4, $5)
        `;
        await db.query(query, [queryText, resultsCount, isEducationalQuery, userId, source]);
    }

    async isMessageExists(messageId) {
        return false;
    }

    async recordFeedbackFromService(queryText, response, isHelpful, userId, messageId) {
        // Obsoleto: tabla feedback eliminada
        return;
    }

    async logPulse(sessionId, userId, isMobile) {
        const queryText = `
            INSERT INTO web_traffic(session_id, user_id, is_mobile, last_ping)
            VALUES($1, $2, $3, NOW())
            ON CONFLICT (session_id) 
            DO UPDATE SET 
                last_ping = EXCLUDED.last_ping,
                user_id = COALESCE(EXCLUDED.user_id, web_traffic.user_id);
        `;
        await db.query(queryText, [sessionId, userId, isMobile]);
    }

    async getRealTimeStats() {
        const query = `
            SELECT 
                COUNT(*) as active_now,
                COUNT(*) FILTER (WHERE is_mobile = TRUE) as mobile_active
            FROM web_traffic 
            WHERE last_ping >= NOW() - INTERVAL '5 minutes'
        `;
        const { rows } = await db.query(query);
        return rows[0] || { active_now: 0, mobile_active: 0 };
    }

    async getDashboardMetricsRaw(days) {
        const safeDays = this._sanitizeDays(days);
        const dateFilter = `created_at >= NOW() - ($1 || ' days')::interval`;

        const queries = [
            { sql: `SELECT COUNT(*) FROM search_history WHERE source = 'search_bar' AND ${dateFilter}`, params: [safeDays] },
            { sql: `SELECT COUNT(*) FROM search_history WHERE source = 'chatbot' AND ${dateFilter}`, params: [safeDays] },
            { sql: `SELECT COUNT(*) FROM search_history WHERE is_educational_query = TRUE AND ${dateFilter}`, params: [safeDays] },
            { sql: `SELECT 0 AS count` },
            { sql: `SELECT 0 AS count` },
            {
                sql: `
                SELECT COUNT(DISTINCT user_id) 
                FROM search_history 
                WHERE ${dateFilter} AND user_id IS NOT NULL;
            `,
                params: [safeDays]
            },
            { sql: `SELECT 0 AS count` },
            {
                sql: `
                SELECT query, COUNT(*) as count 
                FROM search_history 
                WHERE ${dateFilter}
                GROUP BY query 
                ORDER BY count DESC
                LIMIT 5
            `,
                params: [safeDays]
            },
            { sql: 'SELECT COUNT(*) FROM users' }
        ];

        const results = await Promise.all(
            queries.map(q => (q.params ? db.query(q.sql, q.params) : db.query(q.sql)))
        );
        
        return {
            totalSearches: parseInt(results[0].rows[0].count, 10),
            totalChatQueries: parseInt(results[1].rows[0].count, 10),
            educationalQueries: parseInt(results[2].rows[0].count, 10),
            totalFeedbacks: parseInt(results[3].rows[0].count, 10),
            positiveFeedbacks: parseInt(results[4].rows[0].count, 10),
            activeUsers: parseInt(results[5].rows[0].count, 10),
            totalChatMessages: parseInt(results[6].rows[0].count, 10),
            topSearchesRaw: results[7].rows,
            totalUsers: parseInt(results[8].rows[0].count, 10)
        };
    }

    async getUniqueVisitorsCountRaw(days = 1) {
        const query = `SELECT COUNT(DISTINCT session_id) FROM web_traffic WHERE created_at >= CURRENT_DATE`;
        const res = await db.query(query);
        return parseInt(res.rows[0].count, 10);
    }

    async getSearchTrendsRaw(days) {
        const safeDays = this._sanitizeDays(days);
        const trendsQuery = `
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM search_history
            WHERE created_at >= NOW() - ($1 || ' days')::interval
            GROUP BY DATE(created_at)
            ORDER BY date ASC;
        `;
        const trendsData = await db.query(trendsQuery, [safeDays]);
        return trendsData.rows;
    }

    async getInteractionTrendsRaw(days) {
        const safeDays = this._sanitizeDays(days);
        const lookbackDays = Math.max(0, safeDays - 1);
        const query = `
            WITH all_dates AS (
                SELECT generate_series(
                    (NOW() - ($1 || ' days')::interval)::date,
                    NOW()::date,
                    '1 day'::interval
                )::date AS date
            )
            SELECT
                d.date,
                COALESCE(SUM(CASE WHEN s.source = 'chatbot' THEN 1 ELSE 0 END), 0) AS chatbot_queries,
                COALESCE(SUM(CASE WHEN s.source = 'search_bar' THEN 1 ELSE 0 END), 0) AS search_bar_queries
            FROM all_dates d
            LEFT JOIN search_history s ON d.date = DATE(s.created_at)
            GROUP BY d.date
            ORDER BY d.date ASC;
        `;
        const { rows } = await db.query(query, [lookbackDays]);
        return rows;
    }

    async getTopViewedEntitiesRaw(type, days) {
        const safeDays = this._sanitizeDays(days);
        let tableName = '';
        let nameField = 'name';
        switch (type) {
            case 'career': tableName = 'careers'; break;
            case 'course': tableName = 'courses'; break;
            case 'topic': tableName = 'topics'; break;
            default: return [];
        }
        const query = `
            SELECT t.${nameField} as name, COUNT(pv.id) as count, t.id
            FROM page_views pv
            JOIN ${tableName} t ON pv.entity_id = t.id
            WHERE pv.entity_type = $1 
            AND pv.created_at >= NOW() - ($2 || ' days')::interval
            GROUP BY t.id, t.${nameField}
            ORDER BY count DESC
            LIMIT 5;
        `;
        const res = await db.query(query, [type, safeDays]);
        return res.rows;
    }

    async getTopSearchesRawData(days, limit) {
        const safeDays = this._sanitizeDays(days);
        const query = `
            SELECT query, COUNT(*) as count 
            FROM search_history 
            WHERE created_at >= NOW() - ($1 || ' days')::interval
            GROUP BY query 
            ORDER BY count DESC
            LIMIT $2`;
        const res = await db.query(query, [safeDays, limit]);
        return res.rows;
    }

    async getZeroResultSearchesRaw(days) {
        const safeDays = this._sanitizeDays(days);
        const query = `
            SELECT query, COUNT(*) as count
            FROM search_history
            WHERE results_count = 0
            AND created_at >= NOW() - ($1 || ' days')::interval
            GROUP BY query
            ORDER BY count DESC
            LIMIT 5;
        `;
        const res = await db.query(query, [safeDays]);
        return res.rows;
    }

    async getAnalyticsForMLRaw(days) {
        const safeDays = this._sanitizeDays(days);
        const querySearch = `SELECT query, results_count, created_at FROM search_history WHERE created_at >= NOW() - ($1 || ' days')::interval ORDER BY created_at DESC LIMIT 50000`;
        const searchHistoryRes = await db.query(querySearch, [safeDays]);
        return { searchHistory: searchHistoryRes.rows, feedback: [] };
    }

    async logAIInteractionRaw(query, intentType, eventType, userId) {
        const queryText = `
            INSERT INTO ai_analytics(query, intent_type, event_type, user_id)
            VALUES($1, $2, $3, $4)
        `;
        await db.query(queryText, [query, intentType, eventType, userId]);
    }

    async getAIAnalyticsRaw(days) {
        const safeDays = this._sanitizeDays(days);
        const query = `
            SELECT 
                COUNT(*) FILTER (WHERE event_type = 'impression') as impressions,
                COUNT(*) FILTER (WHERE event_type = 'click_explanation') as clicks,
                COUNT(DISTINCT query) as unique_questions
            FROM ai_analytics
            WHERE created_at >= NOW() - ($1 || ' days')::interval
        `;
        const res = await db.query(query, [safeDays]);
        return res.rows[0] || { impressions: 0, clicks: 0, unique_questions: 0 };
    }

    async getTopDeepQuestionsRaw(days) {
        const safeDays = this._sanitizeDays(days);
        const query = `
            SELECT query, COUNT(*) as count
            FROM ai_analytics
            WHERE event_type = 'click_explanation'
            AND created_at >= NOW() - ($1 || ' days')::interval
            GROUP BY query
            ORDER BY count DESC
            LIMIT 5
        `;
        const res = await db.query(query, [safeDays]);
        return res.rows;
    }

    async getAllFeedbackRaw() {
        return [];
    }

    async getHeatmapDataRaw(userId, deckId = null) {
        const params = [userId];
        let cardQuery = `
            SELECT to_char(last_reviewed_at, 'YYYY-MM-DD') as day, COUNT(*) as count
            FROM user_flashcards
            WHERE user_id = $1 AND last_reviewed_at IS NOT NULL
        `;

        if (deckId) {
            cardQuery += ` AND deck_id = $2`;
            params.push(deckId);
        }

        cardQuery += ` GROUP BY day`;

        const cardRes = await db.query(cardQuery, params);
        return {
            cardResRows: cardRes.rows
        };
    }
}

module.exports = AnalyticsRepository;