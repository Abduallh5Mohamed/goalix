const ApiResponse = require('../../shared/api-response');
const { parsePagination, buildPaginationMeta } = require('../../shared/pagination');

class AcademyController {
    constructor(academyService) {
        this.service = academyService;
    }

    // ─── Academy ────────────────────────────────────────────────────────
    getAcademy = async (req, res, next) => {
        try {
            const academy = await this.service.getAcademy(req.user.academyId);
            res.json(ApiResponse.success(academy));
        } catch (err) { next(err); }
    };

    updateAcademy = async (req, res, next) => {
        try {
            const academy = await this.service.updateAcademy(req.user.academyId, req.body);
            res.json(ApiResponse.success(academy));
        } catch (err) { next(err); }
    };

    // ─── Branches ───────────────────────────────────────────────────────
    getBranches = async (req, res, next) => {
        try {
            const { page, limit } = parsePagination(req.query);
            const result = await this.service.getBranches(req.user.academyId, { page, limit });
            res.json(ApiResponse.paginated(result.data, buildPaginationMeta(result.total, page, limit)));
        } catch (err) { next(err); }
    };

    getBranch = async (req, res, next) => {
        try {
            const branch = await this.service.getBranch(req.params.id, req.user.academyId);
            res.json(ApiResponse.success(branch));
        } catch (err) { next(err); }
    };

    createBranch = async (req, res, next) => {
        try {
            const branch = await this.service.createBranch(req.user.academyId, req.body);
            res.status(201).json(ApiResponse.success(branch));
        } catch (err) { next(err); }
    };

    updateBranch = async (req, res, next) => {
        try {
            const branch = await this.service.updateBranch(req.params.id, req.user.academyId, req.body);
            res.json(ApiResponse.success(branch));
        } catch (err) { next(err); }
    };

    deleteBranch = async (req, res, next) => {
        try {
            await this.service.deleteBranch(req.params.id, req.user.academyId);
            res.json(ApiResponse.success({ message: 'Branch deleted' }));
        } catch (err) { next(err); }
    };

    // ─── Groups ─────────────────────────────────────────────────────────
    getGroupsByBranch = async (req, res, next) => {
        try {
            const { page, limit } = parsePagination(req.query);
            const result = await this.service.getGroups(req.params.id, req.user.academyId, { page, limit });
            res.json(ApiResponse.paginated(result.data, buildPaginationMeta(result.total, page, limit)));
        } catch (err) { next(err); }
    };

    createGroup = async (req, res, next) => {
        try {
            const group = await this.service.createGroup(req.user.academyId, req.body);
            res.status(201).json(ApiResponse.success(group));
        } catch (err) { next(err); }
    };

    updateGroup = async (req, res, next) => {
        try {
            const group = await this.service.updateGroup(req.params.id, req.user.academyId, req.body);
            res.json(ApiResponse.success(group));
        } catch (err) { next(err); }
    };

    deleteGroup = async (req, res, next) => {
        try {
            await this.service.deleteGroup(req.params.id, req.user.academyId);
            res.json(ApiResponse.success({ message: 'Group deleted' }));
        } catch (err) { next(err); }
    };

    // ─── Birth Years ────────────────────────────────────────────────────
    getBirthYears = async (req, res, next) => {
        try {
            const branchId = req.query.branchId || req.params.branchId;
            const data = await this.service.getBirthYears(branchId, req.user.academyId);
            res.json(ApiResponse.success(data));
        } catch (err) { next(err); }
    };

    createBirthYear = async (req, res, next) => {
        try {
            const birthYear = await this.service.createBirthYear(req.body, req.user.academyId);
            res.status(201).json(ApiResponse.success(birthYear));
        } catch (err) { next(err); }
    };
}

module.exports = AcademyController;
