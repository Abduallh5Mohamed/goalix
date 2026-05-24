const BaseRepository = require('../../shared/base.repository');

class AcademyRepository extends BaseRepository {
    constructor(db) {
        super('academy_academies', db);
    }

    // ─── Branches ───────────────────────────────────────────────────────
    async findBranches(academyId, { page = 1, limit = 20 } = {}) {
        const query = this.db('academy_branches')
            .where({ academy_id: academyId })
            .whereNull('deleted_at');

        const [{ count }] = await query.clone().count('id as count');
        const data = await query
            .select('*')
            .orderBy('name', 'asc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async findBranchById(id) {
        return this.db('academy_branches').where({ id }).whereNull('deleted_at').first();
    }

    async createBranch(data) {
        const [row] = await this.db('academy_branches').insert(data).returning('*');
        return row;
    }

    async updateBranch(id, data) {
        const [row] = await this.db('academy_branches')
            .where({ id }).whereNull('deleted_at')
            .update({ ...data, updated_at: new Date() }).returning('*');
        return row;
    }

    async softDeleteBranch(id) {
        return this.db('academy_branches').where({ id }).update({ deleted_at: new Date() });
    }

    // ─── Groups ─────────────────────────────────────────────────────────
    async findGroupsByBranch(branchId, { page = 1, limit = 20 } = {}) {
        const query = this.db('academy_groups')
            .where({ branch_id: branchId })
            .whereNull('deleted_at');

        const [{ count }] = await query.clone().count('id as count');
        const data = await query
            .select('*')
            .orderBy('name', 'asc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async findGroupById(id) {
        return this.db('academy_groups').where({ id }).whereNull('deleted_at').first();
    }

    async createGroup(data) {
        const [row] = await this.db('academy_groups').insert(data).returning('*');
        return row;
    }

    async updateGroup(id, data) {
        const [row] = await this.db('academy_groups')
            .where({ id }).whereNull('deleted_at')
            .update({ ...data, updated_at: new Date() }).returning('*');
        return row;
    }

    async softDeleteGroup(id) {
        return this.db('academy_groups').where({ id }).update({ deleted_at: new Date() });
    }

    // ─── Birth Years ────────────────────────────────────────────────────
    async findBirthYears(branchId) {
        return this.db('academy_birth_years')
            .where({ branch_id: branchId })
            .orderBy('year', 'desc');
    }

    async createBirthYear(data) {
        const [row] = await this.db('academy_birth_years').insert(data).returning('*');
        return row;
    }

    async findBirthYearById(id) {
        return this.db('academy_birth_years').where({ id }).first();
    }

    // ─── Schedules ──────────────────────────────────────────────────────
    async findSchedulesByGroup(groupId) {
        return this.db('academy_schedules')
            .where({ group_id: groupId })
            .orderBy('day_of_week', 'asc');
    }

    async createSchedule(data) {
        const [row] = await this.db('academy_schedules').insert(data).returning('*');
        return row;
    }

    async deleteSchedule(id) {
        return this.db('academy_schedules').where({ id }).del();
    }
}

module.exports = AcademyRepository;
