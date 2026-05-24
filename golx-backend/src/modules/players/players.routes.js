const { Router } = require('express');
const validate = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { rbac } = require('../../middleware/rbac.middleware');
const {
    uuidParam,
    createPlayerSchema,
    updatePlayerSchema,
    listPlayersQuery,
    addMeasurementSchema,
    addInjurySchema,
} = require('./players.schema');

function playersRoutes(controller) {
    const router = Router();
    router.use(authMiddleware);

    router.get('/', rbac('players:read'), validate({ query: listPlayersQuery }), controller.list);
    router.post('/', rbac('*'), validate({ body: createPlayerSchema }), controller.create);
    router.get('/:id', rbac('players:read'), validate({ params: uuidParam }), controller.getById);
    router.put('/:id', rbac('*'), validate({ params: uuidParam, body: updatePlayerSchema }), controller.update);
    router.delete('/:id', rbac('*'), validate({ params: uuidParam }), controller.remove);

    router.get('/:id/summary', rbac('players:read'), validate({ params: uuidParam }), controller.getSummary);

    // Measurements
    router.get('/:id/measurements', rbac('measurements:read'), validate({ params: uuidParam }), controller.getMeasurements);
    router.post('/:id/measurements', rbac('measurements:write'), validate({ params: uuidParam, body: addMeasurementSchema }), controller.addMeasurement);

    // Injuries
    router.get('/:id/injuries', rbac('players:read'), validate({ params: uuidParam }), controller.getInjuries);
    router.post('/:id/injuries', rbac('*'), validate({ params: uuidParam, body: addInjurySchema }), controller.addInjury);

    return router;
}

module.exports = playersRoutes;
