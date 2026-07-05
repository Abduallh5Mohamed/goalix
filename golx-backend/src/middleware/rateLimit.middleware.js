const crypto = require('node:crypto');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const env = require('../config/env');
const { redis } = require('../infrastructure/redis');
const ApiResponse = require('../shared/api-response');

// Use req.ip which is set correctly when app.set('trust proxy', 1) is configured.
const keyGenerator = (req) => req.ip;
const userAwareKeyGenerator = (req) => {
    if (req.user?.userId) return `${req.user.role || 'user'}:${req.user.userId}`;
    return keyGenerator(req);
};
const distributedStore = (prefix) => (
    env.NODE_ENV === 'production'
        ? {
            store: new RedisStore({
                sendCommand: (...args) => redis.call(...args),
                prefix: `goalix:rate-limit:${prefix}:`,
            }),
            passOnStoreError: true,
        }
        : {}
);
const loginIdentifierKey = (req) => {
    const identifier = String(
        req.body?.email || req.body?.username || req.body?.phone || '',
    ).trim().toLowerCase();
    if (!identifier) return `ip:${req.ip}`;
    return crypto.createHash('sha256').update(identifier).digest('hex');
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
    ...distributedStore('api'),
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
    ...distributedStore('auth-ip'),
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
    ...distributedStore('admin-auth-ip'),
    handler: (_req, res) => {
        res.status(429).json(
            ApiResponse.error('RATE_LIMIT_EXCEEDED', 'Too many admin authentication attempts, please try again later'),
        );
    },
});

const accountAuthLimiter = rateLimit({
    windowMs: env.AUTH_ACCOUNT_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    max: env.AUTH_ACCOUNT_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: loginIdentifierKey,
    ...distributedStore('auth-account'),
    handler: (_req, res) => {
        res.status(429).json(
            ApiResponse.error('RATE_LIMIT_EXCEEDED', 'Too many authentication attempts, please try again later'),
        );
    },
});

const chatWriteLimiter = rateLimit({
    windowMs: env.CHAT_WRITE_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    max: env.CHAT_WRITE_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userAwareKeyGenerator,
    ...distributedStore('chat-write'),
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
    ...distributedStore('upload'),
    handler: (_req, res) => {
        res.status(429).json(
            ApiResponse.error('RATE_LIMIT_EXCEEDED', 'Too many uploads, please try again later'),
        );
    },
});

const aiLimiter = rateLimit({
    windowMs: env.AI_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    max: env.AI_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userAwareKeyGenerator,
    ...distributedStore('ai'),
    handler: (_req, res) => {
        res.status(429).json(
            ApiResponse.error('RATE_LIMIT_EXCEEDED', 'Too many AI requests, please try again later'),
        );
    },
});

module.exports = {
    apiLimiter,
    authLimiter,
    adminAuthLimiter,
    accountAuthLimiter,
    chatWriteLimiter,
    uploadLimiter,
    aiLimiter,
};
