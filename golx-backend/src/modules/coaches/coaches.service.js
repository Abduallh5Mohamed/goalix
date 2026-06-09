const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const eventBus = require('../../events/eventBus');
const COACHES_EVENTS = require('./coaches.events');
const { BadRequestError, NotFoundError } = require('../../shared/errors');

const legacyAssignmentRoleMap = {
    head: 'head_coach',
    assistant: 'assistant_coach',
    goalkeeping: 'goalkeeping_coach',
};

const normalizeAssignmentRole = (role) => legacyAssignmentRoleMap[role] || role || 'assistant_coach';

const ASSIGNMENT_UPLOAD_MIME = {
    'application/pdf': { fileType: 'pdf', extension: '.pdf' },
    'application/msword': { fileType: 'word', extension: '.doc' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { fileType: 'word', extension: '.docx' },
    'image/png': { fileType: 'image', extension: '.png' },
    'image/jpeg': { fileType: 'image', extension: '.jpg' },
    'image/jpg': { fileType: 'image', extension: '.jpg' },
    'image/webp': { fileType: 'image', extension: '.webp' },
};

const COACH_IMAGE_MIME = {
    'image/png': { extension: '.png' },
    'image/jpeg': { extension: '.jpg' },
    'image/jpg': { extension: '.jpg' },
    'image/webp': { extension: '.webp' },
};

const toNumber = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const mapTrend = (trend) => ({
    up: 'improving',
    down: 'declining',
    same: 'stable',
    new: 'stable',
    improving: 'improving',
    declining: 'declining',
    stable: 'stable',
}[trend] || 'stable');

const formatTime = (value, fallback) => {
    if (!value) return fallback;
    return String(value).slice(0, 5);
};

const sanitizeFileName = (value = 'assignment-file') => {
    let decoded = String(value);
    try {
        decoded = decodeURIComponent(decoded);
    } catch {
        // Keep the raw value if a client sends a non-encoded header.
    }
    return decoded
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160) || 'assignment-file';
};

class CoachesService {
    constructor(coachesRepository, academyService) {
        this.repo = coachesRepository;
        this.academyService = academyService;
    }

    async listCoaches(academyId, pagination) {
        return this.repo.findCoaches(academyId, pagination);
    }

    async getCoach(id, academyId) {
        const coach = await this.repo.findById(id);
        if (!coach) throw new NotFoundError('Coach', id);
        if (academyId && coach.academy_id !== academyId) throw new NotFoundError('Coach', id);
        return coach;
    }

    async getCoachByUserId(userId) {
        const coach = await this.repo.findByUserId(userId);
        if (!coach) throw new NotFoundError('Coach (by userId)', userId);
        return coach;
    }

    async _getCurrentCoach(userId, academyId) {
        const coach = await this.repo.findByUserId(userId);
        if (!coach) throw new NotFoundError('Coach (by userId)', userId);
        if (academyId && coach.academy_id !== academyId) throw new NotFoundError('Coach', coach.id);
        return coach;
    }

    _shapeGroup(group, players = []) {
        const groupPlayers = players.filter((player) => player.groupId === group.id);
        const avgAttendance = groupPlayers.length
            ? Math.round(groupPlayers.reduce((sum, player) => sum + player.attendanceRate, 0) / groupPlayers.length)
            : 0;
        const avgPerformance = groupPlayers.length
            ? Math.round(groupPlayers.reduce((sum, player) => sum + player.performanceScore, 0) / groupPlayers.length)
            : 0;

        return {
            id: group.id,
            branchId: group.branch_id,
            branchName: group.branch_name,
            birthYears: group.birth_years || [],
            name: group.name,
            role: group.role,
            maxPlayers: Number(group.max_players || 0),
            playerCount: Number(group.player_count || groupPlayers.length || 0),
            schedule: group.schedule || 'No schedule',
            status: 'active',
            avgAttendance,
            avgPerformance,
            assignedAt: group.assigned_at,
        };
    }

    _shapePlayer(player, index = 0) {
        const mainPosition = player.main_position || player.position || 'Unassigned';
        return {
            id: player.id,
            userId: player.user_id,
            fullName: player.full_name,
            dateOfBirth: player.date_of_birth,
            age: Number(player.age || 0),
            level: player.level || 'beginner',
            position: mainPosition,
            mainPosition,
            rawPosition: player.position || null,
            preferredFoot: player.preferred_foot || null,
            avatarUrl: player.photo_url || '',
            branchId: player.branch_id,
            branchName: player.branch_name,
            groupId: player.group_id,
            groupName: player.group_name,
            parentName: player.guardian_name || '',
            parentPhone: player.guardian_phone || '',
            height: toNumber(player.height),
            weight: toNumber(player.weight),
            sprintSpeed: toNumber(player.sprint_speed),
            flexibility: toNumber(player.flexibility),
            attendanceRate: toNumber(player.attendance_rate),
            performanceScore: toNumber(player.performance_score),
            rankInGroup: Number(player.rank_in_group || index + 1),
            trend: mapTrend(player.trend),
            profileStatus: player.profile_status || 'incomplete',
            status: 'active',
        };
    }

    _shapeSession(session) {
        return {
            id: session.id,
            groupId: session.group_id,
            groupName: session.group_name,
            coachId: session.coach_id,
            date: session.session_date,
            startTime: formatTime(session.start_time, '16:00'),
            endTime: formatTime(session.end_time, '17:30'),
            location: session.location || '',
            type: session.session_type || 'training',
            status: session.status,
            notes: session.notes || '',
            attendanceCount: Number(session.attendance_count || 0),
            totalPlayers: Number(session.total_players || 0),
        };
    }

    _rankPlayers(players) {
        return [...players]
            .sort((a, b) => b.performanceScore - a.performanceScore || a.fullName.localeCompare(b.fullName))
            .map((player, index) => ({
                ...player,
                rankInGroup: player.rankInGroup || index + 1,
            }));
    }

    async getMyGroups(userId, academyId) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const [groups, players] = await Promise.all([
            this.repo.findCoachGroupsDetailed(coach.id, academyId),
            this.repo.findCoachPlayers(coach.id, academyId),
        ]);

        return groups.map((group) => this._shapeGroup(group, players.map((player) => this._shapePlayer(player))));
    }

    async createMyGroup(userId, academyId, data) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const group = await this.academyService.createGroup(academyId, data);

        await this.assignGroup(coach.id, academyId, group.id, 'head');

        const detailed = await this.repo.findCoachGroupDetailed(coach.id, academyId, group.id);
        if (!detailed) throw new NotFoundError('Group', group.id);

        return this._shapeGroup(detailed, []);
    }

    async createMyBirthYear(userId, academyId, data) {
        await this._getCurrentCoach(userId, academyId);
        return this.academyService.createBirthYear(data, academyId);
    }

    async getMyGroupDetail(userId, academyId, groupId) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const [group, players] = await Promise.all([
            this.repo.findCoachGroupDetailed(coach.id, academyId, groupId),
            this.repo.findCoachPlayers(coach.id, academyId, groupId),
        ]);
        if (!group) throw new NotFoundError('Group', groupId);

        const shapedPlayers = this._rankPlayers(players.map((player, index) => this._shapePlayer(player, index)));
        return {
            group: this._shapeGroup(group, shapedPlayers),
            players: shapedPlayers,
        };
    }

    async updateMyGroup(userId, academyId, groupId, data) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const group = await this.repo.findCoachGroupDetailed(coach.id, academyId, groupId);
        if (!group) throw new NotFoundError('Group', groupId);

        const payload = {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.maxPlayers !== undefined ? { maxPlayers: data.maxPlayers } : {}),
            ...(data.birthYearIds !== undefined ? { birthYearIds: data.birthYearIds } : {}),
            ...(data.birthYearId !== undefined ? { birthYearId: data.birthYearId } : {}),
            ...(data.playerIds !== undefined ? { playerIds: data.playerIds } : {}),
        };

        await this.academyService.updateGroup(groupId, academyId, payload);
        return this.getMyGroupDetail(userId, academyId, groupId);
    }

    async deleteMyGroup(userId, academyId, groupId) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const group = await this.repo.findCoachGroupDetailed(coach.id, academyId, groupId);
        if (!group) throw new NotFoundError('Group', groupId);

        const now = new Date();
        await this.repo.db.transaction(async (trx) => {
            await trx('player_group_assignments')
                .where({ group_id: groupId })
                .whereNull('left_at')
                .update({ left_at: now });
            await trx('coach_group_assignments').where({ group_id: groupId }).del();
            await trx('coach_access_rule_groups').where({ group_id: groupId }).del();
            await trx('group_birth_years').where({ group_id: groupId }).del();
            await trx('group_labels').where({ group_id: groupId }).del();
            await trx('academy_groups')
                .where({ id: groupId })
                .update({ deleted_at: now, is_active: false, updated_at: now });
        });

        return { message: 'Group deleted' };
    }

    async getMyDashboard(userId, academyId) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const [groupsRaw, playersRaw, sessionsRaw, evaluations] = await Promise.all([
            this.repo.findCoachGroupsDetailed(coach.id, academyId),
            this.repo.findCoachPlayers(coach.id, academyId),
            this.repo.findCoachSessions(coach.id, academyId, { limit: 5 }),
            this.repo.findCoachEvaluations(coach.id, academyId, { limit: 5 }),
        ]);
        const players = playersRaw.map((player, index) => this._shapePlayer(player, index));
        const groups = groupsRaw.map((group) => this._shapeGroup(group, players));
        const avgAttendance = players.length
            ? Math.round(players.reduce((sum, player) => sum + player.attendanceRate, 0) / players.length)
            : 0;

        return {
            coach: {
                id: coach.id,
                fullName: coach.full_name,
                specialization: coach.specialization,
            },
            stats: {
                groups: groups.length,
                players: players.length,
                avgAttendance,
                evaluations: evaluations.total,
            },
            groups,
            sessions: sessionsRaw.data.map((session) => this._shapeSession(session)),
            evaluations: evaluations.data.map((evaluation) => this._shapeEvaluation(evaluation)),
            notifications: [],
        };
    }

    async getMySessions(userId, academyId, filters) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const result = await this.repo.findCoachSessions(coach.id, academyId, filters);
        return {
            ...result,
            data: result.data.map((session) => this._shapeSession(session)),
        };
    }

    async getMySession(userId, academyId, sessionId) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const detail = await this.repo.findCoachSessionAttendance(coach.id, academyId, sessionId);
        if (!detail) throw new NotFoundError('Session', sessionId);

        return {
            session: this._shapeSession(detail.session),
            records: detail.records.map((record) => ({
                id: record.id,
                sessionId: record.session_id,
                playerId: record.player_id,
                playerName: record.player_name,
                status: record.status,
                notes: record.notes || '',
                markedBy: record.marked_by,
                markedAt: record.marked_at,
            })),
        };
    }

    async markMyAttendance(userId, academyId, sessionId, records) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const session = await this.repo.findCoachSessionById(coach.id, academyId, sessionId);
        if (!session) throw new NotFoundError('Session', sessionId);

        const players = await this.repo.findCoachPlayers(coach.id, academyId, session.group_id);
        const allowedPlayerIds = new Set(players.map((player) => player.id));
        const invalid = records.find((record) => !allowedPlayerIds.has(record.playerId));
        if (invalid) throw new NotFoundError('Player', invalid.playerId);

        return this.repo.upsertCoachAttendance(sessionId, records, userId);
    }

    async getMyAttendanceHistory(userId, academyId, pagination) {
        const coach = await this._getCurrentCoach(userId, academyId);
        return this.repo.findCoachAttendanceHistory(coach.id, academyId, pagination);
    }

    async saveMyMeasurements(userId, academyId, records) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const players = await this.repo.findCoachPlayers(coach.id, academyId);
        const allowedPlayerIds = new Set(players.map((player) => player.id));
        const validRecords = records.filter((record) => allowedPlayerIds.has(record.playerId));
        if (validRecords.length !== records.length) {
            const invalid = records.find((record) => !allowedPlayerIds.has(record.playerId));
            throw new NotFoundError('Player', invalid.playerId);
        }

        return this.repo.insertCoachMeasurements(validRecords, userId);
    }

    _shapeEvaluation(evaluation) {
        return {
            id: evaluation.id,
            playerId: evaluation.player_id,
            playerName: evaluation.player_name,
            groupId: evaluation.group_id,
            groupName: evaluation.group_name,
            coachId: evaluation.coach_id,
            date: evaluation.eval_date,
            technicalScore: toNumber(evaluation.technical_score),
            tacticalScore: toNumber(evaluation.tactical_score),
            physicalScore: toNumber(evaluation.physical_score),
            mentalScore: toNumber(evaluation.mental_score),
            overallScore: toNumber(evaluation.score),
            notes: evaluation.notes || '',
        };
    }

    _shapeAssignmentFile(file) {
        return {
            id: file.id,
            assignmentId: file.assignment_id,
            fileRole: file.file_role,
            fileType: file.file_type,
            fileName: file.file_name,
            fileUrl: file.file_url,
            mimeType: file.mime_type,
            sizeBytes: toNumber(file.size_bytes),
            uploadedBy: file.uploaded_by,
            createdAt: file.created_at,
        };
    }

    _shapeAssignment(assignment) {
        const files = (assignment.files || []).map((file) => this._shapeAssignmentFile(file));
        return {
            id: assignment.id,
            academyId: assignment.academy_id,
            coachId: assignment.coach_id,
            coachName: assignment.coach_name || null,
            branchId: assignment.branch_id,
            branchName: assignment.branch_name || null,
            groupId: assignment.group_id,
            groupName: assignment.group_name || null,
            title: assignment.title,
            description: assignment.description || '',
            dueDate: assignment.due_date,
            status: assignment.status,
            acceptedFileTypes: assignment.accepted_file_types || ['pdf', 'word', 'image'],
            createdBy: assignment.created_by,
            assignedAt: assignment.assigned_at,
            submittedAt: assignment.submitted_at,
            reviewedAt: assignment.reviewed_at,
            adminNotes: assignment.admin_notes || '',
            coachNotes: assignment.coach_notes || '',
            files,
            attachments: files.filter((file) => file.fileRole === 'brief'),
            submissions: files.filter((file) => file.fileRole === 'submission'),
        };
    }

    _shapePlayerAssignmentFile(file) {
        return {
            id: file.id,
            submissionId: file.submission_id,
            fileType: file.file_type,
            fileName: file.file_name,
            fileUrl: file.file_url,
            mimeType: file.mime_type,
            sizeBytes: toNumber(file.size_bytes),
            uploadedBy: file.uploaded_by,
            createdAt: file.created_at,
        };
    }

    _shapePlayerAssignmentSubmission(submission) {
        return {
            id: submission.id,
            assignmentId: submission.assignment_id,
            playerId: submission.player_id,
            playerName: submission.player_name || null,
            notes: submission.notes || '',
            submittedAt: submission.submitted_at,
            files: (submission.files || []).map((file) => this._shapePlayerAssignmentFile(file)),
        };
    }

    _shapePlayerAssignment(assignment) {
        return {
            id: assignment.id,
            academyId: assignment.academy_id,
            createdByCoachId: assignment.created_by_coach_id,
            coachName: assignment.coach_name || null,
            title: assignment.title,
            description: assignment.description || '',
            openAt: assignment.open_at,
            dueAt: assignment.due_at,
            status: assignment.status,
            acceptedFileTypes: assignment.accepted_file_types || ['pdf', 'word', 'image'],
            createdAt: assignment.created_at,
            updatedAt: assignment.updated_at,
            groups: assignment.groups || [],
            submissionCount: Number(assignment.submission_count || 0),
            submissions: (assignment.submissions || []).map((submission) => this._shapePlayerAssignmentSubmission(submission)),
        };
    }

    async getMyEvaluations(userId, academyId, pagination) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const result = await this.repo.findCoachEvaluations(coach.id, academyId, pagination);
        return {
            ...result,
            data: result.data.map((evaluation) => this._shapeEvaluation(evaluation)),
        };
    }

    async createMyEvaluation(userId, academyId, data) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const players = await this.repo.findCoachPlayers(coach.id, academyId, data.groupId);
        const player = players.find((item) => item.id === data.playerId);
        if (!player) throw new NotFoundError('Player', data.playerId);

        const score = (data.technicalScore + data.tacticalScore + data.physicalScore + data.mentalScore) / 4;
        const row = await this.repo.createCoachEvaluation({
            player_id: data.playerId,
            coach_id: coach.id,
            group_id: data.groupId || player.group_id,
            score,
            technical_score: data.technicalScore,
            tactical_score: data.tacticalScore,
            physical_score: data.physicalScore,
            mental_score: data.mentalScore,
            notes: data.notes || null,
            eval_date: new Date(),
        });

        eventBus.publish(COACHES_EVENTS.UPDATED, { coachId: coach.id, playerId: data.playerId });
        return row;
    }

    async getAssignments(academyId, filters) {
        const result = await this.repo.findAssignments(academyId, filters);
        return {
            ...result,
            data: result.data.map((assignment) => this._shapeAssignment(assignment)),
        };
    }

    async getAssignment(academyId, assignmentId) {
        const assignment = await this.repo.findAssignmentById(assignmentId, academyId);
        if (!assignment) throw new NotFoundError('Assignment', assignmentId);
        return this._shapeAssignment(assignment);
    }

    _mapAssignmentFiles(files = [], userId) {
        return files.map((file) => ({
            uploaded_by: userId,
            file_type: file.fileType,
            file_name: file.fileName,
            file_url: file.fileUrl,
            mime_type: file.mimeType || null,
            size_bytes: file.sizeBytes || null,
        }));
    }

    async storeAssignmentUpload(user, { originalName, mimeType, buffer }) {
        const normalizedMimeType = String(mimeType || '').split(';')[0].trim().toLowerCase();
        const typeInfo = ASSIGNMENT_UPLOAD_MIME[normalizedMimeType];
        if (!typeInfo) {
            throw new BadRequestError('Only PDF, Word, PNG, JPG, JPEG, and WEBP assignment files are accepted.');
        }
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            throw new BadRequestError('Uploaded file is empty.');
        }
        if (buffer.length > 25 * 1024 * 1024) {
            throw new BadRequestError('Assignment files must be 25MB or smaller.');
        }

        const fileName = sanitizeFileName(originalName);
        const academySegment = String(user.academyId || 'shared').replace(/[^a-zA-Z0-9-]/g, '');
        const storedName = `${Date.now()}-${randomUUID()}${typeInfo.extension}`;
        const uploadDir = path.resolve(__dirname, '../../../uploads/assignments', academySegment);
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(path.join(uploadDir, storedName), buffer);

        return {
            fileType: typeInfo.fileType,
            fileName,
            fileUrl: `/uploads/assignments/${academySegment}/${storedName}`,
            mimeType: normalizedMimeType,
            sizeBytes: buffer.length,
        };
    }

    async storeCoachImageUpload(user, { originalName, mimeType, buffer }) {
        const normalizedMimeType = String(mimeType || '').split(';')[0].trim().toLowerCase();
        const typeInfo = COACH_IMAGE_MIME[normalizedMimeType];
        if (!typeInfo) {
            throw new BadRequestError('Coach image must be PNG, JPG, JPEG, or WEBP.');
        }
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            throw new BadRequestError('Uploaded image is empty.');
        }
        if (buffer.length > 5 * 1024 * 1024) {
            throw new BadRequestError('Coach image must be 5MB or smaller.');
        }

        const fileName = sanitizeFileName(originalName || 'coach-image');
        const academySegment = String(user.academyId || 'shared').replace(/[^a-zA-Z0-9-]/g, '');
        const storedName = `${Date.now()}-${randomUUID()}${typeInfo.extension}`;
        const uploadDir = path.resolve(__dirname, '../../../uploads/coaches', academySegment);
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(path.join(uploadDir, storedName), buffer);

        return {
            fileName,
            image: `/uploads/coaches/${academySegment}/${storedName}`,
            mimeType: normalizedMimeType,
            sizeBytes: buffer.length,
        };
    }

    async createAssignment(academyId, adminUserId, data) {
        const coach = await this.getCoach(data.coachId, academyId);
        let branchId = data.branchId || coach.branch_id || null;

        if (data.groupId) {
            const group = await this.repo.verifyGroupOwnership(data.groupId, academyId);
            if (!group) throw new NotFoundError('Group', data.groupId);
            branchId = group.branch_id;
        }

        if (branchId) {
            const branch = await this.repo.verifyBranchOwnership(branchId, academyId);
            if (!branch) throw new NotFoundError('Branch', branchId);
        }

        const assignment = await this.repo.createAssignment({
            academy_id: academyId,
            coach_id: coach.id,
            branch_id: branchId,
            group_id: data.groupId || null,
            title: data.title,
            description: data.description || null,
            due_date: data.dueDate || null,
            status: 'assigned',
            created_by: adminUserId,
            admin_notes: data.adminNotes || null,
        }, this._mapAssignmentFiles(data.attachments, adminUserId));

        eventBus.publish(COACHES_EVENTS.UPDATED, { coachId: coach.id, assignmentId: assignment.id });
        return this.getAssignment(academyId, assignment.id);
    }

    async getMyAssignments(userId, academyId, filters) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const result = await this.repo.findAssignments(academyId, { ...filters, coachId: coach.id });
        return {
            ...result,
            data: result.data.map((assignment) => this._shapeAssignment(assignment)),
        };
    }

    async submitMyAssignment(userId, academyId, assignmentId, data) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const assignment = await this.repo.findCoachAssignmentById(assignmentId, coach.id, academyId);
        if (!assignment) throw new NotFoundError('Assignment', assignmentId);

        const updated = await this.repo.submitAssignment(
            assignmentId,
            coach.id,
            data.coachNotes,
            this._mapAssignmentFiles(data.files, userId),
        );

        eventBus.publish(COACHES_EVENTS.UPDATED, { coachId: coach.id, assignmentId });
        return this._shapeAssignment({
            ...assignment,
            ...updated,
            coach_name: assignment.coach_name,
            branch_name: assignment.branch_name,
            group_name: assignment.group_name,
        });
    }

    async _assertPlayerAssignmentGroups(coachId, academyId, groupIds = []) {
        const requested = [...new Set(groupIds.filter(Boolean))];
        if (!requested.length) {
            throw new BadRequestError('Select at least one target group.');
        }
        const groups = await this.repo.findCoachGroupsDetailed(coachId, academyId);
        const allowed = new Set(groups.map((group) => group.id));
        const invalid = requested.find((groupId) => !allowed.has(groupId));
        if (invalid) throw new NotFoundError('Group', invalid);
        return requested;
    }

    _assignmentDate(value) {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            throw new BadRequestError('Assignment date is invalid.');
        }
        return date;
    }

    async getMyPlayerAssignments(userId, academyId, filters) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const result = await this.repo.findCoachPlayerAssignments(coach.id, academyId, filters);
        return {
            ...result,
            data: result.data.map((assignment) => this._shapePlayerAssignment(assignment)),
        };
    }

    async createMyPlayerAssignment(userId, academyId, data) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const groupIds = await this._assertPlayerAssignmentGroups(coach.id, academyId, data.groupIds);
        const openAt = this._assignmentDate(data.openAt);
        const dueAt = this._assignmentDate(data.dueAt);
        if (openAt && dueAt && dueAt < openAt) {
            throw new BadRequestError('Due date must be after open date.');
        }

        const assignment = await this.repo.createPlayerAssignment({
            academy_id: academyId,
            created_by_coach_id: coach.id,
            created_by_user_id: userId,
            title: data.title,
            description: data.description || null,
            open_at: openAt,
            due_at: dueAt,
            status: 'active',
        }, groupIds);

        return this._shapePlayerAssignment({
            ...assignment,
            coach_name: coach.full_name,
            groups: (await this.repo.findPlayerAssignmentGroups([assignment.id])).map((group) => ({ id: group.id, name: group.name })),
            submission_count: 0,
        });
    }

    async updateMyPlayerAssignment(userId, academyId, assignmentId, data) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const existing = await this.repo.findCoachPlayerAssignmentById(assignmentId, coach.id, academyId);
        if (!existing) throw new NotFoundError('Player assignment', assignmentId);
        const groupIds = data.groupIds ? await this._assertPlayerAssignmentGroups(coach.id, academyId, data.groupIds) : null;
        const openAt = data.openAt === undefined ? undefined : this._assignmentDate(data.openAt);
        const dueAt = data.dueAt === undefined ? undefined : this._assignmentDate(data.dueAt);
        const nextOpen = openAt === undefined ? existing.open_at : openAt;
        const nextDue = dueAt === undefined ? existing.due_at : dueAt;
        if (nextOpen && nextDue && new Date(nextDue) < new Date(nextOpen)) {
            throw new BadRequestError('Due date must be after open date.');
        }

        await this.repo.updatePlayerAssignment(assignmentId, {
            ...(data.title !== undefined ? { title: data.title } : {}),
            ...(data.description !== undefined ? { description: data.description || null } : {}),
            ...(openAt !== undefined ? { open_at: openAt } : {}),
            ...(dueAt !== undefined ? { due_at: dueAt } : {}),
            ...(data.status !== undefined ? { status: data.status } : {}),
        }, groupIds);

        const updated = await this.repo.findCoachPlayerAssignmentById(assignmentId, coach.id, academyId);
        return this._shapePlayerAssignment(updated);
    }

    async getMyPlayerAssignmentSubmissions(userId, academyId, assignmentId) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const assignment = await this.repo.findCoachPlayerAssignmentById(assignmentId, coach.id, academyId);
        if (!assignment) throw new NotFoundError('Player assignment', assignmentId);
        const submissions = await this.repo.findPlayerAssignmentSubmissions(assignmentId);
        return submissions.map((submission) => this._shapePlayerAssignmentSubmission(submission));
    }

    async getMyDailyAiInputs(userId, academyId) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const players = await this.repo.findCoachPlayers(coach.id, academyId);
        const playerIds = players.map((player) => player.id);
        const { rows } = await this.repo.db.raw(`
            SELECT
              date_trunc('week', current_date)::date::text AS week_start,
              (date_trunc('week', current_date)::date + 6)::text AS week_end
        `);
        const weekStart = rows[0]?.week_start;
        const weekEnd = rows[0]?.week_end;
        if (!playerIds.length) return { weekStart, weekEnd, data: [] };

        const inputRows = await this.repo.db('player_daily_ai_inputs as pdai')
            .join('player_profiles as pp', 'pdai.player_id', 'pp.id')
            .whereIn('pdai.player_id', playerIds)
            .where('pdai.academy_id', academyId)
            .where('pdai.input_date', '>=', weekStart)
            .where('pdai.input_date', '<=', weekEnd)
            .select(
                'pdai.*',
                'pp.full_name as player_name',
            )
            .orderBy('pdai.input_date', 'desc')
            .orderBy('pp.full_name', 'asc');

        return {
            weekStart,
            weekEnd,
            data: inputRows.map((row) => ({
                id: row.id,
                playerId: row.player_id,
                playerName: row.player_name,
                inputDate: row.input_date,
                sleepHours: Number(row.sleep_hours),
                trainedToday: Number(row.trained_today),
                mealsCount: Number(row.meals_count),
                dailyAiScore: Number(row.daily_ai_score),
                submittedAt: row.submitted_at,
            })),
        };
    }

    async createCoach(academyId, data) {
        const branch = await this.repo.verifyBranchOwnership(data.branchId, academyId);
        if (!branch) throw new NotFoundError('Branch', data.branchId);
        if (data.branchIds?.length) {
            for (const branchId of data.branchIds) {
                const branch = await this.repo.verifyBranchOwnership(branchId, academyId);
                if (!branch) throw new NotFoundError('Branch', branchId);
            }
        }

        const coach = await this.repo.create({
            user_id: data.userId,
            academy_id: academyId,
            branch_id: data.branchId,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone: data.phone,
            role: data.role,
            bio: data.bio || null,
            image: data.image || null,
            full_name: data.fullName || `${data.firstName} ${data.lastName}`,
            specialization: data.specialization || data.role,
            photo_url: data.photoUrl || data.image || null,
        });
        await this.repo.syncCoachBranches(coach.id, data.branchIds?.length ? data.branchIds : [data.branchId]);

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
        if (academyId && coach.academy_id !== academyId) throw new NotFoundError('Coach', id);

        const updateData = {};
        if (data.branchId !== undefined) {
            if (data.branchId) {
                const branch = await this.repo.verifyBranchOwnership(data.branchId, academyId);
                if (!branch) throw new NotFoundError('Branch', data.branchId);
            }
            updateData.branch_id = data.branchId;
        }
        if (data.branchIds !== undefined) {
            for (const branchId of data.branchIds) {
                const branch = await this.repo.verifyBranchOwnership(branchId, academyId);
                if (!branch) throw new NotFoundError('Branch', branchId);
            }
            updateData.branch_id = data.branchIds[0] || null;
        }
        if (data.email !== undefined) updateData.email = data.email;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.role !== undefined) {
            updateData.role = data.role;
            updateData.specialization = data.role;
        }
        if (data.image !== undefined) {
            updateData.image = data.image || null;
            updateData.photo_url = data.image || null;
        }
        if (data.specialization !== undefined) updateData.specialization = data.specialization;
        if (data.bio !== undefined) updateData.bio = data.bio;

        const identityUpdate = {};
        const iamIdentityUpdate = {};
        if (data.email !== undefined) {
            identityUpdate.email = data.email;
            iamIdentityUpdate.email = data.email;
        }
        if (data.phone !== undefined) {
            identityUpdate.phone = data.phone;
            iamIdentityUpdate.phone = data.phone;
        }
        if (data.isActive !== undefined) {
            identityUpdate.is_active = data.isActive;
            iamIdentityUpdate.is_active = data.isActive;
        }

        const hasIdentityChanges = Object.keys(identityUpdate).length > 0 && coach.user_id;
        const hasIamUsers = hasIdentityChanges ? await this.repo.db.schema.hasTable('iam_users') : false;
        const updated = await this.repo.db.transaction(async (trx) => {
            if (hasIdentityChanges) {
                await trx('auth_users')
                    .where({ id: coach.user_id, role: 'coach' })
                    .update({ ...identityUpdate, updated_at: new Date() });
                if (hasIamUsers) {
                    await trx('iam_users')
                        .where({ id: coach.user_id })
                        .update({ ...iamIdentityUpdate, updated_at: new Date() });
                }
            }
            return this.repo.update(id, updateData, trx);
        });
        if (data.branchIds !== undefined) {
            await this.repo.syncCoachBranches(id, data.branchIds);
        } else if (data.branchId !== undefined) {
            await this.repo.syncCoachBranches(id, data.branchId ? [data.branchId] : []);
        }
        eventBus.publish(COACHES_EVENTS.UPDATED, { coachId: id });
        return updated;
    }

    async deleteCoach(id, academyId) {
        const coach = await this.repo.findById(id);
        if (!coach) throw new NotFoundError('Coach', id);
        if (academyId && coach.academy_id !== academyId) throw new NotFoundError('Coach', id);

        await this.repo.softDelete(id);
        eventBus.publish(COACHES_EVENTS.DELETED, { coachId: id, academyId: coach.academy_id });
    }

    async hardDeleteCoach(id, academyId) {
        const coach = await this.repo.findById(id);
        if (!coach) throw new NotFoundError('Coach', id);
        if (academyId && coach.academy_id !== academyId) throw new NotFoundError('Coach', id);

        const hasIamUsers = await this.repo.db.schema.hasTable('iam_users');
        await this.repo.db.transaction(async (trx) => {
            await trx('coach_profiles').where({ id }).del();
            if (coach.user_id) {
                await trx('auth_users').where({ id: coach.user_id, role: 'coach' }).del();
                if (hasIamUsers) {
                    await trx('iam_users').where({ id: coach.user_id }).del();
                }
            }
        });

        eventBus.publish(COACHES_EVENTS.DELETED, { coachId: id, academyId: coach.academy_id, hardDelete: true });
    }

    async getCoachGroups(coachId) {
        return this.repo.findCoachGroups(coachId);
    }

    async assignGroup(coachId, academyId, groupId, role) {
        const coach = await this.repo.findById(coachId);
        if (!coach) throw new NotFoundError('Coach', coachId);
        if (academyId && coach.academy_id !== academyId) throw new NotFoundError('Coach', coachId);

        // Verify the group belongs to this academy before assigning
        const groupCheck = await this.repo.verifyGroupOwnership(groupId, academyId);
        if (!groupCheck) throw new NotFoundError('Group', groupId);

        const assignment = await this.repo.assignGroup(coachId, groupId, role);
        if (!coach.branch_id) await this.repo.updateCoachBranch(coachId, groupCheck.branch_id);
        await this.repo.db('coach_branch_assignments')
            .insert({ coach_id: coachId, branch_id: groupCheck.branch_id })
            .onConflict(['coach_id', 'branch_id'])
            .ignore();
        eventBus.publish(COACHES_EVENTS.GROUP_ASSIGNED, { coachId, groupId });
        return assignment;
    }

    _shapeCoachAccessRule(rule) {
        return {
            id: rule.id,
            coachId: rule.coach_id,
            branchId: rule.branch_id,
            branchName: rule.branch_name || null,
            accessType: rule.access_type,
            role: normalizeAssignmentRole(rule.role),
            allGroups: !!rule.all_groups,
            allBirthYears: !!rule.all_birth_years,
            groupIds: rule.groupIds || [],
            birthYearIds: rule.birthYearIds || [],
            groups: (rule.groups || []).map((group) => ({
                id: group.id,
                name: group.name,
                branchId: group.branch_id,
            })),
            birthYears: (rule.birthYears || []).map((birthYear) => ({
                id: birthYear.id,
                label: birthYear.label,
                normalizedLabel: birthYear.normalized_label,
                fromYear: birthYear.from_year,
                toYear: birthYear.to_year,
                branchId: birthYear.branch_id,
            })),
            assignedGroups: (rule.assignedGroups || []).map((group) => ({
                id: group.id,
                name: group.name,
                role: normalizeAssignmentRole(group.role),
                assignedAt: group.assigned_at,
            })),
            isInferred: !!rule.isInferred,
        };
    }

    async getCoachAccess(coachId, academyId, branchId = null) {
        const coach = await this.repo.findById(coachId);
        if (!coach) throw new NotFoundError('Coach', coachId);
        if (academyId && coach.academy_id !== academyId) throw new NotFoundError('Coach', coachId);
        if (branchId) {
            const branch = await this.repo.verifyBranchOwnership(branchId, academyId);
            if (!branch) throw new NotFoundError('Branch', branchId);
        }

        const rules = await this.repo.findCoachAccessRules(coachId, academyId, branchId);
        return rules.map((rule) => this._shapeCoachAccessRule(rule));
    }

    async getMyAccessStatus(userId, academyId) {
        const coach = await this._getCurrentCoach(userId, academyId);
        return this.repo.findCoachAccessStatus(coach.id, academyId);
    }

    async getMyBirthdays(userId, academyId) {
        const coach = await this._getCurrentCoach(userId, academyId);
        const rows = await this.repo.findCoachAccessBirthYears(coach.id, academyId);
        return rows.map((row) => ({
            id: row.id,
            branchId: row.branch_id,
            branchName: row.branch_name,
            label: row.label,
            normalizedLabel: row.normalized_label,
            fromYear: row.from_year,
            toYear: row.to_year,
            accessType: row.access_type,
            groupCount: Number(row.group_count || 0),
            playerCount: Number(row.player_count || 0),
        }));
    }

    async upsertCoachAccess(coachId, academyId, adminUserId, data) {
        const coach = await this.repo.findById(coachId);
        if (!coach) throw new NotFoundError('Coach', coachId);
        if (academyId && coach.academy_id !== academyId) throw new NotFoundError('Coach', coachId);

        const branch = await this.repo.verifyBranchOwnership(data.branchId, academyId);
        if (!branch) throw new NotFoundError('Branch', data.branchId);

        let selectedGroupIds = [];
        let selectedBirthYearIds = [];
        let resolvedGroups = [];

        const wantsGroups = data.allGroups || (data.groupIds || []).length > 0;
        const wantsBirthYears = data.allBirthYears || (data.birthYearIds || []).length > 0;

        if (wantsGroups) {
            if (data.allGroups) {
                resolvedGroups = await this.repo.findAllGroupsInBranch(data.branchId);
            } else {
                selectedGroupIds = [...new Set(data.groupIds || [])];
                const selectedGroups = await this.repo.findGroupsByIdsInBranch(data.branchId, selectedGroupIds);
                if (selectedGroups.length !== selectedGroupIds.length) {
                    throw new BadRequestError('All selected groups must belong to the selected branch');
                }
                resolvedGroups.push(...selectedGroups);
            }
        }

        if (wantsBirthYears) {
            const birthYears = data.allBirthYears
                ? await this.repo.findAllBirthYearsInBranch(data.branchId)
                : await this.repo.findBirthYearsByIdsInBranch(data.branchId, [...new Set(data.birthYearIds || [])]);
            selectedBirthYearIds = birthYears.map((row) => row.id);
            if (!data.allBirthYears && selectedBirthYearIds.length !== new Set(data.birthYearIds || []).size) {
                throw new BadRequestError('All selected birth years must belong to the selected branch');
            }
            resolvedGroups.push(...await this.repo.findGroupsForBirthYears(data.branchId, selectedBirthYearIds));
        }

        const resolvedGroupIds = [...new Set(resolvedGroups.map((group) => group.id))];
        const accessType = wantsGroups && wantsBirthYears ? 'both' : wantsGroups ? 'groups' : 'birth_years';
        const rule = await this.repo.replaceCoachAccessRule(coachId, data.branchId, {
            accessType,
            role: data.role,
            allGroups: wantsGroups ? data.allGroups : false,
            allBirthYears: wantsBirthYears ? data.allBirthYears : false,
            groupIds: wantsGroups && !data.allGroups ? selectedGroupIds : [],
            birthYearIds: wantsBirthYears && !data.allBirthYears ? selectedBirthYearIds : [],
            resolvedGroupIds,
            assignedBy: adminUserId,
        });

        if (!coach.branch_id) await this.repo.updateCoachBranch(coachId, data.branchId);
        eventBus.publish(COACHES_EVENTS.GROUP_ASSIGNED, {
            coachId,
            branchId: data.branchId,
            accessType,
            groupCount: resolvedGroupIds.length,
        });

        const [fresh] = await this.repo.findCoachAccessRules(coachId, academyId, rule.branch_id);
        return this._shapeCoachAccessRule(fresh);
    }

    async removeCoachAccess(coachId, academyId, branchId) {
        const coach = await this.repo.findById(coachId);
        if (!coach) throw new NotFoundError('Coach', coachId);
        if (academyId && coach.academy_id !== academyId) throw new NotFoundError('Coach', coachId);
        const branch = await this.repo.verifyBranchOwnership(branchId, academyId);
        if (!branch) throw new NotFoundError('Branch', branchId);

        await this.repo.removeCoachAccessRule(coachId, branchId);
        eventBus.publish(COACHES_EVENTS.UPDATED, { coachId, branchId, unassigned: true });
        return { message: 'Coach access removed', coachId, branchId };
    }

    async getPerformance(coachId, pagination) {
        return this.repo.findPerformanceScores(coachId, pagination);
    }

    async isCoachOfGroup(coachId, groupId) {
        return this.repo.isCoachOfGroup(coachId, groupId);
    }
}

module.exports = CoachesService;
