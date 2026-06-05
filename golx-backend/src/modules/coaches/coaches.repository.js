const BaseRepository = require('../../shared/base.repository');

class CoachesRepository extends BaseRepository {
    constructor(db) {
        super('coach_profiles', db);
    }

    async findCoaches(academyId, { page = 1, limit = 20 } = {}) {
        const query = this.db('coach_profiles')
            .whereNull('coach_profiles.deleted_at')
            .modify((q) => {
                if (academyId) q.where('coach_profiles.academy_id', academyId);
            });

        const [{ count }] = await query.clone().count('coach_profiles.id as count');
        const data = await query
            .leftJoin('auth_users', 'coach_profiles.user_id', 'auth_users.id')
            .leftJoin('academy_branches as branch', 'coach_profiles.branch_id', 'branch.id')
            .select(
                'coach_profiles.*',
                'auth_users.username',
                'auth_users.email as auth_email',
                'auth_users.phone as auth_phone',
                'auth_users.is_active',
                'branch.name as branch_name',
                this.db.raw(`COALESCE((
                    SELECT json_agg(jsonb_build_object('id', ab2.id, 'name', ab2.name))
                    FROM coach_branch_assignments cba
                    JOIN academy_branches ab2 ON cba.branch_id = ab2.id
                    WHERE cba.coach_id = coach_profiles.id
                ), '[]') as branches`),
            )
            .orderBy('coach_profiles.created_at', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async findByUserId(userId) {
        return this.db('coach_profiles').where({ user_id: userId }).whereNull('deleted_at').first();
    }

    async findCoachGroupsDetailed(coachId, academyId) {
        return this.db('coach_group_assignments as cga')
            .join('academy_groups as ag', 'cga.group_id', 'ag.id')
            .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
            .leftJoin('group_birth_years as gby', 'gby.group_id', 'ag.id')
            .leftJoin('academy_birth_years as aby', function joinBirthYears() {
                this.on('aby.id', '=', 'gby.birth_year_id').andOnNull('aby.deleted_at');
            })
            .leftJoin('academy_schedules as sch', 'sch.group_id', 'ag.id')
            .leftJoin('player_group_assignments as pga', function joinCurrentPlayers() {
                this.on('pga.group_id', '=', 'ag.id').andOnNull('pga.left_at');
            })
            .leftJoin('player_profiles as pp', function joinPlayerProfiles() {
                this.on('pp.id', '=', 'pga.player_id').andOnNull('pp.deleted_at');
            })
            .where('cga.coach_id', coachId)
            .where('ab.academy_id', academyId)
            .whereNull('ag.deleted_at')
            .groupBy(
                'cga.id',
                'cga.role',
                'cga.assigned_at',
                'ag.id',
                'ag.name',
                'ag.max_players',
                'ab.id',
                'ab.name',
            )
            .select(
                'cga.id as assignment_id',
                'cga.role',
                'cga.assigned_at',
                'ag.id',
                'ag.name',
                'ag.max_players',
                'ab.id as branch_id',
                'ab.name as branch_name',
                this.db.raw("COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', aby.id, 'label', aby.label, 'normalizedLabel', aby.normalized_label, 'fromYear', aby.from_year, 'toYear', aby.to_year)) FILTER (WHERE aby.id IS NOT NULL), '[]') as birth_years"),
                this.db.raw('COUNT(DISTINCT pp.id)::int as player_count'),
                this.db.raw(`
                    COALESCE(
                        string_agg(
                            DISTINCT CONCAT(
                                CASE sch.day_of_week
                                    WHEN 0 THEN 'Sun'
                                    WHEN 1 THEN 'Mon'
                                    WHEN 2 THEN 'Tue'
                                    WHEN 3 THEN 'Wed'
                                    WHEN 4 THEN 'Thu'
                                    WHEN 5 THEN 'Fri'
                                    WHEN 6 THEN 'Sat'
                                    ELSE ''
                                END,
                                ' ',
                                COALESCE(to_char(sch.start_time, 'HH24:MI'), ''),
                                '-',
                                COALESCE(to_char(sch.end_time, 'HH24:MI'), '')
                            ),
                            ', '
                        ) FILTER (WHERE sch.id IS NOT NULL),
                        'No schedule'
                    ) as schedule
                `),
            )
            .orderBy('ag.name', 'asc');
    }

    async findCoachGroupDetailed(coachId, academyId, groupId) {
        const groups = await this.findCoachGroupsDetailed(coachId, academyId);
        return groups.find((group) => group.id === groupId) || null;
    }

    async findCoachPlayers(coachId, academyId, groupId) {
        return this.db('player_group_assignments as pga')
            .join('player_profiles as pp', 'pga.player_id', 'pp.id')
            .join('academy_groups as ag', 'pga.group_id', 'ag.id')
            .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
            .join('coach_group_assignments as cga', 'cga.group_id', 'ag.id')
            .where('cga.coach_id', coachId)
            .where('ab.academy_id', academyId)
            .whereNull('pga.left_at')
            .whereNull('pp.deleted_at')
            .modify((q) => {
                if (groupId) q.where('ag.id', groupId);
            })
            .select(
                'pp.id',
                'pp.user_id',
                'pp.full_name',
                'pp.date_of_birth',
                'pp.level',
                'pp.position',
                this.db.raw(`
                    (
                        SELECT COALESCE(
                            cfo.label,
                            cfo_text.label,
                            pcv.value_text,
                            pcv.value_long_text,
                            pcv.value_number::text,
                            pcv.value_decimal::text,
                            pcv.value_date::text,
                            pcv.value_boolean::text,
                            json_options.labels,
                            pcv.value_json #>> '{}'
                        )
                        FROM player_custom_values pcv
                        JOIN custom_fields cf ON pcv.field_id = cf.id
                        LEFT JOIN custom_field_options cfo ON cfo.id = pcv.value_option_id
                        LEFT JOIN custom_field_options cfo_text
                            ON cfo_text.field_id = cf.id
                            AND cfo_text.id::text = pcv.value_text
                        LEFT JOIN LATERAL (
                            SELECT string_agg(COALESCE(cfo_json.label, option_id), ', ' ORDER BY option_id) as labels
                            FROM jsonb_array_elements_text(
                                CASE
                                    WHEN jsonb_typeof(pcv.value_json) = 'array' THEN pcv.value_json
                                    WHEN jsonb_typeof(pcv.value_json) = 'string' THEN jsonb_build_array(pcv.value_json #>> '{}')
                                    ELSE '[]'::jsonb
                                END
                            ) as option_values(option_id)
                            LEFT JOIN custom_field_options cfo_json
                                ON cfo_json.field_id = cf.id
                                AND cfo_json.id::text = option_values.option_id
                        ) json_options ON true
                        WHERE pcv.player_id = pp.id
                          AND regexp_replace(lower(cf.key), '[^a-z0-9]+', '_', 'g') = 'main_position'
                        ORDER BY pcv.updated_at DESC NULLS LAST
                        LIMIT 1
                    ) as main_position
                `),
                'pp.preferred_foot',
                'pp.photo_url',
                'pp.guardian_name',
                'pp.guardian_phone',
                'pp.profile_status',
                'ag.id as group_id',
                'ag.name as group_name',
                'ab.id as branch_id',
                'ab.name as branch_name',
                this.db.raw("COALESCE(EXTRACT(YEAR FROM age(CURRENT_DATE, pp.date_of_birth))::int, 0) as age"),
                this.db.raw("(SELECT pm.height_cm FROM player_measurements pm WHERE pm.player_id = pp.id ORDER BY pm.measured_at DESC LIMIT 1) as height"),
                this.db.raw("(SELECT pm.weight_kg FROM player_measurements pm WHERE pm.player_id = pp.id ORDER BY pm.measured_at DESC LIMIT 1) as weight"),
                this.db.raw("(SELECT pm.sprint_speed FROM player_measurements pm WHERE pm.player_id = pp.id ORDER BY pm.measured_at DESC LIMIT 1) as sprint_speed"),
                this.db.raw("(SELECT pm.flexibility FROM player_measurements pm WHERE pm.player_id = pp.id ORDER BY pm.measured_at DESC LIMIT 1) as flexibility"),
                this.db.raw(`
                    COALESCE((
                        SELECT ROUND(
                            100.0 * COUNT(*) FILTER (WHERE am.status IN ('present', 'late'))
                            / NULLIF(COUNT(*), 0)
                        )::int
                        FROM attendance_marks am
                        JOIN attendance_sessions s ON am.session_id = s.id
                        WHERE am.player_id = pp.id
                    ), 0) as attendance_rate
                `),
                this.db.raw(`
                    COALESCE((
                        SELECT ROUND(AVG(ecr.score))::int
                        FROM evaluation_coach_ratings ecr
                        WHERE ecr.player_id = pp.id
                    ), 0) as performance_score
                `),
                this.db.raw(`
                    COALESCE((
                        SELECT rs.rank
                        FROM ranking_snapshots rs
                        WHERE rs.player_id = pp.id AND rs.group_id = ag.id
                        ORDER BY rs.calculated_at DESC
                        LIMIT 1
                    ), 0) as rank_in_group
                `),
                this.db.raw(`
                    COALESCE((
                        SELECT rs.trend
                        FROM ranking_snapshots rs
                        WHERE rs.player_id = pp.id AND rs.group_id = ag.id
                        ORDER BY rs.calculated_at DESC
                        LIMIT 1
                    ), 'new') as trend
                `),
            )
            .orderBy('pp.full_name', 'asc');
    }

    async findCoachSessions(coachId, academyId, { groupId, status, dateFrom, dateTo, page = 1, limit = 50 } = {}) {
        const query = this.db('attendance_sessions as s')
            .join('academy_groups as ag', 's.group_id', 'ag.id')
            .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
            .join('coach_group_assignments as cga', 'cga.group_id', 'ag.id')
            .leftJoin('attendance_marks as am', 'am.session_id', 's.id')
            .where('cga.coach_id', coachId)
            .where('ab.academy_id', academyId)
            .modify((q) => {
                if (groupId) q.where('ag.id', groupId);
                if (status) q.where('s.status', status);
                if (dateFrom) q.where('s.session_date', '>=', dateFrom);
                if (dateTo) q.where('s.session_date', '<=', dateTo);
            })
            .groupBy('s.id', 'ag.id', 'ag.name')
            .select(
                's.*',
                'ag.name as group_name',
                this.db.raw("COUNT(am.id) FILTER (WHERE am.status IN ('present', 'late'))::int as attendance_count"),
                this.db.raw(`(
                    SELECT COUNT(*)::int
                    FROM player_group_assignments pga
                    JOIN player_profiles pp ON pp.id = pga.player_id AND pp.deleted_at IS NULL
                    WHERE pga.group_id = ag.id AND pga.left_at IS NULL
                ) as total_players`),
            );

        const [{ count }] = await query.clone().clearSelect().clearGroup().countDistinct('s.id as count');
        const data = await query
            .orderBy('s.session_date', 'asc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async findCoachSessionById(coachId, academyId, sessionId) {
        return this.db('attendance_sessions as s')
            .join('academy_groups as ag', 's.group_id', 'ag.id')
            .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
            .join('coach_group_assignments as cga', 'cga.group_id', 'ag.id')
            .where('s.id', sessionId)
            .where('cga.coach_id', coachId)
            .where('ab.academy_id', academyId)
            .select('s.*', 'ag.name as group_name')
            .first();
    }

    async findCoachSessionAttendance(coachId, academyId, sessionId) {
        const session = await this.findCoachSessionById(coachId, academyId, sessionId);
        if (!session) return null;

        const records = await this.db('attendance_marks as am')
            .join('player_profiles as pp', 'am.player_id', 'pp.id')
            .where('am.session_id', sessionId)
            .select(
                'am.id',
                'am.session_id',
                'am.player_id',
                'pp.full_name as player_name',
                'am.status',
                'am.notes',
                'am.marked_by',
                'am.marked_at',
            )
            .orderBy('pp.full_name', 'asc');

        return { session, records };
    }

    async upsertCoachAttendance(sessionId, records, markedBy) {
        const rows = records.map((record) => ({
            session_id: sessionId,
            player_id: record.playerId,
            status: record.status,
            notes: record.notes || null,
            marked_by: markedBy,
            marked_at: new Date(),
        }));

        return this.db('attendance_marks')
            .insert(rows)
            .onConflict(['session_id', 'player_id'])
            .merge(['status', 'notes', 'marked_by', 'marked_at'])
            .returning('*');
    }

    async findCoachAttendanceHistory(coachId, academyId, { page = 1, limit = 100 } = {}) {
        const query = this.db('attendance_marks as am')
            .join('attendance_sessions as s', 'am.session_id', 's.id')
            .join('academy_groups as ag', 's.group_id', 'ag.id')
            .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
            .join('coach_group_assignments as cga', 'cga.group_id', 'ag.id')
            .join('player_profiles as pp', 'am.player_id', 'pp.id')
            .where('cga.coach_id', coachId)
            .where('ab.academy_id', academyId)
            .select(
                'am.id',
                'am.session_id',
                'am.player_id',
                'pp.full_name as player_name',
                'am.status',
                'am.notes',
                'am.marked_by',
                'am.marked_at',
                's.session_date',
                's.session_type',
                'ag.name as group_name',
            );

        const [{ count }] = await query.clone().clearSelect().count('am.id as count');
        const data = await query
            .orderBy('s.session_date', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    // ─── Group assignments (owned by coaches module) ────────────────────
    async insertCoachMeasurements(records, measuredBy) {
        const rows = records.map((record) => ({
            player_id: record.playerId,
            height_cm: record.heightCm || null,
            weight_kg: record.weightKg || null,
            sprint_speed: record.sprintSpeed || null,
            stamina: record.stamina || null,
            flexibility: record.flexibility || null,
            measured_at: new Date(),
            measured_by: measuredBy,
            notes: record.notes || 'Coach measurement entry',
        }));

        return this.db('player_measurements').insert(rows).returning('*');
    }

    async findCoachEvaluations(coachId, academyId, { page = 1, limit = 100 } = {}) {
        const query = this.db('evaluation_coach_ratings as ecr')
            .join('player_profiles as pp', 'ecr.player_id', 'pp.id')
            .leftJoin('academy_groups as ag', 'ecr.group_id', 'ag.id')
            .where('ecr.coach_id', coachId)
            .where('pp.academy_id', academyId)
            .whereNull('pp.deleted_at')
            .select(
                'ecr.*',
                'pp.full_name as player_name',
                'ag.name as group_name',
            );

        const [{ count }] = await query.clone().clearSelect().count('ecr.id as count');
        const data = await query
            .orderBy('ecr.eval_date', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async createCoachEvaluation(data) {
        const [row] = await this.db('evaluation_coach_ratings').insert(data).returning('*');
        return row;
    }

    async findCoachGroups(coachId) {
        return this.db('coach_group_assignments')
            .where({ coach_id: coachId })
            .select('*');
    }

    async assignGroup(coachId, groupId, role = 'head') {
        const [row] = await this.db('coach_group_assignments')
            .insert({ coach_id: coachId, group_id: groupId, role, assigned_at: new Date() })
            .onConflict(['coach_id', 'group_id'])
            .merge({ role, assigned_at: new Date() })
            .returning('*');
        return row;
    }

    async updateCoachBranch(coachId, branchId) {
        const [row] = await this.db('coach_profiles')
            .where({ id: coachId })
            .whereNull('deleted_at')
            .update({ branch_id: branchId, updated_at: new Date() })
            .returning('*');
        return row;
    }

    async syncCoachBranches(coachId, branchIds, assignedBy = null) {
        await this.db('coach_branch_assignments').where({ coach_id: coachId }).del();
        if (!branchIds.length) return [];
        const rows = branchIds.map((branchId) => ({
            coach_id: coachId,
            branch_id: branchId,
            assigned_by_admin_id: assignedBy,
        }));
        return this.db('coach_branch_assignments')
            .insert(rows)
            .onConflict(['coach_id', 'branch_id'])
            .ignore()
            .returning('*');
    }

    async findGroupsByIdsInBranch(branchId, groupIds) {
        if (!groupIds.length) return [];
        return this.db('academy_groups')
            .where({ branch_id: branchId })
            .whereIn('id', groupIds)
            .whereNull('deleted_at')
            .select('id', 'name', 'branch_id');
    }

    async findAllGroupsInBranch(branchId) {
        return this.db('academy_groups')
            .where({ branch_id: branchId })
            .whereNull('deleted_at')
            .select('id', 'name', 'branch_id')
            .orderBy('name', 'asc');
    }

    async findBirthYearsByIdsInBranch(branchId, birthYearIds) {
        if (!birthYearIds.length) return [];
        return this.db('academy_birth_years')
            .where({ branch_id: branchId })
            .whereIn('id', birthYearIds)
            .whereNull('deleted_at')
            .select('id', 'label', 'normalized_label', 'from_year', 'to_year', 'branch_id');
    }

    async findAllBirthYearsInBranch(branchId) {
        return this.db('academy_birth_years')
            .where({ branch_id: branchId })
            .whereNull('deleted_at')
            .select('id', 'label', 'normalized_label', 'from_year', 'to_year', 'branch_id')
            .orderBy('normalized_label', 'asc')
            .orderBy('from_year', 'asc');
    }

    async findGroupsForBirthYears(branchId, birthYearIds) {
        if (!birthYearIds.length) return [];
        return this.db('academy_groups as ag')
            .join('group_birth_years as gby', 'gby.group_id', 'ag.id')
            .where('ag.branch_id', branchId)
            .whereIn('gby.birth_year_id', birthYearIds)
            .whereNull('ag.deleted_at')
            .distinct('ag.id', 'ag.name', 'ag.branch_id')
            .orderBy('ag.name', 'asc');
    }

    async findCoachAccessStatus(coachId, academyId) {
        const [rules, groups] = await Promise.all([
            this.db('coach_branch_access_rules as car')
                .join('academy_branches as ab', 'car.branch_id', 'ab.id')
                .where('car.coach_id', coachId)
                .where('ab.academy_id', academyId)
                .whereNull('ab.deleted_at')
                .countDistinct('car.id as count')
                .first(),
            this.db('coach_group_assignments as cga')
                .join('academy_groups as ag', 'cga.group_id', 'ag.id')
                .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
                .where('cga.coach_id', coachId)
                .where('ab.academy_id', academyId)
                .whereNull('ag.deleted_at')
                .whereNull('ab.deleted_at')
                .countDistinct('cga.id as count')
                .first(),
        ]);
        const ruleCount = Number(rules?.count || 0);
        const groupCount = Number(groups?.count || 0);
        return {
            hasAssignments: ruleCount > 0 || groupCount > 0,
            ruleCount,
            groupCount,
        };
    }

    async findCoachAccessBirthYears(coachId, academyId) {
        const rules = await this.db('coach_branch_access_rules as car')
            .join('academy_branches as ab', 'car.branch_id', 'ab.id')
            .where('car.coach_id', coachId)
            .where('ab.academy_id', academyId)
            .whereNull('ab.deleted_at')
            .select('car.*', 'ab.name as branch_name');

        const allBranchIds = rules
            .filter((rule) => ['birth_years', 'both'].includes(rule.access_type) && rule.all_birth_years)
            .map((rule) => rule.branch_id);
        const ruleIds = rules.map((rule) => rule.id);

        const [allRows, selectedRows, groupRows] = await Promise.all([
            allBranchIds.length
                ? this.db('academy_birth_years as aby')
                    .join('academy_branches as ab', 'aby.branch_id', 'ab.id')
                    .whereIn('aby.branch_id', allBranchIds)
                    .where('ab.academy_id', academyId)
                    .whereNull('aby.deleted_at')
                    .whereNull('ab.deleted_at')
                    .select('aby.*', 'ab.name as branch_name', this.db.raw("'birth_years' as access_type"))
                : [],
            ruleIds.length
                ? this.db('coach_access_rule_birth_years as carb')
                    .join('coach_branch_access_rules as car', 'carb.rule_id', 'car.id')
                    .join('academy_birth_years as aby', 'carb.birth_year_id', 'aby.id')
                    .join('academy_branches as ab', 'aby.branch_id', 'ab.id')
                    .whereIn('car.id', ruleIds)
                    .where('car.coach_id', coachId)
                    .whereIn('car.access_type', ['birth_years', 'both'])
                    .where('ab.academy_id', academyId)
                    .whereNull('aby.deleted_at')
                    .whereNull('ab.deleted_at')
                    .select('aby.*', 'ab.name as branch_name', 'car.access_type')
                : [],
            this.db('coach_group_assignments as cga')
                .join('academy_groups as ag', 'cga.group_id', 'ag.id')
                .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
                .join('group_birth_years as gby', 'gby.group_id', 'ag.id')
                .join('academy_birth_years as aby', 'gby.birth_year_id', 'aby.id')
                .where('cga.coach_id', coachId)
                .where('ab.academy_id', academyId)
                .whereNull('ag.deleted_at')
                .whereNull('aby.deleted_at')
                .whereNull('ab.deleted_at')
                .select('aby.*', 'ab.name as branch_name', this.db.raw("'groups' as access_type")),
        ]);

        const rowsById = new Map();
        [...allRows, ...selectedRows, ...groupRows].forEach((row) => {
            if (!rowsById.has(row.id)) rowsById.set(row.id, row);
        });
        const rows = [...rowsById.values()];
        if (!rows.length) return [];

        const ids = rows.map((row) => row.id);
        const [groupCounts, playerCounts] = await Promise.all([
            this.db('group_birth_years')
                .whereIn('birth_year_id', ids)
                .select('birth_year_id')
                .countDistinct('group_id as count')
                .groupBy('birth_year_id'),
            this.db('academy_birth_years as aby')
                .whereIn('aby.id', ids)
                .select('aby.id as birth_year_id')
                .select(this.db.raw(`(
                    SELECT COUNT(DISTINCT pp.id)::int
                    FROM player_profiles pp
                    WHERE pp.branch_id = aby.branch_id
                      AND pp.deleted_at IS NULL
                      AND EXTRACT(YEAR FROM pp.date_of_birth)::int BETWEEN aby.from_year AND aby.to_year
                ) as count`)),
        ]);
        const groupCountById = new Map(groupCounts.map((row) => [row.birth_year_id, Number(row.count || 0)]));
        const playerCountById = new Map(playerCounts.map((row) => [row.birth_year_id, Number(row.count || 0)]));

        return rows
            .map((row) => ({
                ...row,
                group_count: groupCountById.get(row.id) || 0,
                player_count: playerCountById.get(row.id) || 0,
            }))
            .sort((a, b) => String(a.branch_name).localeCompare(String(b.branch_name)) || a.from_year - b.from_year);
    }

    async replaceCoachAccessRule(coachId, branchId, data) {
        return this.db.transaction(async (trx) => {
            const now = new Date();
            const [rule] = await trx('coach_branch_access_rules')
                .insert({
                    coach_id: coachId,
                    branch_id: branchId,
                    access_type: data.accessType,
                    all_groups: data.allGroups,
                    all_birth_years: data.allBirthYears,
                    role: data.role,
                    assigned_by_admin_id: data.assignedBy,
                    assigned_at: now,
                    created_at: now,
                    updated_at: now,
                })
                .onConflict(['coach_id', 'branch_id'])
                .merge({
                    access_type: data.accessType,
                    all_groups: data.allGroups,
                    all_birth_years: data.allBirthYears,
                    role: data.role,
                    assigned_by_admin_id: data.assignedBy,
                    updated_at: now,
                })
                .returning('*');

            await trx('coach_access_rule_groups').where({ rule_id: rule.id }).del();
            if (data.groupIds.length) {
                await trx('coach_access_rule_groups')
                    .insert(data.groupIds.map((groupId) => ({
                        rule_id: rule.id,
                        group_id: groupId,
                        created_at: now,
                    })));
            }

            await trx('coach_access_rule_birth_years').where({ rule_id: rule.id }).del();
            if (data.birthYearIds.length) {
                await trx('coach_access_rule_birth_years')
                    .insert(data.birthYearIds.map((birthYearId) => ({
                        rule_id: rule.id,
                        birth_year_id: birthYearId,
                        created_at: now,
                    })));
            }

            await trx('coach_group_assignments')
                .where({ coach_id: coachId })
                .whereIn('group_id', trx('academy_groups').where({ branch_id: branchId }).select('id'))
                .del();

            if (data.resolvedGroupIds.length) {
                await trx('coach_group_assignments')
                    .insert(data.resolvedGroupIds.map((groupId) => ({
                        coach_id: coachId,
                        group_id: groupId,
                        role: data.role,
                        assigned_at: now,
                    })))
                    .onConflict(['coach_id', 'group_id'])
                    .merge({ role: data.role, assigned_at: now });
            }

            await trx('coach_branch_assignments')
                .insert({
                    coach_id: coachId,
                    branch_id: branchId,
                    assigned_by_admin_id: data.assignedBy,
                    assigned_at: now,
                    created_at: now,
                    updated_at: now,
                })
                .onConflict(['coach_id', 'branch_id'])
                .merge({ assigned_by_admin_id: data.assignedBy, updated_at: now });

            return rule;
        });
    }

    async removeCoachAccessRule(coachId, branchId) {
        return this.db.transaction(async (trx) => {
            await trx('coach_branch_access_rules').where({ coach_id: coachId, branch_id: branchId }).del();
            await trx('coach_group_assignments')
                .where({ coach_id: coachId })
                .whereIn('group_id', trx('academy_groups').where({ branch_id: branchId }).select('id'))
                .del();
            await trx('coach_branch_assignments').where({ coach_id: coachId, branch_id: branchId }).del();
        });
    }

    async findCoachAccessRules(coachId, academyId, branchId = null) {
        const rules = await this.db('coach_branch_access_rules as car')
            .join('academy_branches as ab', 'car.branch_id', 'ab.id')
            .where('car.coach_id', coachId)
            .where('ab.academy_id', academyId)
            .whereNull('ab.deleted_at')
            .modify((q) => {
                if (branchId) q.where('car.branch_id', branchId);
            })
            .select(
                'car.*',
                'ab.name as branch_name',
            )
            .orderBy('ab.name', 'asc');

        const ruleIds = rules.map((rule) => rule.id);
        const [ruleGroups, ruleBirthYears, assignedGroups] = await Promise.all([
            ruleIds.length
                ? this.db('coach_access_rule_groups as carg')
                    .join('academy_groups as ag', 'carg.group_id', 'ag.id')
                    .whereIn('carg.rule_id', ruleIds)
                    .whereNull('ag.deleted_at')
                    .select('carg.rule_id', 'ag.id', 'ag.name', 'ag.branch_id')
                    .orderBy('ag.name', 'asc')
                : [],
            ruleIds.length
                ? this.db('coach_access_rule_birth_years as carb')
                    .join('academy_birth_years as aby', 'carb.birth_year_id', 'aby.id')
                    .whereIn('carb.rule_id', ruleIds)
                    .whereNull('aby.deleted_at')
                    .select('carb.rule_id', 'aby.id', 'aby.label', 'aby.normalized_label', 'aby.from_year', 'aby.to_year', 'aby.branch_id')
                    .orderBy('aby.normalized_label', 'asc')
                    .orderBy('aby.from_year', 'asc')
                : [],
            this.db('coach_group_assignments as cga')
                .join('academy_groups as ag', 'cga.group_id', 'ag.id')
                .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
                .where('cga.coach_id', coachId)
                .where('ab.academy_id', academyId)
                .whereNull('ag.deleted_at')
                .whereNull('ab.deleted_at')
                .modify((q) => {
                    if (branchId) q.where('ab.id', branchId);
                })
                .select('ab.id as branch_id', 'ag.id', 'ag.name', 'cga.role', 'cga.assigned_at')
                .orderBy('ag.name', 'asc'),
        ]);

        const byRule = (rows) => rows.reduce((acc, row) => {
            if (!acc[row.rule_id]) acc[row.rule_id] = [];
            acc[row.rule_id].push(row);
            return acc;
        }, {});
        const groupsByRule = byRule(ruleGroups);
        const birthYearsByRule = byRule(ruleBirthYears);
        const assignedGroupsByBranch = assignedGroups.reduce((acc, row) => {
            if (!acc[row.branch_id]) acc[row.branch_id] = [];
            acc[row.branch_id].push(row);
            return acc;
        }, {});

        const explicit = rules.map((rule) => ({
            ...rule,
            groupIds: (groupsByRule[rule.id] || []).map((row) => row.id),
            birthYearIds: (birthYearsByRule[rule.id] || []).map((row) => row.id),
            groups: groupsByRule[rule.id] || [],
            birthYears: birthYearsByRule[rule.id] || [],
            assignedGroups: assignedGroupsByBranch[rule.branch_id] || [],
            isInferred: false,
        }));

        const ruleBranchIds = new Set(rules.map((rule) => rule.branch_id));
        const inferred = [];
        for (const [legacyBranchId, groups] of Object.entries(assignedGroupsByBranch)) {
            if (ruleBranchIds.has(legacyBranchId)) continue;
            const branch = await this.db('academy_branches')
                .where({ id: legacyBranchId, academy_id: academyId })
                .whereNull('deleted_at')
                .first('id', 'name');
            if (!branch) continue;
            inferred.push({
                id: null,
                coach_id: coachId,
                branch_id: branch.id,
                branch_name: branch.name,
                access_type: 'groups',
                all_groups: false,
                all_birth_years: false,
                role: groups[0]?.role || 'head',
                groupIds: groups.map((row) => row.id),
                birthYearIds: [],
                groups,
                birthYears: [],
                assignedGroups: groups,
                isInferred: true,
            });
        }

        return [...explicit, ...inferred].sort((a, b) => String(a.branch_name || '').localeCompare(String(b.branch_name || '')));
    }

    async verifyBranchOwnership(branchId, academyId) {
        return this.db('academy_branches')
            .where({ id: branchId, academy_id: academyId })
            .whereNull('deleted_at')
            .first();
    }

    async findAssignments(academyId, { coachId, branchId, groupId, status, page = 1, limit = 50 } = {}) {
        const query = this.db('coach_assignments as ca')
            .join('coach_profiles as cp', 'ca.coach_id', 'cp.id')
            .leftJoin('academy_branches as ab', 'ca.branch_id', 'ab.id')
            .leftJoin('academy_groups as ag', 'ca.group_id', 'ag.id')
            .where('ca.academy_id', academyId)
            .whereNull('ca.deleted_at')
            .modify((q) => {
                if (coachId) q.where('ca.coach_id', coachId);
                if (branchId) q.where('ca.branch_id', branchId);
                if (groupId) q.where('ca.group_id', groupId);
                if (status) q.where('ca.status', status);
            });

        const [{ count }] = await query.clone().count('ca.id as count');
        const data = await query
            .select(
                'ca.*',
                'cp.full_name as coach_name',
                'ab.name as branch_name',
                'ag.name as group_name',
            )
            .orderBy('ca.created_at', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        const files = await this.findAssignmentFiles(data.map((assignment) => assignment.id));
        const filesByAssignment = files.reduce((acc, file) => {
            if (!acc[file.assignment_id]) acc[file.assignment_id] = [];
            acc[file.assignment_id].push(file);
            return acc;
        }, {});

        return {
            data: data.map((assignment) => ({
                ...assignment,
                files: filesByAssignment[assignment.id] || [],
            })),
            total: +count,
            page,
            totalPages: Math.ceil(+count / limit) || 1,
        };
    }

    async findAssignmentById(assignmentId, academyId) {
        const assignment = await this.db('coach_assignments as ca')
            .join('coach_profiles as cp', 'ca.coach_id', 'cp.id')
            .leftJoin('academy_branches as ab', 'ca.branch_id', 'ab.id')
            .leftJoin('academy_groups as ag', 'ca.group_id', 'ag.id')
            .where('ca.id', assignmentId)
            .where('ca.academy_id', academyId)
            .whereNull('ca.deleted_at')
            .select(
                'ca.*',
                'cp.full_name as coach_name',
                'ab.name as branch_name',
                'ag.name as group_name',
            )
            .first();

        if (!assignment) return null;
        assignment.files = await this.findAssignmentFiles([assignment.id]);
        return assignment;
    }

    async findCoachAssignmentById(assignmentId, coachId, academyId) {
        const assignment = await this.findAssignmentById(assignmentId, academyId);
        if (!assignment || assignment.coach_id !== coachId) return null;
        return assignment;
    }

    async createAssignment(data, attachments = []) {
        return this.db.transaction(async (trx) => {
            const [assignment] = await trx('coach_assignments').insert(data).returning('*');
            if (attachments.length) {
                await trx('coach_assignment_files').insert(attachments.map((file) => ({
                    ...file,
                    assignment_id: assignment.id,
                    file_role: 'brief',
                })));
            }
            const files = attachments.length
                ? await trx('coach_assignment_files').where({ assignment_id: assignment.id })
                : [];
            return { ...assignment, files };
        });
    }

    async submitAssignment(assignmentId, coachId, coachNotes, files) {
        return this.db.transaction(async (trx) => {
            await trx('coach_assignment_files').insert(files.map((file) => ({
                ...file,
                assignment_id: assignmentId,
                file_role: 'submission',
            })));

            const [assignment] = await trx('coach_assignments')
                .where({ id: assignmentId, coach_id: coachId })
                .whereNull('deleted_at')
                .update({
                    status: 'submitted',
                    coach_notes: coachNotes || null,
                    submitted_at: new Date(),
                    updated_at: new Date(),
                })
                .returning('*');

            const assignmentFiles = await trx('coach_assignment_files').where({ assignment_id: assignmentId });
            return { ...assignment, files: assignmentFiles };
        });
    }

    async findAssignmentFiles(assignmentIds) {
        if (!assignmentIds.length) return [];
        return this.db('coach_assignment_files')
            .whereIn('assignment_id', assignmentIds)
            .orderBy('created_at', 'asc');
    }

    async unassignGroup(coachId, groupId) {
        return this.db('coach_group_assignments')
            .where({ coach_id: coachId, group_id: groupId })
            .del();
    }

    async isCoachOfGroup(coachId, groupId) {
        const row = await this.db('coach_group_assignments')
            .where({ coach_id: coachId, group_id: groupId })
            .first();
        return !!row;
    }

    // ─── Performance scores (owned by coaches module) ───────────────────
    async findPerformanceScores(coachId, { page = 1, limit = 20 } = {}) {
        const query = this.db('coach_performance_scores')
            .where({ coach_id: coachId });

        const [{ count }] = await query.clone().count('id as count');
        const data = await query
            .orderBy('calculated_at', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async addPerformanceScore(data) {
        const [row] = await this.db('coach_performance_scores').insert(data).returning('*');
        return row;
    }

    async verifyGroupOwnership(groupId, academyId) {
        return this.db('academy_groups as ag')
            .join('academy_branches as ab', 'ag.branch_id', 'ab.id')
            .where('ag.id', groupId)
            .where('ab.academy_id', academyId)
            .select(
                'ag.id',
                'ag.name',
                'ag.branch_id as group_branch_id',
                'ab.id as branch_id',
                'ab.academy_id',
            )
            .first();
    }
}

module.exports = CoachesRepository;
