const app = require('./app');
const env = require('./config/env');
const logger = require('./shared/logger');
const { connectRedis, isRedisAvailable } = require('./infrastructure/redis');
const { startWorkers, stopWorkers } = require('./workers');
const setupChatSocket = require('./realtime/chat.socket');

let workers = null;

async function main() {
    // Connect Redis (optional — server starts even if Redis is unavailable)
    await connectRedis();

    // Start BullMQ workers only if Redis is available
    if (isRedisAvailable()) {
        const redisConnection = {
            host: new URL(env.REDIS_URL).hostname,
            port: parseInt(new URL(env.REDIS_URL).port || '6379', 10),
        };
        workers = startWorkers(redisConnection);
    } else {
        logger.warn('⚠️  BullMQ workers not started — Redis unavailable');
    }

    // Start HTTP server
    const server = app.listen(env.PORT, () => {
        logger.info(`🚀 GOLX API running on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    const io = setupChatSocket(server, app.locals.services.chatService);

    // Graceful shutdown
    const shutdown = async (signal) => {
        logger.info({ signal }, 'Shutting down gracefully…');
        server.close(async () => {
            io.close();
            await stopWorkers(workers);
            logger.info('Server closed');
            process.exit(0);
        });
        // Force exit after 10s
        setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
});
