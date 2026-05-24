const { Router } = require("express");
const multer = require("multer");
const validate = require("../../middleware/validate.middleware");
const { authMiddleware } = require("../../middleware/auth.middleware");
const { rbac, rbacAny } = require("../../middleware/rbac.middleware");
const {
  uuidParam,
  createPlayerSchema,
  updatePlayerSchema,
  listPlayersQuery,
  addMeasurementSchema,
  addInjurySchema,
} = require("./players.schema");

function playersRoutes(controller) {
  const router = Router();
  const playerImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (
        ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(
          file.mimetype,
        )
      ) {
        return cb(null, true);
      }
      return cb(new Error("Only PNG, JPG, JPEG, and WEBP images are allowed."));
    },
  }).single("image");
  const handlePlayerImageUpload = (req, res, next) => {
    playerImageUpload(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        return res
          .status(400)
          .json({
            success: false,
            error: { code: "UPLOAD_ERROR", message: err.message },
          });
      }
      return res
        .status(400)
        .json({
          success: false,
          error: { code: "UPLOAD_ERROR", message: err.message },
        });
    });
  };

  router.use(authMiddleware);

  router.get(
    "/",
    rbac("players:read"),
    validate({ query: listPlayersQuery }),
    controller.list,
  );
  router.post(
    "/",
    rbacAny("manage_players", "manage_training_sessions"),
    validate({ body: createPlayerSchema }),
    controller.create,
  );
  router.post(
    "/images",
    rbacAny("manage_players", "manage_training_sessions"),
    handlePlayerImageUpload,
    controller.uploadPlayerImage,
  );
  router.get(
    "/:id",
    rbac("players:read"),
    validate({ params: uuidParam }),
    controller.getById,
  );
  router.put(
    "/:id",
    rbac("players:write"),
    validate({ params: uuidParam, body: updatePlayerSchema }),
    controller.update,
  );
  router.delete(
    "/:id/hard-delete",
    rbac("manage_players"),
    validate({ params: uuidParam }),
    controller.hardRemove,
  );
  router.delete(
    "/:id",
    rbac("manage_players"),
    validate({ params: uuidParam }),
    controller.remove,
  );

  router.get(
    "/:id/summary",
    rbac("players:read"),
    validate({ params: uuidParam }),
    controller.getSummary,
  );

  // Measurements
  router.get(
    "/:id/measurements",
    rbac("measurements:read"),
    validate({ params: uuidParam }),
    controller.getMeasurements,
  );
  router.post(
    "/:id/measurements",
    rbac("measurements:write"),
    validate({ params: uuidParam, body: addMeasurementSchema }),
    controller.addMeasurement,
  );

  // Injuries
  router.get(
    "/:id/injuries",
    rbac("players:read"),
    validate({ params: uuidParam }),
    controller.getInjuries,
  );
  router.post(
    "/:id/injuries",
    rbac("players:write"),
    validate({ params: uuidParam, body: addInjurySchema }),
    controller.addInjury,
  );

  return router;
}

module.exports = playersRoutes;
