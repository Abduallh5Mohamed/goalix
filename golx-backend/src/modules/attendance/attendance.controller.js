const ApiResponse = require('../../shared/api-response');
const { parsePagination, buildPaginationMeta } = require('../../shared/pagination');

class AttendanceController {
    constructor(attendanceService) {
        this.service = attendanceService;
    }

    listSessions = async (req, res, next) => {
        try {
            const { page, limit } = parsePagination(req.query);
            // Only pass schema-validated params (req.query is already stripped by validate middleware)
            const { groupId, coachId, status, dateFrom, dateTo } = req.query;
            const result = await this.service.listSessions(
                { groupId, coachId, status, dateFrom, dateTo, page, limit },
                req.user.academyId,
            );
            res.json(ApiResponse.paginated(result.data, buildPaginationMeta(result.total, page, limit)));
        } catch (err) { next(err); }
    };

    getSession = async (req, res, next) => {
        try {
            const session = await this.service.getSession(req.params.id, req.user.academyId);
            res.json(ApiResponse.success(session));
        } catch (err) { next(err); }
    };

    createSession = async (req, res, next) => {
        try {
            const session = await this.service.createSession(req.user.userId, req.user.academyId, req.body);
            res.status(201).json(ApiResponse.success(session));
        } catch (err) { next(err); }
    };

    updateStatus = async (req, res, next) => {
        try {
            const session = await this.service.updateSessionStatus(
                req.params.id, req.body.status, req.user.userId, req.user.academyId,
            );
            res.json(ApiResponse.success(session));
        } catch (err) { next(err); }
    };

    markAttendance = async (req, res, next) => {
        try {
            const result = await this.service.markAttendance(
                req.params.id, req.body.records, req.user.userId, req.user.academyId,
            );
            res.json(ApiResponse.success(result));
        } catch (err) { next(err); }
    };

    getSessionAttendance = async (req, res, next) => {
        try {
            const data = await this.service.getSessionAttendance(req.params.id, req.user.academyId);
            res.json(ApiResponse.success(data));
        } catch (err) { next(err); }
    };

    getOverview = async (req, res, next) => {
        try {
            const data = await this.service.getAttendanceOverview(req.query, req.user.academyId);
            res.json(ApiResponse.success(data));
        } catch (err) { next(err); }
    };
}

module.exports = AttendanceController;
