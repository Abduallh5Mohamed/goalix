import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

export interface Pagination {
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

type ApiListResponse<T> = {
  data: T[];
  meta?: { pagination?: Pagination };
  pagination?: Pagination;
};

const toPaginated = <T>(res: ApiListResponse<T>): PaginatedResponse<T> => ({
  data: res.data,
  pagination: res.pagination ??
    res.meta?.pagination ?? {
      total: res.data.length,
      page: 1,
      totalPages: 1,
    },
});

export type CalendarEventType =
  | "training"
  | "match"
  | "fitness_test"
  | "meeting"
  | "rest_day"
  | "tournament"
  | "medical_check"
  | "assessment_day";

export type MatchStatus =
  | "scheduled"
  | "postponed"
  | "cancelled"
  | "finished"
  | "completed";

export type CalendarEventStatus =
  | "scheduled"
  | "completed"
  | "finished"
  | "cancelled"
  | "postponed";

export interface EventGroup {
  id: string;
  name: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  event_type: CalendarEventType;
  start_datetime: string;
  end_datetime: string;
  location: string | null;
  status: CalendarEventStatus;
  visibility: "all_assigned_groups" | "selected_groups" | "coaches_only";
  notes: string | null;
  groups: EventGroup[];
  birth_years?: Array<{
    id: string;
    label: string;
    fromYear: number;
    toYear: number;
  }>;
  players?: Array<{ id: string; name: string }>;
  training?: {
    training_focus: string;
    intensity_level: string;
    objectives: string | null;
    session_plan: string | null;
    equipment_needed: string | null;
    coach_notes: string | null;
    original_end_datetime?: string | null;
    extended_minutes?: number;
    last_extended_at?: string | null;
  } | null;
  attendance?: TrainingAttendance[];
  evaluations?: TrainingEvaluation[];
  participants?: TrainingParticipant[];
}

export interface Match {
  id: string;
  event_id: string | null;
  team_id: string | null;
  age_group_id: string | null;
  team_name?: string | null;
  opponent_name: string;
  match_type: "official" | "friendly" | "training" | "training_match";
  match_date: string;
  match_time: string;
  location: string | null;
  venue_type: "home" | "away" | "neutral";
  referee_name: string | null;
  status: MatchStatus;
  match_status: string;
  match_day_notified_at?: string | null;
  started_at?: string | null;
  first_half_started_at?: string | null;
  first_half_stoppage_minutes?: number;
  second_half_started_at?: string | null;
  second_half_stoppage_minutes?: number;
  finished_at?: string | null;
  evaluations_finalized_at?: string | null;
  evaluations_finalized_by_coach_id?: string | null;
  organizer_notes: string | null;
  match_notes: string | null;
  our_score: number | null;
  opponent_score: number | null;
  groups: EventGroup[];
  birth_years?: Array<{
    id: string;
    label: string;
    fromYear: number;
    toYear: number;
  }>;
  squad?: MatchSquad[];
  evaluation_candidates?: MatchEvaluationCandidate[];
  tactics?: MatchTactics | null;
  attendance?: MatchAttendance[];
  stats?: MatchPlayerStats[];
  incidents?: MatchPlayerIncident[];
  goal_events?: MatchGoalEvent[];
  substitutions?: MatchSubstitution[];
  postponements?: MatchPostponement[];
}

export interface MatchSquad {
  id: string;
  match_id: string;
  player_id: string;
  player_name?: string;
  squad_role: "starter" | "substitute" | "reserve";
  position: string | null;
  shirt_number: number | null;
  player_instruction?: string | null;
  profile_status?: "incomplete" | "complete";
}

export type MatchEvaluationCandidate = MatchSquad & {
  is_target_fallback?: boolean;
};

export interface MatchTactics {
  id: string;
  match_id: string;
  formation: string;
  tactical_notes: string | null;
  coach_name?: string | null;
}

export interface MatchAttendance {
  id: string;
  player_id: string;
  player_name?: string;
  status: "present" | "absent" | "late" | "injured";
  notes: string | null;
}

export interface MatchPlayerStats {
  id: string;
  match_id: string;
  player_id: string;
  player_name?: string;
  goals: number;
  assists: number;
  minutes_played: number;
  weekly_minutes_played?: number;
  weekly_matches_played?: number;
  week_start?: string | null;
  week_end?: string | null;
  passes_completed?: number;
  pass_accuracy_percentage?: string | number | null;
  shots_total?: number;
  shots_on_target?: number;
  key_passes?: number;
  tackles?: number;
  defensive_tackles?: number;
  interceptions?: number;
  duels_won?: number;
  duels_lost?: number;
  possession_losses?: number;
  saves?: number;
  yellow_cards: number;
  red_cards: number;
  fouls?: number;
  injuries?: string | null;
  performance_rating: string | null;
  technical_rating?: string | number | null;
  tactical_rating?: string | number | null;
  physical_rating?: string | number | null;
  fatigue_rating?: string | number | null;
  mentality_rating?: string | number | null;
  decision_making_rating?: string | number | null;
  work_rate_rating?: string | number | null;
  positioning_rating?: string | number | null;
  strengths?: string | null;
  weaknesses?: string | null;
  improvement_plan?: string | null;
  coach_notes: string | null;
}

export interface MatchPlayerIncident {
  id: string;
  match_id: string;
  player_id: string;
  player_name?: string;
  incident_type: "yellow_card" | "red_card" | "injury";
  minute?: number;
  body_part: string | null;
  injury_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface MatchGoalEvent {
  id: string;
  match_id: string;
  team: "our" | "opponent";
  scorer_player_id: string | null;
  scorer_player_name?: string | null;
  assist_player_id: string | null;
  assist_player_name?: string | null;
  minute: number;
  notes: string | null;
  created_at: string;
}

export interface MatchSubstitution {
  id: string;
  match_id: string;
  out_player_id: string;
  out_player_name?: string | null;
  in_player_id: string;
  in_player_name?: string | null;
  coach_id: string | null;
  coach_name?: string | null;
  minute: number;
  reason: string | null;
  created_at: string;
}

export interface MatchPostponement {
  id: string;
  match_id: string;
  previous_date: string;
  previous_time: string;
  new_date: string;
  new_time: string;
  previous_location: string | null;
  new_location: string | null;
  reason: string | null;
  postponed_by_user_id: string | null;
  created_at: string;
}

export interface FriendlyMatchRequest {
  id: string;
  coach_id: string;
  coach_name?: string;
  team_id: string | null;
  team_name?: string | null;
  birth_year_id?: string | null;
  birth_year_name?: string | null;
  preferred_date: string;
  preferred_time: string;
  opponent_level: "weak" | "medium" | "strong";
  suggested_opponent_name: string | null;
  reason: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  admin_response: string | null;
  converted_match_id: string | null;
  created_at: string;
}

export interface AdminCoachMatchRequest {
  id: string;
  coach_id: string;
  coach_name?: string;
  opponent_name: string;
  match_type: "official" | "friendly" | "training" | "training_match";
  match_date: string;
  match_time: string;
  location: string;
  venue_type: "home" | "away" | "neutral";
  referee_name: string | null;
  organizer_notes: string | null;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expires_at: string;
  selected_group_id: string | null;
  selected_group_name?: string | null;
  selected_birth_year_id: string | null;
  selected_birth_year_name?: string | null;
  created_match_id: string | null;
  created_at: string;
}

export interface PlayerOption {
  id: string;
  field_key: "position" | "secondary_position" | "playing_style";
  label: string;
  value: string;
  created_by_role: "admin" | "coach";
  is_active: boolean;
}

export interface CoachPlayer {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  username?: string | null;
  phone?: string | null;
  account_phone?: string | null;
  level?: string | null;
  position: string | null;
  profile_status: "incomplete" | "complete";
  branch_id?: string | null;
  group_id: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  customProfile?: Array<{
    label: string;
    key: string;
    fieldType: string;
    value: unknown;
  }>;
}

export type PlayerProfile = CoachPlayer &
  Record<string, unknown> & {
    player_code?: string | null;
    photo_url?: string | null;
    branch_name?: string | null;
    group_name?: string | null;
    account_phone?: string | null;
    profile_completed_at?: string | null;
    date_joined?: string | null;
    created_at?: string | null;
    latestMeasurement?: Record<string, unknown> | null;
    height_cm?: string | number | null;
    weight_kg?: string | number | null;
  };

export interface PlayerProgress {
  playerId: string;
  playerName: string;
  attendancePercentage: number;
  trainingAttendancePercentage?: number;
  matchAttendancePercentage?: number;
  trainingsAttended: number;
  trainingsRecorded?: number;
  matchesPlayed: number;
  matchesAttended?: number;
  matchesRecorded?: number;
  averageTrainingRating: number;
  averageMatchRating: number;
  goals: number;
  assists: number;
  weeklyMinutesPlayed: number;
  weeklyMatchesPlayed: number;
  weekStart: string | null;
  weekEnd: string | null;
  disciplineRecord: {
    yellowCards: number;
    redCards: number;
  };
  attendanceTotals?: {
    total: number;
    attended: number;
    trainingTotal: number;
    trainingAttended: number;
    matchTotal: number;
    matchAttended: number;
  };
  monthlyProgressSummary: string;
}

export interface PlayerAttendanceRecord {
  id: string;
  record_type?: "training" | "match";
  source_id?: string;
  event_id?: string | null;
  match_id?: string | null;
  player_id: string;
  player_name?: string;
  status: TrainingAttendance["status"] | MatchAttendance["status"];
  arrival_time?: string | null;
  reason?: string | null;
  notes: string | null;
  title?: string;
  event_type?: CalendarEventType;
  start_datetime?: string;
  opponent_name?: string | null;
  match_date?: string | null;
  match_time?: string | null;
  location?: string | null;
}

export type PlayerEvaluationRecord = TrainingEvaluation & {
  title?: string;
  event_type?: CalendarEventType;
  start_datetime?: string;
};

export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface InjuryRiskPainDiscomfortRecord {
  id: string | null;
  player_id: string;
  player_name: string;
  position: string | null;
  group_id: string | null;
  week_start: string;
  week_end: string;
  pain_or_discomfort: 0 | 1 | null;
  recorded_by_coach_id: string | null;
  updated_at: string | null;
}

export interface InjuryRiskModelInput {
  player_id: string;
  player_name: string;
  age: number | null;
  position: string;
  attendance_rate: number;
  training_sessions_per_week: number;
  match_minutes_last_week: number;
  fatigue_rating: number;
  previous_injury: number;
  pain_or_discomfort: number;
}

export interface InjuryRiskPrediction {
  risk_percentage: number;
  risk_level: "Low" | "Medium" | "High" | string;
  alert_flag: boolean;
  recommendation: string;
}

export interface InjuryRiskPredictionRecord {
  player_id: string;
  player_name: string;
  position: string | null;
  group_id: string | null;
  analysis_id: string | null;
  input: InjuryRiskModelInput | null;
  prediction: InjuryRiskPrediction | null;
  model_version: string | null;
  created_at: string | null;
  error?: string | null;
}

export interface CoachPlayerDetail {
  player: CoachPlayer &
    Record<string, unknown> & {
      player_code?: string | null;
      photo_url?: string | null;
      branch_name?: string | null;
      group_name?: string | null;
      account_phone?: string | null;
      account_is_active?: boolean | null;
      profile_completed_at?: string | null;
      date_joined?: string | null;
      created_at?: string | null;
    };
  summary: {
    matchTotals: {
      matches_played: number;
      minutes_played: number;
      goals: number;
      assists: number;
      yellow_cards: number;
      red_cards: number;
    };
    attendanceTotals: Record<string, number>;
    trainingEvaluationCount: number;
    injuryCount: number;
    latestMeasurement: Record<string, unknown> | null;
    latestRanking: Record<string, unknown> | null;
  };
  customProfile: Array<Record<string, unknown> & { label: string; value: unknown }>;
  groups: Record<string, unknown>[];
  measurements: Record<string, unknown>[];
  injuries: Record<string, unknown>[];
  healthProfile: Record<string, unknown> | null;
  skillAssessments: Record<string, unknown>[];
  trainingSummaries: Record<string, unknown>[];
  matchSummaries: Record<string, unknown>[];
  trainingAttendance: Record<string, unknown>[];
  trainingEvaluations: Record<string, unknown>[];
  matchStats: Array<MatchPlayerStats & Record<string, unknown>>;
  matchAttendance: Record<string, unknown>[];
  substitutions: MatchSubstitution[];
  incidents: MatchPlayerIncident[];
  goals: MatchGoalEvent[];
  rankings: Record<string, unknown>[];
  coachRatings: Record<string, unknown>[];
  payments: {
    subscriptions: Record<string, unknown>[];
    invoices: Record<string, unknown>[];
    transactions: Record<string, unknown>[];
  };
}

export interface TrainingAttendance {
  id: string;
  event_id: string;
  player_id: string;
  player_name?: string;
  status: "present" | "absent" | "late" | "excused" | "injured";
  arrival_time: string | null;
  reason: string | null;
  notes: string | null;
}

export interface TrainingEvaluation {
  id: string;
  event_id: string;
  player_id: string;
  player_name?: string;
  overall_rating: string | number | null;
  technical_rating: string | number | null;
  tactical_rating: string | number | null;
  physical_rating: string | number | null;
  fatigue_rating?: string | number | null;
  mentality_rating: string | number | null;
  discipline_rating: string | number | null;
  teamwork_rating: string | number | null;
  impact_rating: string | number | null;
  ball_control_rating?: string | number | null;
  passing_accuracy_rating?: string | number | null;
  shooting_rating?: string | number | null;
  dribbling_rating?: string | number | null;
  receiving_under_pressure_rating?: string | number | null;
  speed_rating?: string | number | null;
  endurance_rating?: string | number | null;
  strength_rating?: string | number | null;
  agility_rating?: string | number | null;
  strengths: string | null;
  weaknesses: string | null;
  coach_notes: string | null;
  improvement_plan: string | null;
  development_notes?: string | null;
}

export interface TrainingParticipant extends CoachPlayer {
  player_code?: string | null;
  full_name: string;
  group_name?: string | null;
  attendance: TrainingAttendance | null;
  evaluation: TrainingEvaluation | null;
  customProfile: Array<{
    label: string;
    key: string;
    fieldType: string;
    value: unknown;
  }>;
  totals: {
    attendance: {
      total: number;
      present: number;
      late: number;
      absent: number;
      injured: number;
    };
    matches: {
      matches_played: number;
      minutes_played: number;
      goals: number;
      assists: number;
      average_rating: string | number | null;
      pass_accuracy_percentage: string | number | null;
      tackles: number;
    };
    injuries: number;
  };
  monthlyProgress: Array<{
    month: string;
    average_rating: string | number | null;
  }>;
}

export interface CoachGroup {
  group_id: string;
  group_name: string;
  branch_id: string;
  branch_name: string;
  role: string;
  can_create_training: boolean;
  can_take_attendance: boolean;
  can_evaluate_players: boolean;
}

export type CustomFieldType =
  | "text"
  | "long_text"
  | "number"
  | "decimal"
  | "date"
  | "time"
  | "boolean"
  | "single_select"
  | "multi_select"
  | "rating"
  | "percentage"
  | "file"
  | "image"
  | "url"
  | "phone"
  | "email";

export interface CustomFieldOption {
  id: string;
  field_id: string;
  label: string;
  value: string;
  created_by_role: "admin" | "coach";
  is_active: boolean;
  sort_order: number;
}

export interface CustomField {
  id: string;
  category_id: string;
  label: string;
  key: string;
  field_type: CustomFieldType;
  is_required: boolean;
  placeholder: string | null;
  default_value: string | null;
  unit: string | null;
  min_value: string | number | null;
  max_value: string | number | null;
  created_by_role: "admin" | "coach";
  is_active: boolean;
  sort_order: number;
  options: CustomFieldOption[];
}

export interface CustomCategory {
  id: string;
  name: string;
  description: string | null;
  target_module:
    | "player_profile"
    | "training"
    | "match"
    | "injury"
    | "payment"
    | "evaluation";
  created_by_role: "admin" | "coach";
  created_by_coach_id: string | null;
  assigned_coach_id: string | null;
  visibility: "global" | "specific_coach" | "coach_only" | "shared";
  is_editable_by_coach: boolean;
  is_system_default: boolean;
  is_active: boolean;
  sort_order: number;
  fields: CustomField[];
}

export interface PlayerCustomProfile {
  categories: CustomCategory[];
  values: Array<{ field_id: string; value: unknown }>;
  missingRequiredFieldIds: string[];
}

export interface PlayerImageUploadResponse {
  fileName: string;
  image: string;
  mimeType: string;
  sizeBytes: number;
}

export const calendarApi = createApi({
  reducerPath: "calendarApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "CalendarEvents",
    "Matches",
    "FriendlyRequests",
    "CoachGroups",
    "CoachPlayers",
    "PlayerOptions",
    "CustomData",
    "PlayerCustomProfile",
    "Reports",
    "InjuryRiskInputs",
    "Notifications",
  ],
  endpoints: (builder) => ({
    getAdminCalendarEvents: builder.query<
      PaginatedResponse<CalendarEvent>,
      Record<string, string | number | undefined> | void
    >({
      query: (args) => {
        const filters = args ?? {};
        const params = new URLSearchParams({
          page: String(filters.page ?? 1),
          limit: String(filters.limit ?? 100),
        });
        for (const [key, value] of Object.entries(filters))
          if (value && key !== "page" && key !== "limit")
            params.set(key, String(value));
        return `/admin/calendar-events?${params}`;
      },
      transformResponse: (res: ApiListResponse<CalendarEvent>) =>
        toPaginated(res),
      providesTags: ["CalendarEvents"],
    }),
    createAdminCalendarEvent: builder.mutation<
      CalendarEvent,
      Record<string, unknown>
    >({
      query: (body) => ({
        url: "/admin/calendar-events",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: CalendarEvent }) => res.data,
      invalidatesTags: ["CalendarEvents"],
    }),
    getAdminMatches: builder.query<
      PaginatedResponse<Match>,
      Record<string, string | number | undefined> | void
    >({
      query: (args) => {
        const filters = args ?? {};
        const params = new URLSearchParams({
          page: String(filters.page ?? 1),
          limit: String(filters.limit ?? 100),
        });
        for (const [key, value] of Object.entries(filters))
          if (value && key !== "page" && key !== "limit")
            params.set(key, String(value));
        return `/admin/matches?${params}`;
      },
      transformResponse: (res: ApiListResponse<Match>) => toPaginated(res),
      providesTags: ["Matches"],
    }),
    getAdminMatch: builder.query<Match, string>({
      query: (id) => `/admin/matches/${id}`,
      transformResponse: (res: { data: Match }) => res.data,
      providesTags: ["Matches"],
    }),
    createAdminMatch: builder.mutation<Match, Record<string, unknown>>({
      query: (body) => ({ url: "/admin/matches", method: "POST", body }),
      transformResponse: (res: { data: Match }) => res.data,
      invalidatesTags: ["Matches", "CalendarEvents"],
    }),
    getAdminCoachMatchRequests: builder.query<
      PaginatedResponse<AdminCoachMatchRequest>,
      void
    >({
      query: () => "/admin/match-coach-requests?limit=100",
      transformResponse: (res: ApiListResponse<AdminCoachMatchRequest>) =>
        toPaginated(res),
      providesTags: ["FriendlyRequests"],
    }),
    createAdminCoachMatchRequest: builder.mutation<
      AdminCoachMatchRequest,
      Record<string, unknown>
    >({
      query: (body) => ({
        url: "/admin/match-coach-requests",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: AdminCoachMatchRequest }) => res.data,
      invalidatesTags: ["FriendlyRequests"],
    }),
    updateAdminMatch: builder.mutation<
      Match,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/admin/matches/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: { data: Match }) => res.data,
      invalidatesTags: ["Matches", "CalendarEvents"],
    }),
    updateAdminMatchStatus: builder.mutation<
      Match,
      { id: string; status: MatchStatus }
    >({
      query: ({ id, status }) => ({
        url: `/admin/matches/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (res: { data: Match }) => res.data,
      invalidatesTags: ["Matches", "CalendarEvents"],
    }),
    postponeAdminMatch: builder.mutation<
      Match,
      {
        id: string;
        body: {
          matchDate: string;
          matchTime: string;
          location?: string | null;
          reason?: string;
        };
      }
    >({
      query: ({ id, body }) => ({
        url: `/admin/matches/${id}/postpone`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: { data: Match }) => res.data,
      invalidatesTags: ["Matches", "CalendarEvents"],
    }),
    deleteAdminMatch: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/matches/${id}`, method: "DELETE" }),
      invalidatesTags: ["Matches", "CalendarEvents"],
    }),
    hardDeleteAdminMatch: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/matches/${id}/hard-delete`,
        method: "DELETE",
      }),
      invalidatesTags: ["Matches", "CalendarEvents", "FriendlyRequests"],
    }),
    getAdminFriendlyRequests: builder.query<
      PaginatedResponse<FriendlyMatchRequest>,
      void
    >({
      query: () => "/admin/friendly-match-requests?limit=100",
      transformResponse: (res: ApiListResponse<FriendlyMatchRequest>) =>
        toPaginated(res),
      providesTags: ["FriendlyRequests"],
    }),
    approveFriendlyRequest: builder.mutation<
      FriendlyMatchRequest,
      { id: string; adminResponse?: string }
    >({
      query: ({ id, adminResponse }) => ({
        url: `/admin/friendly-match-requests/${id}/approve`,
        method: "PATCH",
        body: { adminResponse },
      }),
      transformResponse: (res: { data: FriendlyMatchRequest }) => res.data,
      invalidatesTags: ["FriendlyRequests"],
    }),
    rejectFriendlyRequest: builder.mutation<
      FriendlyMatchRequest,
      { id: string; adminResponse: string }
    >({
      query: ({ id, adminResponse }) => ({
        url: `/admin/friendly-match-requests/${id}/reject`,
        method: "PATCH",
        body: { adminResponse },
      }),
      transformResponse: (res: { data: FriendlyMatchRequest }) => res.data,
      invalidatesTags: ["FriendlyRequests"],
    }),
    convertFriendlyRequest: builder.mutation<
      Match,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/admin/friendly-match-requests/${id}/convert-to-match`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: Match }) => res.data,
      invalidatesTags: ["FriendlyRequests", "Matches", "CalendarEvents"],
    }),
    getCoachCalendarEvents: builder.query<
      PaginatedResponse<CalendarEvent>,
      void
    >({
      query: () => "/coach/calendar-events?limit=100",
      transformResponse: (res: ApiListResponse<CalendarEvent>) =>
        toPaginated(res),
      providesTags: ["CalendarEvents"],
    }),
    getCoachGroupsScoped: builder.query<CoachGroup[], void>({
      query: () => "/coach/groups",
      transformResponse: (res: { data: CoachGroup[] }) => res.data,
      providesTags: ["CoachGroups"],
    }),
    getCoachPlayersScoped: builder.query<
      PaginatedResponse<CoachPlayer>,
      {
        page?: number;
        limit?: number;
        customFieldId?: string;
        customValue?: string;
        customOptionId?: string;
      } | void
    >({
      query: (args) => {
        const params = new URLSearchParams({
          page: String(args?.page ?? 1),
          limit: String(args?.limit ?? 200),
        });
        if (args?.customFieldId)
          params.set("customFieldId", args.customFieldId);
        if (args?.customValue) params.set("customValue", args.customValue);
        if (args?.customOptionId)
          params.set("customOptionId", args.customOptionId);
        return `/coach/players?${params}`;
      },
      transformResponse: (res: ApiListResponse<CoachPlayer>) =>
        toPaginated(res),
      providesTags: ["CoachPlayers"],
    }),
    getCoachPlayerDetail: builder.query<CoachPlayerDetail, string>({
      query: (id) => `/coach/players/${id}`,
      transformResponse: (res: { data: CoachPlayerDetail }) => res.data,
      providesTags: ["CoachPlayers", "Matches", "CalendarEvents"],
    }),
    getInjuryRiskPainDiscomfort: builder.query<
      InjuryRiskPainDiscomfortRecord[],
      void
    >({
      query: () => "/coach/injury-risk/pain-discomfort",
      transformResponse: (res: { data: InjuryRiskPainDiscomfortRecord[] }) =>
        res.data,
      providesTags: ["InjuryRiskInputs"],
    }),
    upsertInjuryRiskPainDiscomfort: builder.mutation<
      InjuryRiskPainDiscomfortRecord[],
      { records: Array<{ playerId: string; painOrDiscomfort: 0 | 1 }> }
    >({
      query: (body) => ({
        url: "/coach/injury-risk/pain-discomfort",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: InjuryRiskPainDiscomfortRecord[] }) =>
        res.data,
      invalidatesTags: ["InjuryRiskInputs"],
    }),
    getInjuryRiskPredictions: builder.query<
      InjuryRiskPredictionRecord[],
      void
    >({
      query: () => "/coach/injury-risk/predictions",
      transformResponse: (res: { data: InjuryRiskPredictionRecord[] }) =>
        res.data,
      providesTags: ["InjuryRiskInputs"],
    }),
    runInjuryRiskPredictions: builder.mutation<
      InjuryRiskPredictionRecord[],
      void
    >({
      query: () => ({
        url: "/coach/injury-risk/predictions/run",
        method: "POST",
      }),
      transformResponse: (res: { data: InjuryRiskPredictionRecord[] }) =>
        res.data,
      invalidatesTags: ["InjuryRiskInputs"],
    }),
    createCoachBasicPlayer: builder.mutation<
      CoachPlayer,
      Record<string, unknown>
    >({
      query: (body) => ({ url: "/coach/players", method: "POST", body }),
      transformResponse: (res: { data: CoachPlayer }) => res.data,
      invalidatesTags: ["CoachPlayers"],
    }),
    uploadCoachPlayerImage: builder.mutation<PlayerImageUploadResponse, File>({
      query: (file) => {
        const body = new FormData();
        body.append("image", file);
        return { url: "/players/images", method: "POST", body };
      },
      transformResponse: (res: { data: PlayerImageUploadResponse }) => res.data,
    }),
    completeCoachPlayerProfile: builder.mutation<
      CoachPlayer,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/coach/players/${id}/complete-profile`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: { data: CoachPlayer }) => res.data,
      invalidatesTags: ["CoachPlayers"],
    }),
    createCoachTrainingEvent: builder.mutation<
      CalendarEvent,
      Record<string, unknown>
    >({
      query: (body) => ({
        url: "/coach/training-events",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: CalendarEvent }) => res.data,
      invalidatesTags: ["CalendarEvents"],
    }),
    getCoachTrainingEvent: builder.query<CalendarEvent, string>({
      query: (id) => `/coach/training-events/${id}`,
      transformResponse: (res: { data: CalendarEvent }) => res.data,
      providesTags: ["CalendarEvents"],
    }),
    updateCoachTrainingStatus: builder.mutation<
      CalendarEvent,
      {
        id: string;
        status: CalendarEventStatus;
      }
    >({
      query: ({ id, status }) => ({
        url: `/coach/training-events/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (res: { data: CalendarEvent }) => res.data,
      invalidatesTags: ["CalendarEvents"],
    }),
    extendCoachTrainingEvent: builder.mutation<
      CalendarEvent,
      { id: string; minutes: number }
    >({
      query: ({ id, minutes }) => ({
        url: `/coach/training-events/${id}/extend`,
        method: "PATCH",
        body: { minutes },
      }),
      transformResponse: (res: { data: CalendarEvent }) => res.data,
      invalidatesTags: ["CalendarEvents"],
    }),
    upsertTrainingAttendance: builder.mutation<
      TrainingAttendance[],
      { eventId: string; records: Record<string, unknown>[] }
    >({
      query: ({ eventId, records }) => ({
        url: `/coach/events/${eventId}/attendance`,
        method: "POST",
        body: { records },
      }),
      transformResponse: (res: { data: TrainingAttendance[] }) => res.data,
      invalidatesTags: ["CalendarEvents"],
    }),
    upsertTrainingEvaluations: builder.mutation<
      TrainingEvaluation[],
      { eventId: string; records: Record<string, unknown>[] }
    >({
      query: ({ eventId, records }) => ({
        url: `/coach/events/${eventId}/evaluations`,
        method: "POST",
        body: { records },
      }),
      transformResponse: (res: { data: TrainingEvaluation[] }) => res.data,
      invalidatesTags: ["CalendarEvents"],
    }),
    getCoachMatches: builder.query<PaginatedResponse<Match>, void>({
      query: () => "/coach/matches?limit=100",
      transformResponse: (res: ApiListResponse<Match>) => toPaginated(res),
      providesTags: ["Matches"],
    }),
    getCoachMatch: builder.query<Match, string>({
      query: (id) => `/coach/matches/${id}`,
      transformResponse: (res: { data: Match }) => res.data,
      providesTags: ["Matches"],
    }),
    upsertMatchSquad: builder.mutation<
      MatchSquad[],
      { matchId: string; players: Record<string, unknown>[] }
    >({
      query: ({ matchId, players }) => ({
        url: `/coach/matches/${matchId}/squad`,
        method: "POST",
        body: { players },
      }),
      transformResponse: (res: { data: MatchSquad[] }) => res.data,
      invalidatesTags: ["Matches"],
    }),
    updateMatchSquadPlayer: builder.mutation<
      MatchSquad,
      { matchId: string; playerId: string; body: Record<string, unknown> }
    >({
      query: ({ matchId, playerId, body }) => ({
        url: `/coach/matches/${matchId}/squad/${playerId}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: { data: MatchSquad }) => res.data,
      invalidatesTags: ["Matches"],
    }),
    deleteMatchSquadPlayer: builder.mutation<
      { message: string },
      { matchId: string; playerId: string }
    >({
      query: ({ matchId, playerId }) => ({
        url: `/coach/matches/${matchId}/squad/${playerId}`,
        method: "DELETE",
      }),
      transformResponse: (res: { data: { message: string } }) => res.data,
      invalidatesTags: ["Matches"],
    }),
    upsertMatchTactics: builder.mutation<
      MatchTactics,
      { matchId: string; body: Record<string, unknown> }
    >({
      query: ({ matchId, body }) => ({
        url: `/coach/matches/${matchId}/tactics`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: MatchTactics }) => res.data,
      invalidatesTags: ["Matches"],
    }),
    updateCoachMatchTargets: builder.mutation<
      Match,
      { matchId: string; body: { groupId?: string; birthYearId?: string } }
    >({
      query: ({ matchId, body }) => ({
        url: `/coach/matches/${matchId}/targets`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: { data: Match }) => res.data,
      invalidatesTags: ["Matches", "CalendarEvents"],
    }),
    updateMatchLiveStatus: builder.mutation<
      Match,
      {
        matchId: string;
        body: {
          matchStatus: "scheduled" | "first_half" | "second_half" | "finished";
          firstHalfStoppageMinutes?: number;
          secondHalfStoppageMinutes?: number;
        };
      }
    >({
      query: ({ matchId, body }) => ({
        url: `/coach/matches/${matchId}/live-status`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: { data: Match }) => res.data,
      invalidatesTags: ["Matches", "CalendarEvents"],
    }),
    recordMatchIncident: builder.mutation<
      MatchPlayerIncident,
      {
        matchId: string;
        body: {
          playerId: string;
          incidentType: "yellow_card" | "red_card" | "injury";
          minute?: number;
          bodyPart?: string;
          notes?: string;
        };
      }
    >({
      query: ({ matchId, body }) => ({
        url: `/coach/matches/${matchId}/incidents`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: MatchPlayerIncident }) => res.data,
      invalidatesTags: ["Matches"],
    }),
    recordMatchGoal: builder.mutation<
      Match,
      {
        matchId: string;
        body: {
          team: "our" | "opponent";
          scorerPlayerId?: string;
          assistPlayerId?: string;
          minute?: number;
          notes?: string;
        };
      }
    >({
      query: ({ matchId, body }) => ({
        url: `/coach/matches/${matchId}/goals`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: Match }) => res.data,
      invalidatesTags: ["Matches"],
    }),
    deleteMatchGoal: builder.mutation<
      Match,
      { matchId: string; goalId: string }
    >({
      query: ({ matchId, goalId }) => ({
        url: `/coach/matches/${matchId}/goals/${goalId}`,
        method: "DELETE",
      }),
      transformResponse: (res: { data: Match }) => res.data,
      invalidatesTags: ["Matches"],
    }),
    recordMatchSubstitution: builder.mutation<
      Match,
      {
        matchId: string;
        body: {
          outPlayerId: string;
          inPlayerId: string;
          minute?: number;
          reason?: string;
        };
      }
    >({
      query: ({ matchId, body }) => ({
        url: `/coach/matches/${matchId}/substitutions`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: Match }) => res.data,
      invalidatesTags: ["Matches"],
    }),
    deleteMatchSubstitution: builder.mutation<
      Match,
      { matchId: string; substitutionId: string }
    >({
      query: ({ matchId, substitutionId }) => ({
        url: `/coach/matches/${matchId}/substitutions/${substitutionId}`,
        method: "DELETE",
      }),
      transformResponse: (res: { data: Match }) => res.data,
      invalidatesTags: ["Matches"],
    }),
    deleteMatchIncident: builder.mutation<
      Match,
      { matchId: string; incidentId: string }
    >({
      query: ({ matchId, incidentId }) => ({
        url: `/coach/matches/${matchId}/incidents/${incidentId}`,
        method: "DELETE",
      }),
      transformResponse: (res: { data: Match }) => res.data,
      invalidatesTags: ["Matches"],
    }),
    upsertMatchAttendance: builder.mutation<
      MatchAttendance[],
      { matchId: string; records: Record<string, unknown>[] }
    >({
      query: ({ matchId, records }) => ({
        url: `/coach/matches/${matchId}/attendance`,
        method: "POST",
        body: { records },
      }),
      transformResponse: (res: { data: MatchAttendance[] }) => res.data,
      invalidatesTags: ["Matches"],
    }),
    upsertMatchStats: builder.mutation<
      MatchPlayerStats[],
      { matchId: string; records: Record<string, unknown>[]; finalize?: boolean }
    >({
      query: ({ matchId, records, finalize }) => ({
        url: `/coach/matches/${matchId}/player-stats`,
        method: "POST",
        body: { records, finalize },
      }),
      transformResponse: (res: { data: MatchPlayerStats[] }) => res.data,
      invalidatesTags: ["Matches"],
    }),
    createFriendlyRequest: builder.mutation<
      FriendlyMatchRequest,
      Record<string, unknown>
    >({
      query: (body) => ({
        url: "/coach/friendly-match-requests",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: FriendlyMatchRequest }) => res.data,
      invalidatesTags: ["FriendlyRequests"],
    }),
    getCoachFriendlyRequests: builder.query<
      PaginatedResponse<FriendlyMatchRequest>,
      void
    >({
      query: () => "/coach/friendly-match-requests?limit=100",
      transformResponse: (res: ApiListResponse<FriendlyMatchRequest>) =>
        toPaginated(res),
      providesTags: ["FriendlyRequests"],
    }),
    getCoachAdminMatchRequests: builder.query<
      PaginatedResponse<AdminCoachMatchRequest>,
      void
    >({
      query: () => "/coach/match-requests?limit=100",
      transformResponse: (res: ApiListResponse<AdminCoachMatchRequest>) =>
        toPaginated(res),
      providesTags: ["FriendlyRequests"],
    }),
    acceptCoachAdminMatchRequest: builder.mutation<
      Match,
      { id: string; groupId?: string; birthYearId?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/coach/match-requests/${id}/accept`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: Match }) => res.data,
      invalidatesTags: ["FriendlyRequests", "Matches", "CalendarEvents"],
    }),
    getPlayerOptions: builder.query<
      PlayerOption[],
      { role?: "admin" | "coach"; fieldKey?: string } | void
    >({
      query: (args) => {
        const role = args?.role ?? "admin";
        const params = args?.fieldKey ? `?fieldKey=${args.fieldKey}` : "";
        return `/${role}/player-field-options${params}`;
      },
      transformResponse: (res: { data: PlayerOption[] }) => res.data,
      providesTags: ["PlayerOptions"],
    }),
    createPlayerOption: builder.mutation<
      PlayerOption,
      { role: "admin" | "coach"; body: Record<string, unknown> }
    >({
      query: ({ role, body }) => ({
        url: `/${role}/player-field-options`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: PlayerOption }) => res.data,
      invalidatesTags: ["PlayerOptions"],
    }),
    getCustomCategories: builder.query<
      CustomCategory[],
      { role: "admin" | "coach"; targetModule?: string } | void
    >({
      query: (args) => {
        const role = args?.role ?? "admin";
        const targetModule = args?.targetModule ?? "player_profile";
        return `/${role}/custom-categories?targetModule=${targetModule}`;
      },
      transformResponse: (res: { data: CustomCategory[] }) => res.data,
      providesTags: ["CustomData"],
    }),
    createCustomCategory: builder.mutation<
      CustomCategory,
      { role: "admin" | "coach"; body: Record<string, unknown> }
    >({
      query: ({ role, body }) => ({
        url: `/${role}/custom-categories`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: CustomCategory }) => res.data,
      invalidatesTags: ["CustomData"],
    }),
    createCustomField: builder.mutation<
      CustomField,
      {
        role: "admin" | "coach";
        categoryId: string;
        body: Record<string, unknown>;
      }
    >({
      query: ({ role, categoryId, body }) => ({
        url: `/${role}/custom-categories/${categoryId}/fields`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: CustomField }) => res.data,
      invalidatesTags: ["CustomData", "PlayerCustomProfile"],
    }),
    updateCustomField: builder.mutation<
      CustomField,
      { role: "admin" | "coach"; id: string; body: Record<string, unknown> }
    >({
      query: ({ role, id, body }) => ({
        url: `/${role}/custom-fields/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: { data: CustomField }) => res.data,
      invalidatesTags: ["CustomData", "PlayerCustomProfile"],
    }),
    deleteCustomField: builder.mutation<
      void,
      { role: "admin" | "coach"; id: string }
    >({
      query: ({ role, id }) => ({
        url: `/${role}/custom-fields/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CustomData", "PlayerCustomProfile"],
    }),
    createCustomFieldOption: builder.mutation<
      CustomFieldOption,
      {
        role: "admin" | "coach";
        fieldId: string;
        body: Record<string, unknown>;
      }
    >({
      query: ({ role, fieldId, body }) => ({
        url: `/${role}/custom-fields/${fieldId}/options`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { data: CustomFieldOption }) => res.data,
      invalidatesTags: ["CustomData", "PlayerCustomProfile"],
    }),
    updateCustomFieldOption: builder.mutation<
      CustomFieldOption,
      { role: "admin" | "coach"; id: string; body: Record<string, unknown> }
    >({
      query: ({ role, id, body }) => ({
        url: `/${role}/custom-field-options/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: { data: CustomFieldOption }) => res.data,
      invalidatesTags: ["CustomData", "PlayerCustomProfile"],
    }),
    deleteCustomFieldOption: builder.mutation<
      void,
      { role: "admin" | "coach"; id: string }
    >({
      query: ({ role, id }) => ({
        url: `/${role}/custom-field-options/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CustomData", "PlayerCustomProfile"],
    }),
    updateCustomCategory: builder.mutation<
      CustomCategory,
      { role: "admin" | "coach"; id: string; body: Record<string, unknown> }
    >({
      query: ({ role, id, body }) => ({
        url: `/${role}/custom-categories/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: { data: CustomCategory }) => res.data,
      invalidatesTags: ["CustomData", "PlayerCustomProfile"],
    }),
    deleteCustomCategory: builder.mutation<
      void,
      { role: "admin" | "coach"; id: string }
    >({
      query: ({ role, id }) => ({
        url: `/${role}/custom-categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CustomData", "PlayerCustomProfile"],
    }),
    getCoachPlayerCustomProfile: builder.query<PlayerCustomProfile, string>({
      query: (playerId) => `/coach/players/${playerId}/custom-profile`,
      transformResponse: (res: { data: PlayerCustomProfile }) => res.data,
      providesTags: ["PlayerCustomProfile"],
    }),
    saveCoachPlayerCustomProfile: builder.mutation<
      PlayerCustomProfile,
      {
        playerId: string;
        values: Array<{ fieldId: string; value: unknown }>;
        markProfileComplete?: boolean;
      }
    >({
      query: ({ playerId, values, markProfileComplete }) => ({
        url: `/coach/players/${playerId}/custom-profile`,
        method: "PATCH",
        body: { values, markProfileComplete },
      }),
      transformResponse: (res: { data: PlayerCustomProfile }) => res.data,
      invalidatesTags: ["PlayerCustomProfile", "CoachPlayers"],
    }),
    getPlayerProfile: builder.query<PlayerProfile, void>({
      query: () => "/player/profile",
      transformResponse: (res: { data: PlayerProfile }) => res.data,
      providesTags: ["CoachPlayers"],
    }),
    getPlayerProgress: builder.query<PlayerProgress, void>({
      query: () => "/player/progress",
      transformResponse: (res: { data: PlayerProgress }) => res.data,
      providesTags: ["CalendarEvents", "Matches"],
    }),
    getPlayerAttendance: builder.query<
      PaginatedResponse<PlayerAttendanceRecord>,
      void
    >({
      query: () => "/player/attendance?limit=100",
      transformResponse: (res: ApiListResponse<PlayerAttendanceRecord>) =>
        toPaginated(res),
      providesTags: ["CalendarEvents"],
    }),
    getPlayerEvaluations: builder.query<
      PaginatedResponse<PlayerEvaluationRecord>,
      void
    >({
      query: () => "/player/evaluations?limit=100",
      transformResponse: (res: ApiListResponse<PlayerEvaluationRecord>) =>
        toPaginated(res),
      providesTags: ["CalendarEvents"],
    }),
    getPlayerTrainings: builder.query<
      PaginatedResponse<CalendarEvent>,
      void
    >({
      query: () => "/player/trainings?limit=100",
      transformResponse: (res: ApiListResponse<CalendarEvent>) =>
        toPaginated(res),
      providesTags: ["CalendarEvents"],
    }),
    getNotifications: builder.query<PaginatedResponse<NotificationRow>, void>({
      query: () => "/notifications?limit=20",
      transformResponse: (res: ApiListResponse<NotificationRow>) =>
        toPaginated(res),
      providesTags: ["Notifications"],
    }),
    getUnreadNotificationsCount: builder.query<number, void>({
      query: () => "/notifications/unread-count",
      transformResponse: (res: { data: { unread: number } }) =>
        res.data.unread,
      providesTags: ["Notifications"],
    }),
    markNotificationRead: builder.mutation<NotificationRow, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      transformResponse: (res: { data: NotificationRow }) => res.data,
      invalidatesTags: ["Notifications"],
    }),
    markAllNotificationsRead: builder.mutation<
      { markedRead: number },
      void
    >({
      query: () => ({ url: "/notifications/read-all", method: "PATCH" }),
      transformResponse: (res: { data: { markedRead: number } }) => res.data,
      invalidatesTags: ["Notifications"],
    }),
    getPlayerMatches: builder.query<PaginatedResponse<Match>, void>({
      query: () => "/player/matches?limit=100",
      transformResponse: (res: ApiListResponse<Match>) => toPaginated(res),
      providesTags: ["Matches"],
    }),
    getPlayerCalendarEvents: builder.query<
      PaginatedResponse<CalendarEvent>,
      void
    >({
      query: () => "/player/calendar-events?limit=100",
      transformResponse: (res: ApiListResponse<CalendarEvent>) =>
        toPaginated(res),
      providesTags: ["CalendarEvents"],
    }),
    getParentChildMatches: builder.query<PaginatedResponse<Match>, string>({
      query: (childId) => `/parent/children/${childId}/matches?limit=100`,
      transformResponse: (res: ApiListResponse<Match>) => toPaginated(res),
      providesTags: ["Matches"],
    }),
    getParentChildCalendarEvents: builder.query<
      PaginatedResponse<CalendarEvent>,
      string
    >({
      query: (childId) =>
        `/parent/children/${childId}/calendar-events?limit=100`,
      transformResponse: (res: ApiListResponse<CalendarEvent>) =>
        toPaginated(res),
      providesTags: ["CalendarEvents"],
    }),
  }),
});

export const {
  useGetAdminCalendarEventsQuery,
  useCreateAdminCalendarEventMutation,
  useGetAdminMatchesQuery,
  useGetAdminMatchQuery,
  useCreateAdminMatchMutation,
  useGetAdminCoachMatchRequestsQuery,
  useCreateAdminCoachMatchRequestMutation,
  useUpdateAdminMatchMutation,
  useUpdateAdminMatchStatusMutation,
  usePostponeAdminMatchMutation,
  useDeleteAdminMatchMutation,
  useHardDeleteAdminMatchMutation,
  useGetAdminFriendlyRequestsQuery,
  useApproveFriendlyRequestMutation,
  useRejectFriendlyRequestMutation,
  useConvertFriendlyRequestMutation,
  useGetCoachCalendarEventsQuery,
  useGetCoachGroupsScopedQuery,
  useGetCoachPlayersScopedQuery,
  useGetCoachPlayerDetailQuery,
  useGetInjuryRiskPainDiscomfortQuery,
  useUpsertInjuryRiskPainDiscomfortMutation,
  useGetInjuryRiskPredictionsQuery,
  useRunInjuryRiskPredictionsMutation,
  useCreateCoachBasicPlayerMutation,
  useUploadCoachPlayerImageMutation,
  useCompleteCoachPlayerProfileMutation,
  useCreateCoachTrainingEventMutation,
  useGetCoachTrainingEventQuery,
  useUpdateCoachTrainingStatusMutation,
  useExtendCoachTrainingEventMutation,
  useUpsertTrainingAttendanceMutation,
  useUpsertTrainingEvaluationsMutation,
  useGetCoachMatchesQuery,
  useGetCoachMatchQuery,
  useUpsertMatchSquadMutation,
  useUpdateMatchSquadPlayerMutation,
  useDeleteMatchSquadPlayerMutation,
  useUpsertMatchTacticsMutation,
  useUpdateCoachMatchTargetsMutation,
  useUpdateMatchLiveStatusMutation,
  useRecordMatchIncidentMutation,
  useRecordMatchGoalMutation,
  useDeleteMatchGoalMutation,
  useRecordMatchSubstitutionMutation,
  useDeleteMatchSubstitutionMutation,
  useDeleteMatchIncidentMutation,
  useUpsertMatchAttendanceMutation,
  useUpsertMatchStatsMutation,
  useCreateFriendlyRequestMutation,
  useGetCoachFriendlyRequestsQuery,
  useGetCoachAdminMatchRequestsQuery,
  useAcceptCoachAdminMatchRequestMutation,
  useGetPlayerOptionsQuery,
  useCreatePlayerOptionMutation,
  useGetCustomCategoriesQuery,
  useCreateCustomCategoryMutation,
  useCreateCustomFieldMutation,
  useUpdateCustomFieldMutation,
  useDeleteCustomFieldMutation,
  useCreateCustomFieldOptionMutation,
  useUpdateCustomFieldOptionMutation,
  useDeleteCustomFieldOptionMutation,
  useUpdateCustomCategoryMutation,
  useDeleteCustomCategoryMutation,
  useGetCoachPlayerCustomProfileQuery,
  useSaveCoachPlayerCustomProfileMutation,
  useGetPlayerProfileQuery,
  useGetPlayerProgressQuery,
  useGetPlayerAttendanceQuery,
  useGetPlayerEvaluationsQuery,
  useGetPlayerTrainingsQuery,
  useGetNotificationsQuery,
  useGetUnreadNotificationsCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetPlayerMatchesQuery,
  useGetPlayerCalendarEventsQuery,
  useGetParentChildMatchesQuery,
  useGetParentChildCalendarEventsQuery,
} = calendarApi;
