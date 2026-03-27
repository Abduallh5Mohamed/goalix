const ApiResponse = require('../../shared/api-response');
const { parsePagination, buildPaginationMeta } = require('../../shared/pagination');

class CoachesController {
    constructor(coachesService) {
        this.service = coachesService;
    }

    list = async (req, res, next) => {
        try {
            const { page, limit } = parsePagination(req.query);
            const result = await this.service.listCoaches(req.user.academyId, { page, limit });
            res.json(ApiResponse.paginated(result.data, buildPaginationMeta(result.total, page, limit)));
        } catch (err) { next(err); }
    };

    getById = async (req, res, next) => {
        try {
            const coach = await this.service.getCoach(req.params.id, req.user.academyId);
            res.json(ApiResponse.success(coach));
        } catch (err) { next(err); }
    };

    create = async (req, res, next) => {
        try {
            const coach = await this.service.createCoach(req.user.academyId, req.body);
            res.status(201).json(ApiResponse.success(coach));
        } catch (err) { next(err); }
    };

    update = async (req, res, next) => {
        try {
            const coach = await this.service.updateCoach(req.params.id, req.user.academyId, req.body);
            res.json(ApiResponse.success(coach));
        } catch (err) { next(err); }
    };

    remove = async (req, res, next) => {
        try {
            await this.service.deleteCoach(req.params.id, req.user.academyId);
            res.json(ApiResponse.success({ message: 'Coach deleted' }));
        } catch (err) { next(err); }
    };

    getGroups = async (req, res, next) => {
        try {
            await this.service.getCoach(req.params.id, req.user.academyId);
            const groups = await this.service.getCoachGroups(req.params.id);
            res.json(ApiResponse.success(groups));
        } catch (err) { next(err); }
    };

    assignGroup = async (req, res, next) => {
        try {
            const result = await this.service.assignGroup(req.params.id, req.user.academyId, req.body.groupId, req.body.role);
            res.status(201).json(ApiResponse.success(result));
        } catch (err) { next(err); }
    };

    getPerformance = async (req, res, next) => {
        try {
            await this.service.getCoach(req.params.id, req.user.academyId);
            const { page, limit } = parsePagination(req.query);
            const result = await this.service.getPerformance(req.params.id, { page, limit });
            res.json(ApiResponse.paginated(result.data, buildPaginationMeta(result.total, page, limit)));
        } catch (err) { next(err); }
    };
}

module.exports = CoachesController;
