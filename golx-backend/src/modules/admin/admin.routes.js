const { Router } = require('express');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { rbac } = require('../../middleware/rbac.middleware');
const validate = require('../../middleware/validate.middleware');
const { uuidParam, roleBodySchema, roleUpdateSchema } = require('./admin.schema');

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

    router.get('/settings/access-control', rbac('manage_roles'), controller.getAccessControl);
    router.post('/settings/roles', rbac('manage_roles'), validate({ body: roleBodySchema }), controller.createRole);
    router.patch('/settings/roles/:id', rbac('manage_roles'), validate({ params: uuidParam, body: roleUpdateSchema }), controller.updateRole);
    router.delete('/settings/roles/:id', rbac('manage_roles'), validate({ params: uuidParam }), controller.deleteRole);

    // ─── Pending Registrations ───────────────────────────────────────────
    router.get('/registrations', rbac('manage_users'), controller.getPendingRegistrations);
    router.post('/registrations/:id/approve', rbac('manage_users'), validateUuidParam, controller.approveRegistration);
    router.post('/registrations/:id/reject', rbac('manage_users'), validateUuidParam, controller.rejectRegistration);

    return router;
}

module.exports = adminRoutes;
