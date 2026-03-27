const eventBus = require('../../events/eventBus');
const COACHES_EVENTS = require('./coaches.events');
const { NotFoundError } = require('../../shared/errors');

class CoachesService {
    constructor(coachesRepository) {
        this.repo = coachesRepository;
    }

    async listCoaches(academyId, pagination) {
        return this.repo.findCoaches(academyId, pagination);
    }

    async getCoach(id, academyId) {
        const coach = await this.repo.findById(id);
        if (!coach) throw new NotFoundError('Coach', id);
        if (coach.academy_id !== academyId) throw new NotFoundError('Coach', id);
        return coach;
    }

    async getCoachByUserId(userId) {
        const coach = await this.repo.findByUserId(userId);
        if (!coach) throw new NotFoundError('Coach (by userId)', userId);
        return coach;
    }

    async createCoach(academyId, data) {
        const coach = await this.repo.create({
            user_id: data.userId,
            academy_id: academyId,
            specialization: data.specialization || null,
            bio: data.bio || null,
        });

        eventBus.publish(COACHES_EVENTS.CREATED, {
            coachId: coach.id,
            userId: data.userId,
            academyId,
        });

        return coach;
    }

    async updateCoach(id, academyId, data) {
        const coach = await this.repo.findById(id);
        if (!coach) throw new NotFoundError('Coach', id);
        if (coach.academy_id !== academyId) throw new NotFoundError('Coach', id);

        const updateData = {};
        if (data.specialization !== undefined) updateData.specialization = data.specialization;
        if (data.bio !== undefined) updateData.bio = data.bio;

        const updated = await this.repo.update(id, updateData);
        eventBus.publish(COACHES_EVENTS.UPDATED, { coachId: id });
        return updated;
    }

    async deleteCoach(id, academyId) {
        const coach = await this.repo.findById(id);
        if (!coach) throw new NotFoundError('Coach', id);
        if (coach.academy_id !== academyId) throw new NotFoundError('Coach', id);

        await this.repo.softDelete(id);
        eventBus.publish(COACHES_EVENTS.DELETED, { coachId: id, academyId: coach.academy_id });
    }

    async getCoachGroups(coachId) {
        return this.repo.findCoachGroups(coachId);
    }

    async assignGroup(coachId, academyId, groupId, role) {
        const coach = await this.repo.findById(coachId);
        if (!coach) throw new NotFoundError('Coach', coachId);
        if (coach.academy_id !== academyId) throw new NotFoundError('Coach', coachId);

        // Verify the group belongs to this academy before assigning
        const groupCheck = await this.repo.verifyGroupOwnership(groupId, academyId);
        if (!groupCheck) throw new NotFoundError('Group', groupId);

        const assignment = await this.repo.assignGroup(coachId, groupId, role);
        eventBus.publish(COACHES_EVENTS.GROUP_ASSIGNED, { coachId, groupId });
        return assignment;
    }

    async getPerformance(coachId, pagination) {
        return this.repo.findPerformanceScores(coachId, pagination);
    }

    async isCoachOfGroup(coachId, groupId) {
        return this.repo.isCoachOfGroup(coachId, groupId);
    }
}

module.exports = CoachesService;
