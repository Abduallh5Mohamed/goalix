const Redis = require('ioredis');
const env = require('../config/env');
const logger = require('../shared/logger');

const redisEnabled = process.env.REDIS_ENABLED !== 'false';

const noopRedis = {
    connect: async () => null,
    get: async () => null,
    set: async () => null,
    del: async () => 0,
    quit: async () => null,
    disconnect: () => null,
};

const redis = redisEnabled
    ? new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
            if (times > 3) return null; // stop retrying after 3 attempts
            return Math.min(times * 200, 1000);
        },
        lazyConnect: true,
        enableOfflineQueue: false,
    })
    : noopRedis;

if (redisEnabled) {
    redis.on('connect', () => logger.info('✅ Redis connected'));
    redis.on('error', (err) => logger.warn({ err }, '⚠️  Redis unavailable — caching/locking disabled'));
}

let redisAvailable = false;

const connectRedis = async () => {
    if (!redisEnabled) {
        logger.info('Redis disabled for this environment');
        redisAvailable = false;
        return;
    }

    try {
        await redis.connect();
        redisAvailable = true;
    } catch (err) {
        logger.warn({ err }, '⚠️  Redis connection failed — running without Redis');
        redisAvailable = false;
    }
};

const isRedisAvailable = () => redisAvailable;

module.exports = { redis, connectRedis, isRedisAvailable };
