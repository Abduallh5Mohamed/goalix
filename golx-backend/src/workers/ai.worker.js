const { Worker } = require('bullmq');
const env = require('../config/env');
const logger = require('../shared/logger');

/**
 * AI Worker
 * Jobs: calculate-performance, assess-injury-risk, generate-nutrition-plan, ai-chat
 */
function createAiWorker(redisConnection) {
    const worker = new Worker(
        `${env.BULLMQ_PREFIX}-ai`,
        async (job) => {
            logger.info({ jobId: job.id, name: job.name }, 'AI worker: processing');

            switch (job.name) {
                case 'calculate-performance': {
                    const { playerId } = job.data;
                    // TODO: gather player data, call AI model / algorithm, return score + breakdown
                    logger.info({ playerId }, 'Calculating AI performance score');
                    break;
                }
                case 'assess-injury-risk': {
                    const { playerId } = job.data;
                    // TODO: gather injury history, training load, call model
                    logger.info({ playerId }, 'Assessing injury risk');
                    break;
                }
                case 'generate-nutrition-plan': {
                    const { playerId, goals, restrictions } = job.data;
                    // TODO: call AI model with player profile + goals + restrictions
                    logger.info({ playerId }, 'Generating nutrition plan');
                    break;
                }
                case 'ai-chat': {
                    const { userId, prompt, context } = job.data;
                    // TODO: call LLM API with prompt + context
                    logger.info({ userId }, 'Processing AI chat');
                    break;
                }
                default:
                    logger.warn({ name: job.name }, 'Unknown AI job');
            }

            logger.info({ jobId: job.id }, 'AI worker: completed');
        },
        { connection: redisConnection, concurrency: 2 }
    );

    worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, err: err.message }, 'AI worker: job failed');
    });

    return worker;
}

module.exports = createAiWorker;
