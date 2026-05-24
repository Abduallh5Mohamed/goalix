const BaseRepository = require('../../shared/base.repository');

class PlayersRepository extends BaseRepository {
    constructor(db) {
        super('player_profiles', db);
    }

    async findPlayers({ academyId, branchId, groupId, level, isActive, search, page = 1, limit = 20 }) {
        const query = this.db('player_profiles')
            .where('player_profiles.academy_id', academyId)
            .whereNull('player_profiles.deleted_at')
            .modify((q) => {
                if (groupId) q.whereIn('player_profiles.id',
                    this.db('player_group_assignments').where({ group_id: groupId }).whereNull('left_at').select('player_id'));
                if (level) q.where('player_profiles.level', level);
                if (search) q.where('player_profiles.full_name', 'ilike', `%${search}%`);
            });

        const [{ count }] = await query.clone().count('player_profiles.id as count');
        const data = await query
            .select(
                'player_profiles.id', 'player_profiles.full_name', 'player_profiles.date_of_birth',
                'player_profiles.level', 'player_profiles.position', 'player_profiles.preferred_foot',
                'player_profiles.photo_url', 'player_profiles.created_at',
            )
            .orderBy('player_profiles.full_name', 'asc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async findPlayerSummary(playerId) {
        return this.db('player_profiles')
            .where('player_profiles.id', playerId)
            .whereNull('player_profiles.deleted_at')
            .select('*')
            .first();
    }

    // ─── Measurements (owned by players module) ─────────────────────────
    async findMeasurements(playerId, { page = 1, limit = 20 } = {}) {
        const query = this.db('player_measurements')
            .where({ player_id: playerId });

        const [{ count }] = await query.clone().count('id as count');
        const data = await query
            .orderBy('recorded_month', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async addMeasurement(data) {
        const [row] = await this.db('player_measurements').insert(data).returning('*');
        return row;
    }

    // ─── Injuries (owned by players module) ─────────────────────────────
    async findInjuries(playerId, { page = 1, limit = 20 } = {}) {
        const query = this.db('player_injury_history')
            .where({ player_id: playerId });

        const [{ count }] = await query.clone().count('id as count');
        const data = await query
            .orderBy('injury_date', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async addInjury(data) {
        const [row] = await this.db('player_injury_history').insert(data).returning('*');
        return row;
    }

    async recoverInjury(injuryId, recoveredAt) {
        const [row] = await this.db('player_injury_history')
            .where({ id: injuryId })
            .update({ recovery_date: recoveredAt })
            .returning('*');
        return row;
    }

    // ─── Group Assignments (owned by players module) ────────────────────
    async findGroupAssignments(playerId) {
        return this.db('player_group_assignments')
            .where({ player_id: playerId })
            .orderBy('joined_at', 'desc');
    }

    async assignToGroup(playerId, groupId) {
        // Close previous assignment
        await this.db('player_group_assignments')
            .where({ player_id: playerId })
            .whereNull('left_at')
            .update({ left_at: new Date() });

        // Create new assignment
        const [row] = await this.db('player_group_assignments')
            .insert({ player_id: playerId, group_id: groupId, joined_at: new Date() })
            .returning('*');

        return row;
    }

    // ─── Parent-Player link (stubs — no parent_players table) ──────────
    async findChildrenByParent(parentUserId) {
        return [];
    }

    async linkParentToPlayer(parentUserId, playerId) {
        return null;
    }

    async isParentOfPlayer(parentUserId, playerId) {
        return false;
    }

    async findBranchByIdAndAcademy(branchId, academyId) {
        return this.db('academy_branches')
            .where({ id: branchId, academy_id: academyId })
            .whereNull('deleted_at')
            .first();
    }
}

module.exports = PlayersRepository;
