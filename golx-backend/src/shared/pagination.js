const env = require('../config/env');

/**
 * Parse and normalize pagination params from query string.
 */
function parsePagination(query = {}) {
    let page = parseInt(query.page, 10) || 1;
    let limit = parseInt(query.limit, 10) || env.DEFAULT_PAGE_LIMIT;

    if (page < 1) page = 1;
    if (limit < 1) limit = 1;
    if (limit > env.MAX_PAGE_LIMIT) limit = env.MAX_PAGE_LIMIT;

    const offset = (page - 1) * limit;

    return { page, limit, offset };
}

/**
 * Build pagination metadata for response.
 */
function buildPaginationMeta(total, page, limit) {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
    };
}

module.exports = { parsePagination, buildPaginationMeta };
