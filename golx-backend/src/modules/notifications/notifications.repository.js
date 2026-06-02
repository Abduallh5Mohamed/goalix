const BaseRepository = require('../../shared/base.repository');

class NotificationsRepository extends BaseRepository {
    constructor(db) {
        super('notification_inbox', db);
    }

    async _notificationPlayer(user) {
        if (user?.role === 'player') {
            return this.db('player_profiles')
                .where({ user_id: user.userId })
                .whereNull('deleted_at')
                .first('id', 'branch_id', 'date_of_birth');
        }

        if (user?.role === 'parent') {
            const linkedPlayerId = user.linkedPlayerId ||
                (await this.db('auth_users')
                    .where({ id: user.userId })
                    .whereNull('deleted_at')
                    .first('linked_player_id'))?.linked_player_id;

            if (!linkedPlayerId) return null;
            return this.db('player_profiles')
                .where({ id: linkedPlayerId })
                .whereNull('deleted_at')
                .first('id', 'branch_id', 'date_of_birth');
        }

        return null;
    }

    _applyMatchVisibility(query, player) {
        if (!player?.id) {
            query.where('notification_inbox.type', '<>', 'match');
            return query;
        }

        const db = this.db;
        query.andWhere((visibility) => {
            visibility.where('notification_inbox.type', '<>', 'match').orWhereExists(function visibleMatchNotification() {
                this.select(db.raw('1'))
                    .from('matches as m')
                    .whereRaw("notification_inbox.data ? 'match'")
                    .whereRaw(
                        "m.id::text = notification_inbox.data->'match'->>'id'",
                    )
                    .whereNull('m.deleted_at')
                    .whereExists(function hasTactics() {
                        this.select(db.raw('1'))
                            .from('match_tactics as mt')
                            .whereRaw('mt.match_id = m.id');
                    })
                    .andWhere(function playerTargeted() {
                        this.whereExists(function playerGroupTargeted() {
                            this.select(db.raw('1'))
                                .from('player_group_assignments as pga')
                                .leftJoin('calendar_event_groups as ceg', 'ceg.event_id', 'm.event_id')
                                .where('pga.player_id', player.id)
                                .whereNull('pga.left_at')
                                .andWhere(function groupMatches() {
                                    this.whereRaw('pga.group_id = m.team_id')
                                        .orWhereRaw('pga.group_id = m.age_group_id')
                                        .orWhereRaw('pga.group_id = ceg.group_id');
                                });
                        });

                        if (player.branch_id && player.date_of_birth) {
                            this.orWhereExists(function playerBirthYearTargeted() {
                                this.select(db.raw('1'))
                                    .from('calendar_event_birth_years as ceby')
                                    .join('academy_birth_years as aby', 'aby.id', 'ceby.birth_year_id')
                                    .whereRaw('ceby.event_id = m.event_id')
                                    .where('aby.branch_id', player.branch_id)
                                    .whereNull('aby.deleted_at')
                                    .whereRaw(
                                        'EXTRACT(YEAR FROM ?::date)::int BETWEEN aby.from_year AND aby.to_year',
                                        [player.date_of_birth],
                                    );
                            });
                        }

                        this.orWhereExists(function playerInSquad() {
                            this.select(db.raw('1'))
                                .from('match_squads as ms')
                                .whereRaw('ms.match_id = m.id')
                                .where('ms.player_id', player.id);
                        });
                    });
            });
        });

        return query;
    }

    async _baseUserQuery(userId, { isRead, type } = {}, userContext = null) {
        const query = this.db('notification_inbox')
            .where({ user_id: userId })
            .modify((q) => {
                if (isRead !== undefined) q.where('is_read', isRead === 'true');
                if (type) q.where('type', type);
            });

        if (['player', 'parent'].includes(userContext?.role)) {
            const player = await this._notificationPlayer(userContext);
            this._applyMatchVisibility(query, player);
        }

        return { query };
    }

    async findByUser(userId, { isRead, type, page = 1, limit = 20 } = {}, userContext = null) {
        const { query } = await this._baseUserQuery(userId, { isRead, type }, userContext);

        const [{ count }] = await query.clone().count('id as count');
        const data = await query
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async createNotification(data) {
        const [row] = await this.db('notification_inbox').insert(data).returning('*');
        return row;
    }

    async createBulk(rows) {
        return this.db('notification_inbox').insert(rows).returning('*');
    }

    async markAsRead(id, userId) {
        const [row] = await this.db('notification_inbox')
            .where({ id, user_id: userId })
            .update({ is_read: true })
            .returning('*');
        return row;
    }

    async markAllAsRead(userId) {
        return this.db('notification_inbox')
            .where({ user_id: userId, is_read: false })
            .update({ is_read: true });
    }

    async getUnreadCount(userId, userContext = null) {
        const { query } = await this._baseUserQuery(
            userId,
            { isRead: 'false' },
            userContext,
        );
        const [{ count }] = await query.count('id as count');
        return +count;
    }

    async findLogs({ channel, status, page = 1, limit = 20 } = {}) {
        const query = this.db('notification_logs')
            .modify((q) => {
                if (channel) q.where('channel', channel);
                if (status) q.where('status', status);
            });

        const [{ count }] = await query.clone().count('id as count');
        const data = await query
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        return { data, total: +count, page, totalPages: Math.ceil(+count / limit) || 1 };
    }

    async logNotification(data) {
        const [row] = await this.db('notification_logs').insert(data).returning('*');
        return row;
    }
}

module.exports = NotificationsRepository;
