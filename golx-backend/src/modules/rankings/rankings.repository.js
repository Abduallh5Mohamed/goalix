const BaseRepository = require('../../shared/base.repository');

class RankingsRepository extends BaseRepository {
    constructor(db) {
        super('ranking_snapshots', db);
    }

    _avgRatingToScore(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return null;
        return Math.max(0, Math.min(100, numeric * 10));
    }

    _attendanceToScore(attended, total) {
        const totalNumber = Number(total || 0);
        if (!totalNumber) return null;
        return Math.max(0, Math.min(100, (Number(attended || 0) / totalNumber) * 100));
    }

    _weightedScore({ trainingScore, matchScore, attendanceScore }) {
        const parts = [
            { value: matchScore, weight: 0.45 },
            { value: trainingScore, weight: 0.4 },
            { value: attendanceScore, weight: 0.15 },
        ].filter((part) => Number.isFinite(part.value));

        if (!parts.length) return 0;
        const weightTotal = parts.reduce((sum, part) => sum + part.weight, 0);
        return Number(
            (
                parts.reduce((sum, part) => sum + part.value * part.weight, 0) /
                weightTotal
            ).toFixed(2),
        );
    }

    async findLiveRankingsFallback(period, { groupId, academyId, page = 1, limit = 20 }) {
        const players = await this.db('player_profiles as pp')
            .leftJoin('player_group_assignments as pga', function joinCurrentGroup() {
                this.on('pga.player_id', '=', 'pp.id').andOnNull('pga.left_at');
            })
            .leftJoin('academy_groups as ag', 'pga.group_id', 'ag.id')
            .modify((q) => {
                if (academyId) q.where('pp.academy_id', academyId);
                if (groupId) q.where('pga.group_id', groupId);
            })
            .whereNull('pp.deleted_at')
            .select(
                'pp.id as player_id',
                'pp.full_name as player_name',
                'pga.group_id',
                'ag.name as group_name',
            );

        const playerIds = players.map((player) => player.player_id);
        if (!playerIds.length) {
            return { data: [], total: 0, page, totalPages: 1 };
        }

        const [trainingRows, matchRows, trainingAttendanceRows, matchAttendanceRows] =
            await Promise.all([
                this.db('player_event_evaluations as pee')
                    .join('calendar_events as ce', 'pee.event_id', 'ce.id')
                    .whereIn('pee.player_id', playerIds)
                    .where('ce.academy_id', academyId)
                    .whereNull('ce.deleted_at')
                    .whereNot('ce.status', 'cancelled')
                    .groupBy('pee.player_id')
                    .select(
                        'pee.player_id',
                        this.db.raw(`
                            AVG(
                                COALESCE(
                                    pee.overall_rating,
                                    (
                                      COALESCE(pee.technical_rating, 0)
                                      + COALESCE(pee.tactical_rating, 0)
                                      + COALESCE(pee.physical_rating, 0)
                                      + COALESCE(pee.mentality_rating, 0)
                                    ) / NULLIF(
                                      (CASE WHEN pee.technical_rating IS NULL THEN 0 ELSE 1 END)
                                      + (CASE WHEN pee.tactical_rating IS NULL THEN 0 ELSE 1 END)
                                      + (CASE WHEN pee.physical_rating IS NULL THEN 0 ELSE 1 END)
                                      + (CASE WHEN pee.mentality_rating IS NULL THEN 0 ELSE 1 END),
                                      0
                                    )
                                )
                            ) as avg_rating
                        `),
                    ),
                this.db('match_player_stats as mps')
                    .join('matches as m', 'mps.match_id', 'm.id')
                    .join('player_profiles as pp', 'mps.player_id', 'pp.id')
                    .whereIn('mps.player_id', playerIds)
                    .where('pp.academy_id', academyId)
                    .whereNull('m.deleted_at')
                    .whereNot('m.status', 'cancelled')
                    .groupBy('mps.player_id')
                    .select(
                        'mps.player_id',
                        this.db.raw('AVG(COALESCE(mps.performance_rating, mps.performance_score)) as avg_rating'),
                    ),
                this.db('event_attendance as ea')
                    .join('calendar_events as ce', 'ea.event_id', 'ce.id')
                    .whereIn('ea.player_id', playerIds)
                    .where('ce.academy_id', academyId)
                    .whereNull('ce.deleted_at')
                    .whereNot('ce.status', 'cancelled')
                    .groupBy('ea.player_id')
                    .select(
                        'ea.player_id',
                        this.db.raw('COUNT(*)::int as total'),
                        this.db.raw("SUM(CASE WHEN ea.status IN ('present', 'late') THEN 1 ELSE 0 END)::int as attended"),
                    ),
                this.db('match_attendance as ma')
                    .join('matches as m', 'ma.match_id', 'm.id')
                    .join('player_profiles as pp', 'ma.player_id', 'pp.id')
                    .whereIn('ma.player_id', playerIds)
                    .where('pp.academy_id', academyId)
                    .whereNull('m.deleted_at')
                    .whereNot('m.status', 'cancelled')
                    .groupBy('ma.player_id')
                    .select(
                        'ma.player_id',
                        this.db.raw('COUNT(*)::int as total'),
                        this.db.raw("SUM(CASE WHEN ma.status IN ('present', 'late') THEN 1 ELSE 0 END)::int as attended"),
                    ),
            ]);

        const byPlayer = (rows) => new Map(rows.map((row) => [row.player_id, row]));
        const trainingByPlayer = byPlayer(trainingRows);
        const matchByPlayer = byPlayer(matchRows);
        const trainingAttendanceByPlayer = byPlayer(trainingAttendanceRows);
        const matchAttendanceByPlayer = byPlayer(matchAttendanceRows);

        const rows = players
            .map((player) => {
                const trainingScore = this._avgRatingToScore(
                    trainingByPlayer.get(player.player_id)?.avg_rating,
                );
                const matchScore = this._avgRatingToScore(
                    matchByPlayer.get(player.player_id)?.avg_rating,
                );
                const trainingAttendance = trainingAttendanceByPlayer.get(player.player_id);
                const matchAttendance = matchAttendanceByPlayer.get(player.player_id);
                const attendanceScore = this._attendanceToScore(
                    Number(trainingAttendance?.attended || 0) + Number(matchAttendance?.attended || 0),
                    Number(trainingAttendance?.total || 0) + Number(matchAttendance?.total || 0),
                );

                return {
                    id: `live:${period}:${player.player_id}`,
                    player_id: player.player_id,
                    player_name: player.player_name,
                    group_id: player.group_id,
                    group_name: player.group_name,
                    total_score: this._weightedScore({
                        trainingScore,
                        matchScore,
                        attendanceScore,
                    }).toFixed(2),
                    period,
                    calculated_at: new Date().toISOString(),
                    trend: 'new',
                };
            })
            .sort((a, b) => {
                const scoreDiff = Number(b.total_score) - Number(a.total_score);
                if (scoreDiff) return scoreDiff;
                return String(a.player_name || '').localeCompare(String(b.player_name || ''));
            })
            .map((row, index) => ({ ...row, rank: index + 1 }));

        const total = rows.length;
        const data = rows.slice((page - 1) * limit, (page - 1) * limit + limit);
        return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
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
        if (+count === 0) {
            return this.findLiveRankingsFallback(period, {
                groupId,
                academyId,
                page,
                limit,
            });
        }

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
