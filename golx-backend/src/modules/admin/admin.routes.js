const { Router } = require('express');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { rbac, rbacAny } = require('../../middleware/rbac.middleware');
const validate = require('../../middleware/validate.middleware');
const {
    uuidParam,
    roleUserParam,
    roleBodySchema,
    roleUpdateSchema,
    createAccessUserSchema,
    reportsOverviewQuery,
} = require('./admin.schema');

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

    router.get('/dashboard', rbac('access_admin_dashboard'), controller.getDashboard);
    router.get(
        '/reports/overview',
        rbacAny('view_financial_reports', 'payment.export', 'attendance.export'),
        validate({ query: reportsOverviewQuery }),
        controller.getReportsOverview,
    );

    router.get('/settings/access-control', rbac('manage_roles'), controller.getAccessControl);
    router.get('/password-reset-requests', rbac('manage_users'), controller.listPasswordResetRequests);
    router.post('/settings/users', rbac('manage_roles'), validate({ body: createAccessUserSchema }), controller.createAccessUser);
    router.post('/settings/roles', rbac('manage_roles'), validate({ body: roleBodySchema }), controller.createRole);
    router.patch('/settings/roles/:id', rbac('manage_roles'), validate({ params: uuidParam, body: roleUpdateSchema }), controller.updateRole);
    router.delete('/settings/roles/:id', rbac('manage_roles'), validate({ params: uuidParam }), controller.deleteRole);
    router.post('/settings/roles/:id/users/:userId', rbac('manage_roles'), validate({ params: roleUserParam }), controller.assignRoleToUser);
    router.delete('/settings/roles/:id/users/:userId', rbac('manage_roles'), validate({ params: roleUserParam }), controller.revokeRoleFromUser);

    // ─── Pending Registrations ───────────────────────────────────────────
    router.get('/registrations', rbac('manage_users'), controller.getPendingRegistrations);
    router.post('/registrations/:id/approve', rbac('manage_users'), validateUuidParam, controller.approveRegistration);
    router.post('/registrations/:id/reject', rbac('manage_users'), validateUuidParam, controller.rejectRegistration);

    return router;
}

module.exports = adminRoutes;
