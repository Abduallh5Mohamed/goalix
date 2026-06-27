class AttendanceRepository {
    constructor(db) {
        this.db = db;
    }

    async getAttendanceOverview({ groupId, branchId, dateFrom, dateTo, academyId }) {
        const applyDateFilters = (query) => query.modify((q) => {
            if (dateFrom) q.whereRaw('ce.start_datetime::date >= ?::date', [dateFrom]);
            if (dateTo) q.whereRaw('ce.start_datetime::date <= ?::date', [dateTo]);
        });

        const applyTrainingTargetFilters = (query) => query.modify((q) => {
            if (groupId) {
                q.whereExists(
                    this.db('calendar_event_groups as target_group')
                        .whereRaw('target_group.event_id = ce.id')
                        .where('target_group.group_id', groupId)
                        .select(this.db.raw('1')),
                );
            }

            if (branchId) {
                q.where((branchScope) => {
                    branchScope
                        .whereExists(
                            this.db('calendar_event_groups as target_group')
                                .join('academy_groups as target_ag', 'target_ag.id', 'target_group.group_id')
                                .whereRaw('target_group.event_id = ce.id')
                                .where('target_ag.branch_id', branchId)
                                .select(this.db.raw('1')),
                        )
                        .orWhereExists(
                            this.db('calendar_event_players as target_player')
                                .join('player_profiles as target_pp', 'target_pp.id', 'target_player.player_id')
                                .whereRaw('target_player.event_id = ce.id')
                                .where('target_pp.branch_id', branchId)
                                .select(this.db.raw('1')),
                        )
                        .orWhereExists(
                            this.db('calendar_event_birth_years as target_birth_year')
                                .join(
                                    'academy_birth_years as target_aby',
                                    'target_aby.id',
                                    'target_birth_year.birth_year_id',
                                )
                                .whereRaw('target_birth_year.event_id = ce.id')
                                .where('target_aby.branch_id', branchId)
                                .select(this.db.raw('1')),
                        );
                });
            }
        });

        const trainingQuery = applyTrainingTargetFilters(
            applyDateFilters(
                this.db('calendar_events as ce')
                    .where('ce.academy_id', academyId)
                    .where('ce.event_type', 'training')
                    .whereNull('ce.deleted_at'),
            ),
        );

        const attendanceQuery = applyDateFilters(
            this.db('event_attendance as ea')
                .join('calendar_events as ce', 'ce.id', 'ea.event_id')
                .join('player_profiles as pp', 'pp.id', 'ea.player_id')
                .where('ce.academy_id', academyId)
                .where('ce.event_type', 'training')
                .whereNull('ce.deleted_at')
                .whereNull('pp.deleted_at')
                .modify((q) => {
                    if (branchId) q.where('pp.branch_id', branchId);
                    if (groupId) {
                        q.whereExists(
                            this.db('player_group_assignments as scoped_pga')
                                .whereRaw('scoped_pga.player_id = ea.player_id')
                                .where('scoped_pga.group_id', groupId)
                                .whereNull('scoped_pga.left_at')
                                .select(this.db.raw('1')),
                        );
                    }
                }),
        );

        const [trainingSummary, attendanceSummary, byGroup] = await Promise.all([
            trainingQuery
                .clone()
                .countDistinct('ce.id as total')
                .first(),
            attendanceQuery
                .clone()
                .select(
                    this.db.raw('COUNT(ea.id)::int as total'),
                    this.db.raw(
                        "COUNT(ea.id) FILTER (WHERE ea.status = 'present')::int as present",
                    ),
                    this.db.raw(
                        "COUNT(ea.id) FILTER (WHERE ea.status = 'late')::int as late",
                    ),
                    this.db.raw(
                        "COUNT(ea.id) FILTER (WHERE ea.status = 'absent')::int as absent",
                    ),
                    this.db.raw(
                        "COUNT(ea.id) FILTER (WHERE ea.status = 'excused')::int as excused",
                    ),
                    this.db.raw(
                        "COUNT(ea.id) FILTER (WHERE ea.status = 'injured')::int as injured",
                    ),
                )
                .first(),
            attendanceQuery
                .clone()
                .join('player_group_assignments as pga', function joinActiveGroup() {
                    this.on('pga.player_id', '=', 'ea.player_id').andOnNull('pga.left_at');
                })
                .join('academy_groups as ag', 'ag.id', 'pga.group_id')
                .join('academy_branches as ab', 'ab.id', 'ag.branch_id')
                .whereNull('ag.deleted_at')
                .modify((q) => {
                    if (groupId) q.where('ag.id', groupId);
                    if (branchId) q.where('ab.id', branchId);
                })
                .groupBy('ag.id', 'ag.name')
                .select(
                    'ag.id as groupId',
                    'ag.name as groupName',
                    this.db.raw('COUNT(DISTINCT ea.id)::int as total'),
                    this.db.raw(
                        "COUNT(DISTINCT ea.id) FILTER (WHERE ea.status IN ('present', 'late'))::int as attended",
                    ),
                )
                .orderBy('ag.name', 'asc'),
        ]);

        const total = Number(attendanceSummary?.total || 0);
        const present = Number(attendanceSummary?.present || 0);
        const late = Number(attendanceSummary?.late || 0);

        return {
            totalTrainings: Number(trainingSummary?.total || 0),
            avgRate: total ? Math.round(((present + late) / total) * 100) : 0,
            presentCount: present,
            absentCount: Number(attendanceSummary?.absent || 0),
            lateCount: late,
            excusedCount: Number(attendanceSummary?.excused || 0),
            injuredCount: Number(attendanceSummary?.injured || 0),
            byGroup: byGroup.map((row) => {
                const groupTotal = Number(row.total || 0);
                const attended = Number(row.attended || 0);
                return {
                    groupId: row.groupId,
                    groupName: row.groupName,
                    rate: groupTotal ? Math.round((attended / groupTotal) * 100) : 0,
                    total: groupTotal,
                };
            }),
        };
    }
}

module.exports = AttendanceRepository;
