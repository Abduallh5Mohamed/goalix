const BaseRepository = require('../../shared/base.repository');

class CoachesRepository extends BaseRepository {
    constructor(db) {
        super('coach_profiles', db);
    }

    async findCoaches(academyId, { page = 1, limit = 20 } = {}) {
        const query = this.db('coach_profiles')
            .where('coach_profiles.academy_id', academyId)
            .whereNull('coach_profiles.deleted_at');

        const [{ count }] = await query.clone().count('coach_profiles.id as count');
        const data = await query
            .select('coach_profiles.*')
            .orderBy('coach_profiles.created_at', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async findByUserId(userId) {
        return this.db('coach_profiles').where({ user_id: userId }).whereNull('deleted_at').first();
    }

    // ─── Group assignments (owned by coaches module) ────────────────────
    async findCoachGroups(coachId) {
        return this.db('coach_group_assignments')
            .where({ coach_id: coachId })
            .select('*');
    }

    async assignGroup(coachId, groupId, role = 'head') {
        const [row] = await this.db('coach_group_assignments')
            .insert({ coach_id: coachId, group_id: groupId, role, assigned_at: new Date() })
            .returning('*');
        return row;
    }

    async unassignGroup(coachId, groupId) {
        return this.db('coach_group_assignments')
            .where({ coach_id: coachId, group_id: groupId })
            .del();
    }

    async isCoachOfGroup(coachId, groupId) {
        const row = await this.db('coach_group_assignments')
            .where({ coach_id: coachId, group_id: groupId })
            .first();
        return !!row;
    }

    // ─── Performance scores (owned by coaches module) ───────────────────
    async findPerformanceScores(coachId, { page = 1, limit = 20 } = {}) {
        const query = this.db('coach_performance_scores')
            .where({ coach_id: coachId });

        const [{ count }] = await query.clone().count('id as count');
        const data = await query
            .orderBy('calculated_at', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async addPerformanceScore(data) {
        const [row] = await this.db('coach_performance_scores').insert(data).returning('*');
        return row;
    }

    async verifyGroupOwnership(groupId, academyId) {
        return this.db('academy_groups as ag')
            .join('academy_birth_years as aby', 'ag.birth_year_id', 'aby.id')
            .join('academy_branches as ab', 'aby.branch_id', 'ab.id')
            .where('ag.id', groupId)
            .where('ab.academy_id', academyId)
            .first();
    }
}

module.exports = CoachesRepository;
