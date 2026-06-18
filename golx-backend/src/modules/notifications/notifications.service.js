const eventBus = require('../../events/eventBus');
const NOTIFICATIONS_EVENTS = require('./notifications.events');
const { NotFoundError } = require('../../shared/errors');

class NotificationsService {
    constructor(notificationsRepository, notificationsQueue) {
        this.repo = notificationsRepository;
        this.queue = notificationsQueue;
    }

    async getUserNotifications(user, filters) {
        return this.repo.findByUser(user.userId, filters, user);
    }

    async getUnreadCount(user) {
        return this.repo.getUnreadCount(user.userId, user);
    }

    async sendNotification(data, academyId) {
        const recipients = data.userId
            ? [{ user_id: data.userId }]
            : await this.repo.targetUsers(academyId, data.targetRole);

        const notifications = recipients.length
            ? await this.repo.createBulk(recipients.map((recipient) => ({
                user_id: recipient.user_id,
                type: data.type,
                title: data.title,
                body: data.body,
                data: data.data || {},
                is_read: false,
            })))
            : [];

        // Queue delivery via channel
        if (data.channel !== 'in_app') {
            await this.queue.add('bulk-notification', {
                notificationIds: notifications.map((notification) => notification.id),
                channel: data.channel,
                academyId,
                targetRole: data.targetRole,
            });
        }

        // Log
        for (const notification of notifications) {
            await this.repo.logNotification({
                notification_id: notification.id,
                user_id: notification.user_id,
                channel: data.channel,
                status: 'sent',
            });
        }

        eventBus.publish(NOTIFICATIONS_EVENTS.NOTIFICATION_SENT, {
            count: notifications.length,
            targetRole: data.targetRole || null,
            type: data.type,
        });

        return {
            count: notifications.length,
            notifications,
        };
    }

    async sendBulkNotification(academyId, data) {
        const result = await this.sendNotification(data, academyId);
        eventBus.publish(NOTIFICATIONS_EVENTS.BULK_NOTIFICATION_SENT, {
            type: data.type,
            academyId,
            count: result.count,
        });

        return { message: 'Bulk notification sent', count: result.count };
    }

    async markAsRead(notificationId, userId) {
        const notif = await this.repo.markAsRead(notificationId, userId);
        if (!notif) throw new NotFoundError('Notification', notificationId);

        eventBus.publish(NOTIFICATIONS_EVENTS.NOTIFICATION_READ, {
            notificationId,
            userId,
        });

        return notif;
    }

    async markAllAsRead(userId) {
        const count = await this.repo.markAllAsRead(userId);
        return { markedRead: count };
    }

    async getLogs(filters) {
        return this.repo.findLogs(filters);
    }
}

module.exports = NotificationsService;
