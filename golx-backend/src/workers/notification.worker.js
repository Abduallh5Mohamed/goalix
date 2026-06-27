const { Worker } = require('bullmq');
const env = require('../config/env');
const logger = require('../shared/logger');

/**
 * Notifications Worker
 * Jobs: deliver-notification, bulk-notification
 */
function createNotificationsWorker(redisConnection) {
    const worker = new Worker(
        `${env.BULLMQ_PREFIX}-notifications`,
        async (job) => {
            logger.debug({ jobId: job.id, name: job.name }, 'Notifications worker: processing');

            switch (job.name) {
                case 'deliver-notification': {
                    const { notificationId, channel, userId } = job.data;
                    // TODO: integrate with push/email/sms provider
                    logger.debug({ notificationId, channel, userId }, 'Delivering notification');
                    break;
                }
                case 'bulk-notification': {
                    const { academyId, type, channel, targetRole } = job.data;
                    // TODO: fetch users by academy + role, create notifications in batch
                    logger.debug({ academyId, type, channel, targetRole }, 'Sending bulk notification');
                    break;
                }
                default:
                    logger.warn({ name: job.name }, 'Unknown notification job');
            }

            logger.debug({ jobId: job.id }, 'Notifications worker: completed');
        },
        { connection: redisConnection, concurrency: 5 }
    );

    worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, err: err.message }, 'Notifications worker: job failed');
    });

    return worker;
}

module.exports = createNotificationsWorker;
