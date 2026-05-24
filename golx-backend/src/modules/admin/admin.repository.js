const BaseRepository = require('../../shared/base.repository');
const { ensureIamForAuthUser } = require('../../shared/iam-sync');

class AdminRepository extends BaseRepository {
    constructor(db) {
        super('auth_users', db);
    }

    // ─── KPIs ────────────────────────────────────────────────────────────
    async getKPIs(academyId) {
        const byAcademy = (q, table, col = 'academy_id') =>
            academyId ? q.where(`${table}.${col}`, academyId) : q;

        const [
            playerCount,
            coachCount,
            activeSubsCount,
            overdueCount,
            monthlyRevenue,
            attendanceStats,
        ] = await Promise.all([
            // Total active players
            byAcademy(this.db('player_profiles'), 'player_profiles')
                .whereNull('deleted_at')
                .count('id as count')
                .first(),

            // Total active coaches
            byAcademy(this.db('coach_profiles'), 'coach_profiles')
                .whereNull('deleted_at')
                .count('id as count')
                .first(),

            // Active subscriptions
            (() => {
                const q = this.db('payment_subscriptions as ps')
                    .join('player_profiles as pp', 'ps.player_id', 'pp.id')
                    .where('ps.status', 'active');
                return (academyId ? q.where('pp.academy_id', academyId) : q)
                    .count('ps.id as count').first();
            })(),

            // Overdue invoices (payment_invoices.status = 'overdue')
            (() => {
                const q = this.db('payment_invoices as pi')
                    .join('payment_subscriptions as ps', 'pi.subscription_id', 'ps.id')
                    .join('player_profiles as pp', 'ps.player_id', 'pp.id')
                    .where('pi.status', 'overdue');
                return (academyId ? q.where('pp.academy_id', academyId) : q)
                    .count('pi.id as count').first();
            })(),

            // Monthly revenue (current month paid invoices)
            (() => {
                const q = this.db('payment_invoices as pi')
                    .join('payment_subscriptions as ps', 'pi.subscription_id', 'ps.id')
                    .join('player_profiles as pp', 'ps.player_id', 'pp.id')
                    .where('pi.status', 'paid')
                    .whereRaw("date_trunc('month', pi.paid_at) = date_trunc('month', now())");
                return (academyId ? q.where('pp.academy_id', academyId) : q)
                    .sum('pi.amount as total').first();
            })(),

            // Attendance rate — last 30 days
            (() => {
                const q = this.db('attendance_marks as am')
                    .join('attendance_sessions as s', 'am.session_id', 's.id')
                    .join('academy_groups as ag', 's.group_id', 'ag.id')
                    .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
                    .whereRaw("s.session_date >= now() - interval '30 days'")
                    .select(
                        this.db.raw('COUNT(*) as total'),
                        this.db.raw("COUNT(*) FILTER (WHERE am.status IN ('present','late')) as attended"),
                    );
                return (academyId ? q.where('ab.academy_id', academyId) : q).first();
            })(),
        ]);

        const total = Number(attendanceStats?.total || 0);
        const attended = Number(attendanceStats?.attended || 0);
        const avgAttendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

        return {
            totalPlayers: Number(playerCount?.count || 0),
            totalCoaches: Number(coachCount?.count || 0),
            activeSubscriptions: Number(activeSubsCount?.count || 0),
            overduePayments: Number(overdueCount?.count || 0),
            monthlyRevenue: Number(monthlyRevenue?.total || 0),
            avgAttendanceRate,
        };
    }

    // ─── Attendance Trend (last 8 weeks) ─────────────────────────────────
    async getAttendanceTrend(academyId) {
        const rows = await this.db.raw(`
            WITH weeks AS (
                SELECT generate_series(0, 7) AS w
            ),
            week_ranges AS (
                SELECT
                    w,
                    date_trunc('week', now()) - (w * interval '1 week') AS week_start,
                    date_trunc('week', now()) - (w * interval '1 week') + interval '6 days' AS week_end
                FROM weeks
            ),
            attendance_data AS (
                SELECT
                    wr.w,
                    wr.week_start,
                    COUNT(am.id) AS total,
                    COUNT(am.id) FILTER (WHERE am.status IN ('present','late')) AS attended
                FROM week_ranges wr
                LEFT JOIN attendance_sessions s
                    ON s.session_date BETWEEN wr.week_start AND wr.week_end
                LEFT JOIN academy_groups ag ON s.group_id = ag.id
                LEFT JOIN academy_branches ab ON ag.branch_id = ab.id
                LEFT JOIN attendance_marks am ON am.session_id = s.id
                    AND (:academyId::uuid IS NULL OR ab.academy_id = :academyId)
                GROUP BY wr.w, wr.week_start
            )
            SELECT
                w,
                to_char(week_start, 'Mon DD') AS label,
                CASE WHEN total > 0 THEN ROUND((attended::numeric / total) * 100) ELSE 0 END AS value
            FROM attendance_data
            ORDER BY w DESC
        `, { academyId });

        return rows.rows.map((r) => ({
            label: r.label,
            value: Number(r.value),
        }));
    }

    // ─── Revenue Trend (last 6 months) ───────────────────────────────────
    async getRevenueTrend(academyId) {
        const rows = await this.db.raw(`
            WITH months AS (
                SELECT generate_series(0, 5) AS m
            ),
            month_ranges AS (
                SELECT
                    m,
                    date_trunc('month', now()) - (m * interval '1 month') AS month_start
                FROM months
            )
            SELECT
                mr.m,
                to_char(mr.month_start, 'Mon YYYY') AS label,
                COALESCE(SUM(pi.amount), 0) AS value
            FROM month_ranges mr
            LEFT JOIN payment_invoices pi
                ON date_trunc('month', pi.paid_at) = mr.month_start
                AND pi.status = 'paid'
            LEFT JOIN payment_subscriptions ps ON pi.subscription_id = ps.id
            LEFT JOIN player_profiles pp ON ps.player_id = pp.id
                AND (:academyId::uuid IS NULL OR pp.academy_id = :academyId)
            GROUP BY mr.m, mr.month_start
            ORDER BY mr.m DESC
        `, { academyId });

        return rows.rows.map((r) => ({
            label: r.label,
            value: Number(r.value),
        }));
    }

    // ─── Top Players (last ranking snapshot) ────────────────────────────
    async getTopPlayers(academyId, limit = 5) {
        return this.db
            .select(
                'pp.id',
                'pp.full_name as fullName',
                'rs.total_score as totalScore',
                'rs.rank',
                'rs.period',
            )
            .from(this.db.raw(`(
                SELECT DISTINCT ON (rs.player_id)
                    rs.id, rs.player_id, rs.total_score, rs.rank, rs.period
                FROM ranking_snapshots rs
                ORDER BY rs.player_id, rs.calculated_at DESC
            ) AS rs`))
            .join('player_profiles as pp', 'rs.player_id', 'pp.id')
            .modify((b) => { if (academyId) b.where('pp.academy_id', academyId); })
            .orderBy('rs.total_score', 'desc')
            .limit(limit);
    }

    // ─── Recent Admin Notifications ──────────────────────────────────────
    async getRecentAlerts(academyId, limit = 5) {
        const q = this.db('notification_inbox as ni')
            .join('auth_users as u', 'ni.user_id', 'u.id')
            .where('u.role', 'admin')
            .orderBy('ni.created_at', 'desc')
            .limit(limit)
            .select(
                'ni.id',
                'ni.title',
                'ni.body',
                'ni.type',
                'ni.is_read as isRead',
                'ni.created_at as createdAt',
            );
        if (academyId) q.where('u.academy_id', academyId);
        return q;
    }

    // ─── Pending Registrations ───────────────────────────────────────────

    async getPendingRegistrations({ status, academyId } = {}) {
        const q = this.db('pending_registrations as pr')
            .leftJoin('player_profiles as pp', 'pr.linked_player_id', 'pp.id')
            .leftJoin('auth_users as reviewer', 'pr.reviewed_by', 'reviewer.id')
            .select(
                'pr.id',
                'pr.email',
                'pr.phone',
                'pr.full_name as fullName',
                'pr.role',
                'pr.status',
                'pr.rejection_reason as rejectionReason',
                'pr.linked_player_id as linkedPlayerId',
                'pp.full_name as linkedPlayerName',
                'pr.created_at as createdAt',
                'pr.reviewed_at as reviewedAt',
                'reviewer.email as reviewerEmail',
            )
            .orderBy('pr.created_at', 'desc');

        if (status) q.where('pr.status', status);
        if (academyId) {
            q.where(function () {
                this.where('pr.academy_id', academyId).orWhereNull('pr.academy_id');
            });
        }
        return q;
    }

    async findPendingRegistrationById(id) {
        return this.db('pending_registrations').where({ id }).first();
    }

    async approvePendingRegistration(id, reviewedBy) {
        // Transaction-safe: either all succeed or all rollback
        return this.db.transaction(async (trx) => {
            const pending = await trx('pending_registrations')
                .where({ id, status: 'pending' })
                .forUpdate()       // row-level lock to prevent race conditions
                .first();
            if (!pending) return null;

            // Create the real auth_users record
            const [user] = await trx('auth_users').insert({
                email: pending.email,
                phone: pending.phone,
                password_hash: pending.password_hash,
                role: pending.role,
                academy_id: pending.academy_id,
                linked_player_id: pending.role === 'parent' ? pending.linked_player_id : null,
                is_active: true,
            }).returning('*');

            await ensureIamForAuthUser(trx, user, {
                fullName: pending.full_name,
                grantedBy: reviewedBy,
            });

            // Update pending registration status
            await trx('pending_registrations').where({ id }).update({
                status: 'approved',
                reviewed_by: reviewedBy,
                reviewed_at: trx.fn.now(),
                updated_at: trx.fn.now(),
            });

            // Audit log
            await trx('audit_logs').insert({
                user_id: reviewedBy,
                action: 'registration_approved',
                table_name: 'pending_registrations',
                record_id: id,
                new_data: JSON.stringify({ userId: user.id, email: pending.email, role: pending.role }),
            });

            return user;
        });
    }

    async rejectPendingRegistration(id, reviewedBy, reason) {
        return this.db.transaction(async (trx) => {
            const pending = await trx('pending_registrations')
                .where({ id, status: 'pending' })
                .forUpdate()
                .first();
            if (!pending) return null;

            await trx('pending_registrations').where({ id }).update({
                status: 'rejected',
                rejection_reason: reason,
                reviewed_by: reviewedBy,
                reviewed_at: trx.fn.now(),
                updated_at: trx.fn.now(),
            });

            // Audit log
            await trx('audit_logs').insert({
                user_id: reviewedBy,
                action: 'registration_rejected',
                table_name: 'pending_registrations',
                record_id: id,
                new_data: JSON.stringify({ email: pending.email, role: pending.role, reason }),
            });

            return 1;
        });
    }
}

module.exports = AdminRepository;
