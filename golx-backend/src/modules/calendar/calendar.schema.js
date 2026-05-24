const { z } = require("zod");

const uuid = z.string().uuid();
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date format: YYYY-MM-DD");
const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time format: HH:mm");
const dateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/));

const eventTypeSchema = z.enum([
  "training",
  "match",
  "fitness_test",
  "meeting",
  "rest_day",
  "tournament",
  "medical_check",
  "assessment_day",
]);
const eventStatusSchema = z.enum([
  "scheduled",
  "completed",
  "finished",
  "cancelled",
  "postponed",
]);
const eventVisibilitySchema = z.enum([
  "all_assigned_groups",
  "selected_groups",
  "coaches_only",
]);
const matchTypeSchema = z.enum([
  "official",
  "friendly",
  "training",
  "training_match",
]);
const venueTypeSchema = z.enum(["home", "away", "neutral"]);
const matchCoreStatusSchema = z.enum([
  "scheduled",
  "postponed",
  "cancelled",
  "finished",
]);
const matchLiveStatusSchema = z.enum([
  "scheduled",
  "first_half",
  "second_half",
  "finished",
]);
const squadRoleSchema = z.enum(["starter", "substitute", "reserve"]);
const eventAttendanceStatusSchema = z.enum([
  "present",
  "absent",
  "late",
  "excused",
  "injured",
]);
const matchAttendanceStatusSchema = z.enum([
  "present",
  "absent",
  "late",
  "injured",
]);
const evaluationVisibilitySchema = z.enum([
  "private",
  "player_and_parent",
  "admin_only",
]);
const trainingFocusSchema = z.enum([
  "passing",
  "shooting",
  "dribbling",
  "ball_control",
  "crossing",
  "finishing",
  "attacking",
  "defense",
  "pressing",
  "transition",
  "possession",
  "speed",
  "agility",
  "strength",
  "endurance",
  "fitness",
  "recovery",
  "mentality",
  "vision",
  "decision_making",
  "goalkeeper",
  "set_pieces",
  "technical",
  "tactics",
  "physical",
]);
const intensitySchema = z.enum(["low", "medium", "high"]);
const opponentLevelSchema = z.enum(["weak", "medium", "strong"]);
const optionFieldSchema = z.enum([
  "position",
  "secondary_position",
  "playing_style",
]);

const idParam = z.object({ id: uuid });
const matchParam = z.object({ matchId: uuid });
const matchIncidentParam = z.object({ matchId: uuid, incidentId: uuid });
const matchGoalParam = z.object({ matchId: uuid, goalId: uuid });
const matchSubstitutionParam = z.object({
  matchId: uuid,
  substitutionId: uuid,
});
const eventParam = z.object({ eventId: uuid });
const eventPlayerParam = z.object({ eventId: uuid, playerId: uuid });
const childParam = z.object({ childId: uuid });
const childMatchParam = z.object({ childId: uuid, matchId: uuid });
const playerMatchParam = z.object({ id: uuid });
const squadPlayerParam = z.object({ matchId: uuid, playerId: uuid });
const statsPlayerParam = z.object({ matchId: uuid, playerId: uuid });
const optionParam = z.object({ optionId: uuid });
const evaluationParam = z.object({ id: uuid });
const coachGroupAssignmentParam = z.object({ id: uuid });

const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

const coachPlayersQuery = paginationQuery.extend({
  customFieldId: uuid.optional(),
  customValue: z.string().max(255).optional(),
  customOptionId: uuid.optional(),
});

const calendarFiltersQuery = paginationQuery.extend({
  groupId: uuid.optional(),
  eventType: eventTypeSchema.optional(),
  status: eventStatusSchema.optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
});

const adminMatchFiltersQuery = paginationQuery.extend({
  teamId: uuid.optional(),
  ageGroupId: uuid.optional(),
  groupId: uuid.optional(),
  matchType: matchTypeSchema.optional(),
  status: matchCoreStatusSchema.optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
});

const adminCalendarEventBaseSchema = z.object({
  title: z.string().min(2).max(255),
  eventType: eventTypeSchema,
  startDatetime: dateTimeSchema,
  endDatetime: dateTimeSchema,
  location: z.string().max(255).optional(),
  status: eventStatusSchema.default("scheduled"),
  visibility: eventVisibilitySchema.default("selected_groups"),
  groupIds: z.array(uuid).min(1).max(50).optional(),
  notes: z.string().max(3000).optional(),
});

const adminCalendarEventSchema = adminCalendarEventBaseSchema.superRefine(
  (data, ctx) => {
    if (
      data.visibility !== "coaches_only" &&
      (!data.groupIds || data.groupIds.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groupIds"],
        message: "At least one group is required.",
      });
    }
  },
);

const updateAdminCalendarEventSchema = adminCalendarEventBaseSchema.partial();

const adminMatchBaseSchema = z.object({
  teamId: uuid.optional(),
  ageGroupId: uuid.optional(),
  groupIds: z.array(uuid).max(50).optional(),
  birthYearIds: z.array(uuid).max(50).optional(),
  opponentName: z.string().min(2).max(255),
  matchType: matchTypeSchema,
  matchDate: dateSchema,
  matchTime: timeSchema,
  location: z.string().min(1).max(255),
  venueType: venueTypeSchema,
  refereeName: z.string().max(255).optional(),
  status: matchCoreStatusSchema.default("scheduled"),
  organizerNotes: z.string().max(3000).optional(),
  matchNotes: z.string().max(3000).optional(),
  ourScore: z.number().int().min(0).max(99).optional(),
  opponentScore: z.number().int().min(0).max(99).optional(),
});

const adminMatchSchema = adminMatchBaseSchema.extend({
  coachId: uuid,
});

const adminCoachMatchRequestSchema = adminMatchBaseSchema
  .omit({
    teamId: true,
    ageGroupId: true,
    groupIds: true,
    birthYearIds: true,
  })
  .extend({
    coachId: uuid,
  });

const coachResolveAdminMatchRequestSchema = z
  .object({
    groupId: uuid.optional(),
    birthYearId: uuid.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.groupId && !data.birthYearId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groupId"],
        message: "Select a group or birthday.",
      });
    }
    if (data.groupId && data.birthYearId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groupId"],
        message: "Select either a group or a birthday, not both.",
      });
    }
  });

const updateAdminMatchSchema = adminMatchBaseSchema
  .partial()
  .superRefine((data, ctx) => {
    if ("opponentName" in data && !data.opponentName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["opponentName"],
        message: "Opponent name is required.",
      });
    }
  });

const adminPostponeMatchSchema = z.object({
  matchDate: dateSchema,
  matchTime: timeSchema,
  location: z.string().max(255).nullable().optional(),
  reason: z.string().max(3000).optional(),
});

const matchStatusSchema = z.object({
  status: matchCoreStatusSchema,
});

const coachTrainingEventBaseSchema = z.object({
  title: z.string().min(2).max(255),
  targetType: z.enum([
    "specific_group",
    "multiple_groups",
    "specific_groups",
    "all_my_assigned_groups",
  ]).optional(),
  groupIds: z.array(uuid).max(50).optional(),
  birthYearIds: z.array(uuid).max(50).optional(),
  playerIds: z.array(uuid).max(300).optional(),
  allGroups: z.boolean().optional(),
  allBirthYears: z.boolean().optional(),
  allPlayers: z.boolean().optional(),
  date: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  location: z.string().max(255).optional(),
  trainingFocus: trainingFocusSchema,
  intensityLevel: intensitySchema.default("medium"),
  objectives: z.string().max(3000).optional(),
  sessionPlan: z.string().max(5000).optional(),
  equipmentNeeded: z.string().max(2000).optional(),
  notes: z.string().max(3000).optional(),
});

const coachTrainingEventSchema = coachTrainingEventBaseSchema.superRefine(
  (data, ctx) => {
    const hasGroups =
      data.allGroups ||
      data.targetType === "all_my_assigned_groups" ||
      Boolean(data.groupIds?.length);
    const hasBirthYears = data.allBirthYears || Boolean(data.birthYearIds?.length);
    const hasPlayers = data.allPlayers || Boolean(data.playerIds?.length);
    if (!hasGroups && !hasBirthYears && !hasPlayers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groupIds"],
        message: "Select at least one group, birthday, or player.",
      });
    }
  },
);

const updateCoachTrainingEventSchema = coachTrainingEventBaseSchema.partial();

const trainingStatusSchema = z.object({
  status: eventStatusSchema,
});

const trainingExtendSchema = z.object({
  minutes: z.number().int().min(1).max(60),
});

const attendanceRecordsSchema = z.object({
  records: z
    .array(
      z.object({
        playerId: uuid,
        status: eventAttendanceStatusSchema,
        arrivalTime: timeSchema.optional(),
        reason: z.string().max(500).optional(),
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(200),
});

const updateEventAttendanceSchema = z.object({
  status: eventAttendanceStatusSchema.optional(),
  arrivalTime: timeSchema.optional(),
  reason: z.string().max(500).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

const evaluationRecordsSchema = z.object({
  records: z
    .array(
      z.object({
        playerId: uuid,
        overallRating: z.number().min(0).max(10).optional(),
        technicalRating: z.number().min(0).max(10).optional(),
        tacticalRating: z.number().min(0).max(10).optional(),
        physicalRating: z.number().min(0).max(10).optional(),
        mentalityRating: z.number().min(0).max(10).optional(),
        disciplineRating: z.number().min(0).max(10).optional(),
        teamworkRating: z.number().min(0).max(10).optional(),
        impactRating: z.number().min(0).max(10).optional(),
        ballControlRating: z.number().min(0).max(10).optional(),
        passingAccuracyRating: z.number().min(0).max(10).optional(),
        shootingRating: z.number().min(0).max(10).optional(),
        dribblingRating: z.number().min(0).max(10).optional(),
        receivingUnderPressureRating: z.number().min(0).max(10).optional(),
        speedRating: z.number().min(0).max(10).optional(),
        enduranceRating: z.number().min(0).max(10).optional(),
        strengthRating: z.number().min(0).max(10).optional(),
        agilityRating: z.number().min(0).max(10).optional(),
        strengths: z.string().max(2000).optional(),
        weaknesses: z.string().max(2000).optional(),
        coachNotes: z.string().max(3000).optional(),
        improvementPlan: z.string().max(3000).optional(),
        developmentNotes: z.string().max(3000).optional(),
        visibility: evaluationVisibilitySchema.default("player_and_parent"),
      }),
    )
    .min(1)
    .max(200),
});

const updateEvaluationSchema = z.object({
  overallRating: z.number().min(0).max(10).optional(),
  technicalRating: z.number().min(0).max(10).optional(),
  tacticalRating: z.number().min(0).max(10).optional(),
  physicalRating: z.number().min(0).max(10).optional(),
  mentalityRating: z.number().min(0).max(10).optional(),
  disciplineRating: z.number().min(0).max(10).optional(),
  teamworkRating: z.number().min(0).max(10).optional(),
  impactRating: z.number().min(0).max(10).optional(),
  ballControlRating: z.number().min(0).max(10).optional(),
  passingAccuracyRating: z.number().min(0).max(10).optional(),
  shootingRating: z.number().min(0).max(10).optional(),
  dribblingRating: z.number().min(0).max(10).optional(),
  receivingUnderPressureRating: z.number().min(0).max(10).optional(),
  speedRating: z.number().min(0).max(10).optional(),
  enduranceRating: z.number().min(0).max(10).optional(),
  strengthRating: z.number().min(0).max(10).optional(),
  agilityRating: z.number().min(0).max(10).optional(),
  strengths: z.string().max(2000).nullable().optional(),
  weaknesses: z.string().max(2000).nullable().optional(),
  coachNotes: z.string().max(3000).nullable().optional(),
  improvementPlan: z.string().max(3000).nullable().optional(),
  developmentNotes: z.string().max(3000).nullable().optional(),
  visibility: evaluationVisibilitySchema.optional(),
});

const squadEntrySchema = z.object({
  playerId: uuid,
  squadRole: squadRoleSchema,
  position: z.string().max(50).optional(),
  shirtNumber: z.number().int().min(1).max(99).optional(),
  playerInstruction: z.string().max(1000).optional(),
});

const squadSchema = z.union([
  squadEntrySchema,
  z.object({ players: z.array(squadEntrySchema).min(1).max(40) }),
]);

const updateSquadSchema = z.object({
  squadRole: squadRoleSchema.optional(),
  position: z.string().max(50).nullable().optional(),
  shirtNumber: z.number().int().min(1).max(99).nullable().optional(),
  playerInstruction: z.string().max(1000).nullable().optional(),
});

const tacticsSchema = z.object({
  formation: z.string().min(3).max(20),
  tacticalNotes: z.string().max(5000).optional(),
});

const matchTargetSchema = z
  .object({
    groupId: uuid.optional(),
    birthYearId: uuid.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.groupId && !data.birthYearId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groupId"],
        message: "Select a group or birthday.",
      });
    }
    if (data.groupId && data.birthYearId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groupId"],
        message: "Select either a group or a birthday, not both.",
      });
    }
  });

const matchLiveStatusUpdateSchema = z.object({
  matchStatus: matchLiveStatusSchema,
  firstHalfStoppageMinutes: z.number().int().min(0).max(30).optional(),
  secondHalfStoppageMinutes: z.number().int().min(0).max(30).optional(),
});

const matchIncidentSchema = z
  .object({
    playerId: uuid,
    incidentType: z.enum(["yellow_card", "red_card", "injury"]),
    minute: z.number().int().min(0).max(130).optional(),
    bodyPart: z.string().min(1).max(100).optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.incidentType === "injury" && !data.bodyPart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bodyPart"],
        message: "Body part is required for injuries.",
      });
    }
  });

const matchGoalSchema = z
  .object({
    team: z.enum(["our", "opponent"]).default("our"),
    scorerPlayerId: uuid.optional(),
    assistPlayerId: uuid.optional(),
    minute: z.number().int().min(0).max(130).optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.team === "our" && !data.scorerPlayerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scorerPlayerId"],
        message: "Scorer is required for our goals.",
      });
    }
    if (
      data.scorerPlayerId &&
      data.assistPlayerId &&
      data.scorerPlayerId === data.assistPlayerId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assistPlayerId"],
        message: "Assist player must be different from scorer.",
      });
    }
  });

const matchSubstitutionSchema = z
  .object({
    outPlayerId: uuid,
    inPlayerId: uuid,
    minute: z.number().int().min(0).max(130).optional(),
    reason: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.outPlayerId === data.inPlayerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inPlayerId"],
        message: "Substitution players must be different.",
      });
    }
  });

const matchAttendanceRecordsSchema = z.object({
  records: z
    .array(
      z.object({
        playerId: uuid,
        status: matchAttendanceStatusSchema,
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(40),
});

const statEntrySchema = z.object({
  playerId: uuid,
  minutesPlayed: z.number().int().min(0).max(130).default(0),
  goals: z.number().int().min(0).max(30).default(0),
  assists: z.number().int().min(0).max(30).default(0),
  passesCompleted: z.number().int().min(0).max(500).default(0),
  passAccuracyPercentage: z.number().min(0).max(100).optional(),
  shotsTotal: z.number().int().min(0).max(100).default(0),
  shotsOnTarget: z.number().int().min(0).max(100).default(0),
  keyPasses: z.number().int().min(0).max(100).default(0),
  tackles: z.number().int().min(0).max(100).default(0),
  defensiveTackles: z.number().int().min(0).max(100).default(0),
  interceptions: z.number().int().min(0).max(100).default(0),
  duelsWon: z.number().int().min(0).max(100).default(0),
  duelsLost: z.number().int().min(0).max(100).default(0),
  possessionLosses: z.number().int().min(0).max(100).default(0),
  saves: z.number().int().min(0).max(100).default(0),
  yellowCards: z.number().int().min(0).max(2).default(0),
  redCards: z.number().int().min(0).max(1).default(0),
  fouls: z.number().int().min(0).max(100).default(0),
  injuries: z.string().max(1000).optional(),
  performanceRating: z.number().min(0).max(10).optional(),
  technicalRating: z.number().min(0).max(10).optional(),
  tacticalRating: z.number().min(0).max(10).optional(),
  physicalRating: z.number().min(0).max(10).optional(),
  mentalityRating: z.number().min(0).max(10).optional(),
  decisionMakingRating: z.number().min(0).max(10).optional(),
  workRateRating: z.number().min(0).max(10).optional(),
  positioningRating: z.number().min(0).max(10).optional(),
  strengths: z.string().max(2000).optional(),
  weaknesses: z.string().max(2000).optional(),
  improvementPlan: z.string().max(3000).optional(),
  coachNotes: z.string().max(3000).optional(),
});

const playerStatsSchema = z.union([
  statEntrySchema,
  z.object({
    records: z.array(statEntrySchema).min(1).max(40),
    finalize: z.boolean().optional(),
  }),
]);

const updatePlayerStatsSchema = statEntrySchema
  .omit({ playerId: true })
  .partial();

const friendlyRequestSchema = z.object({
  teamId: uuid.optional(),
  ageGroupId: uuid.optional(),
  birthYearId: uuid.optional(),
  preferredDate: dateSchema,
  preferredTime: timeSchema,
  opponentLevel: opponentLevelSchema,
  suggestedOpponentName: z.string().max(255).optional(),
  reason: z.string().min(2).max(3000),
  notes: z.string().max(3000).optional(),
});

const rejectFriendlyRequestSchema = z.object({
  adminResponse: z.string().min(2).max(3000),
});

const approveFriendlyRequestSchema = z.object({
  adminResponse: z.string().max(3000).optional(),
});

const convertFriendlyRequestSchema = adminMatchBaseSchema
  .pick({
    location: true,
    venueType: true,
    refereeName: true,
    organizerNotes: true,
  })
  .partial();

const optionSchema = z.object({
  fieldKey: optionFieldSchema,
  label: z.string().min(1).max(120),
  value: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
});

const updateOptionSchema = optionSchema.partial();

const optionQuery = z.object({
  fieldKey: optionFieldSchema.optional(),
});

const coachGroupAssignmentSchema = z.object({
  coachId: uuid,
  groupId: uuid,
  role: z.enum(["head", "assistant", "goalkeeping"]).default("head"),
  canCreateTraining: z.boolean().default(true),
  canTakeAttendance: z.boolean().default(true),
  canEvaluatePlayers: z.boolean().default(true),
});

const updateCoachGroupAssignmentSchema = coachGroupAssignmentSchema
  .omit({ coachId: true, groupId: true })
  .partial();

const coachBasicPlayerSchema = z
  .object({
    username: z.string().trim().min(3).max(80).optional(),
    password: z.string().min(8).max(128).optional(),
    phone: z.string().min(8).max(20).optional(),
    fullName: z.string().min(2).max(100),
    birthDate: dateSchema,
    dateJoined: dateSchema.optional(),
    groupId: uuid.optional(),
    branchId: uuid.optional(),
    position: z.string().max(30).optional(),
    level: z.string().max(30).optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    nationality: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
    heightCm: z.number().positive().optional(),
    weightKg: z.number().positive().optional(),
    preferredFoot: z.enum(["left", "right", "both"]).optional(),
    photoUrl: z.string().max(1000).optional(),
    guardianName: z.string().max(100).optional(),
    guardianPhone: z.string().max(20).optional(),
    guardianRelation: z.string().max(50).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) =>
      (!data.username && !data.password) || (data.username && data.password),
    {
      message: "Username and password must be provided together",
      path: ["username"],
    },
  );

const coachCompletePlayerProfileSchema = z.record(z.any());

module.exports = {
  idParam,
  matchParam,
  matchIncidentParam,
  matchGoalParam,
  matchSubstitutionParam,
  eventParam,
  eventPlayerParam,
  childParam,
  childMatchParam,
  playerMatchParam,
  squadPlayerParam,
  statsPlayerParam,
  optionParam,
  evaluationParam,
  coachGroupAssignmentParam,
  paginationQuery,
  coachPlayersQuery,
  calendarFiltersQuery,
  adminMatchFiltersQuery,
  adminCalendarEventSchema,
  updateAdminCalendarEventSchema,
  adminMatchSchema,
  adminCoachMatchRequestSchema,
  coachResolveAdminMatchRequestSchema,
  updateAdminMatchSchema,
  adminPostponeMatchSchema,
  matchStatusSchema,
  coachTrainingEventSchema,
  updateCoachTrainingEventSchema,
  trainingStatusSchema,
  trainingExtendSchema,
  attendanceRecordsSchema,
  updateEventAttendanceSchema,
  evaluationRecordsSchema,
  updateEvaluationSchema,
  squadSchema,
  updateSquadSchema,
  tacticsSchema,
  matchTargetSchema,
  matchLiveStatusUpdateSchema,
  matchIncidentSchema,
  matchGoalSchema,
  matchSubstitutionSchema,
  matchAttendanceRecordsSchema,
  playerStatsSchema,
  updatePlayerStatsSchema,
  friendlyRequestSchema,
  rejectFriendlyRequestSchema,
  approveFriendlyRequestSchema,
  convertFriendlyRequestSchema,
  optionSchema,
  updateOptionSchema,
  optionQuery,
  coachGroupAssignmentSchema,
  updateCoachGroupAssignmentSchema,
  coachBasicPlayerSchema,
  coachCompletePlayerProfileSchema,
};
