const BaseRepository = require('../../shared/base.repository');

class NotificationsRepository extends BaseRepository {
    constructor(db) {
        super('notification_inbox', db);
    }

    async findByUser(userId, { isRead, type, page = 1, limit = 20 } = {}) {
        const query = this.db('notification_inbox')
            .where({ user_id: userId })
            .modify((q) => {
                if (isRead !== undefined) q.where('is_read', isRead === 'true');
                if (type) q.where('type', type);
            });

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

    async getUnreadCount(userId) {
        const [{ count }] = await this.db('notification_inbox')
            .where({ user_id: userId, is_read: false })
            .count('id as count');
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
