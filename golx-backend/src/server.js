const app = require('./app');
const env = require('./config/env');
const logger = require('./shared/logger');
const { connectRedis, isRedisAvailable } = require('./infrastructure/redis');
const redisConnectionFromUrl = require('./infrastructure/redis-connection');
const { startWorkers, stopWorkers } = require('./workers');
const setupChatSocket = require('./realtime/chat.socket');

let workers = null;

async function main() {
    await connectRedis();

    const bullmqEnabled = process.env.BULLMQ_ENABLED !== 'false';

    if (bullmqEnabled && isRedisAvailable()) {
        workers = startWorkers(redisConnectionFromUrl(env.REDIS_URL));
    } else if (bullmqEnabled) {
        logger.warn('BullMQ workers not started - Redis unavailable');
    } else {
        logger.info('BullMQ disabled for this environment');
    }

    const server = app.listen(env.PORT, env.HOST, () => {
        logger.info(`GOLX API running on ${env.HOST}:${env.PORT} [${env.NODE_ENV}]`);
    });

    const io = setupChatSocket(server, app.locals.services.chatService);

    const shutdown = async (signal) => {
        logger.info({ signal }, 'Shutting down gracefully...');
        server.close(async () => {
            io.close();
            await stopWorkers(workers);
            logger.info('Server closed');
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
});
