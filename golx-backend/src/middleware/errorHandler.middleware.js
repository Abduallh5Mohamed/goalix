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

    const statusCode = jsonParseError ? 400 : Number(err.statusCode || 500);

    if (!err.isOperational && !jsonParseError) {
        logger.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled error');
    } else if (statusCode === 403 || statusCode === 429) {
        logger.warn(
            {
                code: err.code,
                statusCode,
                url: req.originalUrl,
                method: req.method,
                requestId,
            },
            err.message,
        );
    } else {
        logger.debug(
            {
                code: err.code,
                statusCode,
                url: req.originalUrl,
                method: req.method,
                requestId,
            },
            err.message,
        );
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
            ApiResponse.error(
                'DUPLICATE_ENTRY',
                'A record with this value already exists',
                [
                    {
                        reason: 'UNIQUE_CONSTRAINT',
                        constraint: err.constraint,
                        solution: 'Use a different value, or update the existing record instead of creating a duplicate.',
                    },
                ],
                { requestId },
            ),
        );
    }

    if (err.code === '23503') {
        return res.status(400).json(
            ApiResponse.error(
                'FOREIGN_KEY_VIOLATION',
                'Referenced resource does not exist or is still linked to another record',
                [
                    {
                        reason: 'FOREIGN_KEY_CONSTRAINT',
                        constraint: err.constraint,
                        solution: 'Select an existing related record, or remove/move the linked records before deleting this one.',
                    },
                ],
                { requestId },
            ),
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
