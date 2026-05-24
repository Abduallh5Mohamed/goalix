const BaseRepository = require('../../shared/base.repository');

class RankingsRepository extends BaseRepository {
    constructor(db) {
        super('ranking_snapshots', db);
    }

    // ─── Rankings ───────────────────────────────────────────────────────
    async findRankings(period, { groupId, academyId, page = 1, limit = 20 }) {
        // Always scope by academy — prevents cross-tenant ranking read via ?groupId
        const query = this.db('ranking_snapshots')
            .join('player_profiles as pp', 'ranking_snapshots.player_id', 'pp.id')
            .leftJoin('academy_groups as ag', 'ranking_snapshots.group_id', 'ag.id')
            .modify((q) => {
                if (academyId) q.where('pp.academy_id', academyId);
                if (period) q.where('ranking_snapshots.period', period);
                if (groupId) q.where('ranking_snapshots.group_id', groupId);
            })
            .select(
                'ranking_snapshots.*',
                'pp.full_name as player_name',
                'ag.name as group_name',
            );

        const [{ count }] = await query.clone().clearSelect().count('ranking_snapshots.id as count');
        const data = await query
            .orderBy([
                { column: 'ranking_snapshots.total_score', order: 'desc' },
                { column: 'ranking_snapshots.rank', order: 'asc' },
            ])
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    // Monthly rankings: use the latest available period in the DB
    async findRankingsByMonthPrefix(monthPeriod, options) {
        const latestRow = await this.db('ranking_snapshots').max('period as p').first();
        const latestPeriod = latestRow ? latestRow.p : null;
        if (!latestPeriod) return { data: [], total: 0, page: options.page || 1, totalPages: 1 };
        return this.findRankings(latestPeriod, options);
    }

    async findPlayerRankings(playerId, { page = 1, limit = 20 } = {}) {
        const query = this.db('ranking_snapshots').where('player_id', playerId);

        const [{ count }] = await query.clone().count('id as count');
        const data = await query
            .orderBy('period', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async upsertRanking(data) {
        return this.db('ranking_snapshots')
            .insert(data)
            .onConflict(['player_id', 'period'])
            .merge(['total_score', 'rank', 'trend', 'calculated_at'])
            .returning('*');
    }

    // ─── Coach Evaluations ─────────────────────────────────────────────
    async findEvaluationsByPlayer(playerId, { page = 1, limit = 20 } = {}) {
        const query = this.db('evaluation_coach_ratings').where('player_id', playerId);

        const [{ count }] = await query.clone().count('id as count');
        const data = await query
            .orderBy('eval_date', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async createEvaluation(data) {
        // Map multi-score object to evaluation_coach_ratings schema
        const row_data = {
            coach_id: data.coach_id,
            player_id: data.player_id,
            group_id: data.group_id || null,
            score: data.overall_score || data.score ||
                ((+data.technical_score + +data.physical_score + +data.tactical_score + +data.discipline_score) / 4) || 0,
            notes: data.notes || null,
            eval_date: data.eval_date || new Date(),
        };
        const [row] = await this.db('evaluation_coach_ratings').insert(row_data).returning('*');
        return row;
    }

    async getAverageEvaluation(playerId, dateFrom, dateTo) {
        return this.db('evaluation_coach_ratings')
            .where('player_id', playerId)
            .modify((q) => {
                if (dateFrom) q.where('eval_date', '>=', dateFrom);
                if (dateTo) q.where('eval_date', '<=', dateTo);
            })
            .avg('score as avgScore')
            .first();
    }

    // ─── Matches ────────────────────────────────────────────────────────
    async findMatches(groupId, { page = 1, limit = 20 } = {}) {
        const query = this.db('match_records')
            .where('group_id', groupId);

        const [{ count }] = await query.clone().count('id as count');
        const data = await query
            .orderBy('match_date', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async createMatch(data) {
        const [row] = await this.db('match_records').insert(data).returning('*');
        return row;
    }

    async findMatchById(id) {
        return this.db('match_records').where({ id }).first();
    }

    // ─── Player Match Stats ─────────────────────────────────────────────
    async findPlayerMatchStats(playerId) {
        return this.db('match_player_stats')
            .where('player_id', playerId)
            .orderBy('created_at', 'desc');
    }

    async createPlayerMatchStats(data) {
        const [row] = await this.db('match_player_stats').insert(data).returning('*');
        return row;
    }

    async getMatchStatsByPlayer(playerId, dateFrom, dateTo) {
        return this.db('match_player_stats')
            .join('match_records', 'match_player_stats.match_id', 'match_records.id')
            .where('match_player_stats.player_id', playerId)
            .modify((q) => {
                if (dateFrom) q.where('match_records.match_date', '>=', dateFrom);
                if (dateTo) q.where('match_records.match_date', '<=', dateTo);
            })
            .select(
                this.db.raw('AVG(match_player_stats.performance_score) as avg_performance'),
                this.db.raw('SUM(match_player_stats.goals) as total_goals'),
                this.db.raw('SUM(match_player_stats.assists) as total_assists'),
            )
            .first();
    }

    // Academy ownership guard — prevents IDOR across tenants
    async verifyPlayerOwnership(playerId, academyId) {
        return this.db('player_profiles')
            .where({ id: playerId, academy_id: academyId })
            .whereNull('deleted_at')
            .first();
    }

    // Verify that a group belongs to this academy (chain: group→branch→academy)
    async verifyGroupOwnership(groupId, academyId) {
        return this.db('academy_groups as ag')
            .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
            .where('ag.id', groupId)
            .where('ab.academy_id', academyId)
            .first();
    }

    // Verify that a match belongs to this academy (chain: match→group→branch→academy)
    async verifyMatchOwnership(matchId, academyId) {
        return this.db('match_records as mr')
            .join('academy_groups as ag', 'mr.group_id', 'ag.id')
            .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
            .where('mr.id', matchId)
            .where('ab.academy_id', academyId)
            .first();
    }
}

module.exports = RankingsRepository;
