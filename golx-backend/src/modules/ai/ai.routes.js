const { Router } = require('express');
const validate = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { rbac } = require('../../middleware/rbac.middleware');
const { aiLimiter } = require('../../middleware/rateLimit.middleware');
const {
    uuidParam,
    archiveQuery,
    performanceScoreQuery,
    injuryRiskSchema,
    nutritionPlanSchema,
    chatSchema,
} = require('./ai.schema');

function aiRoutes(controller) {
    const router = Router();
    router.use(authMiddleware);

    // Performance Scores
    router.get('/scores', rbac('manage_players'), controller.getAllScores);
    router.get('/scores/:id', rbac('manage_players'), validate({ params: uuidParam }), controller.getPerformanceScore);
    router.post('/scores/calculate', aiLimiter, rbac('manage_players'), validate({ body: performanceScoreQuery }), controller.calculatePerformanceScore);

    // Injury Risk
    router.post('/injury-risk', aiLimiter, rbac('manage_players'), validate({ body: injuryRiskSchema }), controller.assessInjuryRisk);
    router.get('/injury-risk/:id', rbac('manage_players'), validate({ params: uuidParam }), controller.getInjuryRisk);
    router.get('/injury-risk/:id/history', rbac('manage_players'), validate({ params: uuidParam, query: archiveQuery }), controller.getInjuryRiskHistory);

    // Nutrition Plan
    router.post('/nutrition-plan', aiLimiter, rbac('manage_players'), validate({ body: nutritionPlanSchema }), controller.generateNutritionPlan);
    router.get('/nutrition-plan/:id', rbac('manage_players'), validate({ params: uuidParam }), controller.getNutritionPlan);
    router.get('/nutrition-plan/:id/history', rbac('manage_players'), validate({ params: uuidParam }), controller.getNutritionPlanHistory);

    // Chat
    router.post('/chat', aiLimiter, rbac('access_admin_dashboard'), validate({ body: chatSchema }), controller.chat);

    return router;
}

module.exports = aiRoutes;
