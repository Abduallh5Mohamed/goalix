const BaseRepository = require('../../shared/base.repository');

class AttendanceRepository extends BaseRepository {
    constructor(db) {
        super('attendance_sessions', db);
    }

    async findSessions({ groupId, coachId, status, dateFrom, dateTo, academyId, page = 1, limit = 20 }) {
        const query = this.db('attendance_sessions as s')
            .join('academy_groups as ag', 's.group_id', 'ag.id')
            .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
            .leftJoin('coach_profiles as cp', 's.coach_id', 'cp.id')
            .where('ab.academy_id', academyId)
            .modify((q) => {
                if (groupId) q.where('s.group_id', groupId);
                if (coachId) q.where('s.coach_id', coachId);
                if (status) q.where('s.status', status);
                if (dateFrom) q.where('s.session_date', '>=', dateFrom);
                if (dateTo) q.where('s.session_date', '<=', dateTo);
            });

        const [{ count }] = await query.clone().count('s.id as count');
        const data = await query
            .select(
                's.*',
                'ag.name as group_name',
                'cp.full_name as coach_name',
            )
            .orderBy('s.session_date', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async findSessionById(id) {
        return this.db('attendance_sessions').where({ id }).first();
    }

    async findSessionByIdAndAcademy(id, academyId) {
        return this.db('attendance_sessions as s')
            .join('academy_groups as ag', 's.group_id', 'ag.id')
            .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
            .where('s.id', id)
            .where('ab.academy_id', academyId)
            .select('s.*')
            .first();
    }

    async createSession(data) {
        const [row] = await this.db('attendance_sessions').insert(data).returning('*');
        return row;
    }

    async updateSessionStatus(id, status) {
        const [row] = await this.db('attendance_sessions')
            .where({ id })
            .update({ status, updated_at: new Date() })
            .returning('*');
        return row;
    }

    async findAttendanceBySession(sessionId) {
        return this.db('attendance_marks')
            .where({ session_id: sessionId })
            .orderBy('marked_at', 'asc');
    }

    async findAttendanceByPlayer(playerId, { dateFrom, dateTo, page = 1, limit = 20 } = {}) {
        const query = this.db('attendance_marks')
            .join('attendance_sessions', 'attendance_marks.session_id', 'attendance_sessions.id')
            .where('attendance_marks.player_id', playerId)
            .modify((q) => {
                if (dateFrom) q.where('attendance_sessions.session_date', '>=', dateFrom);
                if (dateTo) q.where('attendance_sessions.session_date', '<=', dateTo);
            })
            .select(
                'attendance_marks.*',
                'attendance_sessions.session_date',
            );

        const [{ count }] = await query.clone().count('attendance_marks.id as count');
        const data = await query
            .orderBy('attendance_sessions.session_date', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async batchUpsertAttendance(sessionId, records, markedBy) {
        const rows = records.map((r) => ({
            session_id: sessionId,
            player_id: r.playerId,
            status: r.status,
            notes: r.notes || null,
            marked_by: markedBy,
            marked_at: new Date(),
        }));

        return this.db('attendance_marks')
            .insert(rows)
            .onConflict(['session_id', 'player_id'])
            .merge(['status', 'notes', 'marked_by', 'marked_at'])
            .returning('*');
    }

    async getAttendanceOverview({ groupId, branchId, dateFrom, dateTo, academyId }) {
        const query = this.db('attendance_marks')
            .join('attendance_sessions', 'attendance_marks.session_id', 'attendance_sessions.id')
            .join('academy_groups as ag', 'attendance_sessions.group_id', 'ag.id')
            .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
            .where('ab.academy_id', academyId)
            .modify((q) => {
                if (groupId) q.where('attendance_sessions.group_id', groupId);
                if (branchId) q.where('ab.id', branchId);
                if (dateFrom) q.where('attendance_sessions.session_date', '>=', dateFrom);
                if (dateTo) q.where('attendance_sessions.session_date', '<=', dateTo);
            })
            .select('attendance_marks.status')
            .count('attendance_marks.id as count')
            .groupBy('attendance_marks.status');

        return query;
    }

    async getPlayerAttendanceRate(playerId, dateFrom, dateTo) {
        return this.db('attendance_marks')
            .join('attendance_sessions', 'attendance_marks.session_id', 'attendance_sessions.id')
            .where('attendance_marks.player_id', playerId)
            .modify((q) => {
                if (dateFrom) q.where('attendance_sessions.session_date', '>=', dateFrom);
                if (dateTo) q.where('attendance_sessions.session_date', '<=', dateTo);
            })
            .select(
                this.db.raw('COUNT(*) as total'),
                this.db.raw("COUNT(*) FILTER (WHERE attendance_marks.status = 'present') as present"),
                this.db.raw("COUNT(*) FILTER (WHERE attendance_marks.status = 'late') as late"),
                this.db.raw("COUNT(*) FILTER (WHERE attendance_marks.status = 'absent') as absent"),
                this.db.raw("COUNT(*) FILTER (WHERE attendance_marks.status = 'excused') as excused"),
            )
            .first();
    }
}

module.exports = AttendanceRepository;
