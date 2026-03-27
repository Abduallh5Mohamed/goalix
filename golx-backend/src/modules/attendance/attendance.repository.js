const BaseRepository = require('../../shared/base.repository');

class AttendanceRepository extends BaseRepository {
    constructor(db) {
        super('attendance_sessions', db);
    }

    // ─── Sessions ───────────────────────────────────────────────────────
    async findSessions({ groupId, coachId, status, dateFrom, dateTo, academyId, page = 1, limit = 20 }) {
        const query = this.db('attendance_sessions').modify((q) => {
            // Always scope to the requesting academy — prevents cross-tenant IDOR
            if (academyId) {
                q.whereIn('group_id',
                    this.db('academy_groups as ag')
                        .join('academy_birth_years as aby', 'ag.birth_year_id', 'aby.id')
                        .join('academy_branches as ab', 'aby.branch_id', 'ab.id')
                        .where('ab.academy_id', academyId)
                        .select('ag.id'),
                );
            }
            if (groupId) q.where('group_id', groupId);
            if (coachId) q.where('coach_id', coachId);
            if (status) q.where('status', status);
            if (dateFrom) q.where('session_date', '>=', dateFrom);
            if (dateTo) q.where('session_date', '<=', dateTo);
        });

        const [{ count }] = await query.clone().count('id as count');
        const data = await query
            .select('*')
            .orderBy('session_date', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async findSessionById(id) {
        return this.db('attendance_sessions').where({ id }).first();
    }

    // Academy-scoped getter — prevents IDOR across tenants
    async findSessionByIdAndAcademy(id, academyId) {
        return this.db('attendance_sessions as s')
            .join('academy_groups as ag', 's.group_id', 'ag.id')
            .join('academy_birth_years as aby', 'ag.birth_year_id', 'aby.id')
            .join('academy_branches as ab', 'aby.branch_id', 'ab.id')
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

    // ─── Attendance Records ─────────────────────────────────────────────
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
            marked_by: markedBy,
            marked_at: new Date(),
        }));

        // Upsert: insert or update on conflict
        return this.db('attendance_marks')
            .insert(rows)
            .onConflict(['session_id', 'player_id'])
            .merge(['status', 'marked_by', 'marked_at'])
            .returning('*');
    }

    // ─── Overview / Stats ──────────────────────────────────────────────
    async getAttendanceOverview({ groupId, branchId, dateFrom, dateTo, academyId }) {
        const query = this.db('attendance_marks')
            .join('attendance_sessions', 'attendance_marks.session_id', 'attendance_sessions.id')
            .join('academy_groups as ag', 'attendance_sessions.group_id', 'ag.id')
            .join('academy_birth_years as aby', 'ag.birth_year_id', 'aby.id')
            .join('academy_branches as ab', 'aby.branch_id', 'ab.id')
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
        const result = await this.db('attendance_marks')
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

        return result;
    }
}

module.exports = AttendanceRepository;
