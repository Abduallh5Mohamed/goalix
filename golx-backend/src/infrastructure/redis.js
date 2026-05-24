const Redis = require('ioredis');
const env = require('../config/env');
const logger = require('../shared/logger');

const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
});

redis.on('connect', () => logger.info('✅ Redis connected'));
redis.on('error', (err) => logger.error({ err }, '❌ Redis error'));

const connectRedis = async () => {
    try {
        await redis.connect();
    } catch (err) {
        logger.fatal({ err }, '❌ Redis connection failed');
        process.exit(1);
    }
};

module.exports = { redis, connectRedis };
