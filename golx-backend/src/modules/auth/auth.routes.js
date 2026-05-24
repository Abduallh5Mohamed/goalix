const { Router } = require('express');
const validate = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { authLimiter } = require('../../middleware/rateLimit.middleware');
const {
    registerSchema,
    loginSchema,
    refreshSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} = require('./auth.schema');

/**
 * Auth Routes — HTTP layer only, no logic.
 * @param {import('./auth.controller')} controller
 */
function authRoutes(controller) {
    const router = Router();

    router.post(
        '/register',
        authLimiter,
        validate({ body: registerSchema }),
        controller.register,
    );

    router.post(
        '/login',
        authLimiter,
        validate({ body: loginSchema }),
        controller.login,
    );

    router.post(
        '/logout',
        authMiddleware,
        controller.logout,
    );

    router.post(
        '/refresh',
        authLimiter,
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

    return router;
}

module.exports = authRoutes;
