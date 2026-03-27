const { Router } = require('express');
const validate = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { rbac } = require('../../middleware/rbac.middleware');
const {
    uuidParam,
    createSessionSchema,
    updateSessionStatusSchema,
    batchAttendanceSchema,
    attendanceOverviewQuery,
    listSessionsQuery,
} = require('./attendance.schema');

function attendanceRoutes(controller) {
    const router = Router();
    router.use(authMiddleware);

    // Sessions
    router.get('/sessions', rbac('sessions:read'), validate({ query: listSessionsQuery }), controller.listSessions);
    router.post('/sessions', rbac('sessions:write'), validate({ body: createSessionSchema }), controller.createSession);
    router.get('/sessions/:id', rbac('sessions:read'), validate({ params: uuidParam }), controller.getSession);
    router.patch('/sessions/:id/status', rbac('sessions:write'), validate({ params: uuidParam, body: updateSessionStatusSchema }), controller.updateStatus);

    // Attendance marking
    router.patch('/sessions/:id/attendance', rbac('attendance:write'), validate({ params: uuidParam, body: batchAttendanceSchema }), controller.markAttendance);
    router.get('/sessions/:id/attendance', rbac('attendance:read'), validate({ params: uuidParam }), controller.getSessionAttendance);

    // Overview & reports
    router.get('/overview', rbac('attendance:read'), validate({ query: attendanceOverviewQuery }), controller.getOverview);

    return router;
}

module.exports = attendanceRoutes;
