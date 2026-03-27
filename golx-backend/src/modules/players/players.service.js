const eventBus = require('../../events/eventBus');
const PLAYERS_EVENTS = require('./players.events');
const { NotFoundError } = require('../../shared/errors');

class PlayersService {
    constructor(playersRepository) {
        this.repo = playersRepository;
    }

    async listPlayers(academyId, filters) {
        return this.repo.findPlayers({ academyId, ...filters });
    }

    async getPlayer(id, academyId) {
        const player = await this.repo.findById(id);
        if (!player) throw new NotFoundError('Player', id);
        if (player.academy_id !== academyId) throw new NotFoundError('Player', id);
        return player;
    }

    async getPlayerSummary(id, academyId) {
        const player = await this.repo.findPlayerSummary(id);
        if (!player) throw new NotFoundError('Player', id);
        if (player.academy_id !== academyId) throw new NotFoundError('Player', id);
        return player;
    }

    async createPlayer(academyId, data) {
        // Verify the branch belongs to this academy before creating a player
        const branch = await this.repo.findBranchByIdAndAcademy(data.branchId, academyId);
        if (!branch) throw new NotFoundError('Branch', data.branchId);

        const player = await this.repo.create({
            academy_id: academyId,
            branch_id: data.branchId,
            group_id: data.groupId || null,
            user_id: data.userId || null,
            full_name: data.fullName,
            date_of_birth: data.birthDate,
            level: data.level || null,
            position: data.position || null,
            preferred_foot: data.preferredFoot || null,
            photo_url: data.photoUrl || null,
            guardian_name: data.guardianName || null,
            guardian_phone: data.guardianPhone || null,
            notes: data.notes || null,
        });

        // If group assigned, create assignment record
        if (data.groupId) {
            await this.repo.assignToGroup(player.id, data.groupId);
        }

        eventBus.publish(PLAYERS_EVENTS.CREATED, {
            playerId: player.id,
            academyId,
            branchId: data.branchId,
            groupId: data.groupId,
        });

        return player;
    }

    async updatePlayer(id, academyId, data) {
        const player = await this.repo.findById(id);
        if (!player) throw new NotFoundError('Player', id);
        if (player.academy_id !== academyId) throw new NotFoundError('Player', id);

        const updateData = {};
        if (data.fullName) updateData.full_name = data.fullName;
        if (data.birthDate) updateData.date_of_birth = data.birthDate;
        if (data.branchId) updateData.branch_id = data.branchId;
        if (data.level !== undefined) updateData.level = data.level;
        if (data.position !== undefined) updateData.position = data.position;
        if (data.preferredFoot !== undefined) updateData.preferred_foot = data.preferredFoot;
        if (data.photoUrl !== undefined) updateData.photo_url = data.photoUrl;
        if (data.notes !== undefined) updateData.notes = data.notes;

        const updated = await this.repo.update(id, updateData);

        // Handle group change
        if (data.groupId && data.groupId !== player.group_id) {
            await this.repo.assignToGroup(id, data.groupId);
            eventBus.publish(PLAYERS_EVENTS.GROUP_CHANGED, {
                playerId: id,
                oldGroupId: player.group_id,
                newGroupId: data.groupId,
            });
        }

        // Handle level change
        if (data.level && data.level !== player.level) {
            eventBus.publish(PLAYERS_EVENTS.LEVEL_CHANGED, {
                playerId: id,
                oldLevel: player.level,
                newLevel: data.level,
            });
        }

        eventBus.publish(PLAYERS_EVENTS.UPDATED, { playerId: id });
        return updated;
    }

    async deletePlayer(id, academyId) {
        const player = await this.repo.findById(id);
        if (!player) throw new NotFoundError('Player', id);
        if (player.academy_id !== academyId) throw new NotFoundError('Player', id);

        await this.repo.softDelete(id);
        eventBus.publish(PLAYERS_EVENTS.DELETED, { playerId: id, academyId: player.academy_id });
    }

    // ─── Measurements ──────────────────────────────────────────────────
    async getMeasurements(playerId, pagination) {
        return this.repo.findMeasurements(playerId, pagination);
    }

    async addMeasurement(playerId, coachId, data) {
        const measurement = await this.repo.addMeasurement({
            player_id: playerId,
            height_cm: data.heightCm,
            weight_kg: data.weightKg,
            measured_at: data.recordedMonth,
            measured_by: coachId,
            notes: data.notes,
        });

        eventBus.publish(PLAYERS_EVENTS.MEASUREMENT_ADDED, {
            playerId,
            measurementId: measurement.id,
        });

        return measurement;
    }

    // ─── Injuries ──────────────────────────────────────────────────────
    async getInjuries(playerId, pagination) {
        return this.repo.findInjuries(playerId, pagination);
    }

    async addInjury(playerId, coachId, data) {
        const injury = await this.repo.addInjury({
            player_id: playerId,
            injury_type: data.injuryType,
            body_part: data.bodyPart,
            severity: data.severity,
            injury_date: data.occurredAt,
            recovery_date: data.recoveredAt || null,
            notes: data.notes,
            reported_by: coachId,
        });

        eventBus.publish(PLAYERS_EVENTS.INJURY_REPORTED, {
            playerId,
            injuryId: injury.id,
            severity: data.severity,
        });

        return injury;
    }

    // ─── Parent access ─────────────────────────────────────────────────
    async getChildrenByParent(parentUserId) {
        return this.repo.findChildrenByParent(parentUserId);
    }

    async isParentOfPlayer(parentUserId, playerId) {
        return this.repo.isParentOfPlayer(parentUserId, playerId);
    }
}

module.exports = PlayersService;
