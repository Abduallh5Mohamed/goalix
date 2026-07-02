require('dotenv').config();

const databaseSsl = process.env.DATABASE_SSL === undefined
    ? process.env.NODE_ENV === 'production'
    : process.env.DATABASE_SSL === 'true';
const pool = {
    min: Number(process.env.DB_POOL_MIN || 2),
    max: Number(process.env.DB_POOL_MAX || 10),
};

module.exports = {
    development: {
        client: 'pg',
        connection: process.env.DATABASE_URL,
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: './seeds',
        },
        pool,
    },

    test: {
        client: 'pg',
        connection: process.env.DATABASE_URL,
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: './seeds',
        },
        pool: { min: 1, max: Math.min(pool.max, 5) },
    },

    production: {
        client: 'pg',
        connection: {
            connectionString: process.env.DATABASE_URL,
            ssl: databaseSsl ? { rejectUnauthorized: true } : false,
        },
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations',
        },
        pool: {
            ...pool,
            acquireTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
        },
    },
};
