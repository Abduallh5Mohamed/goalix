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
