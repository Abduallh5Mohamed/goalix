const { Router } = require('express');
const validate = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { rbac } = require('../../middleware/rbac.middleware');
const {
    uuidParam,
    createCoachSchema,
    updateCoachSchema,
    assignGroupSchema,
} = require('./coaches.schema');

function coachesRoutes(controller) {
    const router = Router();
    router.use(authMiddleware);

    router.get('/', rbac('coaches:read'), controller.list);
    router.post('/', rbac('*'), validate({ body: createCoachSchema }), controller.create);
    router.get('/:id', rbac('coaches:read'), validate({ params: uuidParam }), controller.getById);
    router.put('/:id', rbac('*'), validate({ params: uuidParam, body: updateCoachSchema }), controller.update);
    router.delete('/:id', rbac('*'), validate({ params: uuidParam }), controller.remove);
    router.get('/:id/groups', rbac('groups:read'), validate({ params: uuidParam }), controller.getGroups);
    router.post('/:id/assign-group', rbac('*'), validate({ params: uuidParam, body: assignGroupSchema }), controller.assignGroup);
    router.get('/:id/performance', rbac('coaches:read'), validate({ params: uuidParam }), controller.getPerformance);

    return router;
}

module.exports = coachesRoutes;
