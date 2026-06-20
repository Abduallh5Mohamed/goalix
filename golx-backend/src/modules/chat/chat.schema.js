const { z } = require("zod");

const uuid = z.string().uuid();

const createConversationSchema = z
  .object({
    type: z.enum([
      "admin_coach",
      "coach_player",
      "admin_player_session",
      "chat_group",
    ]),
    adminUserId: uuid.optional(),
    coachId: uuid.optional(),
    playerId: uuid.optional(),
    groupName: z.string().trim().min(2).max(120).optional(),
    memberUserIds: z.array(uuid).max(80).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.type === "admin_coach" && !data.coachId && !data.adminUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coachId"],
        message: "coachId or adminUserId is required for admin-coach chat",
      });
    }
    if (data.type === "coach_player" && !data.playerId && !data.coachId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["playerId"],
        message: "playerId or coachId is required for coach-player chat",
      });
    }
    if (data.type === "admin_player_session" && !data.playerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["playerId"],
        message: "playerId is required for player chat",
      });
    }
    if (data.type === "chat_group") {
      if (!data.groupName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["groupName"],
          message: "Group name is required",
        });
      }
      if (!data.memberUserIds?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["memberUserIds"],
          message: "Choose at least one group member",
        });
      }
    }
  });

const idParam = z.object({
  id: uuid,
});

const messageParam = z.object({
  id: uuid,
  messageId: uuid,
});

const messagesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
});

const messageBodySchema = z.object({
  body: z.string().trim().max(4000).optional().default(""),
});

const editMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

const deleteMessageQuery = z.object({
  scope: z.enum(["me", "everyone"]).default("everyone"),
});

module.exports = {
  createConversationSchema,
  deleteMessageQuery,
  editMessageSchema,
  idParam,
  messageParam,
  messageBodySchema,
  messagesQuery,
};
