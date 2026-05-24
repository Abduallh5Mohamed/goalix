const eventBus = require("../../events/eventBus");
const PLAYERS_EVENTS = require("./players.events");
const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require("../../shared/errors");
const { ConflictError } = require("../../shared/errors");
const bcrypt = require("bcrypt");
const env = require("../../config/env");
const { ensureIamForAuthUser } = require("../../shared/iam-sync");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const playerImageTypes = {
  "image/png": { extension: ".png" },
  "image/jpeg": { extension: ".jpg" },
  "image/jpg": { extension: ".jpg" },
  "image/webp": { extension: ".webp" },
};

const sanitizeFileName = (value = "player-image") =>
  String(value)
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160) || "player-image";

const technicalSkillMap = {
  ballControl: "ball_control",
  firstTouch: "first_touch",
  passing: "passing",
  shooting: "shooting",
  dribbling: "dribbling",
  crossing: "crossing",
  heading: "heading",
  tackling: "tackling",
  weakFoot: "weak_foot",
  finishing: "finishing",
  longPassing: "long_passing",
  shortPassing: "short_passing",
};

const tacticalSkillMap = {
  positioning: "positioning",
  decisionMaking: "decision_making",
  offBallMovement: "off_ball_movement",
  pressing: "pressing",
  defensiveAwareness: "defensive_awareness",
  teamwork: "teamwork",
  gameReading: "game_reading",
  trackingBack: "tracking_back",
  creatingSpace: "creating_space",
  tacticalDiscipline: "tactical_discipline",
};

const physicalMap = {
  bmi: "bmi",
  sprintSpeed: "sprint_speed",
  acceleration: "acceleration",
  stamina: "stamina",
  strength: "strength",
  agility: "agility",
  balance: "balance",
  jumpHeightCm: "jump_height_cm",
  flexibility: "flexibility",
};

const trainingMap = {
  trainingSessionsCount: "training_sessions_count",
  attendanceCount: "attendance_count",
  absenceCount: "absence_count",
  lateArrivals: "late_arrivals",
  attendanceRate: "attendance_rate",
  trainingPerformanceRating: "training_performance_rating",
  coachNotes: "coach_notes",
  improvementNotes: "improvement_notes",
};

const matchSummaryMap = {
  matchesPlayed: "matches_played",
  minutesPlayed: "minutes_played",
  goals: "goals",
  assists: "assists",
  shots: "shots",
  shotsOnTarget: "shots_on_target",
  passAccuracy: "pass_accuracy",
  keyPasses: "key_passes",
  successfulDribbles: "successful_dribbles",
  tackles: "tackles",
  interceptions: "interceptions",
  fouls: "fouls",
  yellowCards: "yellow_cards",
  redCards: "red_cards",
  manOfTheMatchCount: "man_of_the_match_count",
  matchRating: "match_rating",
};

const healthMap = {
  medicalNotes: "medical_notes",
  injuryHistory: "injury_history",
  currentInjuryStatus: "current_injury_status",
  injuryType: "injury_type",
  injuryDate: "injury_date",
  recoveryDate: "recovery_date",
  fitnessStatus: "fitness_status",
  allergies: "allergies",
  chronicProblems: "chronic_problems",
};

const hasAnyValue = (data, fields) =>
  fields.some(
    (field) =>
      data[field] !== undefined && data[field] !== null && data[field] !== "",
  );

const pickMapped = (data, map) =>
  Object.entries(map).reduce((acc, [inputKey, dbKey]) => {
    if (
      data[inputKey] !== undefined &&
      data[inputKey] !== null &&
      data[inputKey] !== ""
    ) {
      acc[dbKey] = data[inputKey];
    }
    return acc;
  }, {});

const calculateBmi = (heightCm, weightKg) => {
  if (!heightCm || !weightKg) return null;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(2));
};

const addPlanPeriod = (date, plan = "monthly") => {
  const next = new Date(date);
  const months = plan === "yearly" ? 12 : plan === "quarterly" ? 3 : 1;
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
};

class PlayersService {
  constructor(playersRepository) {
    this.repo = playersRepository;
  }

  async _scopeFiltersForUser(user, filters = {}) {
    if (user.role === "admin") return { academyId: user.academyId, ...filters };
    if (user.role === "coach") {
      const coach = await this.repo.findCoachProfileByUserId(user.userId);
      if (!coach)
        throw new ForbiddenError("Coach profile is not linked to this user");
      return { academyId: user.academyId, coachId: coach.id, ...filters };
    }
    if (user.role === "player")
      return {
        academyId: user.academyId,
        playerUserId: user.userId,
        ...filters,
      };
    if (user.role === "parent")
      return {
        academyId: user.academyId,
        linkedPlayerId: user.linkedPlayerId,
        ...filters,
      };
    throw new ForbiddenError("Unsupported role");
  }

  async _assertPlayerAccess(user, player, { write = false } = {}) {
    if (user.academyId && player.academy_id !== user.academyId)
      throw new NotFoundError("Player", player.id);
    if (user.role === "admin") return;
    if (user.role === "player" && player.user_id === user.userId && !write)
      return;
    if (user.role === "parent" && player.id === user.linkedPlayerId && !write)
      return;
    if (user.role === "coach") {
      const coach = await this.repo.findCoachProfileByUserId(user.userId);
      if (coach && (await this.repo.coachCanAccessPlayer(coach.id, player.id)))
        return;
    }
    throw new ForbiddenError("You cannot access this player");
  }

  async listPlayers(user, filters) {
    return this.repo.findPlayers(
      await this._scopeFiltersForUser(user, filters),
    );
  }

  async getPlayer(id, user) {
    const player = await this.repo.findById(id);
    if (!player) throw new NotFoundError("Player", id);
    await this._assertPlayerAccess(user, player);
    return player;
  }

  async getPlayerSummary(id, user) {
    const player = await this.repo.findPlayerSummary(id);
    if (!player) throw new NotFoundError("Player", id);
    await this._assertPlayerAccess(user, player);
    return player;
  }

  async createPlayer(academyId, data, actor = {}) {
    // Verify the branch belongs to this academy before creating a player
    const branch = await this.repo.findBranchByIdAndAcademy(
      data.branchId,
      academyId,
    );
    if (!branch) throw new NotFoundError("Branch", data.branchId);

    let targetGroupId = data.groupId || null;
    const coachProfile =
      actor.role === "coach"
        ? await this.repo.findCoachProfileByUserId(actor.userId)
        : null;
    const playerBirthYear = data.birthDate
      ? new Date(data.birthDate).getFullYear()
      : null;
    if (actor.role === "coach") {
      if (!coachProfile)
        throw new ForbiddenError("Coach profile is not linked to this user");
      if (!Number.isInteger(playerBirthYear)) {
        throw new BadRequestError("A valid player birth date is required");
      }
      const accessibleBirthYear =
        await this.repo.findCoachBirthYearAccessForDate(
          coachProfile.id,
          data.branchId,
          playerBirthYear,
        );
      if (!accessibleBirthYear) {
        throw new ForbiddenError(
          "Your coach account does not have access to this player birth year",
        );
      }
    }
    if (targetGroupId) {
      const group = await this.repo.findGroupByIdAndBranch(
        targetGroupId,
        data.branchId,
      );
      if (!group) throw new NotFoundError("Group", data.groupId);
      if (
        actor.role === "coach" &&
        !(await this.repo.coachCanAccessGroup(coachProfile.id, targetGroupId))
      ) {
        throw new ForbiddenError(
          "Your coach account cannot assign players to this group",
        );
      }
    }

    const normalizedUsername = data.username
      ? data.username.trim().toLowerCase()
      : null;
    const authPhone = data.phone || data.guardianPhone || null;
    if (normalizedUsername) {
      const existing = await this.repo.findAuthUserByCredentials({
        username: normalizedUsername,
        phone: authPhone,
      });
      if (existing) {
        throw new ConflictError(
          "User with this username or phone already exists",
        );
      }
    }

    const passwordHash = data.password
      ? await bcrypt.hash(data.password, env.BCRYPT_ROUNDS)
      : null;
    // Generate code + insert profile atomically inside a single DB transaction
    // so the sequence counter and the profile row are either both committed or both rolled back.
    const player = await this.repo.db.transaction(async (trx) => {
      let userId = data.userId || null;
      if (!targetGroupId && data.birthDate) {
        const autoGroup = Number.isInteger(playerBirthYear)
          ? actor.role === "coach"
            ? await this.repo.findCoachAutoAssignableGroup(
                coachProfile.id,
                data.branchId,
                playerBirthYear,
                trx,
              )
            : await this.repo.findAutoAssignableGroup(
                data.branchId,
                playerBirthYear,
                trx,
              )
          : null;
        targetGroupId = autoGroup?.id || null;
      }

      if (normalizedUsername && passwordHash) {
        const [user] = await trx("auth_users")
          .insert({
            username: normalizedUsername,
            email: null,
            phone: authPhone,
            password_hash: passwordHash,
            role: "player",
            academy_id: academyId,
            branch_id: data.branchId,
            is_active: true,
            is_verified: true,
          })
          .returning("*");

        await ensureIamForAuthUser(trx, user, {
          fullName: data.fullName,
          grantedBy: actor.userId || null,
        });

        userId = user.id;
      }

      // Atomically allocate the next sequential number for this age category + year
      const playerCode = await this.repo.generatePlayerCode(
        data.birthDate,
        trx,
      );

      const [row] = await trx("player_profiles")
        .insert({
          academy_id: academyId,
          branch_id: data.branchId,
          user_id: userId,
          full_name: data.fullName,
          date_of_birth: data.birthDate,
          date_joined: data.dateJoined || new Date().toISOString().slice(0, 10),
          player_code: playerCode,
          gender: data.gender || null,
          phone: data.phone || null,
          address: data.address || null,
          nationality: data.nationality || null,
          level: data.level || null,
          position: data.position || null,
          secondary_positions: JSON.stringify(data.secondaryPositions || []),
          preferred_foot: data.preferredFoot || null,
          current_team: data.currentTeam || null,
          shirt_number: data.shirtNumber || null,
          playing_style: data.playingStyle || null,
          years_experience: data.yearsExperience ?? null,
          previous_club_academy: data.previousClubAcademy || null,
          photo_url: data.photoUrl || null,
          guardian_name: data.guardianName || null,
          guardian_phone: data.guardianPhone || null,
          guardian_relation: data.guardianRelation || null,
          notes: data.notes || null,
        })
        .returning("*");

      // Group assignment inside the same transaction
      if (targetGroupId) {
        await trx("player_group_assignments").insert({
          player_id: row.id,
          group_id: targetGroupId,
          joined_at: data.dateJoined ? new Date(data.dateJoined) : new Date(),
        });
      }

      await this._saveExtendedPlayerData(
        trx,
        row,
        { ...data, groupId: targetGroupId },
        actor,
        coachProfile,
      );

      return row;
    });

    eventBus.publish(PLAYERS_EVENTS.CREATED, {
      playerId: player.id,
      playerCode: player.player_code,
      academyId,
      branchId: data.branchId,
      groupId: targetGroupId,
    });

    return player;
  }

  async _saveExtendedPlayerData(
    trx,
    player,
    data,
    actor = {},
    coachProfile = null,
  ) {
    const groupId = data.groupId || null;

    if (
      data.heightCm ||
      data.weightKg ||
      hasAnyValue(data, Object.keys(physicalMap))
    ) {
      await trx("player_measurements").insert({
        player_id: player.id,
        height_cm: data.heightCm || null,
        weight_kg: data.weightKg || null,
        ...pickMapped(
          {
            ...data,
            bmi: data.bmi || calculateBmi(data.heightCm, data.weightKg),
          },
          physicalMap,
        ),
        measured_at: new Date(),
        measured_by: actor.userId || null,
        notes: "Player profile completion measurement",
      });
    }

    if (
      hasAnyValue(data, [
        ...Object.keys(technicalSkillMap),
        ...Object.keys(tacticalSkillMap),
      ])
    ) {
      await trx("player_skill_assessments").insert({
        player_id: player.id,
        group_id: groupId,
        recorded_by: actor.userId || null,
        assessed_at: new Date(),
        ...pickMapped(data, technicalSkillMap),
        ...pickMapped(data, tacticalSkillMap),
      });
    }

    if (hasAnyValue(data, Object.keys(trainingMap))) {
      await trx("player_training_summaries").insert({
        player_id: player.id,
        group_id: groupId,
        recorded_by: actor.userId || null,
        recorded_at: new Date(),
        ...pickMapped(data, trainingMap),
      });
    }

    if (hasAnyValue(data, Object.keys(matchSummaryMap))) {
      await trx("player_match_summaries").insert({
        player_id: player.id,
        group_id: groupId,
        recorded_by: actor.userId || null,
        recorded_at: new Date(),
        ...pickMapped(data, matchSummaryMap),
      });
    }

    if (hasAnyValue(data, Object.keys(healthMap))) {
      const healthData = pickMapped(data, healthMap);

      await trx("player_health_profiles")
        .insert({
          player_id: player.id,
          ...healthData,
        })
        .onConflict("player_id")
        .merge({
          ...healthData,
          updated_at: new Date(),
        });
    }

    if (
      data.injuryType ||
      data.injuryDate ||
      data.recoveryDate ||
      data.injuryHistory
    ) {
      await trx("player_injury_history").insert({
        player_id: player.id,
        injury_type: data.injuryType || null,
        injury_date: data.injuryDate || null,
        recovery_date: data.recoveryDate || null,
        notes: data.injuryHistory || null,
        reported_by: actor.userId || null,
      });
    }

    if (
      coachProfile &&
      hasAnyValue(data, [
        "overallRating",
        "potentialRating",
        "strengths",
        "weaknesses",
        "recommendedPosition",
        "developmentPlan",
        "coachFinalNotes",
      ])
    ) {
      await trx("evaluation_coach_ratings").insert({
        player_id: player.id,
        coach_id: coachProfile.id,
        group_id: groupId,
        score: data.overallRating ?? 0,
        potential_rating: data.potentialRating ?? null,
        strengths: data.strengths || null,
        weaknesses: data.weaknesses || null,
        recommended_position: data.recommendedPosition || null,
        development_plan: data.developmentPlan || null,
        final_notes: data.coachFinalNotes || null,
        notes: data.coachFinalNotes || null,
        eval_date: new Date(),
      });
    }

    if (
      data.subscriptionType ||
      data.monthlyFees ||
      data.paymentStatus ||
      data.nextPaymentDue ||
      data.discount ||
      data.penalty
    ) {
      const plan = data.subscriptionType || "monthly";
      const startsAt =
        data.lastPaymentDate || new Date().toISOString().slice(0, 10);
      const endsAt = data.nextPaymentDue || addPlanPeriod(startsAt, plan);
      const amount = data.monthlyFees || 0;
      const discount = data.discount || 0;
      const penalty = data.penalty || 0;
      const subscriptionStatus =
        data.paymentStatus === "cancelled"
          ? "cancelled"
          : data.paymentStatus === "paid"
            ? "active"
            : "pending";

      const [subscription] = await trx("payment_subscriptions")
        .insert({
          player_id: player.id,
          group_id: groupId,
          plan,
          amount,
          starts_at: startsAt,
          ends_at: endsAt,
          status: subscriptionStatus,
          discount_amount: discount,
          penalty_amount: penalty,
          last_payment_date: data.lastPaymentDate || null,
          next_payment_due: data.nextPaymentDue || null,
        })
        .returning("*");

      await trx("payment_invoices").insert({
        subscription_id: subscription.id,
        amount: Math.max(amount - discount + penalty, 0),
        due_date: data.nextPaymentDue || endsAt,
        paid_at:
          data.paymentStatus === "paid" && data.lastPaymentDate
            ? data.lastPaymentDate
            : null,
        status: data.paymentStatus || "pending",
      });
    }
  }

  async updatePlayer(id, academyId, data, actor = {}) {
    const player = await this.repo.findById(id);
    if (!player) throw new NotFoundError("Player", id);
    await this._assertPlayerAccess(actor, player, { write: true });

    const coachProfile =
      actor.role === "coach"
        ? await this.repo.findCoachProfileByUserId(actor.userId)
        : null;
    const currentGroupAssignment = data.groupId
      ? await this.repo.findCurrentGroupAssignment(id)
      : null;
    const nextBranchId = data.branchId || player.branch_id;
    const nextBirthDate = data.birthDate || player.date_of_birth;
    const nextBirthYear = nextBirthDate
      ? new Date(nextBirthDate).getFullYear()
      : null;

    if (data.groupId) {
      const group = await this.repo.findGroupByIdAndBranch(
        data.groupId,
        nextBranchId,
      );
      if (!group) throw new NotFoundError("Group", data.groupId);
    }

    if (actor.role === "coach") {
      if (!coachProfile)
        throw new ForbiddenError("Coach profile is not linked to this user");
      if (!Number.isInteger(nextBirthYear)) {
        throw new BadRequestError("A valid player birth date is required");
      }
      const accessibleBirthYear =
        await this.repo.findCoachBirthYearAccessForDate(
          coachProfile.id,
          nextBranchId,
          nextBirthYear,
        );
      if (!accessibleBirthYear) {
        throw new ForbiddenError(
          "Your coach account does not have access to this player birth year",
        );
      }
      if (
        data.groupId &&
        !(await this.repo.coachCanAccessGroup(coachProfile.id, data.groupId))
      ) {
        throw new ForbiddenError(
          "Your coach account cannot assign players to this group",
        );
      }
    }

    const updateData = {};
    if (data.fullName) updateData.full_name = data.fullName;
    if (data.birthDate) updateData.date_of_birth = data.birthDate;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.nationality !== undefined)
      updateData.nationality = data.nationality;
    if (data.branchId) updateData.branch_id = data.branchId;
    if (data.level !== undefined) updateData.level = data.level;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.secondaryPositions !== undefined)
      updateData.secondary_positions = JSON.stringify(data.secondaryPositions);
    if (data.preferredFoot !== undefined)
      updateData.preferred_foot = data.preferredFoot;
    if (data.currentTeam !== undefined)
      updateData.current_team = data.currentTeam;
    if (data.shirtNumber !== undefined)
      updateData.shirt_number = data.shirtNumber;
    if (data.playingStyle !== undefined)
      updateData.playing_style = data.playingStyle;
    if (data.yearsExperience !== undefined)
      updateData.years_experience = data.yearsExperience;
    if (data.previousClubAcademy !== undefined)
      updateData.previous_club_academy = data.previousClubAcademy;
    if (data.photoUrl !== undefined) updateData.photo_url = data.photoUrl;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.guardianName !== undefined)
      updateData.guardian_name = data.guardianName;
    if (data.guardianPhone !== undefined)
      updateData.guardian_phone = data.guardianPhone;
    if (data.guardianRelation !== undefined)
      updateData.guardian_relation = data.guardianRelation;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.markProfileComplete) {
      updateData.profile_status = "complete";
      updateData.profile_completed_at = new Date();
    }

    const hasIamUsers = await this.repo.db.schema.hasTable("iam_users");
    const updated = await this.repo.db.transaction(async (trx) => {
      const row = await this.repo.update(id, updateData, trx);
      if (data.isActive !== undefined && player.user_id) {
        await trx("auth_users")
          .where({ id: player.user_id, role: "player" })
          .update({ is_active: data.isActive, updated_at: new Date() });
        if (hasIamUsers) {
          await trx("iam_users")
            .where({ id: player.user_id })
            .update({ is_active: data.isActive, updated_at: new Date() });
        }
      }
      await this._saveExtendedPlayerData(trx, row, data, actor, coachProfile);
      return row;
    });

    // Handle group change
    if (data.groupId && data.groupId !== currentGroupAssignment?.group_id) {
      await this.repo.assignToGroup(id, data.groupId);
      eventBus.publish(PLAYERS_EVENTS.GROUP_CHANGED, {
        playerId: id,
        oldGroupId: currentGroupAssignment?.group_id,
        newGroupId: data.groupId,
      });
    }

    // Handle level change
    if (data.level && data.level !== player.level) {
      eventBus.publish(PLAYERS_EVENTS.LEVEL_CHANGED, {
        playerId: id,
        oldLevel: player.level,
        newLevel: data.level,
      });
    }

    eventBus.publish(PLAYERS_EVENTS.UPDATED, { playerId: id });
    return updated;
  }

  async deletePlayer(id, academyId) {
    const player = await this.repo.findById(id);
    if (!player) throw new NotFoundError("Player", id);
    if (academyId && player.academy_id !== academyId)
      throw new NotFoundError("Player", id);

    await this.repo.softDelete(id);
    eventBus.publish(PLAYERS_EVENTS.DELETED, {
      playerId: id,
      academyId: player.academy_id,
    });
  }

  async storePlayerImageUpload(user, { originalName, mimeType, buffer }) {
    const normalizedMimeType = String(mimeType || "").toLowerCase();
    const typeInfo = playerImageTypes[normalizedMimeType];
    if (!typeInfo) {
      throw new BadRequestError(
        "Player image must be PNG, JPG, JPEG, or WEBP.",
      );
    }
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new BadRequestError("Uploaded image is empty.");
    }
    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestError("Player image must be 5MB or smaller.");
    }

    const fileName = sanitizeFileName(originalName || "player-image");
    const academySegment = String(user.academyId || "shared").replace(
      /[^a-zA-Z0-9-]/g,
      "",
    );
    const storedName = `${Date.now()}-${randomUUID()}${typeInfo.extension}`;
    const uploadDir = path.resolve(
      __dirname,
      "../../../uploads/players",
      academySegment,
    );
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, storedName), buffer);

    return {
      fileName,
      image: `/uploads/players/${academySegment}/${storedName}`,
      mimeType: normalizedMimeType,
      sizeBytes: buffer.length,
    };
  }

  async hardDeletePlayer(id, academyId) {
    const player = await this.repo.findById(id);
    if (!player) throw new NotFoundError("Player", id);
    if (academyId && player.academy_id !== academyId)
      throw new NotFoundError("Player", id);

    const hasIamUsers = await this.repo.db.schema.hasTable("iam_users");
    await this.repo.db.transaction(async (trx) => {
      await trx("player_profiles").where({ id }).del();

      if (player.user_id) {
        await trx("auth_users")
          .where({ id: player.user_id, role: "player" })
          .del();

        if (hasIamUsers) {
          await trx("iam_users").where({ id: player.user_id }).del();
        }
      }
    });

    eventBus.publish(PLAYERS_EVENTS.DELETED, {
      playerId: id,
      academyId: player.academy_id,
      hardDelete: true,
    });
  }

  // ─── Measurements ──────────────────────────────────────────────────
  async getMeasurements(playerId, pagination) {
    return this.repo.findMeasurements(playerId, pagination);
  }

  async addMeasurement(playerId, coachId, data) {
    const measurement = await this.repo.addMeasurement({
      player_id: playerId,
      height_cm: data.heightCm,
      weight_kg: data.weightKg,
      ...pickMapped(
        {
          ...data,
          bmi: data.bmi || calculateBmi(data.heightCm, data.weightKg),
        },
        physicalMap,
      ),
      measured_at: data.recordedMonth,
      measured_by: coachId,
      notes: data.notes,
    });

    eventBus.publish(PLAYERS_EVENTS.MEASUREMENT_ADDED, {
      playerId,
      measurementId: measurement.id,
    });

    return measurement;
  }

  // ─── Injuries ──────────────────────────────────────────────────────
  async getInjuries(playerId, pagination) {
    return this.repo.findInjuries(playerId, pagination);
  }

  async addInjury(playerId, coachId, data) {
    const injury = await this.repo.addInjury({
      player_id: playerId,
      injury_type: data.injuryType,
      body_part: data.bodyPart,
      severity: data.severity,
      injury_date: data.occurredAt,
      recovery_date: data.recoveredAt || null,
      notes: data.notes,
      reported_by: coachId,
    });

    eventBus.publish(PLAYERS_EVENTS.INJURY_REPORTED, {
      playerId,
      injuryId: injury.id,
      severity: data.severity,
    });

    return injury;
  }

  // ─── Parent access ─────────────────────────────────────────────────
  async getChildrenByParent(parentUserId) {
    return this.repo.findChildrenByParent(parentUserId);
  }

  async isParentOfPlayer(parentUserId, playerId) {
    return this.repo.isParentOfPlayer(parentUserId, playerId);
  }
}

module.exports = PlayersService;
