const {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require("../../shared/errors");

const uniq = (values) => [...new Set((values || []).filter(Boolean))];
const addHours = (isoValue, hours) =>
  new Date(new Date(isoValue).getTime() + hours * 60 * 60 * 1000);
const pad2 = (value) => String(value).padStart(2, "0");
const datePart = (value) =>
  value instanceof Date
    ? `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
    : String(value).slice(0, 10);
const timePart = (value) =>
  value instanceof Date
    ? `${pad2(value.getHours())}:${pad2(value.getMinutes())}`
    : normalizeTime24(value);
const combineDateTime = (date, time) =>
  `${datePart(date)}T${timePart(time)}:00.000Z`;
const matchKickoffAt = (match) =>
  new Date(`${datePart(match.match_date)}T${timePart(match.match_time)}:00`);
const MATCH_AUTO_FINISH_HOURS = 3;
const matchAutoFinishAt = (match) => {
  const finishAt = matchKickoffAt(match);
  finishAt.setHours(finishAt.getHours() + MATCH_AUTO_FINISH_HOURS);
  return finishAt;
};
const MATCH_DAY_UNLOCK_MINUTES = 5;
const matchDayUnlockAt = (match) => {
  const unlockAt = matchKickoffAt(match);
  unlockAt.setMinutes(unlockAt.getMinutes() - MATCH_DAY_UNLOCK_MINUTES);
  return unlockAt;
};
const trainingStartsAt = (event) => new Date(event.start_datetime);
const trainingEndsAt = (event) => new Date(event.end_datetime);
const addMinutes = (value, minutes) =>
  new Date(new Date(value).getTime() + minutes * 60 * 1000);
const normalizeTime24 = (time) => {
  if (!time) return "";
  if (time instanceof Date) {
    return `${pad2(time.getHours())}:${pad2(time.getMinutes())}`;
  }
  const raw = String(time).trim();
  const period = raw.match(/(AM|PM)\s*$/i)?.[1]?.toUpperCase();
  const clock = raw.replace(/\s*(?:AM|PM)+\s*$/i, "").trim();
  const match = clock.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return raw.slice(0, 5);
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) {
    return raw.slice(0, 5);
  }
  if (period === "AM" && hour === 12) hour = 0;
  if (period === "PM" && hour < 12) hour += 12;
  return `${pad2(hour)}:${pad2(minute)}`;
};
const toTime = (time) => {
  const normalized = normalizeTime24(time);
  return normalized ? `${normalized}:00` : "";
};
const normalizeTargetType = (targetType) =>
  targetType === "specific_group" || targetType === "multiple_groups"
    ? "specific_groups"
    : targetType;
const eventStatusFromMatch = (status) =>
  ({
    scheduled: "scheduled",
    postponed: "postponed",
    cancelled: "cancelled",
    finished: "finished",
  })[status] || "scheduled";
const calendarEventStatusForDb = (status) =>
  status === "completed" ? "finished" : status;
const matchStatusFromCore = (status) =>
  ({
    scheduled: "scheduled",
    postponed: "postponed",
    cancelled: "cancelled",
    finished: "finished",
  })[status] || "scheduled";

const optionValue = (label, value) =>
  (value || label)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class CalendarService {
  constructor(
    calendarRepository,
    playersService = null,
    customDataService = null,
  ) {
    this.repo = calendarRepository;
    this.playersService = playersService;
    this.customDataService = customDataService;
  }

  async _getCoach(userId, academyId) {
    const coach = await this.repo.findCoachByUserId(userId);
    if (!coach || coach.academy_id !== academyId)
      throw new NotFoundError("Coach profile");
    return coach;
  }

  async _getPlayer(userId, academyId) {
    const player = await this.repo.findPlayerByUserId(userId);
    if (!player || player.academy_id !== academyId)
      throw new NotFoundError("Player profile");
    return player;
  }

  async _assertParentChild(parentUserId, childId, academyId) {
    const parent = await this.repo.findParentLinkedPlayer(parentUserId);
    if (!parent?.linked_player_id || parent.linked_player_id !== childId) {
      throw new ForbiddenError("Parent can only access their linked child");
    }
    const player = await this.repo
      .db("player_profiles")
      .where({ id: childId, academy_id: academyId })
      .whereNull("deleted_at")
      .first();
    if (!player) throw new NotFoundError("Player", childId);
    return player;
  }

  async _validateAcademyGroups(groupIds, academyId) {
    const uniqueIds = uniq(groupIds);
    const groups = await this.repo.findGroupsByIds(uniqueIds, academyId);
    if (groups.length !== uniqueIds.length) {
      const found = new Set(groups.map((group) => group.id));
      const missing = uniqueIds.find((groupId) => !found.has(groupId));
      throw new NotFoundError("Group", missing);
    }
    return groups;
  }

  async _validateAcademyBirthYears(birthYearIds, academyId) {
    const uniqueIds = uniq(birthYearIds);
    const birthYears = await this.repo.findBirthYearsByIds(
      uniqueIds,
      academyId,
    );
    if (birthYears.length !== uniqueIds.length) {
      const found = new Set(birthYears.map((birthYear) => birthYear.id));
      const missing = uniqueIds.find((birthYearId) => !found.has(birthYearId));
      throw new NotFoundError("Birthday", missing);
    }
    return birthYears;
  }

  async _getCoachAssignments(coachId, academyId) {
    const assignments = await this.repo.findCoachAssignedGroups(
      coachId,
      academyId,
    );
    if (!assignments.length)
      throw new ForbiddenError("Coach has no assigned groups");
    return assignments;
  }

  async _getCoachVisibleGroupIds(coachId, academyId) {
    return this.repo.findCoachVisibleGroupIds(coachId, academyId);
  }

  async _resolveCoachTargetGroups(
    coach,
    academyId,
    { targetType, groupIds },
    permission = "can_create_training",
  ) {
    const assignments = await this._getCoachAssignments(coach.id, academyId);
    const eligible = assignments.filter(
      (assignment) => assignment[permission] !== false,
    );
    if (!eligible.length)
      throw new ForbiddenError("Coach does not have this group permission");

    if (normalizeTargetType(targetType) === "all_my_assigned_groups") {
      return eligible.map((assignment) => assignment.group_id);
    }

    const selected = uniq(groupIds);
    const allowed = new Set(eligible.map((assignment) => assignment.group_id));
    const invalid = selected.find((groupId) => !allowed.has(groupId));
    if (invalid)
      throw new ForbiddenError(
        "Coach cannot access one or more selected groups",
      );
    if (!selected.length)
      throw new BadRequestError("At least one assigned group is required");
    return selected;
  }

  async _ensureCoachCanAccessGroups(
    coach,
    academyId,
    groupIds,
    permission = null,
  ) {
    const assignments = await this.repo.findCoachAssignedGroups(
      coach.id,
      academyId,
    );
    const allowed = new Set(
      assignments
        .filter((assignment) => !permission || assignment[permission] !== false)
        .map((assignment) => assignment.group_id),
    );
    if (!permission) {
      const visibleGroupIds = await this._getCoachVisibleGroupIds(
        coach.id,
        academyId,
      );
      visibleGroupIds.forEach((groupId) => allowed.add(groupId));
    }
    const invalid = uniq(groupIds).find((groupId) => !allowed.has(groupId));
    if (invalid) throw new ForbiddenError("Coach cannot manage this group");
  }

  async _ensureCoachCanAccessBirthYears(coach, academyId, birthYearIds) {
    const accessible = await this.repo.findCoachAccessibleBirthYears(
      coach.id,
      academyId,
    );
    const allowed = new Set(accessible.map((row) => row.id));
    const invalid = uniq(birthYearIds).find(
      (birthYearId) => !allowed.has(birthYearId),
    );
    if (invalid) throw new ForbiddenError("Coach cannot access this birthday");
  }

  async _ensureCoachCanAccessEvent(
    coach,
    academyId,
    eventId,
    permission = null,
  ) {
    const event = await this.repo.findEventById(eventId, academyId);
    if (!event) throw new NotFoundError("Calendar event", eventId);
    const groupIds = (event.groups || []).map((group) => group.id);
    const birthYearIds = (event.birth_years || []).map((birthYear) => birthYear.id);
    const playerIds = (event.players || []).map((player) => player.id);
    await this._ensureCoachCanAccessGroups(
      coach,
      academyId,
      groupIds,
      permission,
    );
    if (birthYearIds.length)
      await this._ensureCoachCanAccessBirthYears(
        coach,
        academyId,
        birthYearIds,
      );
    if (playerIds.length)
      await this._ensureCoachCanAccessPlayers(coach, academyId, playerIds);
    return { event, groupIds, birthYearIds, playerIds };
  }

  async _ensureCoachCanAccessMatch(
    coach,
    academyId,
    matchId,
    permission = null,
  ) {
    const match = await this.repo.findMatchById(matchId, academyId);
    if (!match) throw new NotFoundError("Match", matchId);
    const groupIds = await this.repo.getMatchGroupIds(matchId);
    const birthYearIds = await this.repo.getMatchBirthYearIds(matchId);
    if (!groupIds.length && !birthYearIds.length) {
      const linkedRequest = await this.repo
        .db("friendly_match_requests")
        .where({ converted_match_id: matchId, coach_id: coach.id })
        .first();
      const linkedAdminRequest = await this.repo
        .db("admin_match_coach_requests")
        .where({ created_match_id: matchId, coach_id: coach.id })
        .first();
      if (!linkedRequest && !linkedAdminRequest)
        throw new ForbiddenError("Coach cannot access this match");
    }
    if (groupIds.length)
      await this._ensureCoachCanAccessGroups(
        coach,
        academyId,
        groupIds,
        permission,
      );
    if (birthYearIds.length)
      await this._ensureCoachCanAccessBirthYears(
        coach,
        academyId,
        birthYearIds,
      );
    return { match, groupIds, birthYearIds };
  }

  async _ensurePlayersInGroups(
    playerIds,
    groupIds,
    {
      requireComplete = false,
      customFieldId,
      customValue,
      customOptionId,
    } = {},
  ) {
    const players = await this.repo.findGroupPlayers(groupIds, {
      customFieldId,
      customValue,
      customOptionId,
    });
    const byId = new Map(players.map((player) => [player.id, player]));
    const invalid = uniq(playerIds).find((playerId) => !byId.has(playerId));
    if (invalid)
      throw new ForbiddenError("Player is outside the selected groups");
    if (requireComplete) {
      const incomplete = uniq(playerIds).find(
        (playerId) => byId.get(playerId)?.profile_status !== "complete",
      );
      if (incomplete)
        throw new BadRequestError(
          "Player profile must be complete before this operation",
        );
    }
    return players;
  }

  async _ensureCoachCanAccessPlayers(
    coach,
    academyId,
    playerIds,
    { requireComplete = false } = {},
  ) {
    const players = await this.repo.findCoachScopedPlayersByIds(
      coach.id,
      academyId,
      uniq(playerIds),
      { onlyComplete: requireComplete },
    );
    const byId = new Map(players.map((player) => [player.id, player]));
    const invalid = uniq(playerIds).find((playerId) => !byId.has(playerId));
    if (invalid)
      throw new ForbiddenError(
        "Player is outside your assigned groups or birth years",
      );
    if (requireComplete) {
      const incomplete = uniq(playerIds).find(
        (playerId) => byId.get(playerId)?.profile_status !== "complete",
      );
      if (incomplete)
        throw new BadRequestError(
          "Player profile must be complete before this operation",
        );
    }
    return players;
  }

  async _ensurePlayersInMatchTargets(
    playerIds,
    groupIds,
    birthYearIds,
    academyId,
    { requireComplete = false } = {},
  ) {
    const [groupPlayers, birthYearPlayers] = await Promise.all([
      this.repo.findGroupPlayers(groupIds, { onlyComplete: requireComplete }),
      this.repo.findPlayersForBirthYears(academyId, birthYearIds, {
        onlyComplete: requireComplete,
      }),
    ]);
    const byId = new Map(
      [...groupPlayers, ...birthYearPlayers].map((player) => [
        player.id,
        player,
      ]),
    );
    const invalid = uniq(playerIds).find((playerId) => !byId.has(playerId));
    if (invalid)
      throw new ForbiddenError("Player is outside the selected match target");
    if (requireComplete) {
      const incomplete = uniq(playerIds).find(
        (playerId) => byId.get(playerId)?.profile_status !== "complete",
      );
      if (incomplete)
        throw new BadRequestError(
          "Player profile must be complete before this operation",
        );
    }
    return [...byId.values()];
  }

  async _resolveCoachTrainingTargets(
    coach,
    academyId,
    data,
    permission = "can_create_training",
  ) {
    const targetAllGroups =
      data.allGroups ||
      normalizeTargetType(data.targetType) === "all_my_assigned_groups";
    const assignments = await this.repo.findCoachAssignedGroups(
      coach.id,
      academyId,
    );
    const eligibleAssignments = assignments.filter(
      (assignment) => assignment[permission] !== false,
    );
    const groupIds = targetAllGroups
      ? eligibleAssignments.map((assignment) => assignment.group_id)
      : uniq(data.groupIds);
    if (groupIds.length) {
      const allowed = new Set(
        eligibleAssignments.map((assignment) => assignment.group_id),
      );
      const invalid = groupIds.find((groupId) => !allowed.has(groupId));
      if (invalid)
        throw new ForbiddenError(
          "Coach cannot access one or more selected groups",
        );
    }

    const accessibleBirthYears = await this.repo.findCoachAccessibleBirthYears(
      coach.id,
      academyId,
    );
    const birthYearIds = data.allBirthYears
      ? accessibleBirthYears.map((row) => row.id)
      : uniq(data.birthYearIds);
    if (birthYearIds.length) {
      const allowedBirthYears = new Set(accessibleBirthYears.map((row) => row.id));
      const invalid = birthYearIds.find(
        (birthYearId) => !allowedBirthYears.has(birthYearId),
      );
      if (invalid) throw new ForbiddenError("Coach cannot access this birthday");
    }

    let playerIds = uniq(data.playerIds);
    if (data.allPlayers) {
      playerIds = (
        await this.repo.findCoachScopedPlayers(coach.id, academyId, {
          onlyComplete: true,
        })
      ).map((player) => player.id);
    } else if (playerIds.length) {
      await this._ensureCoachCanAccessPlayers(coach, academyId, playerIds, {
        requireComplete: true,
      });
    }

    if (!groupIds.length && !birthYearIds.length && !playerIds.length) {
      throw new BadRequestError("Select at least one group, birthday, or player");
    }
    return { groupIds, birthYearIds, playerIds };
  }

  async _ensurePlayersInEventTargets(
    playerIds,
    { groupIds = [], birthYearIds = [], directPlayerIds = [] },
    academyId,
    { requireComplete = false } = {},
  ) {
    const uniquePlayerIds = uniq(playerIds);
    const [groupPlayers, birthYearPlayers, directPlayers] = await Promise.all([
      this.repo.findGroupPlayers(groupIds, { onlyComplete: requireComplete }),
      this.repo.findPlayersForBirthYears(academyId, birthYearIds, {
        onlyComplete: requireComplete,
      }),
      directPlayerIds.length
        ? this.repo
            .db("player_profiles")
            .whereIn("id", directPlayerIds)
            .where("academy_id", academyId)
            .whereNull("deleted_at")
            .modify((q) => {
              if (requireComplete) q.where("profile_status", "complete");
            })
        : [],
    ]);
    const byId = new Map(
      [...groupPlayers, ...birthYearPlayers, ...directPlayers].map((player) => [
        player.id,
        player,
      ]),
    );
    const invalid = uniquePlayerIds.find((playerId) => !byId.has(playerId));
    if (invalid)
      throw new ForbiddenError("Player is outside the selected training target");
    if (requireComplete) {
      const incomplete = uniquePlayerIds.find(
        (playerId) => byId.get(playerId)?.profile_status !== "complete",
      );
      if (incomplete)
        throw new BadRequestError(
          "Player profile must be complete before this operation",
        );
    }
    return [...byId.values()];
  }

  async _notifyTrainingTargets(
    academyId,
    { groupIds = [], birthYearIds = [], playerIds = [] },
    title,
    body,
    data,
    trx = this.repo.db,
  ) {
    const userIds = [];
    if (groupIds.length) {
      const users = await this.repo.usersForGroups(groupIds);
      userIds.push(
        ...users.coaches.map((row) => row.user_id),
        ...users.players.map((row) => row.user_id),
        ...users.parents.map((row) => row.user_id),
      );
    }
    if (birthYearIds.length) {
      const users = await this.repo.usersForBirthYears(academyId, birthYearIds);
      userIds.push(
        ...users.coaches.map((row) => row.user_id),
        ...users.players.map((row) => row.user_id),
        ...users.parents.map((row) => row.user_id),
      );
    }
    if (playerIds.length) {
      const players = await trx("player_profiles")
        .whereIn("id", playerIds)
        .whereNotNull("user_id")
        .select("user_id");
      const parents = await trx("auth_users")
        .whereIn("linked_player_id", playerIds)
        .where("role", "parent")
        .whereNull("deleted_at")
        .select("id as user_id");
      userIds.push(
        ...players.map((row) => row.user_id),
        ...parents.map((row) => row.user_id),
      );
    }
    return this._notifyUsers(userIds, title, body, "training", data, trx);
  }

  _notificationRows(userIds, title, body, type, data = {}) {
    return uniq(userIds).map((userId) => ({
      user_id: userId,
      type,
      title,
      body,
      data,
      is_read: false,
    }));
  }

  async _notifyUsers(
    userIds,
    title,
    body,
    type,
    data = {},
    trx = this.repo.db,
  ) {
    return this.repo.createNotifications(
      this._notificationRows(userIds, title, body, type, data),
      trx,
    );
  }

  async _notifyAdmins(
    academyId,
    title,
    body,
    type,
    data = {},
    trx = this.repo.db,
  ) {
    const admins = await this.repo.adminUsers(academyId);
    return this._notifyUsers(
      admins.map((admin) => admin.user_id),
      title,
      body,
      type,
      data,
      trx,
    );
  }

  async _notifyGroups(
    groupIds,
    title,
    body,
    type,
    data = {},
    trx = this.repo.db,
    includePlayers = false,
  ) {
    const users = await this.repo.usersForGroups(groupIds);
    const ids = [
      ...users.coaches.map((row) => row.user_id),
      ...(includePlayers ? users.players.map((row) => row.user_id) : []),
      ...(includePlayers ? users.parents.map((row) => row.user_id) : []),
    ];
    return this._notifyUsers(ids, title, body, type, data, trx);
  }

  async _matchSquadRecipients(matchId) {
    const [players, parents, squadCoachIds, tacticCoachIds] = await Promise.all(
      [
        this.repo
          .db("match_squads as ms")
          .join("player_profiles as pp", "ms.player_id", "pp.id")
          .where("ms.match_id", matchId)
          .whereNotNull("pp.user_id")
          .select("pp.user_id", "pp.id as player_id"),
        this.repo
          .db("match_squads as ms")
          .join("auth_users as au", "au.linked_player_id", "ms.player_id")
          .where("ms.match_id", matchId)
          .where("au.role", "parent")
          .whereNull("au.deleted_at")
          .select("au.id as user_id", "ms.player_id"),
        this.repo
          .db("match_squads")
          .where("match_id", matchId)
          .whereNotNull("selected_by_coach_id")
          .distinct("selected_by_coach_id as coach_id"),
        this.repo
          .db("match_tactics")
          .where("match_id", matchId)
          .whereNotNull("coach_id")
          .distinct("coach_id"),
      ],
    );
    const coachIds = uniq([
      ...squadCoachIds.map((row) => row.coach_id),
      ...tacticCoachIds.map((row) => row.coach_id),
    ]);
    const coaches = coachIds.length
      ? await this.repo
          .db("coach_profiles")
          .whereIn("id", coachIds)
          .whereNotNull("user_id")
          .select("user_id")
      : [];
    return { players, parents, coaches };
  }

  _matchPlanPayload(match) {
    return {
      match: {
        id: match.id,
        opponentName: match.opponent_name,
        matchType: match.match_type,
        matchDate: datePart(match.match_date),
        matchTime: timePart(match.match_time),
        location: match.location,
        venueType: match.venue_type,
        status: match.status,
        matchStatus: match.match_status,
      },
      tactics: match.tactics
        ? {
            formation: match.tactics.formation,
            tacticalNotes: match.tactics.tactical_notes,
            coachName: match.tactics.coach_name,
          }
        : null,
      squad: (match.squad || []).map((player) => ({
        playerId: player.player_id,
        playerName: player.player_name,
        role: player.squad_role,
        position: player.position,
        instruction: player.player_instruction,
      })),
    };
  }

  async _notifyMatchPlan(
    academyId,
    matchId,
    { updated = false } = {},
    trx = this.repo.db,
  ) {
    const match = await this.repo.findMatchById(matchId, academyId);
    if (!match) return;
    if (!match.tactics || !match.squad?.length) return;
    const data = this._matchPlanPayload(match);
    const title = updated
      ? "Match configuration updated"
      : "Match configuration saved";
    const body = `${match.opponent_name} - ${data.tactics?.formation || "No formation"} on ${datePart(match.match_date)}`;
    await this._notifyAdmins(academyId, title, body, "match", data, trx);

    const recipients = await this._matchSquadRecipients(matchId);
    await this._notifyUsers(
      [...recipients.players, ...recipients.parents, ...recipients.coaches].map(
        (row) => row.user_id,
      ),
      title,
      body,
      "match",
      data,
      trx,
    );
  }

  async _notifyMatchDayOpen(academyId, matchId, trx = this.repo.db) {
    const match = await this.repo.findMatchById(matchId, academyId);
    if (!match || !match.tactics || !match.squad?.length) return;
    const data = {
      ...this._matchPlanPayload(match),
      matchDayUrl: `/coach/matches/match-day/${match.id}`,
    };
    const title = "Match starts soon";
    const body = `${match.opponent_name} starts at ${timePart(match.match_time)}. Match Day Operations are open.`;
    await this._notifyAdmins(academyId, title, body, "match", data, trx);
    const recipients = await this._matchSquadRecipients(matchId);
    await this._notifyUsers(
      [...recipients.players, ...recipients.parents, ...recipients.coaches].map(
        (row) => row.user_id,
      ),
      title,
      body,
      "match",
      data,
      trx,
    );
  }

  _matchDayWindowOpen(match) {
    return matchDayUnlockAt(match) <= new Date();
  }

  _ensureMatchDayReady(match) {
    if (!match.tactics || !match.squad?.length) {
      throw new BadRequestError(
        "Save match tactics and squad before match-day operations",
      );
    }
    if (!this._matchDayWindowOpen(match)) {
      throw new ForbiddenError(
        "Match Day Operations open 5 minutes before kick-off",
      );
    }
  }

  _ensureMatchHasStarted(match) {
    if (!["first_half", "second_half"].includes(match.match_status)) {
      throw new BadRequestError("Start the match before recording match events");
    }
  }

  _currentPlayingPlayerIds(match) {
    const yellowCounts = new Map();
    (match.incidents || [])
      .filter((incident) => incident.incident_type === "yellow_card")
      .forEach((incident) => {
        yellowCounts.set(
          incident.player_id,
          (yellowCounts.get(incident.player_id) || 0) + 1,
        );
      });
    const stoppedByIncident = new Set(
      (match.incidents || [])
        .filter((incident) =>
          ["red_card", "injury"].includes(incident.incident_type),
        )
        .map((incident) => incident.player_id),
    );
    yellowCounts.forEach((count, playerId) => {
      if (count >= 2) stoppedByIncident.add(playerId);
    });
    const current = new Set(
      (match.squad || [])
        .filter(
          (player) =>
            player.squad_role === "starter" &&
            !stoppedByIncident.has(player.player_id),
        )
        .map((player) => player.player_id),
    );
    (match.substitutions || []).forEach((substitution) => {
      current.delete(substitution.out_player_id);
      if (!stoppedByIncident.has(substitution.in_player_id)) {
        current.add(substitution.in_player_id);
      }
    });
    return current;
  }

  _matchMinuteLimit(match) {
    return (
      90 +
      Number(match.first_half_stoppage_minutes || 0) +
      Number(match.second_half_stoppage_minutes || 0)
    );
  }

  _matchElapsedMinute(match, now = new Date()) {
    const firstHalfLimit = 45 + Number(match.first_half_stoppage_minutes || 0);
    const secondHalfLimit = 45 + Number(match.second_half_stoppage_minutes || 0);
    if (match.match_status === "finished") {
      return firstHalfLimit + secondHalfLimit;
    }
    if (match.match_status === "first_half") {
      const startedAt = match.first_half_started_at || match.started_at;
      if (!startedAt) return 0;
      return Math.min(
        firstHalfLimit,
        Math.max(0, Math.floor((now - new Date(startedAt)) / 60000)),
      );
    }
    if (match.match_status === "second_half") {
      if (!match.second_half_started_at) return firstHalfLimit;
      return (
        firstHalfLimit +
        Math.min(
          secondHalfLimit,
          Math.max(
            0,
            Math.floor((now - new Date(match.second_half_started_at)) / 60000),
          ),
        )
      );
    }
    return 0;
  }

  _calculateMatchMinutes(match, now = new Date()) {
    const endMinute = this._matchElapsedMinute(match, now);
    const maxMinute = this._matchMinuteLimit(match);
    const attendanceByPlayer = new Map(
      (match.attendance || []).map((record) => [record.player_id, record]),
    );
    const playerState = new Map(
      (match.squad || []).map((player) => {
        const attendance = attendanceByPlayer.get(player.player_id);
        const unavailable = ["absent", "injured"].includes(
          attendance?.status || "",
        );
        const starts = player.squad_role === "starter" && !unavailable;
        return [
          player.player_id,
          {
            playerId: player.player_id,
            activeSince: starts ? 0 : null,
            minutes: 0,
            stopped: unavailable,
          },
        ];
      }),
    );

    const stopPlayer = (playerId, minute) => {
      const state = playerState.get(playerId);
      if (!state || state.activeSince === null) return;
      const safeMinute = Math.min(Math.max(Number(minute || 0), 0), endMinute);
      state.minutes += Math.max(0, safeMinute - state.activeSince);
      state.activeSince = null;
    };
    const startPlayer = (playerId, minute) => {
      const state = playerState.get(playerId);
      if (!state || state.stopped || state.activeSince !== null) return;
      const safeMinute = Math.min(Math.max(Number(minute || 0), 0), endMinute);
      state.activeSince = safeMinute;
    };
    const stateYellowCounts = new Map();

    const events = [
      ...(match.substitutions || []).map((substitution) => ({
        type: "substitution",
        minute: Number(substitution.minute || 0),
        substitution,
      })),
      ...(match.incidents || []).map((incident) => ({
        type: "incident",
        minute: Number(incident.minute || 0),
        incident,
      })),
    ].sort((a, b) => a.minute - b.minute || (a.type === "incident" ? -1 : 1));

    events.forEach((event) => {
      if (event.type === "substitution") {
        stopPlayer(event.substitution.out_player_id, event.minute);
        startPlayer(event.substitution.in_player_id, event.minute);
        return;
      }
      if (event.incident.incident_type === "yellow_card") {
        const previousYellows = stateYellowCounts.get(event.incident.player_id) || 0;
        stateYellowCounts.set(event.incident.player_id, previousYellows + 1);
        if (previousYellows + 1 >= 2) {
          stopPlayer(event.incident.player_id, event.minute);
          const state = playerState.get(event.incident.player_id);
          if (state) state.stopped = true;
        }
        return;
      }
      if (!["red_card", "injury"].includes(event.incident.incident_type)) {
        return;
      }
      stopPlayer(event.incident.player_id, event.minute);
      const state = playerState.get(event.incident.player_id);
      if (state) state.stopped = true;
    });

    playerState.forEach((state) => {
      if (state.activeSince !== null) {
        state.minutes += Math.max(0, endMinute - state.activeSince);
      }
      state.minutes = Math.min(Math.max(Math.round(state.minutes), 0), maxMinute);
    });

    return [...playerState.values()].map((state) => ({
      playerId: state.playerId,
      minutesPlayed: state.minutes,
    }));
  }

  async _syncMatchMinutes(matchId, academyId, coachId, trx = this.repo.db) {
    const match = await this.repo.findMatchById(matchId, academyId);
    if (!match?.squad?.length) return [];
    const minutes = this._calculateMatchMinutes(match);
    if (!minutes.length) return [];

    await trx("match_player_stats")
      .insert(
        minutes.map((record) => ({
          match_id: matchId,
          player_id: record.playerId,
          minutes_played: record.minutesPlayed,
          goals: 0,
          assists: 0,
          yellow_cards: 0,
          red_cards: 0,
          created_by_coach_id: coachId || null,
        })),
      )
      .onConflict(["match_id", "player_id"])
      .merge({
        minutes_played: this.repo.db.raw("excluded.minutes_played"),
        updated_at: new Date(),
      });

    return minutes;
  }

  _ensureMatchCanStart(match) {
    if (matchKickoffAt(match) > new Date()) {
      throw new BadRequestError("Match can only start at kick-off time");
    }

    const squad = match.squad || [];
    const attendanceByPlayer = new Map(
      (match.attendance || []).map((record) => [record.player_id, record]),
    );
    const unmarked = squad.find(
      (player) => !attendanceByPlayer.has(player.player_id),
    );
    if (unmarked) {
      throw new BadRequestError(
        "Mark attendance for every squad player before starting the match",
      );
    }

    const currentPlaying = this._currentPlayingPlayerIds(match);
    const unavailableCurrentPlayer = squad.find((player) => {
      const attendance = attendanceByPlayer.get(player.player_id);
      return (
        currentPlaying.has(player.player_id) &&
        ["absent", "injured"].includes(attendance?.status)
      );
    });
    if (unavailableCurrentPlayer) {
      throw new BadRequestError(
        "Replace absent or injured players with available substitutes before starting the match",
      );
    }
  }

  _ensureTrainingEventOpen(event) {
    if (event.status === "cancelled")
      throw new BadRequestError("Cancelled events cannot be changed");
    if (
      event.status === "completed" ||
      event.status === "finished" ||
      trainingEndsAt(event) <= new Date()
    )
      throw new BadRequestError("Training session is closed");
    if (trainingStartsAt(event) > new Date())
      throw new BadRequestError("Training session has not started yet");
  }

  async _incrementPlayerGoalStat(trx, matchId, playerId, coachId, field, delta) {
    const insertValue = Math.max(delta, 0);
    const patch =
      delta > 0
        ? {
            [field]: this.repo.db.raw(
              `COALESCE(match_player_stats.${field}, 0) + ?`,
              [delta],
            ),
          }
        : {
            [field]: this.repo.db.raw(
              `GREATEST(COALESCE(match_player_stats.${field}, 0) + ?, 0)`,
              [delta],
            ),
          };
    await trx("match_player_stats")
      .insert({
        match_id: matchId,
        player_id: playerId,
        minutes_played: 0,
        goals: field === "goals" ? insertValue : 0,
        assists: field === "assists" ? insertValue : 0,
        yellow_cards: 0,
        red_cards: 0,
        created_by_coach_id: coachId,
      })
      .onConflict(["match_id", "player_id"])
      .merge({ ...patch, updated_at: new Date() });
  }

  async _notifyMatchDayIfDue(academyId, matches) {
    const notified = new Map();
    const dueMatches = (matches || []).filter((match) => {
      if (
        !["scheduled", "postponed"].includes(match.status) ||
        match.match_status !== "scheduled"
      )
        return false;
      const notifiedAt = match.match_day_notified_at
        ? new Date(match.match_day_notified_at)
        : null;
      if (notifiedAt && notifiedAt >= matchDayUnlockAt(match)) return false;
      return this._matchDayWindowOpen(match);
    });
    for (const match of dueMatches) {
      const fullMatch = await this.repo.findMatchById(match.id, academyId);
      if (!fullMatch?.tactics || !fullMatch.squad?.length) continue;
      await this.repo.db.transaction(async (trx) => {
        const notifiedAt = new Date();
        const updated = await trx("matches")
          .where({ id: match.id })
          .where((query) => {
            query
              .whereNull("match_day_notified_at")
              .orWhere("match_day_notified_at", "<", matchDayUnlockAt(match));
          })
          .update({
            match_day_notified_at: notifiedAt,
            updated_at: notifiedAt,
          });
        if (!updated) return;
        notified.set(match.id, notifiedAt);
        await this._notifyMatchDayOpen(academyId, match.id, trx);
      });
    }
    return notified;
  }

  async _finalizeOverdueMatches(academyId, { matchId } = {}) {
    const candidates = await this.repo.findAutoFinishMatchCandidates(
      academyId,
      { matchId },
    );
    const now = new Date();
    const dueMatches = candidates.filter(
      (match) => matchAutoFinishAt(match) <= now,
    );
    if (!dueMatches.length) return new Set();

    const targetSnapshots = new Map();
    for (const match of dueMatches) {
      const [groupIds, birthYearIds] = await Promise.all([
        this.repo.getMatchGroupIds(match.id),
        this.repo.getMatchBirthYearIds(match.id),
      ]);
      targetSnapshots.set(
        match.id,
        await this._buildMatchTargetSnapshot(academyId, {
          groupIds,
          birthYearIds,
          teamId: match.team_id,
          ageGroupId: match.age_group_id,
        }),
      );
    }

    const eventIds = dueMatches.map((match) => match.event_id).filter(Boolean);
    await this.repo.db.transaction(async (trx) => {
      for (const match of dueMatches) {
        await trx("matches")
          .where({ id: match.id })
          .whereIn("status", ["scheduled", "postponed"])
          .update({
            status: "completed",
            match_status: "finished",
            finished_at: match.finished_at || matchAutoFinishAt(match),
            target_snapshot: JSON.stringify(targetSnapshots.get(match.id)),
            updated_at: now,
          });
        await this._refreshMatchSquadSnapshots(match.id, trx);
      }
      if (eventIds.length) {
        await trx("calendar_events")
          .whereIn("id", eventIds)
          .update({
            status: "finished",
            updated_at: now,
          });
      }
    });
    for (const match of dueMatches) {
      await this._syncMatchMinutes(match.id, academyId, null);
    }
    return new Set(dueMatches.map((match) => match.id));
  }

  async _completeExpiredTrainingEvents(academyId, { eventId } = {}) {
    const now = new Date();
    const baseQuery = this.repo
      .db("calendar_events")
      .where({
        academy_id: academyId,
        event_type: "training",
        status: "scheduled",
      })
      .where("end_datetime", "<=", now);
    if (eventId) baseQuery.where({ id: eventId });

    const rows = await baseQuery.clone().select("id");
    if (!rows.length) return new Set();

    await this.repo
      .db("calendar_events")
      .whereIn(
        "id",
        rows.map((row) => row.id),
      )
      .update({ status: "finished", updated_at: now });

    return new Set(rows.map((row) => row.id));
  }

  async notifyDueMatchDays() {
    const candidates = await this.repo.findDueMatchDayCandidates();
    const byAcademy = candidates.reduce((map, match) => {
      if (!map.has(match.academy_id)) map.set(match.academy_id, []);
      map.get(match.academy_id).push(match);
      return map;
    }, new Map());

    let notifiedCount = 0;
    for (const [academyId, matches] of byAcademy.entries()) {
      const notified = await this._notifyMatchDayIfDue(academyId, matches);
      notifiedCount += notified.size;
    }
    return notifiedCount;
  }

  _matchGroupIds(data) {
    return uniq([...(data.groupIds || []), data.teamId, data.ageGroupId]);
  }

  async _resolveAdminMatchGroupIds(academyId, data) {
    const explicitGroupIds = this._matchGroupIds(data);
    const birthYearIds = uniq(data.birthYearIds || []);
    if (!birthYearIds.length) return explicitGroupIds;
    const birthYearGroups = await this.repo.findGroupsForBirthYears(
      academyId,
      birthYearIds,
    );
    return uniq([
      ...explicitGroupIds,
      ...birthYearGroups.map((group) => group.id),
    ]);
  }

  async _resolveAdminMatchTargets(academyId, data) {
    const birthYearIds = uniq(data.birthYearIds || []);
    const groupIds = await this._resolveAdminMatchGroupIds(academyId, data);
    if (groupIds.length) await this._validateAcademyGroups(groupIds, academyId);
    if (birthYearIds.length)
      await this._validateAcademyBirthYears(birthYearIds, academyId);
    return { groupIds, birthYearIds };
  }

  async _buildMatchTargetSnapshot(
    academyId,
    { groupIds = [], birthYearIds = [], teamId = null, ageGroupId = null },
  ) {
    const snapshotGroupIds = uniq([...groupIds, teamId, ageGroupId]);
    const snapshotBirthYearIds = uniq(birthYearIds);
    const [groups, birthYears] = await Promise.all([
      snapshotGroupIds.length
        ? this.repo
            .db("academy_groups as ag")
            .join("academy_branches as ab", "ag.branch_id", "ab.id")
            .whereIn("ag.id", snapshotGroupIds)
            .where("ab.academy_id", academyId)
            .select("ag.id", "ag.name")
        : [],
      snapshotBirthYearIds.length
        ? this.repo
            .db("academy_birth_years as aby")
            .join("academy_branches as ab", "aby.branch_id", "ab.id")
            .whereIn("aby.id", snapshotBirthYearIds)
            .where("ab.academy_id", academyId)
            .select("aby.id", "aby.label", "aby.from_year", "aby.to_year")
        : [],
    ]);
    const groupsById = new Map(groups.map((group) => [group.id, group]));
    const birthYearsById = new Map(
      birthYears.map((birthYear) => [birthYear.id, birthYear]),
    );
    const team = teamId ? groupsById.get(teamId) : null;
    const ageGroup = ageGroupId ? groupsById.get(ageGroupId) : null;

    return {
      groups: snapshotGroupIds
        .map((groupId) => groupsById.get(groupId))
        .filter(Boolean)
        .map((group) => ({ id: group.id, name: group.name })),
      birthYears: snapshotBirthYearIds
        .map((birthYearId) => birthYearsById.get(birthYearId))
        .filter(Boolean)
        .map((birthYear) => ({
          id: birthYear.id,
          label:
            birthYear.label ||
            `${birthYear.from_year}-${birthYear.to_year}`,
          fromYear: birthYear.from_year,
          toYear: birthYear.to_year,
        })),
      teamName: team?.name || null,
      ageGroupName: ageGroup?.name || null,
    };
  }

  async _refreshMatchSquadSnapshots(matchId, trx = this.repo.db) {
    await trx.raw(
      `
        UPDATE match_squads AS ms
        SET
          player_name_snapshot = pp.full_name,
          profile_status_snapshot = pp.profile_status::text,
          updated_at = NOW()
        FROM player_profiles AS pp
        WHERE ms.player_id = pp.id
          AND ms.match_id = ?
      `,
      [matchId],
    );
  }

  _matchEventPayload(academyId, data, actorUserId) {
    const start = combineDateTime(data.matchDate, data.matchTime);
    return {
      academy_id: academyId,
      title: `${data.opponentName} (${data.matchType.replace("_", " ")})`,
      event_type: "match",
      start_datetime: start,
      end_datetime: addHours(start, 2),
      location: data.location,
      status: eventStatusFromMatch(data.status || "scheduled"),
      visibility:
        data.groupIds?.length ||
        data.birthYearIds?.length ||
        data.teamId ||
        data.ageGroupId
          ? "selected_groups"
          : "coaches_only",
      created_by_user_id: actorUserId,
      created_by_role: "admin",
      notes: data.organizerNotes || null,
    };
  }

  _matchPayload(data, adminUserId) {
    return {
      team_id: data.teamId || null,
      age_group_id: data.ageGroupId || null,
      opponent_name: data.opponentName,
      match_type: data.matchType,
      match_date: data.matchDate,
      match_time: toTime(data.matchTime),
      location: data.location,
      venue_type: data.venueType,
      referee_name: data.refereeName || null,
      status: data.status || "scheduled",
      match_status: matchStatusFromCore(data.status || "scheduled"),
      organizer_notes: data.organizerNotes || null,
      match_notes: data.matchNotes || null,
      our_score: data.ourScore ?? null,
      opponent_score: data.opponentScore ?? null,
      created_by_admin_id: adminUserId,
    };
  }

  async adminListCalendarEvents(academyId, filters) {
    return this.repo.paginate(
      this.repo.eventListQuery(academyId, filters),
      filters,
      "ce.id",
    );
  }

  async adminGetCalendarEvent(academyId, eventId) {
    const event = await this.repo.findEventById(eventId, academyId);
    if (!event) throw new NotFoundError("Calendar event", eventId);
    return event;
  }

  async adminCreateCalendarEvent(academyId, adminUserId, data) {
    const groupIds =
      data.visibility === "coaches_only" ? [] : uniq(data.groupIds);
    await this._validateAcademyGroups(groupIds, academyId);

    const event = await this.repo.db.transaction(async (trx) => {
      const row = await this.repo.createEventWithGroups(
        {
          academy_id: academyId,
          title: data.title,
          event_type: data.eventType,
          start_datetime: data.startDatetime,
          end_datetime: data.endDatetime,
          location: data.location || null,
          status: calendarEventStatusForDb(data.status),
          visibility: data.visibility,
          created_by_user_id: adminUserId,
          created_by_role: "admin",
          notes: data.notes || null,
        },
        groupIds,
        trx,
      );
      await this._notifyGroups(
        groupIds,
        "New academy event",
        data.title,
        "calendar",
        { eventId: row.id },
        trx,
      );
      return row;
    });

    return this.adminGetCalendarEvent(academyId, event.id);
  }

  async adminUpdateCalendarEvent(academyId, eventId, data) {
    const event = await this.adminGetCalendarEvent(academyId, eventId);
    let groupIds = null;
    if (data.groupIds) {
      groupIds = uniq(data.groupIds);
      await this._validateAcademyGroups(groupIds, academyId);
    }

    await this.repo.db.transaction(async (trx) => {
      await trx("calendar_events")
        .where({ id: eventId })
        .update({
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.eventType !== undefined
            ? { event_type: data.eventType }
            : {}),
          ...(data.startDatetime !== undefined
            ? { start_datetime: data.startDatetime }
            : {}),
          ...(data.endDatetime !== undefined
            ? { end_datetime: data.endDatetime }
            : {}),
          ...(data.location !== undefined ? { location: data.location } : {}),
          ...(data.status !== undefined
            ? { status: calendarEventStatusForDb(data.status) }
            : {}),
          ...(data.visibility !== undefined
            ? { visibility: data.visibility }
            : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          updated_at: new Date(),
        });
      if (groupIds) await this.repo.replaceEventGroups(eventId, groupIds, trx);
      const notifyGroupIds =
        groupIds || (event.groups || []).map((group) => group.id);
      await this._notifyGroups(
        notifyGroupIds,
        "Calendar event updated",
        event.title,
        "calendar",
        { eventId },
        trx,
        true,
      );
    });

    return this.adminGetCalendarEvent(academyId, eventId);
  }

  async adminDeleteCalendarEvent(academyId, eventId) {
    await this.adminGetCalendarEvent(academyId, eventId);
    await this.repo
      .db("calendar_events")
      .where({ id: eventId })
      .update({ deleted_at: new Date(), status: "cancelled" });
    return { message: "Calendar event deleted" };
  }

  async adminListMatches(academyId, filters) {
    await this._finalizeOverdueMatches(academyId);
    return this.repo.paginate(
      this.repo.matchListQuery(academyId, filters),
      filters,
      "m.id",
    );
  }

  async adminGetMatch(academyId, matchId) {
    await this._finalizeOverdueMatches(academyId, { matchId });
    const match = await this.repo.findMatchById(matchId, academyId);
    if (!match) throw new NotFoundError("Match", matchId);
    return match;
  }

  async adminCreateMatch(academyId, adminUserId, data) {
    const { groupIds, birthYearIds } = await this._resolveAdminMatchTargets(
      academyId,
      data,
    );
    const targetSnapshot = await this._buildMatchTargetSnapshot(academyId, {
      groupIds,
      birthYearIds,
      teamId: data.teamId,
      ageGroupId: data.ageGroupId,
    });
    const assignedCoach = data.coachId
      ? await this.repo.findCoachById(data.coachId, academyId)
      : null;
    if (data.coachId && !assignedCoach) {
      throw new NotFoundError("Coach", data.coachId);
    }

    const match = await this.repo.db.transaction(async (trx) => {
      const event = await this.repo.createEventWithTargets(
        this._matchEventPayload(academyId, data, adminUserId),
        { groupIds, birthYearIds },
        trx,
      );
      const [row] = await trx("matches")
        .insert({
          event_id: event.id,
          ...this._matchPayload(data, adminUserId),
          target_snapshot: JSON.stringify(targetSnapshot),
        })
        .returning("*");
      if (assignedCoach) {
        await trx("admin_match_coach_requests").insert({
          academy_id: academyId,
          coach_id: assignedCoach.id,
          requested_by_admin_id: adminUserId,
          opponent_name: data.opponentName,
          match_type: data.matchType,
          match_date: data.matchDate,
          match_time: toTime(data.matchTime),
          location: data.location,
          venue_type: data.venueType,
          referee_name: data.refereeName || null,
          organizer_notes: data.organizerNotes || null,
          status: "accepted",
          selected_group_id: groupIds.length === 1 ? groupIds[0] : null,
          selected_birth_year_id:
            birthYearIds.length === 1 ? birthYearIds[0] : null,
          created_match_id: row.id,
          expires_at: addHours(new Date().toISOString(), 24),
        });
      }
      if (groupIds.length) {
        await this._notifyGroups(
          groupIds,
          "New match scheduled",
          `${data.opponentName} on ${data.matchDate}`,
          "match",
          { matchId: row.id, eventId: event.id },
          trx,
        );
      }
      if (birthYearIds.length) {
        const users = await this.repo.usersForBirthYears(
          academyId,
          birthYearIds,
        );
        await this._notifyUsers(
          [
            ...users.coaches.map((user) => user.user_id),
            ...users.players.map((user) => user.user_id),
            ...users.parents.map((user) => user.user_id),
          ],
          "New match scheduled",
          `${data.opponentName} on ${data.matchDate}`,
          "match",
          { matchId: row.id, eventId: event.id },
          trx,
        );
      }
      if (assignedCoach?.user_id) {
        await this._notifyUsers(
          [assignedCoach.user_id],
          "New match assigned",
          `${data.opponentName} on ${data.matchDate}`,
          "match",
          { matchId: row.id, eventId: event.id },
          trx,
        );
      }
      return row;
    });

    return this.adminGetMatch(academyId, match.id);
  }

  async adminListCoachMatchRequests(academyId, filters) {
    await this.repo.expireAdminMatchCoachRequests({ academyId });
    return this.repo.paginate(
      this.repo.adminMatchCoachRequestsQuery(academyId, filters),
      filters,
      "amcr.id",
    );
  }

  async adminCreateCoachMatchRequest(academyId, adminUserId, data) {
    const coach = await this.repo.findCoachById(data.coachId, academyId);
    if (!coach) throw new NotFoundError("Coach", data.coachId);
    const [row] = await this.repo
      .db("admin_match_coach_requests")
      .insert({
        academy_id: academyId,
        coach_id: data.coachId,
        requested_by_admin_id: adminUserId,
        opponent_name: data.opponentName,
        match_type: data.matchType,
        match_date: data.matchDate,
        match_time: toTime(data.matchTime),
        location: data.location,
        venue_type: data.venueType,
        referee_name: data.refereeName || null,
        organizer_notes: data.organizerNotes || null,
        status: "pending",
        expires_at: addHours(new Date().toISOString(), 24),
      })
      .returning("*");
    if (coach.user_id) {
      await this._notifyUsers(
        [coach.user_id],
        "Match target required",
        `${data.opponentName} needs a group or birthday within 24 hours.`,
        "match",
        { requestId: row.id },
      );
    }
    return this.repo.findAdminMatchCoachRequestById(row.id, academyId);
  }

  async adminUpdateMatch(academyId, matchId, data) {
    const match = await this.adminGetMatch(academyId, matchId);
    if (
      data.status &&
      data.status !== "finished" &&
      (["completed", "finished"].includes(match.status) ||
        match.match_status === "finished")
    ) {
      throw new BadRequestError("Finished matches cannot be cancelled or postponed");
    }
    const currentGroupIds = await this.repo.getMatchGroupIds(matchId);
    const currentBirthYearIds = await this.repo.getMatchBirthYearIds(matchId);
    const targetsChanged =
      data.groupIds !== undefined ||
      data.teamId !== undefined ||
      data.ageGroupId !== undefined ||
      data.birthYearIds !== undefined;
    const birthYearIds =
      data.birthYearIds !== undefined
        ? uniq(data.birthYearIds || [])
        : currentBirthYearIds;
    const groupIds = targetsChanged
      ? await this._resolveAdminMatchGroupIds(academyId, {
          groupIds: data.groupIds !== undefined ? data.groupIds : currentGroupIds,
          teamId: data.teamId !== undefined ? data.teamId : match.team_id,
          ageGroupId:
            data.ageGroupId !== undefined ? data.ageGroupId : match.age_group_id,
          birthYearIds,
        })
      : currentGroupIds;
    if (groupIds.length) await this._validateAcademyGroups(groupIds, academyId);
    if (birthYearIds.length)
      await this._validateAcademyBirthYears(birthYearIds, academyId);
    const targetSnapshot = targetsChanged
      ? await this._buildMatchTargetSnapshot(academyId, {
          groupIds,
          birthYearIds,
          teamId: data.teamId !== undefined ? data.teamId : match.team_id,
          ageGroupId:
            data.ageGroupId !== undefined ? data.ageGroupId : match.age_group_id,
        })
      : null;
    const finalTargetSnapshot =
      data.status === "finished" && !targetSnapshot
        ? await this._buildMatchTargetSnapshot(academyId, {
            groupIds,
            birthYearIds,
            teamId: data.teamId !== undefined ? data.teamId : match.team_id,
            ageGroupId:
              data.ageGroupId !== undefined
                ? data.ageGroupId
                : match.age_group_id,
          })
        : null;

    await this.repo.db.transaction(async (trx) => {
      const updateData = {};
      if (data.teamId !== undefined) updateData.team_id = data.teamId || null;
      if (data.ageGroupId !== undefined)
        updateData.age_group_id = data.ageGroupId || null;
      if (data.opponentName !== undefined)
        updateData.opponent_name = data.opponentName;
      if (data.matchType !== undefined) updateData.match_type = data.matchType;
      if (data.matchDate !== undefined) updateData.match_date = data.matchDate;
      if (data.matchTime !== undefined)
        updateData.match_time = toTime(data.matchTime);
      if (data.location !== undefined) updateData.location = data.location;
      if (data.venueType !== undefined) updateData.venue_type = data.venueType;
      if (data.refereeName !== undefined)
        updateData.referee_name = data.refereeName || null;
      if (data.status !== undefined) {
        updateData.status = data.status === "finished" ? "completed" : data.status;
        updateData.match_status = matchStatusFromCore(data.status);
        if (data.status === "finished") {
          updateData.finished_at = match.finished_at || new Date();
        }
      }
      if (data.organizerNotes !== undefined)
        updateData.organizer_notes = data.organizerNotes || null;
      if (data.matchNotes !== undefined)
        updateData.match_notes = data.matchNotes || null;
      if (data.ourScore !== undefined) updateData.our_score = data.ourScore;
      if (data.opponentScore !== undefined)
        updateData.opponent_score = data.opponentScore;
      if (targetSnapshot || finalTargetSnapshot) {
        updateData.target_snapshot = JSON.stringify(
          targetSnapshot || finalTargetSnapshot,
        );
      }
      await trx("matches")
        .where({ id: matchId })
        .update({ ...updateData, updated_at: new Date() });
      if (data.status === "finished") {
        await this._refreshMatchSquadSnapshots(matchId, trx);
      }

      const eventUpdate = {};
      if (data.opponentName || data.matchType)
        eventUpdate.title = `${data.opponentName || match.opponent_name} (${(data.matchType || match.match_type).replace("_", " ")})`;
      if (data.matchDate || data.matchTime) {
        const start = combineDateTime(
          data.matchDate || match.match_date,
          data.matchTime || match.match_time,
        );
        eventUpdate.start_datetime = start;
        eventUpdate.end_datetime = addHours(start, 2);
      }
      if (data.location !== undefined) eventUpdate.location = data.location;
      if (data.status !== undefined)
        eventUpdate.status = eventStatusFromMatch(data.status);
      if (data.organizerNotes !== undefined)
        eventUpdate.notes = data.organizerNotes || null;
      if (Object.keys(eventUpdate).length) {
        await trx("calendar_events")
          .where({ id: match.event_id })
          .update({ ...eventUpdate, updated_at: new Date() });
      }
      if (targetsChanged) {
        await this.repo.replaceEventGroups(match.event_id, groupIds, trx);
        await this.repo.replaceEventBirthYears(
          match.event_id,
          birthYearIds,
          trx,
        );
      }
      await this._notifyGroups(
        groupIds,
        "Match updated",
        `${match.opponent_name} details changed`,
        "match",
        { matchId },
        trx,
        true,
      );
    });

    return this.adminGetMatch(academyId, matchId);
  }

  async adminPostponeMatch(academyId, adminUserId, matchId, data) {
    const match = await this.adminGetMatch(academyId, matchId);
    if (
      ["completed", "finished"].includes(match.status) ||
      match.match_status === "finished"
    ) {
      throw new BadRequestError("Finished matches cannot be postponed");
    }
    if (match.status === "cancelled" || match.match_status === "cancelled") {
      throw new BadRequestError("Cancelled matches cannot be postponed");
    }
    if (match.match_status !== "scheduled") {
      throw new BadRequestError("Started matches cannot be postponed");
    }

    const groupIds = await this.repo.getMatchGroupIds(matchId);
    const birthYearIds = await this.repo.getMatchBirthYearIds(matchId);
    const newLocation =
      data.location !== undefined ? data.location || null : match.location;
    const now = new Date();
    const start = combineDateTime(data.matchDate, data.matchTime);

    await this.repo.db.transaction(async (trx) => {
      await trx("match_postponements").insert({
        match_id: matchId,
        previous_date: datePart(match.match_date),
        previous_time: toTime(match.match_time),
        new_date: data.matchDate,
        new_time: toTime(data.matchTime),
        previous_location: match.location || null,
        new_location: newLocation || null,
        reason: data.reason || null,
        postponed_by_user_id: adminUserId,
      });

      await trx("matches")
        .where({ id: matchId })
        .update({
          match_date: data.matchDate,
          match_time: toTime(data.matchTime),
          location: newLocation,
          status: "postponed",
          match_status: "scheduled",
          match_day_notified_at: null,
          started_at: null,
          first_half_started_at: null,
          second_half_started_at: null,
          finished_at: null,
          updated_at: now,
        });

      if (match.event_id) {
        await trx("calendar_events")
          .where({ id: match.event_id })
          .update({
            start_datetime: start,
            end_datetime: addHours(start, 2),
            location: newLocation,
            status: "postponed",
            notes: data.reason || match.organizer_notes || null,
            updated_at: now,
          });
      }

      const notificationBody = `${match.opponent_name} postponed to ${data.matchDate} at ${timePart(data.matchTime)}`;
      await this._notifyGroups(
        groupIds,
        "Match postponed",
        notificationBody,
        "match",
        {
          matchId,
          previousDate: datePart(match.match_date),
          previousTime: timePart(match.match_time),
          newDate: data.matchDate,
          newTime: timePart(data.matchTime),
        },
        trx,
        true,
      );

      if (birthYearIds.length) {
        const users = await this.repo.usersForBirthYears(
          academyId,
          birthYearIds,
        );
        await this._notifyUsers(
          [
            ...users.coaches.map((user) => user.user_id),
            ...users.players.map((user) => user.user_id),
            ...users.parents.map((user) => user.user_id),
          ],
          "Match postponed",
          notificationBody,
          "match",
          {
            matchId,
            previousDate: datePart(match.match_date),
            previousTime: timePart(match.match_time),
            newDate: data.matchDate,
            newTime: timePart(data.matchTime),
          },
          trx,
        );
      }
    });

    return this.adminGetMatch(academyId, matchId);
  }

  async adminDeleteMatch(academyId, matchId) {
    const match = await this.adminGetMatch(academyId, matchId);
    await this.repo.db.transaction(async (trx) => {
      await trx("admin_match_coach_requests")
        .where({ created_match_id: matchId })
        .del();
      await trx("friendly_match_requests")
        .where({ converted_match_id: matchId })
        .del();
      await trx("matches").where({ id: matchId }).update({
        deleted_at: new Date(),
        status: "cancelled",
        match_status: "cancelled",
      });
      if (match.event_id)
        await trx("calendar_events")
          .where({ id: match.event_id })
          .update({ status: "cancelled", deleted_at: new Date() });
    });
    return { message: "Match deleted" };
  }

  async adminHardDeleteMatch(academyId, matchId) {
    const match = await this.repo.findMatchForHardDelete(matchId, academyId);
    if (!match) throw new NotFoundError("Match", matchId);

    await this.repo.db.transaction(async (trx) => {
      await trx("admin_match_coach_requests")
        .where({ created_match_id: matchId })
        .del();
      await trx("friendly_match_requests")
        .where({ converted_match_id: matchId })
        .del();

      if (match.event_id) {
        await trx("calendar_events").where({ id: match.event_id }).del();
      } else {
        await trx("matches").where({ id: matchId }).del();
      }
    });

    return { message: "Match permanently deleted" };
  }

  async adminUpdateMatchStatus(academyId, matchId, status) {
    return this.adminUpdateMatch(academyId, matchId, { status });
  }

  async coachListCalendarEvents(userId, academyId, filters) {
    const coach = await this._getCoach(userId, academyId);
    await this._completeExpiredTrainingEvents(academyId);
    const groupIds = await this._getCoachVisibleGroupIds(coach.id, academyId);
    const birthYearIds = (
      await this.repo.findCoachAccessibleBirthYears(coach.id, academyId)
    ).map((row) => row.id);
    const playerIds = (
      await this.repo.findCoachScopedPlayers(coach.id, academyId, {
        onlyComplete: true,
      })
    ).map((player) => player.id);
    if (!groupIds.length && !birthYearIds.length && !playerIds.length)
      return { data: [], total: 0, page: filters.page || 1, totalPages: 1 };
    return this.repo.paginate(
      this.repo.eventListQuery(academyId, {
        ...filters,
        groupIds,
        birthYearIds,
        playerIds,
      }),
      filters,
      "ce.id",
    );
  }

  async coachListGroups(userId, academyId) {
    const coach = await this._getCoach(userId, academyId);
    return this.repo.findCoachAssignedGroups(coach.id, academyId);
  }

  async coachListPlayers(userId, academyId, filters) {
    const coach = await this._getCoach(userId, academyId);
    const players = await this.repo.findCoachScopedPlayers(
      coach.id,
      academyId,
      filters,
    );
    return {
      data: players,
      total: players.length,
      page: filters.page || 1,
      totalPages: 1,
    };
  }

  async coachGetPlayerDetail(userId, academyId, playerId) {
    const coach = await this._getCoach(userId, academyId);
    const scopedPlayers = await this.repo.findCoachScopedPlayersByIds(
      coach.id,
      academyId,
      [playerId],
    );
    if (!scopedPlayers.length) throw new NotFoundError("Player", playerId);

    const db = this.repo.db;
    const player = await db("player_profiles as pp")
      .leftJoin("auth_users as au", "pp.user_id", "au.id")
      .leftJoin("academy_branches as ab", "pp.branch_id", "ab.id")
      .leftJoin("player_group_assignments as pga", function joinCurrentGroup() {
        this.on("pga.player_id", "=", "pp.id").andOnNull("pga.left_at");
      })
      .leftJoin("academy_groups as ag", "pga.group_id", "ag.id")
      .where("pp.id", playerId)
      .where("pp.academy_id", academyId)
      .whereNull("pp.deleted_at")
      .select(
        "pp.*",
        "au.username",
        "au.phone as account_phone",
        "au.is_active as account_is_active",
        "au.is_verified as account_is_verified",
        "ab.name as branch_name",
        "ag.id as group_id",
        "ag.name as group_name",
        "pga.joined_at as group_joined_at",
      )
      .first();

    const [
      groupAssignments,
      measurements,
      injuries,
      healthProfile,
      skillAssessments,
      trainingSummaries,
      matchSummaries,
      customValues,
      trainingAttendance,
      trainingEvaluations,
      matchStats,
      matchAttendance,
      substitutions,
      incidents,
      goals,
      rankings,
      coachRatings,
      subscriptions,
    ] = await Promise.all([
      db("player_group_assignments as pga")
        .leftJoin("academy_groups as ag", "pga.group_id", "ag.id")
        .leftJoin("academy_branches as ab", "ag.branch_id", "ab.id")
        .where("pga.player_id", playerId)
        .select("pga.*", "ag.name as group_name", "ab.name as branch_name")
        .orderBy("pga.joined_at", "desc"),
      db("player_measurements")
        .where({ player_id: playerId })
        .orderBy("measured_at", "desc"),
      db("player_injury_history")
        .where({ player_id: playerId })
        .orderBy("injury_date", "desc"),
      db("player_health_profiles").where({ player_id: playerId }).first(),
      db("player_skill_assessments as psa")
        .leftJoin("academy_groups as ag", "psa.group_id", "ag.id")
        .where("psa.player_id", playerId)
        .select("psa.*", "ag.name as group_name")
        .orderBy("psa.assessed_at", "desc"),
      db("player_training_summaries as pts")
        .leftJoin("academy_groups as ag", "pts.group_id", "ag.id")
        .where("pts.player_id", playerId)
        .select("pts.*", "ag.name as group_name")
        .orderBy("pts.recorded_at", "desc"),
      db("player_match_summaries as pms")
        .leftJoin("academy_groups as ag", "pms.group_id", "ag.id")
        .where("pms.player_id", playerId)
        .select("pms.*", "ag.name as group_name")
        .orderBy("pms.recorded_at", "desc"),
      db("player_custom_values as pcv")
        .join("custom_fields as cf", "pcv.field_id", "cf.id")
        .join("custom_categories as cc", "cf.category_id", "cc.id")
        .leftJoin("custom_field_options as cfo", "pcv.value_option_id", "cfo.id")
        .where("pcv.player_id", playerId)
        .select(
          "pcv.*",
          "cf.label",
          "cf.key",
          "cf.field_type",
          "cf.unit",
          "cc.name as category_name",
          "cfo.label as option_label",
        )
        .orderBy("cc.sort_order", "asc")
        .orderBy("cf.sort_order", "asc"),
      db("event_attendance as ea")
        .join("calendar_events as ce", "ea.event_id", "ce.id")
        .leftJoin("training_sessions as ts", "ts.event_id", "ce.id")
        .where("ea.player_id", playerId)
        .where("ce.event_type", "training")
        .select(
          "ea.*",
          "ce.title",
          "ce.start_datetime",
          "ce.end_datetime",
          "ce.location",
          "ce.status as event_status",
          "ts.training_focus",
          "ts.intensity_level",
        )
        .orderBy("ce.start_datetime", "desc"),
      db("player_event_evaluations as pee")
        .join("calendar_events as ce", "pee.event_id", "ce.id")
        .leftJoin("coach_profiles as cp", "pee.coach_id", "cp.id")
        .where("pee.player_id", playerId)
        .select("pee.*", "ce.title", "ce.start_datetime", "cp.full_name as coach_name")
        .orderBy("ce.start_datetime", "desc"),
      db("match_player_stats as mps")
        .join("matches as m", "mps.match_id", "m.id")
        .leftJoin("academy_groups as team", "m.team_id", "team.id")
        .where("mps.player_id", playerId)
        .whereNull("m.deleted_at")
        .select(
          "mps.*",
          "m.opponent_name",
          "m.match_date",
          "m.match_time",
          "m.location",
          "m.status",
          "m.match_status",
          "m.our_score",
          "m.opponent_score",
          "team.name as team_name",
        )
        .orderBy("m.match_date", "desc")
        .orderBy("m.match_time", "desc"),
      db("match_attendance as ma")
        .join("matches as m", "ma.match_id", "m.id")
        .where("ma.player_id", playerId)
        .whereNull("m.deleted_at")
        .select("ma.*", "m.opponent_name", "m.match_date", "m.match_time")
        .orderBy("m.match_date", "desc"),
      db("match_substitutions as sub")
        .join("matches as m", "sub.match_id", "m.id")
        .leftJoin("player_profiles as outp", "sub.out_player_id", "outp.id")
        .leftJoin("player_profiles as inp", "sub.in_player_id", "inp.id")
        .where((q) => {
          q.where("sub.out_player_id", playerId).orWhere("sub.in_player_id", playerId);
        })
        .whereNull("m.deleted_at")
        .select(
          "sub.*",
          "m.opponent_name",
          "m.match_date",
          "outp.full_name as out_player_name",
          "inp.full_name as in_player_name",
        )
        .orderBy("m.match_date", "desc")
        .orderBy("sub.minute", "desc"),
      db("match_player_incidents as mpi")
        .join("matches as m", "mpi.match_id", "m.id")
        .where("mpi.player_id", playerId)
        .whereNull("m.deleted_at")
        .select("mpi.*", "m.opponent_name", "m.match_date")
        .orderBy("m.match_date", "desc")
        .orderBy("mpi.minute", "desc"),
      db("match_goal_events as mge")
        .join("matches as m", "mge.match_id", "m.id")
        .where((q) => {
          q.where("mge.scorer_player_id", playerId).orWhere(
            "mge.assist_player_id",
            playerId,
          );
        })
        .whereNull("m.deleted_at")
        .select("mge.*", "m.opponent_name", "m.match_date")
        .orderBy("m.match_date", "desc")
        .orderBy("mge.minute", "desc"),
      db("ranking_snapshots as rs")
        .leftJoin("academy_groups as ag", "rs.group_id", "ag.id")
        .leftJoin("ranking_score_breakdown as rsb", "rsb.ranking_id", "rs.id")
        .where("rs.player_id", playerId)
        .select("rs.*", "ag.name as group_name", "rsb.*")
        .orderBy("rs.period", "desc"),
      db("evaluation_coach_ratings as ecr")
        .leftJoin("coach_profiles as cp", "ecr.coach_id", "cp.id")
        .leftJoin("academy_groups as ag", "ecr.group_id", "ag.id")
        .where("ecr.player_id", playerId)
        .select("ecr.*", "cp.full_name as coach_name", "ag.name as group_name")
        .orderBy("ecr.eval_date", "desc"),
      db("payment_subscriptions as ps")
        .leftJoin("academy_groups as ag", "ps.group_id", "ag.id")
        .where("ps.player_id", playerId)
        .select("ps.*", "ag.name as group_name")
        .orderBy("ps.starts_at", "desc"),
    ]);

    const subscriptionIds = subscriptions.map((row) => row.id);
    const invoices = subscriptionIds.length
      ? await db("payment_invoices")
          .whereIn("subscription_id", subscriptionIds)
          .orderBy("due_date", "desc")
      : [];
    const invoiceIds = invoices.map((row) => row.id);
    const transactions = invoiceIds.length
      ? await db("payment_transactions")
          .whereIn("invoice_id", invoiceIds)
          .orderBy("created_at", "desc")
      : [];

    const optionIds = new Set();
    customValues.forEach((row) => {
      if (row.value_option_id) optionIds.add(row.value_option_id);
      if (typeof row.value_text === "string" && uuidPattern.test(row.value_text)) {
        optionIds.add(row.value_text);
      }
      if (typeof row.value_json === "string" && uuidPattern.test(row.value_json)) {
        optionIds.add(row.value_json);
      }
      if (Array.isArray(row.value_json)) {
        row.value_json
          .filter((value) => typeof value === "string" && uuidPattern.test(value))
          .forEach((value) => optionIds.add(value));
      }
    });
    const optionRows = optionIds.size
      ? await db("custom_field_options")
          .whereIn("id", [...optionIds])
          .select("id", "label")
      : [];
    const optionLabels = new Map(optionRows.map((row) => [row.id, row.label]));

    const valueOf = (row) => {
      if (row.option_label) return row.option_label;
      if (typeof row.value_text === "string" && optionLabels.has(row.value_text)) {
        return optionLabels.get(row.value_text);
      }
      if (typeof row.value_json === "string" && optionLabels.has(row.value_json)) {
        return optionLabels.get(row.value_json);
      }
      if (Array.isArray(row.value_json)) {
        const labels = row.value_json
          .map((value) => optionLabels.get(value) || value)
          .filter(Boolean);
        return labels.length ? labels.join(", ") : null;
      }
      return (
        row.value_text ??
        row.value_long_text ??
        row.value_number ??
        row.value_decimal ??
        row.value_date ??
        row.value_boolean ??
        row.value_json ??
        null
      );
    };

    const matchTotals = matchStats.reduce(
      (totals, row) => ({
        matches_played: totals.matches_played + (Number(row.minutes_played || 0) > 0 ? 1 : 0),
        minutes_played: totals.minutes_played + Number(row.minutes_played || 0),
        goals: totals.goals + Number(row.goals || 0),
        assists: totals.assists + Number(row.assists || 0),
        yellow_cards: totals.yellow_cards + Number(row.yellow_cards || 0),
        red_cards: totals.red_cards + Number(row.red_cards || 0),
      }),
      { matches_played: 0, minutes_played: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 },
    );
    const attendanceTotals = trainingAttendance.reduce(
      (totals, row) => {
        totals.total += 1;
        totals[row.status] = (totals[row.status] || 0) + 1;
        return totals;
      },
      { total: 0, present: 0, late: 0, absent: 0, excused: 0, injured: 0 },
    );

    return {
      player,
      summary: {
        matchTotals,
        attendanceTotals,
        trainingEvaluationCount: trainingEvaluations.length,
        injuryCount: injuries.length + (healthProfile?.current_injury_status === "injured" ? 1 : 0),
        latestMeasurement: measurements[0] || null,
        latestRanking: rankings[0] || null,
      },
      customProfile: customValues.map((row) => ({ ...row, value: valueOf(row) })),
      groups: groupAssignments,
      measurements,
      injuries,
      healthProfile: healthProfile || null,
      skillAssessments,
      trainingSummaries,
      matchSummaries,
      trainingAttendance,
      trainingEvaluations,
      matchStats,
      matchAttendance,
      substitutions,
      incidents,
      goals,
      rankings,
      coachRatings,
      payments: { subscriptions, invoices, transactions },
    };
  }

  async coachListGroupPlayers(userId, academyId, groupId) {
    const coach = await this._getCoach(userId, academyId);
    await this._ensureCoachCanAccessGroups(coach, academyId, [groupId]);
    return this.repo.findGroupPlayers([groupId]);
  }

  async _trainingParticipants(event, academyId) {
    const groupIds = (event.groups || []).map((group) => group.id);
    const birthYearIds = (event.birth_years || []).map((birthYear) => birthYear.id);
    const directPlayerIds = (event.players || []).map((player) => player.id);
    const [groupPlayers, birthYearPlayers, directPlayers] = await Promise.all([
      this.repo.findGroupPlayers(groupIds, { onlyComplete: true }),
      this.repo.findPlayersForBirthYears(academyId, birthYearIds, {
        onlyComplete: true,
      }),
      directPlayerIds.length
        ? this.repo
            .db("player_profiles")
            .whereIn("id", directPlayerIds)
            .where("academy_id", academyId)
            .whereNull("deleted_at")
            .where("profile_status", "complete")
        : [],
    ]);
    const playerIds = [
      ...new Set(
        [...groupPlayers, ...birthYearPlayers, ...directPlayers].map(
          (player) => player.id,
        ),
      ),
    ];
    if (!playerIds.length) return [];

    const [
      players,
      customValues,
      trainingAttendance,
      matchStats,
      injuryCounts,
      monthlyProgress,
    ] = await Promise.all([
      this.repo
        .db("player_profiles as pp")
        .leftJoin("auth_users as au", "pp.user_id", "au.id")
        .leftJoin(
          "player_group_assignments as pga",
          function joinCurrentAssignment() {
            this.on("pga.player_id", "=", "pp.id").andOnNull("pga.left_at");
          },
        )
        .leftJoin("academy_groups as ag", "pga.group_id", "ag.id")
        .whereIn("pp.id", playerIds)
        .select(
          "pp.*",
          "au.username",
          "au.phone as account_phone",
          "ag.name as group_name",
        )
        .orderBy("pp.full_name", "asc"),
      this.repo
        .db("player_custom_values as pcv")
        .join("custom_fields as cf", "pcv.field_id", "cf.id")
        .leftJoin("custom_field_options as cfo", "pcv.value_option_id", "cfo.id")
        .whereIn("pcv.player_id", playerIds)
        .select(
          "pcv.player_id",
          "pcv.field_id",
          "cf.label",
          "cf.key",
          "cf.field_type",
          "cfo.label as option_label",
          "pcv.value_text",
          "pcv.value_long_text",
          "pcv.value_number",
          "pcv.value_decimal",
          "pcv.value_date",
          "pcv.value_boolean",
          "pcv.value_option_id",
          "pcv.value_json",
        ),
      this.repo
        .db("event_attendance as ea")
        .join("calendar_events as ce", "ea.event_id", "ce.id")
        .whereIn("ea.player_id", playerIds)
        .where("ce.event_type", "training")
        .groupBy("ea.player_id")
        .select(
          "ea.player_id",
          this.repo.db.raw("COUNT(*)::int as total"),
          this.repo.db.raw(
            "COUNT(*) FILTER (WHERE ea.status = 'present')::int as present",
          ),
          this.repo.db.raw(
            "COUNT(*) FILTER (WHERE ea.status = 'late')::int as late",
          ),
          this.repo.db.raw(
            "COUNT(*) FILTER (WHERE ea.status = 'absent')::int as absent",
          ),
          this.repo.db.raw(
            "COUNT(*) FILTER (WHERE ea.status = 'injured')::int as injured",
          ),
        ),
      this.repo
        .db("match_player_stats as mps")
        .whereIn("mps.player_id", playerIds)
        .groupBy("mps.player_id")
        .select(
          "mps.player_id",
          this.repo.db.raw("COUNT(*) FILTER (WHERE mps.minutes_played > 0)::int as matches_played"),
          this.repo.db.raw("COALESCE(SUM(mps.minutes_played), 0)::int as minutes_played"),
          this.repo.db.raw("COALESCE(SUM(mps.goals), 0)::int as goals"),
          this.repo.db.raw("COALESCE(SUM(mps.assists), 0)::int as assists"),
          this.repo.db.raw("ROUND(AVG(mps.performance_rating), 2) as average_rating"),
          this.repo.db.raw("ROUND(AVG(mps.pass_accuracy_percentage), 2) as pass_accuracy_percentage"),
          this.repo.db.raw("COALESCE(SUM(mps.tackles), 0)::int as tackles"),
        ),
      this.repo
        .db("match_player_incidents")
        .whereIn("player_id", playerIds)
        .where("incident_type", "injury")
        .groupBy("player_id")
        .select("player_id", this.repo.db.raw("COUNT(*)::int as injuries")),
      this.repo
        .db("player_event_evaluations as pee")
        .join("calendar_events as ce", "pee.event_id", "ce.id")
        .whereIn("pee.player_id", playerIds)
        .groupBy("pee.player_id", this.repo.db.raw("date_trunc('month', ce.start_datetime)"))
        .select(
          "pee.player_id",
          this.repo.db.raw("to_char(date_trunc('month', ce.start_datetime), 'YYYY-MM') as month"),
          this.repo.db.raw("ROUND(AVG(pee.overall_rating), 2) as average_rating"),
        )
        .orderBy("month", "asc"),
    ]);

    const byPlayer = (rows) =>
      rows.reduce((map, row) => {
        const list = map.get(row.player_id) || [];
        list.push(row);
        map.set(row.player_id, list);
        return map;
      }, new Map());
    const customByPlayer = byPlayer(customValues);
    const progressByPlayer = byPlayer(monthlyProgress);
    const attendanceByPlayer = new Map(
      trainingAttendance.map((row) => [row.player_id, row]),
    );
    const statsByPlayer = new Map(matchStats.map((row) => [row.player_id, row]));
    const injuriesByPlayer = new Map(
      injuryCounts.map((row) => [row.player_id, row]),
    );
    const currentAttendance = new Map(
      (event.attendance || []).map((row) => [row.player_id, row]),
    );
    const currentEvaluation = new Map(
      (event.evaluations || []).map((row) => [row.player_id, row]),
    );

    const optionIds = new Set();
    customValues.forEach((row) => {
      if (row.value_option_id) optionIds.add(row.value_option_id);
      if (typeof row.value_text === "string" && uuidPattern.test(row.value_text)) {
        optionIds.add(row.value_text);
      }
      if (typeof row.value_json === "string" && uuidPattern.test(row.value_json)) {
        optionIds.add(row.value_json);
      }
      if (Array.isArray(row.value_json)) {
        row.value_json
          .filter((value) => typeof value === "string" && uuidPattern.test(value))
          .forEach((value) => optionIds.add(value));
      }
    });
    const optionRows = optionIds.size
      ? await this.repo
          .db("custom_field_options")
          .whereIn("id", [...optionIds])
          .select("id", "label")
      : [];
    const optionLabels = new Map(optionRows.map((row) => [row.id, row.label]));

    const valueOf = (row) => {
      if (row.option_label) return row.option_label;
      if (typeof row.value_text === "string" && optionLabels.has(row.value_text)) {
        return optionLabels.get(row.value_text);
      }
      if (typeof row.value_json === "string" && optionLabels.has(row.value_json)) {
        return optionLabels.get(row.value_json);
      }
      if (Array.isArray(row.value_json)) {
        const labels = row.value_json
          .map((value) => optionLabels.get(value) || value)
          .filter(Boolean);
        return labels.length ? labels.join(", ") : null;
      }
      return (
        row.value_text ??
        row.value_long_text ??
        row.value_number ??
        row.value_decimal ??
        row.value_date ??
        row.value_boolean ??
        row.value_json ??
        null
      );
    };

    return players.map((player) => ({
      ...player,
      attendance: currentAttendance.get(player.id) || null,
      evaluation: currentEvaluation.get(player.id) || null,
      customProfile: (customByPlayer.get(player.id) || []).map((row) => ({
        label: row.label,
        key: row.key,
        fieldType: row.field_type,
        value: valueOf(row),
      })),
      totals: {
        attendance: attendanceByPlayer.get(player.id) || {
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
          injured: 0,
        },
        matches: statsByPlayer.get(player.id) || {
          matches_played: 0,
          minutes_played: 0,
          goals: 0,
          assists: 0,
          average_rating: null,
          pass_accuracy_percentage: null,
          tackles: 0,
        },
        injuries: Number(injuriesByPlayer.get(player.id)?.injuries || 0),
      },
      monthlyProgress: progressByPlayer.get(player.id) || [],
    }));
  }

  async _trainingEventWithParticipants(event, academyId) {
    return {
      ...event,
      participants: await this._trainingParticipants(event, academyId),
    };
  }

  async coachCreateTrainingEvent(userId, academyId, data) {
    const coach = await this._getCoach(userId, academyId);
    const targets = await this._resolveCoachTrainingTargets(
      coach,
      academyId,
      data,
      "can_create_training",
    );
    await this._validateAcademyGroups(targets.groupIds, academyId);
    await this._validateAcademyBirthYears(targets.birthYearIds, academyId);
    const start = combineDateTime(data.date, data.startTime);
    const end = combineDateTime(data.date, data.endTime);
    if (new Date(end) <= new Date(start))
      throw new BadRequestError("End time must be after start time");

    const event = await this.repo.db.transaction(async (trx) => {
      const row = await this.repo.createEventWithTargets(
        {
          academy_id: academyId,
          title: data.title,
          event_type: "training",
          start_datetime: start,
          end_datetime: end,
          location: data.location || null,
          status: "scheduled",
          visibility:
            targets.groupIds.length &&
            !targets.birthYearIds.length &&
            !targets.playerIds.length &&
            (data.allGroups ||
              normalizeTargetType(data.targetType) === "all_my_assigned_groups")
              ? "all_assigned_groups"
              : "selected_groups",
          created_by_user_id: userId,
          created_by_role: "coach",
          notes: data.notes || null,
        },
        targets,
        trx,
      );

      await trx("training_sessions").insert({
        event_id: row.id,
        coach_id: coach.id,
        training_focus: data.trainingFocus,
        intensity_level: data.intensityLevel,
        objectives: data.objectives || null,
        session_plan: data.sessionPlan || null,
        equipment_needed: data.equipmentNeeded || null,
        coach_notes: data.notes || null,
      });
      await this._notifyTrainingTargets(
        academyId,
        targets,
        "New training session",
        data.title,
        { eventId: row.id },
        trx,
      );
      return row;
    });

    return this.repo.findEventById(event.id, academyId);
  }

  async coachGetTrainingEvent(userId, academyId, eventId) {
    const coach = await this._getCoach(userId, academyId);
    const { event } = await this._ensureCoachCanAccessEvent(
      coach,
      academyId,
      eventId,
    );
    if (event.event_type !== "training")
      throw new NotFoundError("Training event", eventId);
    const completed = await this._completeExpiredTrainingEvents(academyId, {
      eventId,
    });
    const activeEvent = completed.has(eventId)
      ? await this.repo.findEventById(eventId, academyId)
      : event;
    return this._trainingEventWithParticipants(activeEvent, academyId);
  }

  async coachUpdateTrainingEvent(userId, academyId, eventId, data) {
    const coach = await this._getCoach(userId, academyId);
    const { event } = await this._ensureCoachCanAccessEvent(
      coach,
      academyId,
      eventId,
      "can_create_training",
    );
    if (event.created_by_user_id !== userId)
      throw new ForbiddenError(
        "Coach can only edit training events he created",
      );
    if (event.status === "cancelled")
      throw new BadRequestError("Cancelled events cannot be edited");
    if (event.status === "finished" || event.status === "completed")
      throw new BadRequestError("Closed training sessions cannot be edited");
    if (
      event.event_type === "training" &&
      data.endTime !== undefined &&
      new Date() >= trainingStartsAt(event) &&
      new Date() < trainingEndsAt(event)
    ) {
      throw new BadRequestError(
        "Use the training extension action to change a live training end time",
      );
    }

    let targets = null;
    if (
      data.targetType ||
      data.groupIds ||
      data.birthYearIds ||
      data.playerIds ||
      data.allGroups !== undefined ||
      data.allBirthYears !== undefined ||
      data.allPlayers !== undefined
    ) {
      targets = await this._resolveCoachTrainingTargets(
        coach,
        academyId,
        {
          targetType: data.targetType,
          groupIds:
            data.groupIds !== undefined
              ? data.groupIds
              : (event.groups || []).map((group) => group.id),
          birthYearIds:
            data.birthYearIds !== undefined
              ? data.birthYearIds
              : (event.birth_years || []).map((birthYear) => birthYear.id),
          playerIds:
            data.playerIds !== undefined
              ? data.playerIds
              : (event.players || []).map((player) => player.id),
          allGroups: data.allGroups,
          allBirthYears: data.allBirthYears,
          allPlayers: data.allPlayers,
        },
        "can_create_training",
      );
    }

    await this.repo.db.transaction(async (trx) => {
      const eventUpdate = {};
      if (data.title !== undefined) eventUpdate.title = data.title;
      if (data.date || data.startTime)
        eventUpdate.start_datetime = combineDateTime(
          data.date || event.start_datetime,
          data.startTime || timePart(event.start_datetime),
        );
      if (data.date || data.endTime)
        eventUpdate.end_datetime = combineDateTime(
          data.date || event.start_datetime,
          data.endTime || timePart(event.end_datetime),
        );
      if (data.location !== undefined)
        eventUpdate.location = data.location || null;
      if (data.notes !== undefined) eventUpdate.notes = data.notes || null;
      if (targets)
        eventUpdate.visibility =
          targets?.groupIds.length &&
          !targets.birthYearIds.length &&
          !targets.playerIds.length &&
          (data.allGroups ||
            normalizeTargetType(data.targetType) === "all_my_assigned_groups")
            ? "all_assigned_groups"
            : "selected_groups";
      if (Object.keys(eventUpdate).length)
        await trx("calendar_events")
          .where({ id: eventId })
          .update({ ...eventUpdate, updated_at: new Date() });

      const trainingUpdate = {};
      if (data.trainingFocus !== undefined)
        trainingUpdate.training_focus = data.trainingFocus;
      if (data.intensityLevel !== undefined)
        trainingUpdate.intensity_level = data.intensityLevel;
      if (data.objectives !== undefined)
        trainingUpdate.objectives = data.objectives || null;
      if (data.sessionPlan !== undefined)
        trainingUpdate.session_plan = data.sessionPlan || null;
      if (data.equipmentNeeded !== undefined)
        trainingUpdate.equipment_needed = data.equipmentNeeded || null;
      if (data.notes !== undefined)
        trainingUpdate.coach_notes = data.notes || null;
      if (Object.keys(trainingUpdate).length)
        await trx("training_sessions")
          .where({ event_id: eventId })
          .update({ ...trainingUpdate, updated_at: new Date() });
      if (targets) await this.repo.replaceEventTargets(eventId, targets, trx);
      const notifyTargets =
        targets || {
          groupIds: event.groups.map((group) => group.id),
          birthYearIds: (event.birth_years || []).map((row) => row.id),
          playerIds: (event.players || []).map((row) => row.id),
        };
      await this._notifyTrainingTargets(
        academyId,
        notifyTargets,
        "Training updated",
        event.title,
        { eventId },
        trx,
      );
    });

    return this._trainingEventWithParticipants(
      await this.repo.findEventById(eventId, academyId),
      academyId,
    );
  }

  async coachUpdateTrainingEventStatus(userId, academyId, eventId, status) {
    const coach = await this._getCoach(userId, academyId);
    const { event } = await this._ensureCoachCanAccessEvent(
      coach,
      academyId,
      eventId,
      "can_create_training",
    );
    if (event.created_by_user_id !== userId)
      throw new ForbiddenError(
        "Coach can only update training events he created",
      );
    await this.repo
      .db("calendar_events")
      .where({ id: eventId })
      .update({
        status: calendarEventStatusForDb(status),
        updated_at: new Date(),
      });
    await this._notifyTrainingTargets(
      academyId,
      {
        groupIds: event.groups.map((group) => group.id),
        birthYearIds: (event.birth_years || []).map((row) => row.id),
        playerIds: (event.players || []).map((row) => row.id),
      },
      "Training status updated",
      `${event.title}: ${status}`,
      { eventId },
      this.repo.db,
    );
    return this._trainingEventWithParticipants(
      await this.repo.findEventById(eventId, academyId),
      academyId,
    );
  }

  async coachExtendTrainingEvent(userId, academyId, eventId, minutes) {
    const coach = await this._getCoach(userId, academyId);
    const { event } = await this._ensureCoachCanAccessEvent(
      coach,
      academyId,
      eventId,
      "can_create_training",
    );
    if (event.event_type !== "training")
      throw new NotFoundError("Training event", eventId);
    if (event.created_by_user_id !== userId)
      throw new ForbiddenError("Coach can only extend training events he created");
    if (event.status === "cancelled")
      throw new BadRequestError("Cancelled events cannot be extended");
    if (event.status === "finished" || event.status === "completed")
      throw new BadRequestError("Closed training sessions cannot be extended");

    const now = new Date();
    const startAt = trainingStartsAt(event);
    const currentEndAt = trainingEndsAt(event);
    if (now < startAt || now >= currentEndAt) {
      throw new BadRequestError("Training can only be extended while it is open");
    }

    await this.repo.db.transaction(async (trx) => {
      const training = await trx("training_sessions")
        .where({ event_id: eventId })
        .forUpdate()
        .first();
      if (!training) throw new NotFoundError("Training session", eventId);

      const originalEndAt = training.original_end_datetime
        ? new Date(training.original_end_datetime)
        : currentEndAt;
      const maxEndAt = addMinutes(originalEndAt, 60);
      const requestedEndAt = addMinutes(currentEndAt, minutes);
      const newEndAt = requestedEndAt > maxEndAt ? maxEndAt : requestedEndAt;
      if (newEndAt <= currentEndAt) {
        throw new BadRequestError("Training extension limit is one hour");
      }
      const extendedMinutes = Math.round(
        (newEndAt.getTime() - originalEndAt.getTime()) / 60000,
      );

      await trx("calendar_events").where({ id: eventId }).update({
        end_datetime: newEndAt,
        updated_at: now,
      });
      await trx("training_sessions").where({ event_id: eventId }).update({
        original_end_datetime: training.original_end_datetime || currentEndAt,
        extended_minutes: extendedMinutes,
        last_extended_at: now,
        updated_at: now,
      });
    });

    return this._trainingEventWithParticipants(
      await this.repo.findEventById(eventId, academyId),
      academyId,
    );
  }

  async coachUpsertEventAttendance(userId, academyId, eventId, records) {
    const coach = await this._getCoach(userId, academyId);
    const { event, groupIds, birthYearIds, playerIds } = await this._ensureCoachCanAccessEvent(
      coach,
      academyId,
      eventId,
      "can_take_attendance",
    );
    this._ensureTrainingEventOpen(event);
    await this._ensurePlayersInEventTargets(
      records.map((record) => record.playerId),
      { groupIds, birthYearIds, directPlayerIds: playerIds },
      academyId,
    );

    const rows = records.map((record) => ({
      event_id: eventId,
      player_id: record.playerId,
      status: record.status,
      arrival_time: record.arrivalTime || null,
      marked_by_coach_id: coach.id,
      reason: record.reason || null,
      notes: record.notes || null,
    }));

    const result = await this.repo
      .db("event_attendance")
      .insert(rows)
      .onConflict(["event_id", "player_id"])
      .merge({
        status: this.repo.db.raw("excluded.status"),
        arrival_time: this.repo.db.raw("excluded.arrival_time"),
        marked_by_coach_id: this.repo.db.raw("excluded.marked_by_coach_id"),
        reason: this.repo.db.raw("excluded.reason"),
        notes: this.repo.db.raw("excluded.notes"),
        updated_at: new Date(),
      })
      .returning("*");
    await this._notifyGroups(
      groupIds,
      "Attendance marked",
      event.title,
      "attendance",
      { eventId },
      this.repo.db,
      true,
    );
    return result;
  }

  async coachUpdateEventAttendance(userId, academyId, eventId, playerId, data) {
    const coach = await this._getCoach(userId, academyId);
    const { event, groupIds, birthYearIds, playerIds } = await this._ensureCoachCanAccessEvent(
      coach,
      academyId,
      eventId,
      "can_take_attendance",
    );
    this._ensureTrainingEventOpen(event);
    await this._ensurePlayersInEventTargets(
      [playerId],
      { groupIds, birthYearIds, directPlayerIds: playerIds },
      academyId,
    );
    const [row] = await this.repo
      .db("event_attendance")
      .where({ event_id: eventId, player_id: playerId })
      .update({
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.arrivalTime !== undefined
          ? { arrival_time: data.arrivalTime }
          : {}),
        ...(data.reason !== undefined ? { reason: data.reason } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        marked_by_coach_id: coach.id,
        updated_at: new Date(),
      })
      .returning("*");
    if (!row) throw new NotFoundError("Attendance record");
    return row;
  }

  async coachUpsertEventEvaluations(userId, academyId, eventId, records) {
    const coach = await this._getCoach(userId, academyId);
    const { event, groupIds, birthYearIds, playerIds } = await this._ensureCoachCanAccessEvent(
      coach,
      academyId,
      eventId,
      "can_evaluate_players",
    );
    this._ensureTrainingEventOpen(event);
    await this._ensurePlayersInEventTargets(
      records.map((record) => record.playerId),
      { groupIds, birthYearIds, directPlayerIds: playerIds },
      academyId,
      { requireComplete: true },
    );

    const rows = records.map((record) => ({
      event_id: eventId,
      player_id: record.playerId,
      coach_id: coach.id,
      overall_rating: record.overallRating ?? null,
      technical_rating: record.technicalRating ?? null,
      tactical_rating: record.tacticalRating ?? null,
      physical_rating: record.physicalRating ?? null,
      mentality_rating: record.mentalityRating ?? null,
      discipline_rating: record.disciplineRating ?? null,
      teamwork_rating: record.teamworkRating ?? null,
      impact_rating: record.impactRating ?? null,
      ball_control_rating: record.ballControlRating ?? null,
      passing_accuracy_rating: record.passingAccuracyRating ?? null,
      shooting_rating: record.shootingRating ?? null,
      dribbling_rating: record.dribblingRating ?? null,
      receiving_under_pressure_rating:
        record.receivingUnderPressureRating ?? null,
      speed_rating: record.speedRating ?? null,
      endurance_rating: record.enduranceRating ?? null,
      strength_rating: record.strengthRating ?? null,
      agility_rating: record.agilityRating ?? null,
      strengths: record.strengths || null,
      weaknesses: record.weaknesses || null,
      coach_notes: record.coachNotes || null,
      improvement_plan: record.improvementPlan || null,
      development_notes: record.developmentNotes || null,
      visibility: record.visibility,
    }));
    const result = await this.repo
      .db("player_event_evaluations")
      .insert(rows)
      .onConflict(["event_id", "player_id", "coach_id"])
      .merge()
      .returning("*");
    await this._notifyGroups(
      groupIds,
      "Player evaluation added",
      event.title,
      "evaluation",
      { eventId },
      this.repo.db,
      true,
    );
    return result;
  }

  async coachUpdateEvaluation(userId, academyId, evaluationId, data) {
    const coach = await this._getCoach(userId, academyId);
    const [row] = await this.repo
      .db("player_event_evaluations")
      .where({ id: evaluationId, coach_id: coach.id })
      .update({
        ...(data.overallRating !== undefined
          ? { overall_rating: data.overallRating }
          : {}),
        ...(data.technicalRating !== undefined
          ? { technical_rating: data.technicalRating }
          : {}),
        ...(data.tacticalRating !== undefined
          ? { tactical_rating: data.tacticalRating }
          : {}),
        ...(data.physicalRating !== undefined
          ? { physical_rating: data.physicalRating }
          : {}),
        ...(data.mentalityRating !== undefined
          ? { mentality_rating: data.mentalityRating }
          : {}),
        ...(data.disciplineRating !== undefined
          ? { discipline_rating: data.disciplineRating }
          : {}),
        ...(data.teamworkRating !== undefined
          ? { teamwork_rating: data.teamworkRating }
          : {}),
        ...(data.impactRating !== undefined
          ? { impact_rating: data.impactRating }
          : {}),
        ...(data.ballControlRating !== undefined
          ? { ball_control_rating: data.ballControlRating }
          : {}),
        ...(data.passingAccuracyRating !== undefined
          ? { passing_accuracy_rating: data.passingAccuracyRating }
          : {}),
        ...(data.shootingRating !== undefined
          ? { shooting_rating: data.shootingRating }
          : {}),
        ...(data.dribblingRating !== undefined
          ? { dribbling_rating: data.dribblingRating }
          : {}),
        ...(data.receivingUnderPressureRating !== undefined
          ? {
              receiving_under_pressure_rating:
                data.receivingUnderPressureRating,
            }
          : {}),
        ...(data.speedRating !== undefined
          ? { speed_rating: data.speedRating }
          : {}),
        ...(data.enduranceRating !== undefined
          ? { endurance_rating: data.enduranceRating }
          : {}),
        ...(data.strengthRating !== undefined
          ? { strength_rating: data.strengthRating }
          : {}),
        ...(data.agilityRating !== undefined
          ? { agility_rating: data.agilityRating }
          : {}),
        ...(data.strengths !== undefined ? { strengths: data.strengths } : {}),
        ...(data.weaknesses !== undefined
          ? { weaknesses: data.weaknesses }
          : {}),
        ...(data.coachNotes !== undefined
          ? { coach_notes: data.coachNotes }
          : {}),
        ...(data.improvementPlan !== undefined
          ? { improvement_plan: data.improvementPlan }
          : {}),
        ...(data.developmentNotes !== undefined
          ? { development_notes: data.developmentNotes }
          : {}),
        ...(data.visibility !== undefined
          ? { visibility: data.visibility }
          : {}),
        updated_at: new Date(),
      })
      .returning("*");
    if (!row) throw new NotFoundError("Evaluation", evaluationId);
    return row;
  }

  async coachListMatches(userId, academyId, filters) {
    const coach = await this._getCoach(userId, academyId);
    await this._finalizeOverdueMatches(academyId);
    const groupIds = await this._getCoachVisibleGroupIds(coach.id, academyId);
    const birthYearIds = (
      await this.repo.findCoachAccessibleBirthYears(coach.id, academyId)
    ).map((row) => row.id);
    if (!groupIds.length && !birthYearIds.length)
      return { data: [], total: 0, page: filters.page || 1, totalPages: 1 };
    const result = await this.repo.paginate(
      this.repo.matchListQuery(academyId, {
        ...filters,
        groupIds,
        birthYearIds,
      }),
      filters,
      "m.id",
    );
    const notifiedMatches = await this._notifyMatchDayIfDue(
      academyId,
      result.data,
    );
    if (notifiedMatches.size) {
      result.data = result.data.map((match) =>
        notifiedMatches.has(match.id)
          ? {
              ...match,
              match_day_notified_at: notifiedMatches.get(match.id),
            }
          : match,
      );
    }
    return result;
  }

  async coachListAdminMatchRequests(userId, academyId, filters) {
    const coach = await this._getCoach(userId, academyId);
    await this.repo.expireAdminMatchCoachRequests({
      academyId,
      coachId: coach.id,
    });
    return this.repo.paginate(
      this.repo.adminMatchCoachRequestsQuery(academyId, {
        ...filters,
        coachId: coach.id,
      }),
      filters,
      "amcr.id",
    );
  }

  async coachAcceptAdminMatchRequest(userId, academyId, requestId, data) {
    const coach = await this._getCoach(userId, academyId);
    await this.repo.expireAdminMatchCoachRequests({
      academyId,
      coachId: coach.id,
    });
    const request = await this.repo.findAdminMatchCoachRequestById(
      requestId,
      academyId,
    );
    if (!request || request.coach_id !== coach.id)
      throw new NotFoundError("Match request", requestId);
    if (request.status !== "pending")
      throw new BadRequestError("This match request is no longer pending");
    if (new Date(request.expires_at) <= new Date())
      throw new BadRequestError("This match request has expired");

    let matchData = {
      opponentName: request.opponent_name,
      matchType: request.match_type,
      matchDate: datePart(request.match_date),
      matchTime: timePart(request.match_time),
      location: request.location,
      venueType: request.venue_type,
      refereeName: request.referee_name || undefined,
      status: "scheduled",
      organizerNotes: request.organizer_notes || undefined,
    };

    let selected = {};
    if (data.groupId) {
      await this._ensureCoachCanAccessGroups(coach, academyId, [data.groupId]);
      matchData.groupIds = [data.groupId];
      selected = { selected_group_id: data.groupId };
    } else {
      await this._ensureCoachCanAccessBirthYears(coach, academyId, [
        data.birthYearId,
      ]);
      matchData.birthYearIds = [data.birthYearId];
      selected = { selected_birth_year_id: data.birthYearId };
    }

    const match = await this.adminCreateMatch(
      academyId,
      request.requested_by_admin_id,
      matchData,
    );
    await this.repo
      .db("admin_match_coach_requests")
      .where({ id: requestId })
      .update({
        ...selected,
        created_match_id: match.id,
        status: "accepted",
        updated_at: new Date(),
      });
    return match;
  }

  async coachGetMatch(userId, academyId, matchId) {
    const coach = await this._getCoach(userId, academyId);
    await this._finalizeOverdueMatches(academyId, { matchId });
    const { match } = await this._ensureCoachCanAccessMatch(
      coach,
      academyId,
      matchId,
    );
    if (["first_half", "second_half"].includes(match.match_status)) {
      await this._syncMatchMinutes(matchId, academyId, coach.id);
      return this.repo.findMatchById(matchId, academyId);
    }
    return match;
  }

  async coachUpsertMatchSquad(userId, academyId, matchId, payload) {
    const coach = await this._getCoach(userId, academyId);
    const { groupIds, birthYearIds } = await this._ensureCoachCanAccessMatch(
      coach,
      academyId,
      matchId,
    );
    const players = payload.players || [payload];
    await this._ensurePlayersInMatchTargets(
      players.map((player) => player.playerId),
      groupIds,
      birthYearIds,
      academyId,
      { requireComplete: true },
    );
    const playerProfiles = await this.repo
      .db("player_profiles")
      .whereIn(
        "id",
        uniq(players.map((player) => player.playerId)),
      )
      .select("id", "full_name", "profile_status");
    const playerSnapshots = new Map(
      playerProfiles.map((player) => [player.id, player]),
    );
    const rows = players.map((player) => ({
      match_id: matchId,
      player_id: player.playerId,
      selected_by_coach_id: coach.id,
      squad_role: player.squadRole,
      position: player.position || null,
      shirt_number: player.shirtNumber || null,
      player_instruction: player.playerInstruction || null,
      player_name_snapshot:
        playerSnapshots.get(player.playerId)?.full_name || null,
      profile_status_snapshot:
        playerSnapshots.get(player.playerId)?.profile_status || null,
    }));
    const result = await this.repo.db.transaction(async (trx) => {
      if (Array.isArray(payload.players)) {
        await trx("match_squads")
          .where({ match_id: matchId })
          .whereNotIn(
            "player_id",
            rows.map((row) => row.player_id),
          )
          .del();
      }
      return trx("match_squads")
        .insert(rows)
        .onConflict(["match_id", "player_id"])
        .merge({
          selected_by_coach_id: this.repo.db.raw("excluded.selected_by_coach_id"),
          squad_role: this.repo.db.raw("excluded.squad_role"),
          position: this.repo.db.raw("excluded.position"),
          shirt_number: this.repo.db.raw("excluded.shirt_number"),
          player_instruction: this.repo.db.raw("excluded.player_instruction"),
          player_name_snapshot: this.repo.db.raw(
            "excluded.player_name_snapshot",
          ),
          profile_status_snapshot: this.repo.db.raw(
            "excluded.profile_status_snapshot",
          ),
          updated_at: new Date(),
        })
        .returning("*");
    });
    await this._syncMatchMinutes(matchId, academyId, coach.id);

    await this._notifyMatchPlan(academyId, matchId, { updated: true });
    return result;
  }

  async coachUpdateMatchSquad(userId, academyId, matchId, playerId, data) {
    const coach = await this._getCoach(userId, academyId);
    const { groupIds, birthYearIds } = await this._ensureCoachCanAccessMatch(
      coach,
      academyId,
      matchId,
    );
    await this._ensurePlayersInMatchTargets(
      [playerId],
      groupIds,
      birthYearIds,
      academyId,
      { requireComplete: true },
    );
    const [row] = await this.repo
      .db("match_squads")
      .where({ match_id: matchId, player_id: playerId })
      .update({
        ...(data.squadRole !== undefined ? { squad_role: data.squadRole } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
        ...(data.shirtNumber !== undefined
          ? { shirt_number: data.shirtNumber }
          : {}),
        ...(data.playerInstruction !== undefined
          ? { player_instruction: data.playerInstruction || null }
          : {}),
        selected_by_coach_id: coach.id,
        updated_at: new Date(),
      })
      .returning("*");
    if (!row) throw new NotFoundError("Squad player");
    await this._syncMatchMinutes(matchId, academyId, coach.id);
    await this._notifyMatchPlan(academyId, matchId, { updated: true });
    return row;
  }

  async coachDeleteMatchSquad(userId, academyId, matchId, playerId) {
    const coach = await this._getCoach(userId, academyId);
    await this._ensureCoachCanAccessMatch(coach, academyId, matchId);
    const deleted = await this.repo
      .db("match_squads")
      .where({ match_id: matchId, player_id: playerId })
      .del();
    if (!deleted) throw new NotFoundError("Squad player");
    await this._syncMatchMinutes(matchId, academyId, coach.id);
    await this._notifyMatchPlan(academyId, matchId, { updated: true });
    return { message: "Player removed from squad" };
  }

  async coachUpsertMatchTactics(userId, academyId, matchId, data) {
    const coach = await this._getCoach(userId, academyId);
    await this._ensureCoachCanAccessMatch(coach, academyId, matchId);
    const existing = await this.repo
      .db("match_tactics")
      .where({ match_id: matchId })
      .first();
    const payload = {
      match_id: matchId,
      coach_id: coach.id,
      ...(data.formation !== undefined ? { formation: data.formation } : {}),
      ...(data.tacticalNotes !== undefined
        ? { tactical_notes: data.tacticalNotes || null }
        : {}),
    };
    const [row] = await this.repo
      .db("match_tactics")
      .insert(payload)
      .onConflict("match_id")
      .merge({ ...payload, updated_at: new Date() })
      .returning("*");
    await this._notifyMatchPlan(academyId, matchId, {
      updated: Boolean(existing),
    });
    return row;
  }

  async coachUpdateMatchTargets(userId, academyId, matchId, data) {
    const coach = await this._getCoach(userId, academyId);
    const { match } = await this._ensureCoachCanAccessMatch(
      coach,
      academyId,
      matchId,
    );
    const groupIds = data.groupId ? [data.groupId] : [];
    const birthYearIds = data.birthYearId ? [data.birthYearId] : [];
    if (groupIds.length)
      await this._ensureCoachCanAccessGroups(coach, academyId, groupIds);
    if (birthYearIds.length)
      await this._ensureCoachCanAccessBirthYears(
        coach,
        academyId,
        birthYearIds,
      );
    const targetSnapshot = await this._buildMatchTargetSnapshot(academyId, {
      groupIds,
      birthYearIds,
      teamId: data.groupId || null,
      ageGroupId: null,
    });

    await this.repo.db.transaction(async (trx) => {
      let eventId = match.event_id;
      if (!eventId) {
        const event = await this.repo.createEventWithTargets(
          this._matchEventPayload(
            academyId,
            {
              opponentName: match.opponent_name,
              matchType: match.match_type,
              matchDate: datePart(match.match_date),
              matchTime: timePart(match.match_time),
              location: match.location || "To be confirmed",
              venueType: match.venue_type,
              status: match.status,
              organizerNotes: match.organizer_notes || undefined,
              groupIds,
              birthYearIds,
            },
            match.created_by_admin_id,
          ),
          { groupIds, birthYearIds },
          trx,
        );
        eventId = event.id;
        await trx("matches")
          .where({ id: matchId })
          .update({
            event_id: eventId,
            team_id: data.groupId || null,
            age_group_id: null,
            target_snapshot: JSON.stringify(targetSnapshot),
            updated_at: new Date(),
          });
      } else {
        await this.repo.replaceEventGroups(eventId, groupIds, trx);
        await this.repo.replaceEventBirthYears(eventId, birthYearIds, trx);
        await trx("matches")
          .where({ id: matchId })
          .update({
            team_id: data.groupId || null,
            age_group_id: null,
            target_snapshot: JSON.stringify(targetSnapshot),
            updated_at: new Date(),
          });
      }
    });

    await this._notifyMatchPlan(academyId, matchId, { updated: true });
    return this.coachGetMatch(userId, academyId, matchId);
  }

  async coachUpdateMatchLiveStatus(userId, academyId, matchId, data) {
    const coach = await this._getCoach(userId, academyId);
    const { match } = await this._ensureCoachCanAccessMatch(
      coach,
      academyId,
      matchId,
    );
    this._ensureMatchDayReady(match);
    if (match.match_status === "finished" && data.matchStatus !== "finished") {
      throw new BadRequestError("Finished matches cannot be restarted");
    }
    if (
      data.matchStatus === "first_half" &&
      match.match_status === "scheduled"
    ) {
      this._ensureMatchCanStart(match);
    }
    let targetSnapshot = null;
    if (data.matchStatus === "finished") {
      const [groupIds, birthYearIds] = await Promise.all([
        this.repo.getMatchGroupIds(matchId),
        this.repo.getMatchBirthYearIds(matchId),
      ]);
      targetSnapshot = await this._buildMatchTargetSnapshot(academyId, {
        groupIds,
        birthYearIds,
        teamId: match.team_id,
        ageGroupId: match.age_group_id,
      });
    }
    const now = new Date();
    const updateData = {
      match_status: data.matchStatus,
      updated_at: now,
    };
    if (data.firstHalfStoppageMinutes !== undefined)
      updateData.first_half_stoppage_minutes = data.firstHalfStoppageMinutes;
    if (data.secondHalfStoppageMinutes !== undefined)
      updateData.second_half_stoppage_minutes = data.secondHalfStoppageMinutes;
    if (data.matchStatus === "first_half") {
      updateData.started_at = match.started_at || now;
      updateData.first_half_started_at = match.first_half_started_at || now;
      updateData.status = "scheduled";
    }
    if (data.matchStatus === "second_half") {
      updateData.second_half_started_at = match.second_half_started_at || now;
      updateData.status = "scheduled";
    }
    if (data.matchStatus === "finished") {
      updateData.finished_at = now;
      updateData.status = "completed";
      updateData.target_snapshot = JSON.stringify(targetSnapshot);
    }

    const [row] = await this.repo.db.transaction(async (trx) => {
      const [updatedMatch] = await trx("matches")
        .where({ id: matchId })
        .update(updateData)
        .returning("*");
      if (data.matchStatus === "finished") {
        await this._refreshMatchSquadSnapshots(matchId, trx);
      }
      return [updatedMatch];
    });
    await this._syncMatchMinutes(matchId, academyId, coach.id);
    if (
      ["first_half", "second_half"].includes(data.matchStatus) &&
      match.event_id
    ) {
      await this.repo
        .db("calendar_events")
        .where({ id: match.event_id })
        .update({ status: "scheduled", updated_at: now });
    }
    if (data.matchStatus === "finished" && match.event_id) {
      await this.repo
        .db("calendar_events")
        .where({ id: match.event_id })
        .update({ status: "finished", updated_at: now });
    }
    const statusLabel = data.matchStatus.replace("_", " ");
    await this._notifyAdmins(
      academyId,
      "Match status updated",
      `${match.opponent_name} is now ${statusLabel}`,
      "match",
      { matchId, matchStatus: data.matchStatus },
    );
    if (data.matchStatus === "first_half" || data.matchStatus === "finished") {
      await this._notifyMatchPlan(academyId, matchId, { updated: true });
    }
    return row;
  }

  async coachRecordMatchIncident(userId, academyId, matchId, data) {
    const coach = await this._getCoach(userId, academyId);
    const { match, groupIds, birthYearIds } =
      await this._ensureCoachCanAccessMatch(coach, academyId, matchId);
    this._ensureMatchDayReady(match);
    this._ensureMatchHasStarted(match);
    await this._ensurePlayersInMatchTargets(
      [data.playerId],
      groupIds,
      birthYearIds,
      academyId,
      { requireComplete: true },
    );

    const injuryDate = datePart(new Date());
    const minute = data.minute ?? this._matchElapsedMinute(match);
    const result = await this.repo.db.transaction(async (trx) => {
      const [incident] = await trx("match_player_incidents")
        .insert({
          match_id: matchId,
          player_id: data.playerId,
          coach_id: coach.id,
          incident_type: data.incidentType,
          minute,
          body_part: data.incidentType === "injury" ? data.bodyPart : null,
          injury_date: data.incidentType === "injury" ? injuryDate : null,
          notes: data.notes || null,
        })
        .returning("*");

      const statPatch =
        data.incidentType === "yellow_card"
          ? {
              yellow_cards: this.repo.db.raw(
                "LEAST(COALESCE(match_player_stats.yellow_cards, 0) + 1, 2)",
              ),
            }
          : data.incidentType === "red_card"
            ? { red_cards: 1 }
            : { injuries: data.bodyPart };

      await trx("match_player_stats")
        .insert({
          match_id: matchId,
          player_id: data.playerId,
          minutes_played: 0,
          goals: 0,
          assists: 0,
          yellow_cards: data.incidentType === "yellow_card" ? 1 : 0,
          red_cards: data.incidentType === "red_card" ? 1 : 0,
          injuries: data.incidentType === "injury" ? data.bodyPart : null,
          created_by_coach_id: coach.id,
        })
        .onConflict(["match_id", "player_id"])
        .merge({ ...statPatch, updated_at: new Date() });

      if (data.incidentType === "injury") {
        await trx("player_injury_history").insert({
          player_id: data.playerId,
          injury_type: data.bodyPart,
          injury_date: injuryDate,
          notes: data.notes || `Injured during ${match.opponent_name}`,
          reported_by: userId,
        });
      }

      return incident;
    });
    await this._syncMatchMinutes(matchId, academyId, coach.id);

    const player = await this.repo
      .db("player_profiles")
      .where({ id: data.playerId })
      .first();
    await this._notifyAdmins(
      academyId,
      "Match incident recorded",
      `${player?.full_name || "Player"} - ${data.incidentType.replace("_", " ")} in ${match.opponent_name}`,
      "match",
      {
        matchId,
        playerId: data.playerId,
        incidentType: data.incidentType,
        minute,
        bodyPart: data.bodyPart || null,
      },
    );
    return result;
  }

  async coachRecordMatchGoal(userId, academyId, matchId, data) {
    const coach = await this._getCoach(userId, academyId);
    const { match, groupIds, birthYearIds } =
      await this._ensureCoachCanAccessMatch(coach, academyId, matchId);
    this._ensureMatchDayReady(match);
    this._ensureMatchHasStarted(match);

    const playerIds = uniq([data.scorerPlayerId, data.assistPlayerId]);
    if (playerIds.length) {
      await this._ensurePlayersInMatchTargets(
        playerIds,
        groupIds,
        birthYearIds,
        academyId,
        { requireComplete: true },
      );
    }

    const minute = data.minute ?? 0;
    await this.repo.db.transaction(async (trx) => {
      await trx("match_goal_events").insert({
        match_id: matchId,
        team: data.team,
        scorer_player_id: data.team === "our" ? data.scorerPlayerId : null,
        assist_player_id:
          data.team === "our" ? data.assistPlayerId || null : null,
        coach_id: coach.id,
        minute,
        notes: data.notes || null,
      });

      await trx("matches")
        .where({ id: matchId })
        .update({
          ...(data.team === "our"
            ? {
                our_score: trx.raw("COALESCE(our_score, 0) + 1"),
              }
            : {
                opponent_score: trx.raw("COALESCE(opponent_score, 0) + 1"),
              }),
          updated_at: new Date(),
        });

      if (data.team === "our" && data.scorerPlayerId) {
        await this._incrementPlayerGoalStat(
          trx,
          matchId,
          data.scorerPlayerId,
          coach.id,
          "goals",
          1,
        );
      }
      if (data.team === "our" && data.assistPlayerId) {
        await this._incrementPlayerGoalStat(
          trx,
          matchId,
          data.assistPlayerId,
          coach.id,
          "assists",
          1,
        );
      }
    });

    return this.coachGetMatch(userId, academyId, matchId);
  }

  async coachDeleteMatchGoal(userId, academyId, matchId, goalId) {
    const coach = await this._getCoach(userId, academyId);
    const { match } = await this._ensureCoachCanAccessMatch(
      coach,
      academyId,
      matchId,
    );
    this._ensureMatchDayReady(match);

    await this.repo.db.transaction(async (trx) => {
      const goal = await trx("match_goal_events")
        .where({ id: goalId, match_id: matchId })
        .first();
      if (!goal) throw new NotFoundError("Match goal", goalId);

      await trx("match_goal_events").where({ id: goalId }).del();
      await trx("matches")
        .where({ id: matchId })
        .update({
          ...(goal.team === "our"
            ? {
                our_score: trx.raw("GREATEST(COALESCE(our_score, 0) - 1, 0)"),
              }
            : {
                opponent_score: trx.raw(
                  "GREATEST(COALESCE(opponent_score, 0) - 1, 0)",
                ),
              }),
          updated_at: new Date(),
        });

      if (goal.scorer_player_id) {
        await this._incrementPlayerGoalStat(
          trx,
          matchId,
          goal.scorer_player_id,
          coach.id,
          "goals",
          -1,
        );
      }
      if (goal.assist_player_id) {
        await this._incrementPlayerGoalStat(
          trx,
          matchId,
          goal.assist_player_id,
          coach.id,
          "assists",
          -1,
        );
      }
    });

    return this.coachGetMatch(userId, academyId, matchId);
  }

  async coachRecordMatchSubstitution(userId, academyId, matchId, data) {
    const coach = await this._getCoach(userId, academyId);
    const { match } = await this._ensureCoachCanAccessMatch(
      coach,
      academyId,
      matchId,
    );
    this._ensureMatchDayReady(match);
    if (match.match_status === "finished") {
      throw new BadRequestError("Finished matches cannot accept substitutions");
    }
    if (data.outPlayerId === data.inPlayerId) {
      throw new BadRequestError("Substitution players must be different");
    }

    const squadByPlayer = new Map(
      (match.squad || []).map((player) => [player.player_id, player]),
    );
    const outPlayer = squadByPlayer.get(data.outPlayerId);
    const inPlayer = squadByPlayer.get(data.inPlayerId);
    if (!outPlayer || !inPlayer) {
      throw new BadRequestError("Both players must be in the match squad");
    }

    const currentPlaying = this._currentPlayingPlayerIds(match);
    const outPlayerWasInjured = (match.incidents || []).some(
      (incident) =>
        incident.player_id === data.outPlayerId &&
        incident.incident_type === "injury",
    );
    const outPlayerWasSubbedOut = (match.substitutions || []).some(
      (substitution) => substitution.out_player_id === data.outPlayerId,
    );
    if (
      !currentPlaying.has(data.outPlayerId) &&
      (!outPlayerWasInjured || outPlayerWasSubbedOut)
    ) {
      throw new BadRequestError("The player going out is not currently playing");
    }
    if (currentPlaying.has(data.inPlayerId)) {
      throw new BadRequestError("The substitute is already playing");
    }

    const attendanceByPlayer = new Map(
      (match.attendance || []).map((record) => [record.player_id, record]),
    );
    const replacementAttendance = attendanceByPlayer.get(data.inPlayerId);
    if (
      !replacementAttendance ||
      ["absent", "injured"].includes(replacementAttendance.status)
    ) {
      throw new BadRequestError(
        "Replacement player must be marked present or late before substitution",
      );
    }

    const minute = data.minute ?? this._matchElapsedMinute(match);
    await this.repo.db("match_substitutions").insert({
      match_id: matchId,
      out_player_id: data.outPlayerId,
      in_player_id: data.inPlayerId,
      coach_id: coach.id,
      minute,
      reason: data.reason || null,
    });
    await this._syncMatchMinutes(matchId, academyId, coach.id);

    await this._notifyAdmins(
      academyId,
      "Match substitution recorded",
      `${inPlayer.player_name || "Player"} replaced ${outPlayer.player_name || "player"} in ${match.opponent_name}`,
      "match",
      {
        matchId,
        outPlayerId: data.outPlayerId,
        inPlayerId: data.inPlayerId,
        minute,
      },
    );

    return this.coachGetMatch(userId, academyId, matchId);
  }

  async coachDeleteMatchSubstitution(userId, academyId, matchId, substitutionId) {
    const coach = await this._getCoach(userId, academyId);
    const { match } = await this._ensureCoachCanAccessMatch(
      coach,
      academyId,
      matchId,
    );
    this._ensureMatchDayReady(match);
    if (match.match_status === "finished") {
      throw new BadRequestError("Finished matches cannot be changed");
    }

    const deleted = await this.repo
      .db("match_substitutions")
      .where({ id: substitutionId, match_id: matchId })
      .del();
    if (!deleted) throw new NotFoundError("Match substitution", substitutionId);
    await this._syncMatchMinutes(matchId, academyId, coach.id);
    return this.coachGetMatch(userId, academyId, matchId);
  }

  async coachDeleteMatchIncident(userId, academyId, matchId, incidentId) {
    const coach = await this._getCoach(userId, academyId);
    const { match } = await this._ensureCoachCanAccessMatch(
      coach,
      academyId,
      matchId,
    );
    this._ensureMatchDayReady(match);

    const deleted = await this.repo.db.transaction(async (trx) => {
      const incident = await trx("match_player_incidents")
        .where({ id: incidentId, match_id: matchId })
        .first();
      if (!incident) throw new NotFoundError("Match incident", incidentId);

      await trx("match_player_incidents").where({ id: incidentId }).del();

      const remaining = await trx("match_player_incidents")
        .where({
          match_id: matchId,
          player_id: incident.player_id,
        })
        .orderBy("created_at", "desc");
      const yellowCards = Math.min(
        2,
        remaining.filter((item) => item.incident_type === "yellow_card").length,
      );
      const redCards = remaining.some(
        (item) => item.incident_type === "red_card",
      )
        ? 1
        : 0;
      const latestInjury = remaining.find(
        (item) => item.incident_type === "injury",
      );

      await trx("match_player_stats")
        .where({ match_id: matchId, player_id: incident.player_id })
        .update({
          yellow_cards: yellowCards,
          red_cards: redCards,
          injuries: latestInjury?.body_part || null,
          updated_at: new Date(),
        });

      if (incident.incident_type === "injury") {
        const injuryQuery = trx("player_injury_history").where({
          player_id: incident.player_id,
          injury_type: incident.body_part,
          injury_date: incident.injury_date,
        });
        if (incident.notes) {
          injuryQuery.where("notes", incident.notes);
        } else {
          injuryQuery.where("notes", `Injured during ${match.opponent_name}`);
        }
        const injury = await injuryQuery.first();
        if (injury) {
          await trx("player_injury_history").where({ id: injury.id }).del();
        }
      }

      return incident;
    });
    await this._syncMatchMinutes(matchId, academyId, coach.id);

    const player = await this.repo
      .db("player_profiles")
      .where({ id: deleted.player_id })
      .first();
    await this._notifyAdmins(
      academyId,
      "Match incident removed",
      `${player?.full_name || "Player"} - ${deleted.incident_type.replace("_", " ")} removed from ${match.opponent_name}`,
      "match",
      {
        matchId,
        playerId: deleted.player_id,
        incidentType: deleted.incident_type,
      },
    );
    return this.coachGetMatch(userId, academyId, matchId);
  }

  async coachUpsertMatchAttendance(userId, academyId, matchId, records) {
    const coach = await this._getCoach(userId, academyId);
    const { match, groupIds, birthYearIds } =
      await this._ensureCoachCanAccessMatch(
        coach,
        academyId,
        matchId,
        "can_take_attendance",
      );
    this._ensureMatchDayReady(match);
    await this._ensurePlayersInMatchTargets(
      records.map((record) => record.playerId),
      groupIds,
      birthYearIds,
      academyId,
    );
    const rows = records.map((record) => ({
      match_id: matchId,
      player_id: record.playerId,
      status: record.status,
      marked_by_coach_id: coach.id,
      notes: record.notes || null,
    }));
    const result = await this.repo
      .db("match_attendance")
      .insert(rows)
      .onConflict(["match_id", "player_id"])
      .merge({
        status: this.repo.db.raw("excluded.status"),
        marked_by_coach_id: this.repo.db.raw("excluded.marked_by_coach_id"),
        notes: this.repo.db.raw("excluded.notes"),
        updated_at: new Date(),
      })
      .returning("*");
    await this._syncMatchMinutes(matchId, academyId, coach.id);
    return result;
  }

  _statsRows(matchId, coachId, records) {
    return records.map((record) => ({
      match_id: matchId,
      player_id: record.playerId,
      minutes_played: record.minutesPlayed ?? 0,
      goals: record.goals ?? 0,
      assists: record.assists ?? 0,
      passes_completed: record.passesCompleted ?? 0,
      pass_accuracy_percentage: record.passAccuracyPercentage ?? null,
      shots_total: record.shotsTotal ?? 0,
      shots_on_target: record.shotsOnTarget ?? 0,
      key_passes: record.keyPasses ?? 0,
      tackles: record.tackles ?? 0,
      defensive_tackles: record.defensiveTackles ?? 0,
      interceptions: record.interceptions ?? 0,
      duels_won: record.duelsWon ?? 0,
      duels_lost: record.duelsLost ?? 0,
      possession_losses: record.possessionLosses ?? 0,
      saves: record.saves ?? 0,
      yellow_cards: record.yellowCards ?? 0,
      red_cards: record.redCards ?? 0,
      fouls: record.fouls ?? 0,
      injuries: record.injuries || null,
      performance_rating: record.performanceRating ?? null,
      performance_score: record.performanceRating ?? null,
      technical_rating: record.technicalRating ?? null,
      tactical_rating: record.tacticalRating ?? null,
      physical_rating: record.physicalRating ?? null,
      mentality_rating: record.mentalityRating ?? null,
      decision_making_rating: record.decisionMakingRating ?? null,
      work_rate_rating: record.workRateRating ?? null,
      positioning_rating: record.positioningRating ?? null,
      strengths: record.strengths || null,
      weaknesses: record.weaknesses || null,
      improvement_plan: record.improvementPlan || null,
      coach_notes: record.coachNotes || null,
      created_by_coach_id: coachId,
    }));
  }

  async coachUpsertPlayerStats(userId, academyId, matchId, payload) {
    const coach = await this._getCoach(userId, academyId);
    const { match, groupIds, birthYearIds } = await this._ensureCoachCanAccessMatch(
      coach,
      academyId,
      matchId,
      "can_evaluate_players",
    );
    if (match.evaluations_finalized_at) {
      throw new BadRequestError("Match evaluations are locked");
    }
    if (payload.finalize && match.match_status !== "finished") {
      throw new BadRequestError("Finish the match before saving final evaluations");
    }
    const records = payload.records || [payload];
    await this._ensurePlayersInMatchTargets(
      records.map((record) => record.playerId),
      groupIds,
      birthYearIds,
      academyId,
      { requireComplete: true },
    );
    const result = await this.repo.db.transaction(async (trx) => {
      const rows = await trx("match_player_stats")
        .insert(this._statsRows(matchId, coach.id, records))
        .onConflict(["match_id", "player_id"])
        .merge()
        .returning("*");

      if (payload.finalize) {
        await trx("matches").where({ id: matchId }).update({
          evaluations_finalized_at: new Date(),
          evaluations_finalized_by_coach_id: coach.id,
          updated_at: new Date(),
        });
      }

      return rows;
    });
    await this._syncMatchMinutes(matchId, academyId, coach.id);
    return result;
  }

  async coachUpdatePlayerStats(userId, academyId, matchId, playerId, data) {
    const coach = await this._getCoach(userId, academyId);
    const { match, groupIds, birthYearIds } = await this._ensureCoachCanAccessMatch(
      coach,
      academyId,
      matchId,
      "can_evaluate_players",
    );
    if (match.evaluations_finalized_at) {
      throw new BadRequestError("Match evaluations are locked");
    }
    await this._ensurePlayersInMatchTargets(
      [playerId],
      groupIds,
      birthYearIds,
      academyId,
      { requireComplete: true },
    );
    const [row] = await this.repo
      .db("match_player_stats")
      .where({ match_id: matchId, player_id: playerId })
      .update({
        ...this._statsRows(matchId, coach.id, [{ ...data, playerId }])[0],
        updated_at: new Date(),
      })
      .returning("*");
    if (!row) throw new NotFoundError("Match player stats");
    await this._syncMatchMinutes(matchId, academyId, coach.id);
    return row;
  }

  async coachCreateFriendlyRequest(userId, academyId, data) {
    const coach = await this._getCoach(userId, academyId);
    const groupIds = uniq([data.teamId, data.ageGroupId]);
    if (groupIds.length)
      await this._ensureCoachCanAccessGroups(coach, academyId, groupIds);
    if (data.birthYearId)
      await this._ensureCoachCanAccessBirthYears(coach, academyId, [
        data.birthYearId,
      ]);
    const [row] = await this.repo
      .db("friendly_match_requests")
      .insert({
        coach_id: coach.id,
        team_id: data.teamId || null,
        age_group_id: data.ageGroupId || null,
        birth_year_id: data.birthYearId || null,
        preferred_date: data.preferredDate,
        preferred_time: toTime(data.preferredTime),
        opponent_level: data.opponentLevel,
        suggested_opponent_name: data.suggestedOpponentName || null,
        reason: data.reason,
        notes: data.notes || null,
        status: "pending",
      })
      .returning("*");
    return row;
  }

  async coachListFriendlyRequests(userId, academyId, filters) {
    const coach = await this._getCoach(userId, academyId);
    return this.repo.paginate(
      this.repo.friendlyRequestsQuery(academyId, {
        ...filters,
        coachId: coach.id,
      }),
      filters,
      "fmr.id",
    );
  }

  async adminListFriendlyRequests(academyId, filters) {
    return this.repo.paginate(
      this.repo.friendlyRequestsQuery(academyId, filters),
      filters,
      "fmr.id",
    );
  }

  async adminApproveFriendlyRequest(
    academyId,
    adminUserId,
    requestId,
    adminResponse,
  ) {
    const request = await this.repo.findFriendlyRequestById(
      requestId,
      academyId,
    );
    if (!request) throw new NotFoundError("Friendly match request", requestId);
    const [row] = await this.repo
      .db("friendly_match_requests")
      .where({ id: requestId })
      .update({
        status: "approved",
        admin_response: adminResponse || null,
        reviewed_by_admin_id: adminUserId,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .returning("*");
    if (request.coach_user_id)
      await this._notifyUsers(
        [request.coach_user_id],
        "Friendly request approved",
        adminResponse || "Your friendly match request was approved.",
        "match",
        { requestId },
      );
    return row;
  }

  async adminRejectFriendlyRequest(
    academyId,
    adminUserId,
    requestId,
    adminResponse,
  ) {
    const request = await this.repo.findFriendlyRequestById(
      requestId,
      academyId,
    );
    if (!request) throw new NotFoundError("Friendly match request", requestId);
    const [row] = await this.repo
      .db("friendly_match_requests")
      .where({ id: requestId })
      .update({
        status: "rejected",
        admin_response: adminResponse,
        reviewed_by_admin_id: adminUserId,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .returning("*");
    if (request.coach_user_id)
      await this._notifyUsers(
        [request.coach_user_id],
        "Friendly request rejected",
        adminResponse,
        "match",
        { requestId },
      );
    return row;
  }

  async adminConvertFriendlyRequest(academyId, adminUserId, requestId, data) {
    const request = await this.repo.findFriendlyRequestById(
      requestId,
      academyId,
    );
    if (!request) throw new NotFoundError("Friendly match request", requestId);
    if (request.status !== "approved")
      throw new BadRequestError("Only approved requests can be converted");
    if (request.converted_match_id)
      throw new ConflictError("Friendly request already converted");

    const match = await this.adminCreateMatch(academyId, adminUserId, {
      teamId: request.team_id,
      ageGroupId: request.age_group_id,
      birthYearIds: request.birth_year_id ? [request.birth_year_id] : undefined,
      opponentName:
        request.suggested_opponent_name || `${request.opponent_level} opponent`,
      matchType: "friendly",
      matchDate: request.preferred_date,
      matchTime: request.preferred_time,
      location: data.location || "To be confirmed",
      venueType: data.venueType || "neutral",
      refereeName: data.refereeName,
      status: "scheduled",
      organizerNotes: data.organizerNotes || request.notes || request.reason,
    });

    await this.repo
      .db("friendly_match_requests")
      .where({ id: requestId })
      .update({ converted_match_id: match.id, updated_at: new Date() });
    return match;
  }

  async listPlayerOptions(academyId, fieldKey) {
    return this.repo.listPlayerOptions(academyId, fieldKey);
  }

  async createPlayerOption(user, data) {
    const coach =
      user.role === "coach"
        ? await this._getCoach(user.userId, user.academyId)
        : null;
    const [row] = await this.repo
      .db("player_field_options")
      .insert({
        academy_id: user.academyId,
        field_key: data.fieldKey,
        label: data.label,
        value: optionValue(data.label, data.value),
        created_by_user_id: user.userId,
        created_by_role: user.role === "coach" ? "coach" : "admin",
        created_by_coach_id: coach?.id || null,
        is_active: data.isActive ?? true,
      })
      .returning("*");
    return row;
  }

  async updatePlayerOption(user, optionId, data) {
    const option = await this.repo
      .db("player_field_options")
      .where({ id: optionId, academy_id: user.academyId })
      .whereNull("deleted_at")
      .first();
    if (!option) throw new NotFoundError("Player option", optionId);
    if (user.role === "coach") {
      const coach = await this._getCoach(user.userId, user.academyId);
      if (
        option.created_by_role !== "coach" ||
        option.created_by_coach_id !== coach.id
      ) {
        throw new ForbiddenError(
          "Coach can only edit options created by himself",
        );
      }
    }
    const [row] = await this.repo
      .db("player_field_options")
      .where({ id: optionId })
      .update({
        ...(data.fieldKey !== undefined ? { field_key: data.fieldKey } : {}),
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.value !== undefined || data.label !== undefined
          ? { value: optionValue(data.label || option.label, data.value) }
          : {}),
        ...(data.isActive !== undefined ? { is_active: data.isActive } : {}),
        updated_at: new Date(),
      })
      .returning("*");
    return row;
  }

  async deletePlayerOption(user, optionId) {
    await this.updatePlayerOption(user, optionId, {});
    await this.repo
      .db("player_field_options")
      .where({ id: optionId })
      .update({ deleted_at: new Date(), is_active: false });
    return { message: "Player option deleted" };
  }

  async adminListCoachGroups(academyId, filters) {
    return this.repo.listCoachGroupAssignments(academyId, filters);
  }

  async adminCreateCoachGroup(academyId, data) {
    const coach = await this.repo
      .db("coach_profiles")
      .where({ id: data.coachId, academy_id: academyId })
      .whereNull("deleted_at")
      .first();
    if (!coach) throw new NotFoundError("Coach", data.coachId);
    await this._validateAcademyGroups([data.groupId], academyId);
    const [row] = await this.repo
      .db("coach_group_assignments")
      .insert({
        coach_id: data.coachId,
        group_id: data.groupId,
        role: data.role,
        can_create_training: data.canCreateTraining,
        can_take_attendance: data.canTakeAttendance,
        can_evaluate_players: data.canEvaluatePlayers,
        assigned_at: new Date(),
      })
      .onConflict(["coach_id", "group_id"])
      .merge()
      .returning("*");
    return row;
  }

  async adminUpdateCoachGroup(academyId, assignmentId, data) {
    const current = await this.repo
      .db("coach_group_assignments as cga")
      .join("coach_profiles as cp", "cga.coach_id", "cp.id")
      .where("cga.id", assignmentId)
      .where("cp.academy_id", academyId)
      .select("cga.*")
      .first();
    if (!current)
      throw new NotFoundError("Coach group assignment", assignmentId);
    const [row] = await this.repo
      .db("coach_group_assignments")
      .where({ id: assignmentId })
      .update({
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.canCreateTraining !== undefined
          ? { can_create_training: data.canCreateTraining }
          : {}),
        ...(data.canTakeAttendance !== undefined
          ? { can_take_attendance: data.canTakeAttendance }
          : {}),
        ...(data.canEvaluatePlayers !== undefined
          ? { can_evaluate_players: data.canEvaluatePlayers }
          : {}),
      })
      .returning("*");
    return row;
  }

  async adminDeleteCoachGroup(academyId, assignmentId) {
    const current = await this.repo
      .db("coach_group_assignments as cga")
      .join("coach_profiles as cp", "cga.coach_id", "cp.id")
      .where("cga.id", assignmentId)
      .where("cp.academy_id", academyId)
      .select("cga.id")
      .first();
    if (!current)
      throw new NotFoundError("Coach group assignment", assignmentId);
    await this.repo
      .db("coach_group_assignments")
      .where({ id: assignmentId })
      .del();
    return { message: "Coach group assignment deleted" };
  }

  async adminAttendanceReport(academyId, filters) {
    const rows = await this.repo
      .db("event_attendance as ea")
      .join("calendar_events as ce", "ea.event_id", "ce.id")
      .leftJoin("calendar_event_groups as ceg", "ce.id", "ceg.event_id")
      .leftJoin("academy_groups as ag", "ceg.group_id", "ag.id")
      .where("ce.academy_id", academyId)
      .whereNull("ce.deleted_at")
      .modify((q) => {
        if (filters.groupId) q.where("ceg.group_id", filters.groupId);
        if (filters.eventType) q.where("ce.event_type", filters.eventType);
        if (filters.dateFrom)
          q.whereRaw("ce.start_datetime::date >= ?", [filters.dateFrom]);
        if (filters.dateTo)
          q.whereRaw("ce.start_datetime::date <= ?", [filters.dateTo]);
      })
      .groupBy("ag.id", "ag.name")
      .select(
        "ag.id as group_id",
        "ag.name as group_name",
        this.repo.db.raw("COUNT(ea.id)::int as total_marks"),
        this.repo.db.raw(
          "COUNT(ea.id) FILTER (WHERE ea.status IN ('present','late'))::int as attended",
        ),
        this.repo.db.raw(
          "ROUND(100.0 * COUNT(ea.id) FILTER (WHERE ea.status IN ('present','late')) / NULLIF(COUNT(ea.id), 0))::int as attendance_rate",
        ),
      );
    return rows;
  }

  async adminPerformanceReport(academyId, filters) {
    return this.repo
      .db("player_event_evaluations as pee")
      .join("calendar_events as ce", "pee.event_id", "ce.id")
      .join("player_profiles as pp", "pee.player_id", "pp.id")
      .where("ce.academy_id", academyId)
      .whereNull("pp.deleted_at")
      .modify((q) => {
        if (filters.groupId) {
          q.whereIn(
            "pee.player_id",
            this.repo
              .db("player_group_assignments")
              .where({ group_id: filters.groupId })
              .whereNull("left_at")
              .select("player_id"),
          );
        }
      })
      .groupBy("pp.id", "pp.full_name")
      .select(
        "pp.id as player_id",
        "pp.full_name as player_name",
        this.repo.db.raw("ROUND(AVG(pee.overall_rating), 2) as average_rating"),
        this.repo.db.raw("COUNT(pee.id)::int as evaluations_count"),
      )
      .orderBy("average_rating", "desc");
  }

  async _playerVisibleEvents(playerId, academyId, filters = {}) {
    const player = await this.repo
      .db("player_profiles")
      .where({ id: playerId, academy_id: academyId })
      .whereNull("deleted_at")
      .first();
    if (!player) throw new NotFoundError("Player", playerId);
    const groupRows = await this.repo.findPlayerGroups(playerId);
    const groupIds = groupRows.map((row) => row.group_id);
    const birthYearRows = await this.repo.findBirthYearsForPlayer(player);
    const birthYearIds = birthYearRows.map((row) => row.id);
    return this.repo.paginate(
      this.repo.eventListQuery(academyId, {
        ...filters,
        groupIds,
        birthYearIds,
        playerIds: [playerId],
      }),
      filters,
      "ce.id",
    );
  }

  async playerListCalendarEvents(userId, academyId, filters) {
    const player = await this._getPlayer(userId, academyId);
    return this._playerVisibleEvents(player.id, academyId, filters);
  }

  async playerListTrainings(userId, academyId, filters) {
    return this.playerListCalendarEvents(userId, academyId, {
      ...filters,
      eventType: "training",
    });
  }

  async playerListMatches(userId, academyId, filters) {
    const player = await this._getPlayer(userId, academyId);
    await this._finalizeOverdueMatches(academyId);
    const groupRows = await this.repo.findPlayerGroups(player.id);
    const groupIds = groupRows.map((row) => row.group_id);
    return this.repo.paginate(
      this.repo.matchListQuery(academyId, { ...filters, groupIds }),
      filters,
      "m.id",
    );
  }

  async playerGetMatch(userId, academyId, matchId) {
    const player = await this._getPlayer(userId, academyId);
    const match = await this.adminGetMatch(academyId, matchId);
    const groupRows = await this.repo.findPlayerGroups(player.id);
    const matchGroupIds = await this.repo.getMatchGroupIds(matchId);
    if (!groupRows.some((row) => matchGroupIds.includes(row.group_id)))
      throw new ForbiddenError("Player cannot access this match");
    return match;
  }

  async playerGetMatchStats(userId, academyId, matchId) {
    const player = await this._getPlayer(userId, academyId);
    await this.playerGetMatch(userId, academyId, matchId);
    return this.repo
      .db("match_player_stats")
      .where({ match_id: matchId, player_id: player.id })
      .first();
  }

  async playerAttendanceHistory(userId, academyId, filters) {
    const player = await this._getPlayer(userId, academyId);
    const query = this.repo
      .db("event_attendance as ea")
      .join("calendar_events as ce", "ea.event_id", "ce.id")
      .where("ea.player_id", player.id)
      .where("ce.academy_id", academyId)
      .select("ea.*", "ce.title", "ce.event_type", "ce.start_datetime")
      .orderBy("ce.start_datetime", "desc");
    return this.repo.paginate(query, filters, "ea.id");
  }

  async playerEvaluations(userId, academyId, filters) {
    const player = await this._getPlayer(userId, academyId);
    const query = this.repo
      .db("player_event_evaluations as pee")
      .join("calendar_events as ce", "pee.event_id", "ce.id")
      .where("pee.player_id", player.id)
      .where("ce.academy_id", academyId)
      .where("pee.visibility", "player_and_parent")
      .select("pee.*", "ce.title", "ce.event_type", "ce.start_datetime")
      .orderBy("ce.start_datetime", "desc");
    return this.repo.paginate(query, filters, "pee.id");
  }

  async playerProgress(userId, academyId, playerId = null) {
    await this._finalizeOverdueMatches(academyId);
    const player = playerId
      ? await this.repo
          .db("player_profiles")
          .where({ id: playerId, academy_id: academyId })
          .whereNull("deleted_at")
          .first()
      : await this._getPlayer(userId, academyId);
    if (!player) throw new NotFoundError("Player", playerId);

    const [attendance, trainings, matches, evaluations, stats, weeklyMinutes] =
      await Promise.all([
        this.repo
          .db("event_attendance as ea")
          .join("calendar_events as ce", "ea.event_id", "ce.id")
          .where("ea.player_id", player.id)
          .where("ce.academy_id", academyId)
          .select(
            this.repo.db.raw("COUNT(*)::int as total"),
            this.repo.db.raw(
              "COUNT(*) FILTER (WHERE ea.status IN ('present','late'))::int as attended",
            ),
          )
          .first(),
        this.repo
          .db("event_attendance as ea")
          .join("calendar_events as ce", "ea.event_id", "ce.id")
          .where({ "ea.player_id": player.id, "ce.event_type": "training" })
          .count("ea.id as count")
          .first(),
        this.repo
          .db("match_squads as ms")
          .join("matches as m", "ms.match_id", "m.id")
          .where({ "ms.player_id": player.id, "m.status": "finished" })
          .whereNull("m.deleted_at")
          .count("ms.id as count")
          .first(),
        this.repo
          .db("player_event_evaluations")
          .where({ player_id: player.id })
          .avg("overall_rating as average")
          .first(),
        this.repo
          .db("match_player_stats")
          .where({ player_id: player.id })
          .sum({
            goals: "goals",
            assists: "assists",
            yellow_cards: "yellow_cards",
            red_cards: "red_cards",
          })
          .first(),
        this.repo
          .db("match_player_stats as mps")
          .join("matches as m", "mps.match_id", "m.id")
          .where("mps.player_id", player.id)
          .whereNull("m.deleted_at")
          .whereRaw("m.match_date >= date_trunc('week', CURRENT_DATE)::date")
          .whereRaw(
            "m.match_date < (date_trunc('week', CURRENT_DATE)::date + INTERVAL '7 days')",
          )
          .select(
            this.repo.db.raw("COALESCE(SUM(mps.minutes_played), 0)::int as minutes"),
            this.repo.db.raw("COUNT(*) FILTER (WHERE mps.minutes_played > 0)::int as matches"),
            this.repo.db.raw("date_trunc('week', CURRENT_DATE)::date as week_start"),
            this.repo.db.raw("(date_trunc('week', CURRENT_DATE)::date + INTERVAL '6 days')::date as week_end"),
          )
          .first(),
      ]);

    const total = Number(attendance?.total || 0);
    const attended = Number(attendance?.attended || 0);
    return {
      playerId: player.id,
      playerName: player.full_name,
      attendancePercentage: total ? Math.round((attended / total) * 100) : 0,
      trainingsAttended: Number(trainings?.count || 0),
      matchesPlayed: Number(matches?.count || 0),
      averageTrainingRating: Number(evaluations?.average || 0),
      averageMatchRating: 0,
      goals: Number(stats?.goals || 0),
      assists: Number(stats?.assists || 0),
      weeklyMinutesPlayed: Number(weeklyMinutes?.minutes || 0),
      weeklyMatchesPlayed: Number(weeklyMinutes?.matches || 0),
      weekStart: weeklyMinutes?.week_start || null,
      weekEnd: weeklyMinutes?.week_end || null,
      disciplineRecord: {
        yellowCards: Number(stats?.yellow_cards || 0),
        redCards: Number(stats?.red_cards || 0),
      },
      monthlyProgressSummary:
        "Generated from calendar events, attendance, evaluations, and match stats.",
    };
  }

  async parentListCalendarEvents(parentUserId, academyId, childId, filters) {
    await this._assertParentChild(parentUserId, childId, academyId);
    return this._playerVisibleEvents(childId, academyId, filters);
  }

  async parentListTrainings(parentUserId, academyId, childId, filters) {
    return this.parentListCalendarEvents(parentUserId, academyId, childId, {
      ...filters,
      eventType: "training",
    });
  }

  async parentListMatches(parentUserId, academyId, childId, filters) {
    await this._assertParentChild(parentUserId, childId, academyId);
    await this._finalizeOverdueMatches(academyId);
    const groupRows = await this.repo.findPlayerGroups(childId);
    const groupIds = groupRows.map((row) => row.group_id);
    return this.repo.paginate(
      this.repo.matchListQuery(academyId, { ...filters, groupIds }),
      filters,
      "m.id",
    );
  }

  async parentGetMatch(parentUserId, academyId, childId, matchId) {
    await this._assertParentChild(parentUserId, childId, academyId);
    const groupRows = await this.repo.findPlayerGroups(childId);
    const matchGroupIds = await this.repo.getMatchGroupIds(matchId);
    if (!groupRows.some((row) => matchGroupIds.includes(row.group_id)))
      throw new ForbiddenError("Parent cannot access this match");
    return this.adminGetMatch(academyId, matchId);
  }

  async parentGetMatchStats(parentUserId, academyId, childId, matchId) {
    await this.parentGetMatch(parentUserId, academyId, childId, matchId);
    return this.repo
      .db("match_player_stats")
      .where({ match_id: matchId, player_id: childId })
      .first();
  }

  async parentAttendanceHistory(parentUserId, academyId, childId, filters) {
    await this._assertParentChild(parentUserId, childId, academyId);
    const query = this.repo
      .db("event_attendance as ea")
      .join("calendar_events as ce", "ea.event_id", "ce.id")
      .where("ea.player_id", childId)
      .where("ce.academy_id", academyId)
      .select("ea.*", "ce.title", "ce.event_type", "ce.start_datetime")
      .orderBy("ce.start_datetime", "desc");
    return this.repo.paginate(query, filters, "ea.id");
  }

  async parentEvaluations(parentUserId, academyId, childId, filters) {
    await this._assertParentChild(parentUserId, childId, academyId);
    const query = this.repo
      .db("player_event_evaluations as pee")
      .join("calendar_events as ce", "pee.event_id", "ce.id")
      .where("pee.player_id", childId)
      .where("ce.academy_id", academyId)
      .where("pee.visibility", "player_and_parent")
      .select("pee.*", "ce.title", "ce.event_type", "ce.start_datetime")
      .orderBy("ce.start_datetime", "desc");
    return this.repo.paginate(query, filters, "pee.id");
  }

  async coachCreateBasicPlayer(user, data) {
    if (!this.playersService)
      throw new BadRequestError("Players service is unavailable");
    const coach = await this._getCoach(user.userId, user.academyId);
    const birthYear = new Date(data.birthDate).getFullYear();
    if (!Number.isInteger(birthYear))
      throw new BadRequestError("A valid player birth date is required");

    let groupId = data.groupId || null;
    let branchId = data.branchId || null;
    if (groupId) {
      await this._ensureCoachCanAccessGroups(coach, user.academyId, [groupId]);
      const groups = await this.repo.findGroupsByIds([groupId], user.academyId);
      branchId = branchId || groups[0]?.branch_id;
    } else {
      const matches = await this.repo.findCoachAccessibleBirthYears(
        coach.id,
        user.academyId,
        {
          branchId,
          birthYear,
        },
      );
      if (!matches.length) {
        throw new ForbiddenError(
          "Your coach account does not have access to this player birth year",
        );
      }
      if (!branchId && new Set(matches.map((row) => row.branch_id)).size > 1) {
        throw new BadRequestError(
          "Select a branch before creating this player",
        );
      }
      branchId = branchId || matches[0].branch_id;
      const autoGroup = await this.repo.findCoachAutoAssignableGroup(
        coach.id,
        branchId,
        birthYear,
      );
      groupId = autoGroup?.id || null;
    }
    return this.playersService.createPlayer(
      user.academyId,
      {
        ...data,
        branchId,
        groupId,
        markProfileComplete: false,
      },
      user,
    );
  }

  async coachCompletePlayerProfile(user, playerId, data) {
    if (!this.playersService)
      throw new BadRequestError("Players service is unavailable");
    const coach = await this._getCoach(user.userId, user.academyId);
    await this._ensureCoachCanAccessPlayers(coach, user.academyId, [playerId]);
    if (this.customDataService) {
      await this.customDataService.savePlayerValues(
        user,
        playerId,
        data.customValues || data.values || [],
        {
          markProfileComplete: true,
        },
      );
    }
    return this.playersService.updatePlayer(
      playerId,
      user.academyId,
      {
        ...data,
        customValues: undefined,
        values: undefined,
        markProfileComplete: true,
      },
      user,
    );
  }
}

module.exports = CalendarService;
