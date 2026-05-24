require('dotenv').config();

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
        pool: { min: 2, max: 10 },
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
        pool: { min: 1, max: 5 },
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
            min: 2,
            max: 10,
            acquireTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
        },
    },
};
