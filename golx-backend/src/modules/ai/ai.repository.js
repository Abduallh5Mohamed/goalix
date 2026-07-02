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

    _aiScoresQuery(academyId, sourceTable = 'ai_analyses') {
        return this.db(`${sourceTable} as ai_analyses`)
            .join('player_profiles', 'ai_analyses.player_id', 'player_profiles.id')
            .where('player_profiles.academy_id', academyId)
            .where('ai_analyses.type', 'performance')
            .select('ai_analyses.*', 'player_profiles.full_name');
    }

    async getAiScores(academyId, { page = 1, limit = 20, includeArchive = false } = {}) {
        const query = this._aiScoresQuery(academyId);

        if (includeArchive && await this.db.schema.hasTable('ai_analyses_archive')) {
            const archiveQuery = this._aiScoresQuery(academyId, 'ai_analyses_archive');
            const [{ count: hotCount }] = await query.clone().clearSelect().count('ai_analyses.id as count');
            const [{ count: archiveCount }] = await archiveQuery.clone().clearSelect().count('ai_analyses.id as count');
            const readLimit = page * limit;
            const [hotRows, archiveRows] = await Promise.all([
                query.clone().orderBy('ai_analyses.created_at', 'desc').limit(readLimit),
                archiveQuery.clone().orderBy('ai_analyses.created_at', 'desc').limit(readLimit),
            ]);
            const data = [...hotRows, ...archiveRows]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice((page - 1) * limit, page * limit);
            const total = Number(hotCount || 0) + Number(archiveCount || 0);
            return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
        }

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

    async getInjuryRisks(playerId, { includeArchive = false } = {}) {
        const hotRows = await this.db('ai_analyses')
            .where({ player_id: playerId, type: 'injury_risk' })
            .orderBy('created_at', 'desc')
            .limit(10);
        if (!includeArchive || hotRows.length >= 10) return hotRows;
        if (!(await this.db.schema.hasTable('ai_analyses_archive'))) return hotRows;
        const archiveRows = await this.db('ai_analyses_archive')
            .where({ player_id: playerId, type: 'injury_risk' })
            .orderBy('created_at', 'desc')
            .limit(10);
        return [...hotRows, ...archiveRows]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10);
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
