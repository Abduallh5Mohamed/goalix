const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../infrastructure/database');
const { UnauthorizedError } = require('../shared/errors');
const { createAbility } = require('../shared/authorization');

const readAccessToken = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    return req.cookies?.accessToken || null;
};

const assertActiveAccessSession = async (decoded) => {
    if (!decoded.jti) {
        throw new UnauthorizedError('Session missing');
    }

    const session = await db('auth_refresh_tokens')
        .where({
            user_id: decoded.userId,
            access_jti: decoded.jti,
            is_revoked: false,
        })
        .where('expires_at', '>', new Date())
        .first();

    if (!session) {
        throw new UnauthorizedError('Session revoked');
    }

    await db('auth_refresh_tokens')
        .where({ id: session.id })
        .update({ last_seen_at: new Date() });
};

const assertActiveAdminAccount = async (decoded) => {
    if (decoded.role !== 'admin') return;

    try {
        const adminAccount = await db('admin_accounts')
            .where({ user_id: decoded.userId, is_active: true })
            .whereNull('deleted_at')
            .first('id');

        if (!adminAccount) {
            throw new UnauthorizedError('Admin account is disabled');
        }
    } catch (err) {
        if (err.code === '42P01') return;
        throw err;
    }
};

/**
 * Auth middleware. Browser clients authenticate with an httpOnly accessToken
 * cookie; Authorization: Bearer is retained for non-browser API clients.
 */
const authMiddleware = async (req, _res, next) => {
    const token = readAccessToken(req);
    if (!token) {
        return next(new UnauthorizedError('Missing access token'));
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
        await assertActiveAccessSession(decoded);
        await assertActiveAdminAccount(decoded);
        req.user = createAbility({
            userId: decoded.userId,
            role: decoded.role,
            academyId: decoded.academyId,
            branchId: decoded.branchId,
            linkedPlayerId: decoded.linkedPlayerId,
            sessionId: decoded.jti,
        }, db);
        return next();
    } catch (err) {
        if (err instanceof UnauthorizedError) return next(err);
        if (err.name === 'TokenExpiredError') {
            return next(new UnauthorizedError('Token expired'));
        }
        return next(new UnauthorizedError('Invalid token'));
    }
};

/**
 * Optional auth attaches a verified JWT payload if one is present. It does not
 * perform DB session validation because callers must treat it as advisory.
 */
const optionalAuth = (req, _res, next) => {
    const token = readAccessToken(req);
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
        req.user = createAbility({
            userId: decoded.userId,
            role: decoded.role,
            academyId: decoded.academyId,
            branchId: decoded.branchId,
            linkedPlayerId: decoded.linkedPlayerId,
            sessionId: decoded.jti,
        }, db);
    } catch {
        req.user = null;
    }
    return next();
};

module.exports = { authMiddleware, optionalAuth };
