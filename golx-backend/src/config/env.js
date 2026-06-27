const { z } = require('zod');

const optionalBoolean = z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional();
const DEFAULT_COOKIE_SECRET = 'change-this-to-a-random-32-char-secret-in-production';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
    PORT: z.coerce.number().default(3000),
    HOST: z.string().default('0.0.0.0'),

    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DB_POOL_MIN: z.coerce.number().int().min(0).default(2),
    DB_POOL_MAX: z.coerce.number().int().min(1).default(40),

    // Redis
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    AUTH_SESSION_CACHE_TTL_SECONDS: z.coerce.number().int().min(30).default(900),
    AUTH_SESSION_LAST_SEEN_INTERVAL_SECONDS: z.coerce.number().int().min(30).default(300),
    AUTH_SESSION_LAST_SEEN_JITTER_SECONDS: z.coerce.number().int().min(0).default(60),
    AUTH_USER_CACHE_TTL_SECONDS: z.coerce.number().int().min(5).default(120),
    ACADEMY_BRANCHES_CACHE_TTL_SECONDS: z.coerce.number().int().min(5).default(120),
    NOTIFICATION_UNREAD_COUNT_CACHE_TTL_SECONDS: z.coerce.number().int().min(1).default(30),
    CHAT_CONVERSATIONS_CACHE_TTL_SECONDS: z.coerce.number().int().min(1).default(15),

    // JWT
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().default('7d'),

    // BullMQ
    BULLMQ_PREFIX: z.string().default('goalix'),
    BULLMQ_WORKERS_ENABLED: optionalBoolean,
    BACKGROUND_AUTOMATIONS_ENABLED: optionalBoolean,
    INJURY_RISK_AUTOMATION_ENABLED: optionalBoolean,

    // CORS
    CORS_ORIGINS: z.string().default('http://localhost:3001'),

    // Bcrypt
    BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).default(12),

    // Pagination
    DEFAULT_PAGE_LIMIT: z.coerce.number().default(20),
    MAX_PAGE_LIMIT: z.coerce.number().default(100),
    API_RATE_LIMIT_MAX: z.coerce.number().default(1000),
    API_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(15),

    // Account Lockout
    MAX_FAILED_LOGIN_ATTEMPTS: z.coerce.number().default(5),
    LOCKOUT_DURATION_MINUTES: z.coerce.number().default(15),
    ADMIN_MAX_FAILED_LOGIN_ATTEMPTS: z.coerce.number().default(3),
    ADMIN_LOCKOUT_DURATION_MINUTES: z.coerce.number().default(30),

    // TOTP 2FA
    TOTP_ISSUER: z.string().default('GOALIX Academy'),

    // Admin Login Rate Limit
    ADMIN_AUTH_RATE_LIMIT_MAX: z.coerce.number().default(5),
    ADMIN_AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(15),

    // Cookie signing secret
<<<<<<< HEAD
    COOKIE_SECRET: z.string().min(32).default('change-this-to-a-random-32-char-secret-in-production'),

    // HTTP server
    HTTP_LISTEN_BACKLOG: z.coerce.number().int().min(128).default(8192),
    HTTP_KEEP_ALIVE_TIMEOUT_MS: z.coerce.number().int().min(1000).default(65000),
    HTTP_HEADERS_TIMEOUT_MS: z.coerce.number().int().min(2000).default(66000),
    HTTP_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(120000),

    // Observability
    SLOW_QUERY_LOG_MS: z.coerce.number().int().min(0).default(250),
    SLOW_QUERY_SQL_MAX_CHARS: z.coerce.number().int().min(200).default(2000),
    SLOW_REQUEST_LOG_MS: z.coerce.number().int().min(0).default(1000),
=======
    COOKIE_SECRET: z.string().min(32).default(DEFAULT_COOKIE_SECRET),
>>>>>>> de89f1e66e55b89ad33d06e72b75d3e4a875aef6
});

let env;
try {
    env = envSchema.parse(process.env);
    if (env.NODE_ENV === 'production' && env.COOKIE_SECRET === DEFAULT_COOKIE_SECRET) {
        throw new z.ZodError([
            {
                code: z.ZodIssueCode.custom,
                path: ['COOKIE_SECRET'],
                message: 'COOKIE_SECRET must be set to a unique production secret',
            },
        ]);
    }
} catch (err) {
    console.error('❌ Environment validation failed:');
    console.error(err.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n'));
    process.exit(1);
}

module.exports = env;
