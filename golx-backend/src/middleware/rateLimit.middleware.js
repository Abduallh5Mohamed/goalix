const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const ApiResponse = require('../shared/api-response');

// Use req.ip which is set correctly when app.set('trust proxy', 1) is configured.
const keyGenerator = (req) => req.ip;
const userAwareKeyGenerator = (req) => {
    if (req.user?.userId) return `${req.user.role || 'user'}:${req.user.userId}`;
    return keyGenerator(req);
};

/**
 * General API rate limiter for authenticated dashboards and realtime fallbacks.
 */
const apiLimiter = rateLimit({
    windowMs: env.API_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    max: env.API_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler: (_req, res) => {
        res.status(429).json(
            ApiResponse.error('RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later'),
        );
    },
});

/**
 * Auth endpoints rate limiter: 10 requests per 15 minutes
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler: (_req, res) => {
        res.status(429).json(
            ApiResponse.error('RATE_LIMIT_EXCEEDED', 'Too many authentication attempts, please try again later'),
        );
    },
});

/**
 * Stricter admin auth rate limiter: fewer attempts allowed
 */
const adminAuthLimiter = rateLimit({
    windowMs: (env.ADMIN_AUTH_RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
    max: env.ADMIN_AUTH_RATE_LIMIT_MAX || 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler: (_req, res) => {
        res.status(429).json(
            ApiResponse.error('RATE_LIMIT_EXCEEDED', 'Too many admin authentication attempts, please try again later'),
        );
    },
});

const chatWriteLimiter = rateLimit({
    windowMs: env.CHAT_WRITE_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    max: env.CHAT_WRITE_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userAwareKeyGenerator,
    handler: (_req, res) => {
        res.status(429).json(
            ApiResponse.error('RATE_LIMIT_EXCEEDED', 'Too many chat actions, please try again later'),
        );
    },
});

const uploadLimiter = rateLimit({
    windowMs: env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    max: env.UPLOAD_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userAwareKeyGenerator,
    handler: (_req, res) => {
        res.status(429).json(
            ApiResponse.error('RATE_LIMIT_EXCEEDED', 'Too many uploads, please try again later'),
        );
    },
});

module.exports = {
    apiLimiter,
    authLimiter,
    adminAuthLimiter,
    chatWriteLimiter,
    uploadLimiter,
};
