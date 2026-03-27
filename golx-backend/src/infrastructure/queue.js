const { Queue } = require('bullmq');
const env = require('../config/env');
const logger = require('../shared/logger');

const redisUrl = new URL(env.REDIS_URL);
// Preserve auth credentials and TLS from REDIS_URL so BullMQ authenticates correctly in production
const redisConnection = {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port || '6379', 10),
    ...(redisUrl.password ? { password: decodeURIComponent(redisUrl.password) } : {}),
    // rediss: protocol means TLS-encrypted Redis (e.g. Redis Cloud, Upstash)
    ...(redisUrl.protocol === 'rediss:' ? { tls: {} } : {}),
};

const createQueue = (name) => {
    const queue = new Queue(`${env.BULLMQ_PREFIX}-${name}`, {
        connection: redisConnection,
        defaultJobOptions: {
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 5000 },
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
        },
    });

    queue.on('error', (err) => logger.error({ err, queue: name }, 'Queue error'));

    return queue;
};

const rankingsQueue = createQueue('rankings');
const notificationsQueue = createQueue('notifications');
const paymentsQueue = createQueue('payments');
const aiQueue = createQueue('ai');

module.exports = {
    createQueue,
    rankingsQueue,
    notificationsQueue,
    paymentsQueue,
    aiQueue,
};
