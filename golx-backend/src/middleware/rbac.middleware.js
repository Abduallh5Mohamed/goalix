const { ForbiddenError } = require('../shared/errors');

/**
 * Role-based permissions map (RBAC).
 */
const permissions = {
    admin: ['*'],
    coach: [
        'players:read',
        'attendance:read', 'attendance:write',
        'evaluations:read', 'evaluations:write',
        'measurements:read', 'measurements:write',
        'schedule:read', 'schedule:write',
        'sessions:read', 'sessions:write',
        'rankings:read',
        'groups:read',
        'coaches:read',
        'nutrition:read', 'nutrition:write',
        'matches:read', 'matches:write',
    ],
    player: [
        'profile:read',
        'progress:read',
        'training:read',
        'attendance:read',
        'rankings:read',
        'measurements:read',
        'nutrition:read',
        'evaluations:read',
    ],
    parent: [
        'child:read',
        'payments:read',
        'notifications:read',
        'attendance:read',
        'measurements:read',
        'nutrition:read',
        'schedule:read',
    ],
};

/**
 * RBAC middleware — checks if user has the required permission.
 * @param {string} required - permission string e.g. 'players:read'
 */
const rbac = (required) => (req, _res, next) => {
    if (!req.user) {
        return next(new ForbiddenError('Authentication required'));
    }

    const userPerms = permissions[req.user.role] || [];

    // '*' as required means "any authenticated user" (gateway is authMiddleware)
    if (required === '*' || userPerms.includes('*') || userPerms.includes(required)) {
        return next();
    }

    return next(new ForbiddenError('Insufficient permissions'));
};

/**
 * Restrict to specific roles only.
 * @param  {...string} roles - allowed roles
 */
const restrictTo = (...roles) => (req, _res, next) => {
    if (!req.user) {
        return next(new ForbiddenError('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
        return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
};

module.exports = { rbac, restrictTo, permissions };
