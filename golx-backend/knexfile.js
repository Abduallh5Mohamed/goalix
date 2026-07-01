require('dotenv').config();

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
            ssl: { rejectUnauthorized: true },
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
