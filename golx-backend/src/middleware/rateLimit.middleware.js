const rateLimit = require('express-rate-limit');
const ApiResponse = require('../shared/api-response');

// Use req.ip which is set correctly when app.set('trust proxy', 1) is configured.
const keyGenerator = (req) => req.ip;

/**
 * General API rate limiter: 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
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

module.exports = { apiLimiter, authLimiter };
