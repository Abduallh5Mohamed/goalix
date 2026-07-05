const app = require('./app');
const env = require('./config/env');
const logger = require('./shared/logger');
const { connectRedis, isRedisAvailable } = require('./infrastructure/redis');
const { connectDatabase } = require('./infrastructure/database');
const { buildRedisConnection, startWorkers, stopWorkers } = require('./workers');
const setupChatSocket = require('./realtime/chat.socket');

let workers = null;

async function main() {
    await connectDatabase();
    await connectRedis();

    const bullmqEnabled = process.env.BULLMQ_ENABLED !== 'false';
    const workersEnabled =
        env.BULLMQ_WORKERS_ENABLED ?? env.NODE_ENV !== 'production';

    if (bullmqEnabled && workersEnabled && isRedisAvailable()) {
        workers = startWorkers(buildRedisConnection(env.REDIS_URL));
    } else if (bullmqEnabled && !workersEnabled) {
        logger.info('BullMQ workers disabled in the API process');
    } else if (bullmqEnabled) {
        logger.warn('BullMQ workers not started - Redis unavailable');
    } else {
        logger.info('BullMQ disabled for this environment');
    }

    const server = app.listen({
        port: env.PORT,
        host: env.HOST,
        backlog: env.HTTP_LISTEN_BACKLOG,
    }, () => {
        logger.info(`GOALIX API running on ${env.HOST}:${env.PORT} [${env.NODE_ENV}]`);
    });
    server.keepAliveTimeout = env.HTTP_KEEP_ALIVE_TIMEOUT_MS;
    server.headersTimeout = Math.max(
        env.HTTP_HEADERS_TIMEOUT_MS,
        env.HTTP_KEEP_ALIVE_TIMEOUT_MS + 1000,
    );
    server.requestTimeout = env.HTTP_REQUEST_TIMEOUT_MS;

    const io = setupChatSocket(server, app.locals.services.chatService);

    let shuttingDown = false;
    const shutdown = async (signal, exitCode = 0, error = null) => {
        if (shuttingDown) return;
        shuttingDown = true;
        const logContext = error ? { signal, err: error } : { signal };
        if (error) logger.fatal(logContext, 'Fatal process error');
        else logger.info(logContext, 'Shutting down gracefully...');

        const forceExit = setTimeout(() => {
            logger.fatal({ signal }, 'Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
        forceExit.unref();

        server.close(async () => {
            try {
                io.close();
                app.locals.backgroundAutomations?.stop?.();
                await stopWorkers(workers);
                logger.info({ signal }, 'Server closed');
                process.exit(exitCode);
            } catch (shutdownError) {
                logger.fatal({ err: shutdownError, signal }, 'Graceful shutdown failed');
                process.exit(1);
            }
        });
    };

    process.once('SIGTERM', () => void shutdown('SIGTERM'));
    process.once('SIGINT', () => void shutdown('SIGINT'));
    process.once('unhandledRejection', (reason) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        void shutdown('unhandledRejection', 1, error);
    });
    process.once('uncaughtException', (error) => {
        void shutdown('uncaughtException', 1, error);
    });
}

main().catch((err) => {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
});
