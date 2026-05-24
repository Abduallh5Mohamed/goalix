const eventBus = require('../../events/eventBus');
const ATTENDANCE_EVENTS = require('./attendance.events');
const { NotFoundError, ForbiddenError, AppError } = require('../../shared/errors');

class AttendanceService {
    constructor(attendanceRepository, redis) {
        this.repo = attendanceRepository;
        this.redis = redis;
    }

    // ─── Sessions ───────────────────────────────────────────────────────
    async listSessions(filters, academyId) {
        return this.repo.findSessions({ ...filters, academyId });
    }

    async getSession(id, academyId) {
        const session = await this.repo.findSessionByIdAndAcademy(id, academyId);
        if (!session) throw new NotFoundError('Session', id);
        return session;
    }

    async createSession(coachId, academyId, data) {
        // Verify the group belongs to this academy before creating a session
        const groupCheck = await this.repo.db('academy_groups as ag')
            .join('academy_birth_years as aby', 'ag.birth_year_id', 'aby.id')
            .join('academy_branches as ab', 'aby.branch_id', 'ab.id')
            .where('ag.id', data.groupId)
            .where('ab.academy_id', academyId)
            .first();
        if (!groupCheck) throw new NotFoundError('Group', data.groupId);

        const session = await this.repo.createSession({
            group_id: data.groupId,
            coach_id: coachId,
            session_date: data.sessionDate,
            start_time: data.startTime || null,
            end_time: data.endTime || null,
            location: data.location || null,
            session_type: data.sessionType,
            notes: data.notes || null,
            status: 'scheduled',
        });

        eventBus.publish(ATTENDANCE_EVENTS.SESSION_CREATED, {
            sessionId: session.id,
            groupId: data.groupId,
            coachId,
            date: data.sessionDate,
        });

        return session;
    }

    async updateSessionStatus(sessionId, status, userId, academyId) {
        const session = await this.repo.findSessionByIdAndAcademy(sessionId, academyId);
        if (!session) throw new NotFoundError('Session', sessionId);

        // Validate status transitions
        const validTransitions = {
            scheduled: ['active', 'cancelled'],
            active: ['completed', 'cancelled'],
            completed: [],
            cancelled: [],
        };

        if (!validTransitions[session.status]?.includes(status)) {
            throw new AppError(
                `Cannot transition from '${session.status}' to '${status}'`,
                400,
                'INVALID_STATUS_TRANSITION',
            );
        }

        const updated = await this.repo.updateSessionStatus(sessionId, status);

        // Publish events
        if (status === 'active') {
            eventBus.publish(ATTENDANCE_EVENTS.SESSION_STARTED, {
                sessionId, groupId: session.group_id, coachId: session.coach_id,
            });
        } else if (status === 'completed') {
            // Release lock
            await this.redis.del(`golx:attendance:lock:${sessionId}`);
            eventBus.publish(ATTENDANCE_EVENTS.SESSION_COMPLETED, {
                sessionId, groupId: session.group_id, coachId: session.coach_id,
            });
        } else if (status === 'cancelled') {
            await this.redis.del(`golx:attendance:lock:${sessionId}`);
            eventBus.publish(ATTENDANCE_EVENTS.SESSION_CANCELLED, { sessionId });
        }

        return updated;
    }

    // ─── Attendance Marking (batch) ─────────────────────────────────────
    async markAttendance(sessionId, records, coachId, academyId) {
        const session = await this.repo.findSessionByIdAndAcademy(sessionId, academyId);
        if (!session) throw new NotFoundError('Session', sessionId);

        if (session.status !== 'active') {
            throw new AppError('Session must be active to mark attendance', 400, 'SESSION_NOT_ACTIVE');
        }

        // Acquire lock in Redis (prevent concurrent marking)
        const lockKey = `golx:attendance:lock:${sessionId}`;
        const lockAcquired = await this.redis.set(lockKey, coachId, 'EX', 7200, 'NX');
        if (!lockAcquired) {
            const lockHolder = await this.redis.get(lockKey);
            if (lockHolder !== coachId) {
                throw new AppError('Another coach is marking attendance for this session', 409, 'SESSION_LOCKED');
            }
        }

        const result = await this.repo.batchUpsertAttendance(sessionId, records, coachId);

        eventBus.publish(ATTENDANCE_EVENTS.BATCH_MARKED, {
            sessionId,
            records: records.map((r) => ({ playerId: r.playerId, status: r.status })),
        });

        return result;
    }

    async getSessionAttendance(sessionId, academyId) {
        // Verify session belongs to this academy before returning attendance records
        const session = await this.repo.findSessionByIdAndAcademy(sessionId, academyId);
        if (!session) throw new NotFoundError('Session', sessionId);
        return this.repo.findAttendanceBySession(sessionId);
    }

    // ─── Player Attendance ──────────────────────────────────────────────
    async getPlayerAttendance(playerId, filters) {
        return this.repo.findAttendanceByPlayer(playerId, filters);
    }

    async getPlayerAttendanceRate(playerId, dateFrom, dateTo) {
        return this.repo.getPlayerAttendanceRate(playerId, dateFrom, dateTo);
    }

    // ─── Overview ──────────────────────────────────────────────────────
    async getAttendanceOverview(filters, academyId) {
        return this.repo.getAttendanceOverview({ ...filters, academyId });
    }
}

module.exports = AttendanceService;
