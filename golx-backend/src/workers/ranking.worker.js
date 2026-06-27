const { Worker } = require('bullmq');
const logger = require('../shared/logger');

/**
 * Rankings Worker
 * Jobs: recalculate-rankings (weekly / monthly)
 */
function createRankingsWorker(redisConnection) {
    const worker = new Worker(
        'rankings',
        async (job) => {
            const { type } = job.data;
            logger.debug({ jobId: job.id, type }, 'Rankings worker: processing');

            // TODO: implement actual ranking algorithm
            // 1. Fetch all players for academy/branch
            // 2. Gather attendance %, coach evaluations, discipline, match stats, AI scores
            // 3. Apply weights: coach_eval 35%, attendance 20%, discipline 15%, match 20%, ai 10%
            // 4. Upsert rankings table
            // 5. Publish event

            logger.debug({ jobId: job.id, type }, 'Rankings worker: completed');
        },
        { connection: redisConnection, concurrency: 2 }
    );

    worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, err: err.message }, 'Rankings worker: job failed');
    });

    return worker;
}

module.exports = createRankingsWorker;
