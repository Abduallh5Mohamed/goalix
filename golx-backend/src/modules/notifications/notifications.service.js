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

    async sendNotification(data) {
        const notification = await this.repo.createNotification({
            user_id: data.userId,
            type: data.type,
            title: data.title,
            body: data.body,
            is_read: false,
        });

        // Queue delivery via channel
        if (data.channel !== 'in_app') {
            await this.queue.add('deliver-notification', {
                notificationId: notification.id,
                channel: data.channel,
                userId: data.userId,
            });
        }

        // Log
        await this.repo.logNotification({
            notification_id: notification.id,
            user_id: data.userId,
            channel: data.channel,
            status: 'sent',
        });

        eventBus.publish(NOTIFICATIONS_EVENTS.NOTIFICATION_SENT, {
            notificationId: notification.id,
            userId: data.userId,
            type: data.type,
        });

        return notification;
    }

    async sendBulkNotification(academyId, data) {
        // Queue bulk delivery
        await this.queue.add('bulk-notification', {
            academyId,
            type: data.type,
            title: data.title,
            body: data.body,
            channel: data.channel,
            targetRole: data.targetRole,
        });

        eventBus.publish(NOTIFICATIONS_EVENTS.BULK_NOTIFICATION_SENT, {
            type: data.type,
            academyId,
        });

        return { message: 'Bulk notification queued' };
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
