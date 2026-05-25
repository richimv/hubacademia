const db = require('../../infrastructure/database/db');

class SelfEvaluationRepository {
    async incrementUsageCountAndDailyEvaluation(userId) {
        const query = `
            UPDATE users 
            SET usage_count = usage_count + 1, daily_arena_usage = daily_arena_usage + 1 
            WHERE id = $1
        `;
        await db.query(query, [userId]);
    }

    async incrementDailyEvaluationOnly(userId) {
        const query = `
            UPDATE users 
            SET daily_arena_usage = daily_arena_usage + 1 
            WHERE id = $1
        `;
        await db.query(query, [userId]);
    }
}

module.exports = new SelfEvaluationRepository();
