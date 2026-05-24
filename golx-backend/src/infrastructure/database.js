const knex = require('knex');
const env = require('../config/env');
const logger = require('../shared/logger');

const db = knex({
    client: 'pg',
    connection: {
        connectionString: env.DATABASE_URL,
        ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
    },
    pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
    },
    acquireConnectionTimeout: 10000,
});

// Test connection on startup
db.raw('SELECT 1')
    .then(() => logger.info('✅ PostgreSQL connected'))
    .catch((err) => {
        logger.fatal({ err }, '❌ PostgreSQL connection failed');
        process.exit(1);
    });

module.exports = db;
