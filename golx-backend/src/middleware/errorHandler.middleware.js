const logger = require('../shared/logger');
const ApiResponse = require('../shared/api-response');
const { AppError } = require('../shared/errors');

/**
 * Global error handler middleware — must be registered last in Express.
 */
const errorHandler = (err, req, res, _next) => {
    // Log error
    if (err.isOperational) {
        logger.warn({ err, url: req.originalUrl, method: req.method }, err.message);
    } else {
        logger.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled error');
    }

    // Operational errors (our custom errors)
    if (err instanceof AppError) {
        return res.status(err.statusCode).json(
            ApiResponse.error(err.code, err.message, err.details, { requestId: req.id }),
        );
    }

    // Knex / DB errors
    if (err.code === '23505') {
        return res.status(409).json(
            ApiResponse.error('DUPLICATE_ENTRY', 'A record with this value already exists', [], { requestId: req.id }),
        );
    }
    if (err.code === '23503') {
        return res.status(400).json(
            ApiResponse.error('FOREIGN_KEY_VIOLATION', 'Referenced resource does not exist', [], { requestId: req.id }),
        );
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json(
            ApiResponse.error('INVALID_TOKEN', 'Invalid token', [], { requestId: req.id }),
        );
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json(
            ApiResponse.error('TOKEN_EXPIRED', 'Token expired', [], { requestId: req.id }),
        );
    }

    // Fallback: Internal server error
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    return res.status(500).json(
        ApiResponse.error('INTERNAL_ERROR', message, [], { requestId: req.id }),
    );
};

module.exports = errorHandler;
