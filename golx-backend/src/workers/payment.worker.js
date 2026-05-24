const { Worker } = require('bullmq');
const logger = require('../shared/logger');

/**
 * Payments Worker
 * Jobs: generate-invoice, check-expiring-subscriptions, process-refund
 */
function createPaymentsWorker(redisConnection) {
    const worker = new Worker(
        'payments',
        async (job) => {
            logger.info({ jobId: job.id, name: job.name }, 'Payments worker: processing');

            switch (job.name) {
                case 'generate-invoice': {
                    const { subscriptionId } = job.data;
                    // TODO: generate PDF invoice, store in storage, notify user
                    logger.info({ subscriptionId }, 'Generating invoice');
                    break;
                }
                case 'check-expiring-subscriptions': {
                    // TODO: query expiring subs, send reminders, mark expired
                    logger.info('Checking expiring subscriptions');
                    break;
                }
                case 'process-refund': {
                    const { paymentId, amount } = job.data;
                    // TODO: integrate with payment gateway for refund
                    logger.info({ paymentId, amount }, 'Processing refund');
                    break;
                }
                default:
                    logger.warn({ name: job.name }, 'Unknown payment job');
            }

            logger.info({ jobId: job.id }, 'Payments worker: completed');
        },
        { connection: redisConnection, concurrency: 3 }
    );

    worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, err: err.message }, 'Payments worker: job failed');
    });

    return worker;
}

module.exports = createPaymentsWorker;
