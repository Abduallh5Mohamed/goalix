const { z } = require("zod");

const uuidParam = z.object({ id: z.string().uuid() });
const groupParam = z.object({ groupId: z.string().uuid() });
const sessionParam = z.object({ sessionId: z.string().uuid() });
const assignmentParam = z.object({ assignmentId: z.string().uuid() });
const playerAssignmentSubmissionParam = assignmentParam.extend({ submissionId: z.string().uuid() });

const coachRoleSchema = z.enum([
  "head_coach",
  "assistant_coach",
  "goalkeeping_coach",
  "fitness_coach",
  "technical_coach",
  "tactical_coach",
  "goalkeeping_assistant",
  "performance_analyst",
  "team_manager",
  "physiotherapist",
  "rehabilitation_coach",
  "scout",
  "academy_director",
  "youth_coach",
  "conditioning_coach",
]);

const createCoachSchema = z.object({
  userId: z.string().uuid(),
  branchId: z.string().uuid({ message: "Branch is required" }),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Valid email is required").max(255),
  phone: z.string().trim().min(8, "Phone is required").max(30),
  role: coachRoleSchema,
  bio: z.string().trim().max(2000).nullable().optional(),
  image: z.string().trim().max(2000).nullable().optional(),
  branchIds: z.array(z.string().uuid()).max(50).optional(),
  specialization: z.string().max(100).optional(),
  photoUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://") || u.startsWith("http://"), {
      message: "Photo URL must use HTTP or HTTPS",
    })
    .optional(),
  fullName: z.string().min(2).max(100).optional(),
});

const updateCoachSchema = z.object({
  branchId: z.string().uuid().optional(),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(255).optional(),
  phone: z.string().trim().min(8).max(30).optional(),
  role: coachRoleSchema.optional(),
  isActive: z.boolean().optional(),
  image: z.string().trim().max(2000).nullable().optional(),
  branchIds: z.array(z.string().uuid()).max(50).optional(),
  specialization: z.string().max(100).optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  photoUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://") || u.startsWith("http://"), {
      message: "Photo URL must use HTTP or HTTPS",
    })
    .optional(),
  fullName: z.string().min(2).max(100).optional(),
});

const groupAssignmentRoleSchema = coachRoleSchema;

const assignGroupSchema = z.object({
  groupId: z.string().uuid(),
  role: groupAssignmentRoleSchema.default("assistant_coach"),
});

const coachAccessQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

const coachAccessBranchParam = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
});

const coachAccessSchema = z
  .object({
    branchId: z.string().uuid(),
    accessType: z.enum(["groups", "birth_years", "both"]).optional(),
    role: groupAssignmentRoleSchema.default("assistant_coach"),
    allGroups: z.boolean().default(false),
    allBirthYears: z.boolean().default(false),
    groupIds: z.array(z.string().uuid()).max(300).default([]),
    birthYearIds: z.array(z.string().uuid()).max(100).default([]),
  })
  .superRefine((data, ctx) => {
    const hasGroupAccess = data.allGroups || data.groupIds.length > 0;
    const hasBirthYearAccess =
      data.allBirthYears || data.birthYearIds.length > 0;

    if (!hasGroupAccess && !hasBirthYearAccess) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groupIds"],
        message: "Select at least one group or birth year access option",
      });
    }
  });

const createCoachGroupSchema = z
  .object({
    branchId: z.string().uuid(),
    birthYearIds: z.array(z.string().uuid()).min(1).max(20).optional(),
    birthYearId: z.string().uuid().optional(),
    playerIds: z.array(z.string().uuid()).max(200).optional(),
    name: z.string().min(1).max(50),
    maxPlayers: z.number().int().positive().max(100).default(25),
  })
  .refine((data) => data.birthYearIds?.length || data.birthYearId, {
    message: "At least one birth year is required",
    path: ["birthYearIds"],
  });

const updateCoachGroupSchema = z.object({
  birthYearIds: z.array(z.string().uuid()).min(1).max(20).optional(),
  birthYearId: z.string().uuid().optional(),
  playerIds: z.array(z.string().uuid()).max(200).optional(),
  name: z.string().min(1).max(50).optional(),
  maxPlayers: z.number().int().positive().max(100).optional(),
});

const coachSessionsQuery = z.object({
  groupId: z.string().uuid().optional(),
  status: z.enum(["scheduled", "active", "completed", "cancelled"]).optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const attendanceStatusSchema = z.enum(["present", "absent", "late", "excused"]);

const coachAttendanceSchema = z.object({
  records: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        status: attendanceStatusSchema,
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1),
});

const coachMeasurementsSchema = z.object({
  records: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        heightCm: z.number().positive().max(250).optional(),
        weightKg: z.number().positive().max(200).optional(),
        sprintSpeed: z.number().positive().optional(),
        stamina: z.number().min(0).max(100).optional(),
        flexibility: z.number().min(0).max(100).optional(),
        notes: z.string().max(500).optional(),
        measuredAt: z.string().date().optional(),
      }),
    )
    .min(1),
});

const coachEvaluationSchema = z.object({
  playerId: z.string().uuid(),
  groupId: z.string().uuid().optional(),
  technicalScore: z.number().min(0).max(10),
  tacticalScore: z.number().min(0).max(10),
  physicalScore: z.number().min(0).max(10),
  mentalScore: z.number().min(0).max(10),
  notes: z.string().max(2000).optional(),
});

const createCoachBirthYearSchema = z
  .object({
    branchId: z.string().uuid(),
    fromYear: z.number().int().min(2000).max(2030),
    toYear: z.number().int().min(2000).max(2030),
    label: z.string().max(50).optional(),
  })
  .refine((data) => data.fromYear <= data.toYear, {
    message: "fromYear must be less than or equal to toYear",
    path: ["toYear"],
  });

const assignmentFileSchema = z
  .object({
    fileType: z.enum(["pdf", "word", "image"]),
    fileName: z.string().min(1).max(255),
    fileUrl: z.string().min(1).max(2000),
    mimeType: z.string().max(100).optional(),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(25 * 1024 * 1024)
      .optional(),
  })
  .superRefine((file, ctx) => {
    const name = file.fileName.toLowerCase();
    const mime = (file.mimeType || "").toLowerCase();
    if (
      file.fileType === "pdf" &&
      !name.endsWith(".pdf") &&
      mime !== "application/pdf"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PDF assignment files must be PDF documents.",
      });
    }
    if (file.fileType === "image") {
      const imageName = /\.(png|jpe?g|webp)$/i.test(name);
      const imageMime = mime.startsWith("image/");
      if (!imageName && !imageMime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Image assignment files must be PNG, JPG, JPEG, or WEBP.",
        });
      }
    }
    if (file.fileType === "word") {
      const wordName = /\.(docx?|DOCX?)$/i.test(name);
      const wordMime =
        mime === "application/msword" ||
        mime ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      if (!wordName && !wordMime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Word assignment files must be DOC or DOCX documents.",
        });
      }
    }
  });

const assignmentQuerySchema = z.object({
  coachId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  status: z
    .enum(["assigned", "in_progress", "submitted", "reviewed", "cancelled"])
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const playerAssignmentQuerySchema = z.object({
  status: z.enum(["active", "closed", "cancelled"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const createCoachAssignmentSchema = z.object({
  coachId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  title: z.string().min(2).max(255),
  description: z.string().max(3000).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  adminNotes: z.string().max(2000).optional(),
  attachments: z.array(assignmentFileSchema).max(8).optional(),
});

const submitCoachAssignmentSchema = z.object({
  coachNotes: z.string().max(2000).optional(),
  files: z.array(assignmentFileSchema).min(1).max(8),
});

const playerAssignmentBaseSchema = z.object({
  title: z.string().min(2).max(255),
  description: z.string().max(3000).optional(),
  openAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)).optional(),
  dueAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)).optional(),
  targetType: z.enum(["group", "birth_year"]).default("group"),
  groupIds: z.array(z.string().uuid()).max(50).default([]),
  birthYearIds: z.array(z.string().uuid()).max(50).default([]),
});

const validatePlayerAssignmentTarget = (data, ctx) => {
  if (data.targetType === "birth_year") {
    if (!data.birthYearIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one target birthday.",
        path: ["birthYearIds"],
      });
    }
    return;
  }
  if (!data.groupIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select at least one target group.",
      path: ["groupIds"],
    });
  }
};

const playerAssignmentSchema = playerAssignmentBaseSchema.superRefine(validatePlayerAssignmentTarget);

const updatePlayerAssignmentSchema = playerAssignmentBaseSchema
  .partial()
  .extend({
    status: z.enum(["active", "closed", "cancelled"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.targetType !== undefined || data.groupIds !== undefined || data.birthYearIds !== undefined) {
      validatePlayerAssignmentTarget(
        {
          ...data,
          targetType: data.targetType || "group",
          groupIds: data.groupIds || [],
          birthYearIds: data.birthYearIds || [],
        },
        ctx,
      );
    }
  });

const reviewPlayerAssignmentSubmissionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  comment: z.string().trim().max(3000).optional(),
});

module.exports = {
  uuidParam,
  groupParam,
  sessionParam,
  assignmentParam,
  playerAssignmentSubmissionParam,
  createCoachSchema,
  updateCoachSchema,
  assignGroupSchema,
  coachAccessQuerySchema,
  coachAccessBranchParam,
  coachAccessSchema,
    createCoachGroupSchema,
    updateCoachGroupSchema,
  coachSessionsQuery,
  coachAttendanceSchema,
  coachMeasurementsSchema,
  coachEvaluationSchema,
  createCoachBirthYearSchema,
  coachRoleSchema,
  assignmentQuerySchema,
  playerAssignmentQuerySchema,
  createCoachAssignmentSchema,
  submitCoachAssignmentSchema,
  playerAssignmentSchema,
  updatePlayerAssignmentSchema,
  reviewPlayerAssignmentSubmissionSchema,
};
