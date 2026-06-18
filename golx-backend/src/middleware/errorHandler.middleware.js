const logger = require('../shared/logger');
const ApiResponse = require('../shared/api-response');
const { AppError } = require('../shared/errors');

const isJsonParseError = (err) => (
    err instanceof SyntaxError
    && err.status === 400
    && err.type === 'entity.parse.failed'
);

/**
 * Global error handler middleware. Must be registered last in Express.
 */
const errorHandler = (err, req, res, _next) => {
    const requestId = req.id;
    const jsonParseError = isJsonParseError(err);

    if (err.isOperational || jsonParseError) {
        logger.warn({ err, url: req.originalUrl, method: req.method }, err.message);
    } else {
        logger.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled error');
    }

    if (jsonParseError) {
        return res.status(400).json(
            ApiResponse.error('INVALID_JSON', 'Malformed JSON request body', [], { requestId }),
        );
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json(
            ApiResponse.error(err.code, err.message, err.details, { requestId }),
        );
    }

    if (err.code === '23505') {
        return res.status(409).json(
            ApiResponse.error('DUPLICATE_ENTRY', 'A record with this value already exists', [], { requestId }),
        );
    }

    if (err.code === '23503') {
        return res.status(400).json(
            ApiResponse.error('FOREIGN_KEY_VIOLATION', 'Referenced resource does not exist', [], { requestId }),
        );
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json(
            ApiResponse.error('INVALID_TOKEN', 'Invalid token', [], { requestId }),
        );
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json(
            ApiResponse.error('TOKEN_EXPIRED', 'Token expired', [], { requestId }),
        );
    }

    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    return res.status(500).json(
        ApiResponse.error('INTERNAL_ERROR', message, [], { requestId }),
    );
};

module.exports = errorHandler;
