const { Worker } = require('bullmq');
const env = require('../config/env');
const logger = require('../shared/logger');

/**
 * Rankings Worker
 * Jobs: recalculate-rankings (weekly / monthly)
 */
function createRankingsWorker(redisConnection) {
    const worker = new Worker(
        `${env.BULLMQ_PREFIX}-rankings`,
        async (job) => {
            const { type, academyId, branchId, weekStart, monthStart } = job.data;
            logger.info({ jobId: job.id, type }, 'Rankings worker: processing');

            // TODO: implement actual ranking algorithm
            // 1. Fetch all players for academy/branch
            // 2. Gather attendance %, coach evaluations, discipline, match stats, AI scores
            // 3. Apply weights: coach_eval 35%, attendance 20%, discipline 15%, match 20%, ai 10%
            // 4. Upsert rankings table
            // 5. Publish event

            logger.info({ jobId: job.id, type }, 'Rankings worker: completed');
        },
        { connection: redisConnection, concurrency: 2 }
    );

    worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, err: err.message }, 'Rankings worker: job failed');
    });

    return worker;
}

module.exports = createRankingsWorker;
