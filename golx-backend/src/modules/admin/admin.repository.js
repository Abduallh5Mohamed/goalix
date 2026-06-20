const BaseRepository = require('../../shared/base.repository');
const { BadRequestError } = require('../../shared/errors');
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
                COALESCE(SUM(
                    CASE
                        WHEN :academyId::uuid IS NULL OR pp.academy_id = :academyId
                        THEN pi.amount
                        ELSE 0
                    END
                ), 0) AS value
            FROM month_ranges mr
            LEFT JOIN payment_invoices pi
                ON date_trunc('month', pi.paid_at) = mr.month_start
                AND pi.status = 'paid'
            LEFT JOIN payment_subscriptions ps ON pi.subscription_id = ps.id
            LEFT JOIN player_profiles pp ON ps.player_id = pp.id
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
        const rows = await this.db.raw(`
            WITH scoped_rankings AS (
                SELECT
                    pp.id,
                    pp.full_name,
                    rs.total_score,
                    rs.rank,
                    rs.period,
                    rs.calculated_at
                FROM ranking_snapshots rs
                JOIN player_profiles pp ON rs.player_id = pp.id
                WHERE pp.deleted_at IS NULL
                  AND (:academyId::uuid IS NULL OR pp.academy_id = :academyId)
            ),
            latest_period AS (
                SELECT period
                FROM scoped_rankings
                ORDER BY calculated_at DESC NULLS LAST, period DESC
                LIMIT 1
            ),
            latest_rankings AS (
                SELECT
                    sr.*,
                    COALESCE(
                        sr.rank::int,
                        ROW_NUMBER() OVER (
                            ORDER BY sr.total_score DESC NULLS LAST, sr.full_name ASC
                        )::int
                    ) AS display_rank
                FROM scoped_rankings sr
                JOIN latest_period lp ON lp.period = sr.period
            )
            SELECT
                id,
                full_name AS "fullName",
                total_score AS "totalScore",
                display_rank AS rank,
                period
            FROM latest_rankings
            ORDER BY display_rank ASC, total_score DESC NULLS LAST
            LIMIT :limit
        `, { academyId, limit });

        return rows.rows.map((row) => ({
            ...row,
            totalScore: Number(row.totalScore || 0),
            rank: Number(row.rank || 0),
        }));
    }

    async getWeeklyMatches(academyId) {
        const rows = await this.db.raw(`
            WITH days AS (
                SELECT generate_series(
                    date_trunc('week', current_date)::date,
                    (date_trunc('week', current_date)::date + interval '6 days')::date,
                    interval '1 day'
                )::date AS day_date
            )
            SELECT
                d.day_date::text AS date,
                to_char(d.day_date, 'Dy') AS "dayLabel",
                to_char(d.day_date, 'DD Mon') AS "dateLabel",
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', m.id::text,
                            'opponentName', m.opponent_name,
                            'matchTime', to_char(m.match_time, 'HH24:MI'),
                            'venueType', m.venue_type::text,
                            'status', m.status::text,
                            'matchStatus', m.match_status::text,
                            'ourScore', m.our_score,
                            'opponentScore', m.opponent_score,
                            'played', (
                                m.status::text IN ('completed', 'finished')
                                OR m.match_status::text = 'finished'
                            )
                        )
                        ORDER BY m.match_time ASC
                    ) FILTER (WHERE m.id IS NOT NULL),
                    '[]'::json
                ) AS matches
            FROM days d
            LEFT JOIN matches m
              ON m.match_date = d.day_date
             AND m.deleted_at IS NULL
             AND m.status::text <> 'cancelled'
             AND (
                :academyId::uuid IS NULL
                OR EXISTS (
                    SELECT 1
                    FROM calendar_events ce
                    WHERE ce.id = m.event_id
                      AND ce.academy_id = :academyId
                      AND ce.deleted_at IS NULL
                )
             )
            GROUP BY d.day_date
            ORDER BY d.day_date ASC
        `, { academyId });

        return rows.rows;
    }

    // ─── Access Control Settings ────────────────────────────────────────
    async getAccessControl(academyId) {
        const db = this.db;
        const [permissionRows, roleRows] = await Promise.all([
            this.db('iam_permissions as p')
                .leftJoin('iam_permission_groups as pg', 'p.group_id', 'pg.id')
                .select(
                    'p.id',
                    'p.code',
                    'p.resource',
                    'p.action',
                    'p.scope',
                    'p.description',
                    'p.is_system as isSystem',
                    'pg.id as groupId',
                    'pg.code as groupCode',
                    'pg.name as groupName',
                    'pg.description as groupDescription',
                    'pg.sort_order as groupSortOrder',
                )
                .orderBy('pg.sort_order', 'asc')
                .orderBy('p.resource', 'asc')
                .orderBy('p.action', 'asc'),
            this.db('iam_roles as r')
                .leftJoin('iam_user_roles as ur', function joinAssignments() {
                    this.on('ur.role_id', '=', 'r.id')
                        .andOn('ur.academy_id', '=', db.raw('?', [academyId]))
                        .andOnNull('ur.revoked_at')
                        .andOn(function activeAssignment() {
                            this.onNull('ur.expires_at').orOn('ur.expires_at', '>', db.raw('now()'));
                        });
                })
                .whereNull('r.deleted_at')
                .where(function scopedRoles() {
                    this.whereNull('r.academy_id').orWhere('r.academy_id', academyId);
                })
                .select(
                    'r.id',
                    'r.academy_id as academyId',
                    'r.code',
                    'r.name',
                    'r.description',
                    'r.is_system as isSystem',
                    'r.is_active as isActive',
                    'r.priority',
                    'r.created_at as createdAt',
                    'r.updated_at as updatedAt',
                    this.db.raw('COUNT(DISTINCT ur.user_id)::int as "userCount"'),
                )
                .groupBy('r.id')
                .orderBy('r.is_system', 'desc')
                .orderBy('r.priority', 'asc')
                .orderBy('r.name', 'asc'),
        ]);

        const permissionsByRole = await this.db('iam_role_permissions as rp')
            .join('iam_roles as r', 'rp.role_id', 'r.id')
            .whereNull('r.deleted_at')
            .where(function scopedRoles() {
                this.whereNull('r.academy_id').orWhere('r.academy_id', academyId);
            })
            .select(
                'rp.role_id as roleId',
                'rp.permission_id as permissionId',
                'rp.denied',
            );

        const permissionMap = permissionsByRole.reduce((acc, row) => {
            if (!acc.has(row.roleId)) acc.set(row.roleId, []);
            acc.get(row.roleId).push({
                permissionId: row.permissionId,
                denied: Boolean(row.denied),
            });
            return acc;
        }, new Map());

        const groups = new Map();
        for (const row of permissionRows) {
            const groupKey = row.groupId || 'ungrouped';
            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    id: row.groupId,
                    code: row.groupCode || 'ungrouped',
                    name: row.groupName || 'Ungrouped',
                    description: row.groupDescription || null,
                    sortOrder: Number(row.groupSortOrder || 999),
                    permissions: [],
                });
            }

            groups.get(groupKey).permissions.push({
                id: row.id,
                code: row.code,
                resource: row.resource,
                action: row.action,
                scope: row.scope,
                description: row.description,
                isSystem: Boolean(row.isSystem),
            });
        }

        return {
            permissionGroups: Array.from(groups.values()),
            roles: roleRows.map((role) => ({
                ...role,
                isSystem: Boolean(role.isSystem),
                isActive: Boolean(role.isActive),
                userCount: Number(role.userCount || 0),
                permissionAssignments: permissionMap.get(role.id) || [],
            })),
        };
    }

    async createAcademyRole(academyId, userId, data) {
        return this.db.transaction(async (trx) => {
            const [role] = await trx('iam_roles')
                .insert({
                    academy_id: academyId,
                    code: data.code,
                    name: data.name,
                    description: data.description || null,
                    is_system: false,
                    is_active: data.isActive !== undefined ? data.isActive : true,
                    priority: 100,
                    created_by: userId,
                    updated_by: userId,
                })
                .returning('*');

            await this.replaceRolePermissions(role.id, data.permissionIds || [], userId, trx);
            return role;
        });
    }

    async findAcademyEditableRole(roleId, academyId) {
        return this.db('iam_roles')
            .where({ id: roleId, academy_id: academyId, is_system: false })
            .whereNull('deleted_at')
            .first();
    }

    async updateAcademyRole(roleId, academyId, userId, data) {
        return this.db.transaction(async (trx) => {
            const role = await trx('iam_roles')
                .where({ id: roleId, academy_id: academyId, is_system: false })
                .whereNull('deleted_at')
                .forUpdate()
                .first();
            if (!role) return null;

            const updateData = {};
            if (data.name !== undefined) updateData.name = data.name;
            if (data.code !== undefined) updateData.code = data.code;
            if (data.description !== undefined) updateData.description = data.description || null;
            if (data.isActive !== undefined) updateData.is_active = data.isActive;

            let updated = role;
            if (Object.keys(updateData).length) {
                [updated] = await trx('iam_roles')
                    .where({ id: roleId })
                    .update({
                        ...updateData,
                        updated_by: userId,
                        updated_at: new Date(),
                    })
                    .returning('*');
            }

            if (data.permissionIds !== undefined) {
                await this.replaceRolePermissions(roleId, data.permissionIds, userId, trx);
            }

            return updated;
        });
    }

    async softDeleteAcademyRole(roleId, academyId, userId) {
        const [row] = await this.db('iam_roles')
            .where({ id: roleId, academy_id: academyId, is_system: false })
            .whereNull('deleted_at')
            .update({
                deleted_at: new Date(),
                deleted_by: userId,
                is_active: false,
                updated_by: userId,
                updated_at: new Date(),
            })
            .returning('*');
        return row;
    }

    async replaceRolePermissions(roleId, permissionIds, userId, trx = this.db) {
        const uniqueIds = [...new Set(permissionIds || [])];
        if (uniqueIds.length) {
            const existingRows = await trx('iam_permissions').whereIn('id', uniqueIds).select('id');
            const existingIds = new Set(existingRows.map((row) => row.id));
            const missingIds = uniqueIds.filter((id) => !existingIds.has(id));
            if (missingIds.length) {
                throw new BadRequestError('One or more selected permissions no longer exist');
            }
        }

        await trx('iam_role_permissions').where({ role_id: roleId }).del();
        if (!uniqueIds.length) return;

        await trx('iam_role_permissions').insert(
            uniqueIds.map((permissionId) => ({
                role_id: roleId,
                permission_id: permissionId,
                denied: false,
                granted_by: userId,
            })),
        );
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
