const { Router } = require('express');
const validate = require('../../middleware/validate.middleware');
const { authMiddleware, optionalAuth } = require('../../middleware/auth.middleware');
const { rbac, rbacAny } = require('../../middleware/rbac.middleware');
const { authLimiter, adminAuthLimiter } = require('../../middleware/rateLimit.middleware');
const {
    registerSchema,
    signupSchema,
    registrationStatusSchema,
    loginSchema,
    refreshSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verify2FASchema,
    verifySetup2FASchema,
    backupCodeSchema,
    disable2FASchema,
} = require('./auth.schema');

/**
 * Auth Routes — HTTP layer only, no logic.
 * @param {import('./auth.controller')} controller
 */
function authRoutes(controller) {
    const router = Router();
    const allowLoginRoles = (...roles) => (req, _res, next) => {
        req.allowedLoginRoles = roles;
        next();
    };
    const adminLoginLimiter = process.env.NODE_ENV === 'development'
        ? (_req, _res, next) => next()
        : adminAuthLimiter;

    // Admins create any account. Coaches may create player/parent accounts.
    router.post(
        '/register',
        authMiddleware,
        rbacAny('manage_users', 'manage_training_sessions'),
        validate({ body: registerSchema }),
        controller.register,
    );

    router.post(
        '/login',
        authLimiter,
        allowLoginRoles('player', 'parent'),
        validate({ body: loginSchema }),
        controller.login,
    );

    router.post(
        '/signup',
        authLimiter,
        validate({ body: signupSchema }),
        controller.signup,
    );

    router.get(
        '/registration-status',
        authLimiter,
        validate({ query: registrationStatusSchema }),
        controller.registrationStatus,
    );

    // Dedicated admin login with stricter rate limiting
    router.post(
        '/admin/login',
        adminLoginLimiter,
        allowLoginRoles('admin', 'coach'),
        validate({ body: loginSchema }),
        controller.login,
    );

    router.post(
        '/logout',
        optionalAuth,
        controller.logout,
    );

    router.post(
        '/logout-all',
        authMiddleware,
        controller.logoutAll,
    );

    router.post(
        '/refresh',
        validate({ body: refreshSchema.optional() }),
        controller.refresh,
    );

    router.post(
        '/forgot-password',
        authLimiter,
        validate({ body: forgotPasswordSchema }),
        controller.forgotPassword,
    );

    router.post(
        '/reset-password',
        authLimiter,
        validate({ body: resetPasswordSchema }),
        controller.resetPassword,
    );

    router.get(
        '/me',
        authMiddleware,
        controller.me,
    );

    router.get(
        '/permissions',
        authMiddleware,
        controller.permissions,
    );

    // ─── 2FA Routes ─────────────────────────────────────────────────────

    router.post(
        '/2fa/setup',
        authMiddleware,
        rbac('access_admin_dashboard'),
        controller.setup2FA,
    );

    router.post(
        '/2fa/verify-setup',
        authMiddleware,
        rbac('access_admin_dashboard'),
        validate({ body: verifySetup2FASchema }),
        controller.verifySetup2FA,
    );

    router.post(
        '/2fa/verify',
        adminAuthLimiter,
        validate({ body: verify2FASchema }),
        controller.verify2FA,
    );

    router.post(
        '/2fa/backup-verify',
        adminAuthLimiter,
        validate({ body: backupCodeSchema }),
        controller.verifyBackupCode,
    );

    router.post(
        '/2fa/disable',
        authMiddleware,
        rbac('access_admin_dashboard'),
        validate({ body: disable2FASchema }),
        controller.disable2FA,
    );

    return router;
}

module.exports = authRoutes;
