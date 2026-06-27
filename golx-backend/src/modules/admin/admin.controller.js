const ApiResponse = require('../../shared/api-response');

class AdminController {
    constructor(adminService) {
        this.service = adminService;
    }

    getDashboard = async (req, res, next) => {
        try {
            const data = await this.service.getDashboard(req.user.academyId || null);
            res.json(ApiResponse.success(data));
        } catch (err) {
            next(err);
        }
    };

    getReportsOverview = async (req, res, next) => {
        try {
            const data = await this.service.getReportsOverview(
                req.user.academyId || null,
                req.query,
            );
            res.json(ApiResponse.success(data));
        } catch (err) {
            next(err);
        }
    };

    // ─── Pending Registrations ───────────────────────────────────────────

    getPendingRegistrations = async (req, res, next) => {
        try {
            const { status } = req.query;
            const academyId = req.user.academyId || null;
            const data = await this.service.getPendingRegistrations({ status, academyId });
            res.json(ApiResponse.success(data));
        } catch (err) {
            next(err);
        }
    };

    getAccessControl = async (req, res, next) => {
        try {
            const data = await this.service.getAccessControl(req.user.academyId || null);
            res.json(ApiResponse.success(data));
        } catch (err) {
            next(err);
        }
    };

    createAccessUser = async (req, res, next) => {
        try {
            const data = await this.service.createAccessUser(
                req.user.academyId || null,
                req.user.userId,
                req.body,
            );
            res.status(201).json(ApiResponse.success(data));
        } catch (err) {
            next(err);
        }
    };

    createRole = async (req, res, next) => {
        try {
            const role = await this.service.createRole(
                req.user.academyId || null,
                req.user.userId,
                req.body,
            );
            res.status(201).json(ApiResponse.success(role));
        } catch (err) {
            next(err);
        }
    };

    updateRole = async (req, res, next) => {
        try {
            const role = await this.service.updateRole(
                req.params.id,
                req.user.academyId || null,
                req.user.userId,
                req.body,
            );
            res.json(ApiResponse.success(role));
        } catch (err) {
            next(err);
        }
    };

    deleteRole = async (req, res, next) => {
        try {
            const result = await this.service.deleteRole(
                req.params.id,
                req.user.academyId || null,
                req.user.userId,
            );
            res.json(ApiResponse.success(result));
        } catch (err) {
            next(err);
        }
    };

    assignRoleToUser = async (req, res, next) => {
        try {
            const result = await this.service.assignRoleToUser(
                req.params.id,
                req.params.userId,
                req.user.academyId || null,
                req.user.userId,
            );
            res.json(ApiResponse.success(result));
        } catch (err) {
            next(err);
        }
    };

    revokeRoleFromUser = async (req, res, next) => {
        try {
            const result = await this.service.revokeRoleFromUser(
                req.params.id,
                req.params.userId,
                req.user.academyId || null,
                req.user.userId,
            );
            res.json(ApiResponse.success(result));
        } catch (err) {
            next(err);
        }
    };

    approveRegistration = async (req, res, next) => {
        try {
            const result = await this.service.approveRegistration(req.params.id, req.user.userId, req.ip, req.get('user-agent'));
            res.json(ApiResponse.success(result));
        } catch (err) {
            next(err);
        }
    };

    rejectRegistration = async (req, res, next) => {
        try {
            const { reason } = req.body;
            if (!reason || !reason.trim()) {
                return res.status(400).json(ApiResponse.error('Rejection reason is required'));
            }
            const result = await this.service.rejectRegistration(req.params.id, req.user.userId, reason.trim(), req.ip, req.get('user-agent'));
            res.json(ApiResponse.success(result));
        } catch (err) {
            next(err);
        }
    };
}

module.exports = AdminController;
