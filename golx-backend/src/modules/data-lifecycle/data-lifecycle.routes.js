const { Router } = require("express");
const { z } = require("zod");
const { authMiddleware } = require("../../middleware/auth.middleware");
const { rbac } = require("../../middleware/rbac.middleware");
const validate = require("../../middleware/validate.middleware");

const runSchema = z.object({
  dryRun: z.boolean().optional().default(false),
});

function dataLifecycleRoutes(controller) {
  const router = Router();
  router.use(authMiddleware, rbac("access_admin_dashboard"));

  router.get("/status", controller.status);
  router.post("/run", validate({ body: runSchema }), controller.run);

  return router;
}

module.exports = dataLifecycleRoutes;
