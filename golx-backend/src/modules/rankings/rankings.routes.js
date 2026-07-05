const { Router } = require('express');
const validate = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { rbac, rbacAny } = require('../../middleware/rbac.middleware');
const {
    uuidParam,
    rankingsQuery,
    createEvaluationSchema,
    createMatchSchema,
    playerMatchStatsSchema,
    recalculateSchema,
} = require('./rankings.schema');

function rankingsRoutes(controller) {
    const router = Router();
    router.use(authMiddleware);

    // Rankings
    const academyRankingRead = rbacAny('manage_players', 'ranking.read.academy');
    router.get('/weekly', academyRankingRead, validate({ query: rankingsQuery }), controller.getWeekly);
    router.get('/monthly', academyRankingRead, validate({ query: rankingsQuery }), controller.getMonthly);
    router.get('/player/:id', academyRankingRead, validate({ params: uuidParam }), controller.getPlayerRankings);
    router.post('/recalculate', rbac('manage_players'), validate({ body: recalculateSchema }), controller.recalculate);

    // Evaluations
    router.post('/evaluations', rbac('manage_players'), validate({ body: createEvaluationSchema }), controller.createEvaluation);
    router.get('/evaluations/player/:id', rbacAny('manage_players', 'evaluation.read.academy'), validate({ params: uuidParam }), controller.getPlayerEvaluations);

    // Matches
    router.post('/matches', rbac('manage_schedules'), validate({ body: createMatchSchema }), controller.createMatch);
    router.post('/matches/player-stats', rbac('manage_schedules'), validate({ body: playerMatchStatsSchema }), controller.addPlayerStats);

    return router;
}

module.exports = rankingsRoutes;
