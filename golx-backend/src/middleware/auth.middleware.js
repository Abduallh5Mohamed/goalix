const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { UnauthorizedError } = require('../shared/errors');

/**
 * Auth middleware — verifies JWT access token from Authorization header.
 * Attaches decoded user to req.user
 */
const authMiddleware = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new UnauthorizedError('Missing or invalid authorization header'));
    }

    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
            academyId: decoded.academyId,
            branchId: decoded.branchId,
            sessionId: decoded.sessionId,
        };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new UnauthorizedError('Token expired'));
        }
        return next(new UnauthorizedError('Invalid token'));
    }
};

/**
 * Optional auth — attaches user if token exists, but doesn't fail if missing.
 */
const optionalAuth = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
            academyId: decoded.academyId,
            branchId: decoded.branchId,
            sessionId: decoded.sessionId,
        };
    } catch {
        req.user = null;
    }
    next();
};

module.exports = { authMiddleware, optionalAuth };
