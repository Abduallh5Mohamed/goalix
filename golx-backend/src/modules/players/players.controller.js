const ApiResponse = require("../../shared/api-response");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../shared/pagination");

class PlayersController {
  constructor(playersService) {
    this.service = playersService;
  }

  list = async (req, res, next) => {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await this.service.listPlayers(req.user, {
        ...req.query,
        page,
        limit,
      });
      res.json(
        ApiResponse.paginated(
          result.data,
          buildPaginationMeta(result.total, page, limit),
        ),
      );
    } catch (err) {
      next(err);
    }
  };

  getById = async (req, res, next) => {
    try {
      const player = await this.service.getPlayer(req.params.id, req.user);
      res.json(ApiResponse.success(player));
    } catch (err) {
      next(err);
    }
  };

  getSummary = async (req, res, next) => {
    try {
      const summary = await this.service.getPlayerSummary(
        req.params.id,
        req.user,
      );
      res.json(ApiResponse.success(summary));
    } catch (err) {
      next(err);
    }
  };

  create = async (req, res, next) => {
    try {
      const player = await this.service.createPlayer(
        req.user.academyId,
        req.body,
        req.user,
      );
      res.status(201).json(ApiResponse.success(player));
    } catch (err) {
      next(err);
    }
  };

  update = async (req, res, next) => {
    try {
      const player = await this.service.updatePlayer(
        req.params.id,
        req.user.academyId,
        req.body,
        req.user,
      );
      res.json(ApiResponse.success(player));
    } catch (err) {
      next(err);
    }
  };

  remove = async (req, res, next) => {
    try {
      await this.service.deletePlayer(req.params.id, req.user.academyId);
      res.json(ApiResponse.success({ message: "Player deleted" }));
    } catch (err) {
      next(err);
    }
  };

  hardRemove = async (req, res, next) => {
    try {
      await this.service.hardDeletePlayer(req.params.id, req.user.academyId);
      res.json(ApiResponse.success({ message: "Player permanently deleted" }));
    } catch (err) {
      next(err);
    }
  };

  // ─── Measurements ──────────────────────────────────────────────────
  getMeasurements = async (req, res, next) => {
    try {
      // Verify player belongs to requester's academy before exposing sub-resources
      await this.service.getPlayer(req.params.id, req.user);
      const { page, limit } = parsePagination(req.query);
      const result = await this.service.getMeasurements(req.params.id, {
        page,
        limit,
      });
      res.json(
        ApiResponse.paginated(
          result.data,
          buildPaginationMeta(result.total, page, limit),
        ),
      );
    } catch (err) {
      next(err);
    }
  };

  addMeasurement = async (req, res, next) => {
    try {
      await this.service.getPlayer(req.params.id, req.user);
      const coachId = req.user.userId;
      const m = await this.service.addMeasurement(
        req.params.id,
        coachId,
        req.body,
      );
      res.status(201).json(ApiResponse.success(m));
    } catch (err) {
      next(err);
    }
  };

  // ─── Injuries ──────────────────────────────────────────────────────
  getInjuries = async (req, res, next) => {
    try {
      await this.service.getPlayer(req.params.id, req.user);
      const { page, limit } = parsePagination(req.query);
      const result = await this.service.getInjuries(req.params.id, {
        page,
        limit,
      });
      res.json(
        ApiResponse.paginated(
          result.data,
          buildPaginationMeta(result.total, page, limit),
        ),
      );
    } catch (err) {
      next(err);
    }
  };

  addInjury = async (req, res, next) => {
    try {
      await this.service.getPlayer(req.params.id, req.user);
      const coachId = req.user.userId;
      const injury = await this.service.addInjury(
        req.params.id,
        coachId,
        req.body,
      );
      res.status(201).json(ApiResponse.success(injury));
    } catch (err) {
      next(err);
    }
  };
}

module.exports = PlayersController;
