const { z } = require('zod');

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),

    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // Redis
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

    // JWT
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().default('7d'),

    // BullMQ
    BULLMQ_PREFIX: z.string().default('golx'),

    // CORS
    CORS_ORIGINS: z.string().default('http://localhost:3001'),

    // Bcrypt
    BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).default(12),

    // Pagination
    DEFAULT_PAGE_LIMIT: z.coerce.number().default(20),
    MAX_PAGE_LIMIT: z.coerce.number().default(100),
});

let env;
try {
    env = envSchema.parse(process.env);
} catch (err) {
    console.error('❌ Environment validation failed:');
    console.error(err.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n'));
    process.exit(1);
}

module.exports = env;
