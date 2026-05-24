const app = require('./app');
const env = require('./config/env');
const logger = require('./shared/logger');
const { connectRedis } = require('./infrastructure/redis');
const { startWorkers, stopWorkers } = require('./workers');

let workers = null;

async function main() {
    // Connect Redis
    await connectRedis();

    // Start BullMQ workers
    const redisConnection = {
        host: new URL(env.REDIS_URL).hostname,
        port: parseInt(new URL(env.REDIS_URL).port || '6379', 10),
    };
    workers = startWorkers(redisConnection);

    // Start HTTP server
    const server = app.listen(env.PORT, () => {
        logger.info(`🚀 GOLX API running on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
        logger.info({ signal }, 'Shutting down gracefully…');
        server.close(async () => {
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
