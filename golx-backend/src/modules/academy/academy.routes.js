const { Router } = require('express');
const validate = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { rbac } = require('../../middleware/rbac.middleware');
const {
    uuidParam,
    createBranchSchema,
    updateBranchSchema,
    updateAcademySchema,
    createGroupSchema,
    updateGroupSchema,
    createBirthYearSchema,
} = require('./academy.schema');

function academyRoutes(controller) {
    const router = Router();

    // All academy routes require authentication
    router.use(authMiddleware);

    // Academy
    router.get('/', controller.getAcademy);
    router.put('/', rbac('*'), validate({ body: updateAcademySchema }), controller.updateAcademy);

    // Branches
    router.get('/branches', controller.getBranches);
    router.post('/branches', rbac('*'), validate({ body: createBranchSchema }), controller.createBranch);
    router.get('/branches/:id', validate({ params: uuidParam }), controller.getBranch);
    router.put('/branches/:id', rbac('*'), validate({ params: uuidParam, body: updateBranchSchema }), controller.updateBranch);
    router.delete('/branches/:id', rbac('*'), validate({ params: uuidParam }), controller.deleteBranch);

    // Groups by branch
    router.get('/branches/:id/groups', validate({ params: uuidParam }), controller.getGroupsByBranch);

    // Groups
    router.post('/groups', rbac('*'), validate({ body: createGroupSchema }), controller.createGroup);
    router.put('/groups/:id', rbac('*'), validate({ params: uuidParam, body: updateGroupSchema }), controller.updateGroup);
    router.delete('/groups/:id', rbac('*'), validate({ params: uuidParam }), controller.deleteGroup);

    // Birth Years
    router.get('/birth-years', controller.getBirthYears);
    router.post('/birth-years', rbac('*'), validate({ body: createBirthYearSchema }), controller.createBirthYear);

    return router;
}

module.exports = academyRoutes;
