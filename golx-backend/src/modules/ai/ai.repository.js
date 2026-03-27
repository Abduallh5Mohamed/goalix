const BaseRepository = require('../../shared/base.repository');

class AiRepository extends BaseRepository {
    constructor(db) {
        super('ai_analyses', db);
    }

    // ─── AI Performance Analyses ──────────────────────────────────────────
    async upsertAiScore(playerId, score, breakdown) {
        const [row] = await this.db('ai_analyses')
            .insert({
                player_id: playerId,
                type: 'performance',
                input_data: {},
                result: { score, breakdown },
            })
            .returning('*');
        return row;
    }

    async getAiScore(playerId) {
        return this.db('ai_analyses')
            .where({ player_id: playerId, type: 'performance' })
            .orderBy('created_at', 'desc')
            .first();
    }

    async getAiScores(academyId, { page = 1, limit = 20 } = {}) {
        const query = this.db('ai_analyses')
            .join('player_profiles', 'ai_analyses.player_id', 'player_profiles.id')
            .where('player_profiles.academy_id', academyId)
            .where('ai_analyses.type', 'performance')
            .select('ai_analyses.*', 'player_profiles.full_name');

        const [{ count }] = await query.clone().count('ai_analyses.id as count');
        const data = await query.orderBy('ai_analyses.created_at', 'desc').limit(limit).offset((page - 1) * limit);
        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    // ─── Injury Risk ──────────────────────────────────────────────────────
    async createInjuryRisk(data) {
        const [row] = await this.db('ai_analyses').insert({
            player_id: data.player_id,
            type: 'injury_risk',
            input_data: data.input_data || {},
            result: data.result || {},
        }).returning('*');
        return row;
    }

    async getInjuryRisks(playerId) {
        return this.db('ai_analyses')
            .where({ player_id: playerId, type: 'injury_risk' })
            .orderBy('created_at', 'desc')
            .limit(10);
    }

    async getLatestInjuryRisk(playerId) {
        return this.db('ai_analyses')
            .where({ player_id: playerId, type: 'injury_risk' })
            .orderBy('created_at', 'desc')
            .first();
    }

    // ─── Nutrition Plans ────────────────────────────────────────────────
    async createNutritionPlan(data) {
        const [row] = await this.db('nutrition_plans').insert(data).returning('*');
        return row;
    }

    async getNutritionPlans(playerId) {
        return this.db('nutrition_plans')
            .where({ player_id: playerId })
            .orderBy('created_at', 'desc')
            .limit(10);
    }

    async getLatestNutritionPlan(playerId) {
        return this.db('nutrition_plans')
            .where({ player_id: playerId })
            .orderBy('created_at', 'desc')
            .first();
    }

    // Academy ownership guard — prevents IDOR across tenants
    async verifyPlayerOwnership(playerId, academyId) {
        return this.db('player_profiles')
            .where({ id: playerId, academy_id: academyId })
            .whereNull('deleted_at')
            .first();
    }
}

module.exports = AiRepository;
