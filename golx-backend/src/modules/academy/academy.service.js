const eventBus = require('../../events/eventBus');
const ACADEMY_EVENTS = require('./academy.events');
const { NotFoundError, ForbiddenError } = require('../../shared/errors');

class AcademyService {
    constructor(academyRepository) {
        this.repo = academyRepository;
    }

    // ─── Academy ────────────────────────────────────────────────────────
    async getAcademy(academyId) {
        const academy = await this.repo.findById(academyId);
        if (!academy) throw new NotFoundError('Academy', academyId);
        return academy;
    }

    async updateAcademy(academyId, data) {
        const academy = await this.repo.update(academyId, {
            name: data.name,
            logo_url: data.logoUrl,
            address: data.address,
            phone: data.phone,
            email: data.email,
            settings: data.settings,
        });
        if (!academy) throw new NotFoundError('Academy', academyId);

        eventBus.publish(ACADEMY_EVENTS.UPDATED, { academyId });
        return academy;
    }

    // ─── Branches ───────────────────────────────────────────────────────
    async getBranches(academyId, pagination) {
        return this.repo.findBranches(academyId, pagination);
    }

    async getBranch(id, academyId) {
        const branch = await this.repo.findBranchById(id);
        if (!branch || branch.academy_id !== academyId) throw new NotFoundError('Branch', id);
        return branch;
    }

    async createBranch(academyId, data) {
        const branch = await this.repo.createBranch({
            academy_id: academyId,
            name: data.name,
            address: data.address,
            capacity: data.capacity,
        });

        eventBus.publish(ACADEMY_EVENTS.BRANCH_CREATED, {
            branchId: branch.id,
            academyId,
            name: branch.name,
        });

        return branch;
    }

    async updateBranch(id, academyId, data) {
        const branch = await this.repo.findBranchById(id);
        if (!branch || branch.academy_id !== academyId) throw new NotFoundError('Branch', id);

        const updated = await this.repo.updateBranch(id, {
            name: data.name,
            address: data.address,
            capacity: data.capacity,
        });

        eventBus.publish(ACADEMY_EVENTS.BRANCH_UPDATED, { branchId: id, academyId });
        return updated;
    }

    async deleteBranch(id, academyId) {
        const branch = await this.repo.findBranchById(id);
        if (!branch || branch.academy_id !== academyId) throw new NotFoundError('Branch', id);

        await this.repo.softDeleteBranch(id);
        eventBus.publish(ACADEMY_EVENTS.BRANCH_DELETED, { branchId: id, academyId });
    }

    // ─── Groups ─────────────────────────────────────────────────────────
    async getGroups(branchId, academyId, pagination) {
        // Verify the branch belongs to this academy before returning its groups
        const branch = await this.repo.findBranchById(branchId);
        if (!branch || branch.academy_id !== academyId) throw new NotFoundError('Branch', branchId);
        return this.repo.findGroupsByBranch(branchId, pagination);
    }

    async getGroup(id) {
        const group = await this.repo.findGroupById(id);
        if (!group) throw new NotFoundError('Group', id);
        return group;
    }

    async createGroup(academyId, data) {
        // Verify the target branch belongs to this academy
        const branch = await this.repo.findBranchById(data.branchId);
        if (!branch || branch.academy_id !== academyId) throw new NotFoundError('Branch', data.branchId);

        const group = await this.repo.createGroup({
            branch_id: data.branchId,
            birth_year_id: data.birthYearId,
            name: data.name,
            max_players: data.maxPlayers,
        });

        eventBus.publish(ACADEMY_EVENTS.GROUP_CREATED, {
            groupId: group.id,
            branchId: data.branchId,
            birthYearId: data.birthYearId,
        });

        return group;
    }

    async updateGroup(id, academyId, data) {
        const group = await this.repo.findGroupById(id);
        if (!group) throw new NotFoundError('Group', id);

        // Verify the group’s branch belongs to this academy
        const branch = await this.repo.findBranchById(group.branch_id);
        if (!branch || branch.academy_id !== academyId) throw new NotFoundError('Group', id);

        const updated = await this.repo.updateGroup(id, {
            name: data.name,
            max_players: data.maxPlayers,
            is_active: data.isActive,
        });

        eventBus.publish(ACADEMY_EVENTS.GROUP_UPDATED, { groupId: id });
        return updated;
    }

    async deleteGroup(id, academyId) {
        const group = await this.repo.findGroupById(id);
        if (!group) throw new NotFoundError('Group', id);

        // Verify the group’s branch belongs to this academy
        const branch = await this.repo.findBranchById(group.branch_id);
        if (!branch || branch.academy_id !== academyId) throw new NotFoundError('Group', id);

        await this.repo.softDeleteGroup(id);
        eventBus.publish(ACADEMY_EVENTS.GROUP_DELETED, { groupId: id });
    }

    // ─── Birth Years ────────────────────────────────────────────────────
    async getBirthYears(branchId, academyId) {
        // Verify branch belongs to this academy before exposing its birth years
        const branch = await this.repo.findBranchById(branchId);
        if (!branch || branch.academy_id !== academyId) throw new NotFoundError('Branch', branchId);
        return this.repo.findBirthYears(branchId);
    }

    async createBirthYear(data, academyId) {
        // Verify the target branch belongs to this academy before creating
        const branch = await this.repo.findBranchById(data.branchId);
        if (!branch || branch.academy_id !== academyId) throw new NotFoundError('Branch', data.branchId);

        const birthYear = await this.repo.createBirthYear({
            branch_id: data.branchId,
            year: data.year,
            label: data.label,
        });

        eventBus.publish(ACADEMY_EVENTS.BIRTH_YEAR_CREATED, {
            birthYearId: birthYear.id,
            branchId: data.branchId,
            year: data.year,
        });

        return birthYear;
    }

    // ─── Schedules ──────────────────────────────────────────────────────
    async getSchedules(groupId) {
        return this.repo.findSchedulesByGroup(groupId);
    }

    async createSchedule(data) {
        return this.repo.createSchedule({
            group_id: data.groupId,
            day_of_week: data.dayOfWeek,
            start_time: data.startTime,
            end_time: data.endTime,
            location: data.location,
        });
    }
}

module.exports = AcademyService;
