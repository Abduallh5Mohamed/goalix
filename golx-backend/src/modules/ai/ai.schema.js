const { z } = require('zod');

const uuidParam = z.object({ id: z.string().uuid() });

const performanceScoreQuery = z.object({
    playerId: z.string().uuid(),
});

const injuryRiskSchema = z.object({
    playerId: z.string().uuid(),
});

const nutritionPlanSchema = z.object({
    playerId: z.string().uuid(),
    goals: z.array(z.string()).optional(),
    restrictions: z.array(z.string()).optional(),
});

const chatSchema = z.object({
    prompt: z.string().min(1).max(2000),
    context: z.string().max(1000).optional(),
});

module.exports = {
    uuidParam,
    performanceScoreQuery,
    injuryRiskSchema,
    nutritionPlanSchema,
    chatSchema,
};
