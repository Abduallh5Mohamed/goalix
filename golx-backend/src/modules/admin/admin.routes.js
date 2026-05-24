const { Router } = require('express');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { rbac } = require('../../middleware/rbac.middleware');

// UUID v4 format validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUuidParam(req, res, next) {
    if (!UUID_REGEX.test(req.params.id)) {
        return res.status(400).json({ success: false, error: { message: 'Invalid ID format' } });
    }
    next();
}

function adminRoutes(controller) {
    const router = Router();
    router.use(authMiddleware);
    router.use(rbac('access_admin_dashboard'));

    router.get('/dashboard', controller.getDashboard);

    // ─── Pending Registrations ───────────────────────────────────────────
    router.get('/registrations', rbac('manage_users'), controller.getPendingRegistrations);
    router.post('/registrations/:id/approve', rbac('manage_users'), validateUuidParam, controller.approveRegistration);
    router.post('/registrations/:id/reject', rbac('manage_users'), validateUuidParam, controller.rejectRegistration);

    return router;
}

module.exports = adminRoutes;
