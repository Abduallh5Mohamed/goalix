const { Router } = require('express');
const validate = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { rbac } = require('../../middleware/rbac.middleware');
const {
    uuidParam,
    sendNotificationSchema,
    bulkNotificationSchema,
    notificationsQuery,
    logsQuerySchema,
} = require('./notifications.schema');

function notificationsRoutes(controller) {
    const router = Router();
    router.use(authMiddleware);

    router.get('/', validate({ query: notificationsQuery }), controller.getNotifications);
    router.get('/unread-count', controller.getUnreadCount);
    // send: admin-only — prevents any authenticated user from spamming arbitrary users
    router.post('/send', rbac('manage_users'), validate({ body: sendNotificationSchema }), controller.send);
    router.post('/send-bulk', rbac('manage_users'), validate({ body: bulkNotificationSchema }), controller.sendBulk);
    router.patch('/read-all', controller.markAllAsRead);
    router.patch('/:id/read', validate({ params: uuidParam }), controller.markAsRead);
    // Logs: admin-only with validated query params
    router.get('/logs', rbac('manage_users'), validate({ query: logsQuerySchema }), controller.getLogs);

    return router;
}

module.exports = notificationsRoutes;
