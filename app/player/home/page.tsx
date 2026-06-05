"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  CalendarClock,
  ChevronRight,
  Clock,
  Dumbbell,
  Goal,
  Loader2,
  MapPin,
  ShieldCheck,
  Star,
  Trophy,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useGetPlayerCalendarEventsQuery,
  useGetPlayerEvaluationsQuery,
  useGetPlayerMatchesQuery,
  useGetPlayerProfileQuery,
  useGetPlayerProgressQuery,
  useGetPlayerTrainingsQuery,
} from "@/lib/store/api/calendarApi";
import type {
  CalendarEvent,
  Match,
  MatchPlayerStats,
  PlayerEvaluationRecord,
  PlayerProfile,
} from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12, localDateTimeTimestamp } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info";

const closedStatuses = new Set(["completed", "finished", "cancelled"]);

const numberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatNumber = (value: unknown) => {
  const numeric = numberValue(value);
  return numeric === null ? "0" : String(Math.round(numeric));
};

const formatRating = (value: unknown) => {
  const numeric = numberValue(value);
  if (numeric === null) return "N/A";
  return `${Number.isInteger(numeric) ? numeric : numeric.toFixed(1)}/10`;
};

const percent = (value: unknown) => {
  const numeric = numberValue(value);
  return Math.max(0, Math.min(100, numeric ?? 0));
};

const ratingPercent = (value: unknown) => percent((numberValue(value) ?? 0) * 10);

const titleCase = (value: string | null | undefined) =>
  (value || "Not set")
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const textValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const values = value.map(textValue).filter(Boolean);
    return values.length ? values.join(", ") : null;
  }
  return null;
};

const normalizeKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const profileValue = (
  profile: PlayerProfile | undefined,
  keys: string[],
): string | null => {
  if (!profile) return null;
  const normalizedKeys = new Set(keys.map(normalizeKey));

  for (const [key, value] of Object.entries(profile as Record<string, unknown>)) {
    if (normalizedKeys.has(normalizeKey(key))) {
      const text = textValue(value);
      if (text) return text;
    }
  }

  for (const item of profile.customProfile ?? []) {
    if (
      normalizedKeys.has(normalizeKey(item.key)) ||
      normalizedKeys.has(normalizeKey(item.label))
    ) {
      const text = textValue(item.value);
      if (text) return text;
    }
  }

  return null;
};

const matchTimestamp = (match: Match) => {
  const timestamp = localDateTimeTimestamp(match.match_date, match.match_time);
  if (timestamp) return timestamp;
  return Date.parse(`${match.match_date}T00:00:00`) || 0;
};

const eventTimestamp = (event: CalendarEvent) =>
  Date.parse(String(event.start_datetime || "")) || 0;

const statusVariant = (status: string): BadgeVariant => {
  if (["completed", "finished", "starter", "present"].includes(status)) return "success";
  if (["scheduled", "substitute", "reserve"].includes(status)) return "info";
  if (["postponed", "late"].includes(status)) return "warning";
  if (["cancelled", "absent", "injured"].includes(status)) return "destructive";
  return "secondary";
};

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  progress,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  progress?: number;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.045] shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </div>
          <span className="rounded-lg bg-cyan-400/10 p-2 text-cyan-200">
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-400">{detail}</p>
        {progress !== undefined && <Progress className="mt-4" value={progress} />}
      </CardContent>
    </Card>
  );
}

function MatchCard({ match }: { match: Match }) {
  const squad = match.squad?.[0];
  const stats = match.stats?.[0] as MatchPlayerStats | undefined;

  return (
    <Card className="border-white/10 bg-white/[0.045] shadow-none">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">Next Match</p>
            <h3 className="mt-1 text-xl font-semibold text-white">
              {match.opponent_name}
            </h3>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-cyan-300" />
                {formatDate(match.match_date)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-300" />
                {formatTime12(match.match_time)}
              </span>
              {match.location && (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyan-300" />
                  {match.location}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant(match.status)}>{titleCase(match.status)}</Badge>
            {squad?.squad_role && (
              <Badge variant={statusVariant(squad.squad_role)}>
                {titleCase(squad.squad_role)}
              </Badge>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-white/[0.035] p-3">
            <p className="text-xs text-slate-400">Position</p>
            <p className="mt-1 font-semibold text-white">{squad?.position || "TBD"}</p>
          </div>
          <div className="rounded-lg bg-white/[0.035] p-3">
            <p className="text-xs text-slate-400">Rating</p>
            <p className="mt-1 font-semibold text-white">
              {formatRating(stats?.performance_rating)}
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.035] p-3">
            <p className="text-xs text-slate-400">Minutes</p>
            <p className="mt-1 font-semibold text-white">
              {formatNumber(stats?.minutes_played)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div>
        <p className="font-medium text-white">{event.title}</p>
        <p className="mt-1 text-sm text-slate-400">
          {formatDate(event.start_datetime)} | {formatTime12(event.start_datetime)}
        </p>
      </div>
      <Badge variant={statusVariant(event.status)}>{titleCase(event.status)}</Badge>
    </div>
  );
}

function LatestEvaluation({ evaluation }: { evaluation?: PlayerEvaluationRecord }) {
  if (!evaluation) {
    return <EmptyState text="No coach evaluation is available yet." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Overall"
          value={formatRating(evaluation.overall_rating)}
          detail="Latest training evaluation"
          icon={Star}
          progress={ratingPercent(evaluation.overall_rating)}
        />
        <KpiCard
          label="Technical"
          value={formatRating(evaluation.technical_rating)}
          detail="Ball work and execution"
          icon={Goal}
          progress={ratingPercent(evaluation.technical_rating)}
        />
        <KpiCard
          label="Physical"
          value={formatRating(evaluation.physical_rating)}
          detail="Fitness and intensity"
          icon={ShieldCheck}
          progress={ratingPercent(evaluation.physical_rating)}
        />
      </div>
      {(evaluation.strengths || evaluation.coach_notes) && (
        <div className="rounded-lg bg-white/[0.035] p-4 text-sm text-slate-300">
          {evaluation.strengths && (
            <p>
              <span className="font-medium text-white">Strengths:</span>{" "}
              {evaluation.strengths}
            </p>
          )}
          {evaluation.coach_notes && (
            <p className="mt-2">
              <span className="font-medium text-white">Coach notes:</span>{" "}
              {evaluation.coach_notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlayerHomePage() {
  const profileQuery = useGetPlayerProfileQuery();
  const progressQuery = useGetPlayerProgressQuery();
  const matchesQuery = useGetPlayerMatchesQuery(undefined, {
    pollingInterval: 15000,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });
  const calendarQuery = useGetPlayerCalendarEventsQuery();
  const trainingsQuery = useGetPlayerTrainingsQuery();
  const evaluationsQuery = useGetPlayerEvaluationsQuery();

  const profile = profileQuery.data;
  const progress = progressQuery.data;
  const matches = useMemo(() => matchesQuery.data?.data ?? [], [matchesQuery.data]);
  const events = useMemo(() => calendarQuery.data?.data ?? [], [calendarQuery.data]);
  const trainings = useMemo(
    () => trainingsQuery.data?.data ?? [],
    [trainingsQuery.data],
  );
  const evaluations = useMemo(
    () => evaluationsQuery.data?.data ?? [],
    [evaluationsQuery.data],
  );

  const playerName = profile?.full_name || progress?.playerName || "Player";
  const position =
    profileValue(profile, ["main_position", "main position"]) ||
    profile?.position ||
    "Not set";

  const nextMatch = matches
    .filter((match) => !closedStatuses.has(match.status))
    .sort((a, b) => matchTimestamp(a) - matchTimestamp(b))[0];
  const latestMatch = matches
    .filter((match) => closedStatuses.has(match.status))
    .sort((a, b) => matchTimestamp(b) - matchTimestamp(a))[0];
  const upcomingEvents = [...events, ...trainings]
    .filter((event) => !closedStatuses.has(event.status))
    .sort((a, b) => eventTimestamp(a) - eventTimestamp(b))
    .slice(0, 4);
  const latestEvaluation = evaluations
    .slice()
    .sort(
      (a, b) =>
        Date.parse(String(b.start_datetime || "")) -
        Date.parse(String(a.start_datetime || "")),
    )[0];

  const isLoading =
    profileQuery.isLoading ||
    progressQuery.isLoading ||
    matchesQuery.isLoading ||
    calendarQuery.isLoading;
  const hasError =
    profileQuery.isError ||
    progressQuery.isError ||
    matchesQuery.isError ||
    calendarQuery.isError ||
    trainingsQuery.isError ||
    evaluationsQuery.isError;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${playerName}`}
        description="Your live academy data, upcoming schedule, match plan, and coach feedback."
        breadcrumbs={[{ label: "Home" }]}
        actions={
          <div className="hidden gap-2 sm:flex">
            <Link
              href="/player/matches"
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/[0.08]"
            >
              Matches
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/player/calendar"
              className="inline-flex items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15"
            >
              Calendar
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      {hasError && (
        <Card className="border-amber-400/30 bg-amber-500/10 shadow-none">
          <CardContent className="p-4 text-sm text-amber-100">
            Some player data could not load. Anything available from the backend
            is still shown below.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card className="border-white/10 bg-white/[0.045] shadow-none">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your player dashboard...
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Attendance"
              value={`${formatNumber(progress?.attendancePercentage)}%`}
              detail={`${formatNumber(progress?.trainingsAttended)} trainings attended`}
              icon={ShieldCheck}
              progress={percent(progress?.attendancePercentage)}
            />
            <KpiCard
              label="Matches Played"
              value={formatNumber(progress?.matchesPlayed)}
              detail={`${formatNumber(progress?.matchesAttended)} attended records`}
              icon={Trophy}
            />
            <KpiCard
              label="Weekly Minutes"
              value={formatNumber(progress?.weeklyMinutesPlayed)}
              detail={`${formatNumber(progress?.weeklyMatchesPlayed)} match entries this week`}
              icon={Clock}
              progress={percent(Number(progress?.weeklyMinutesPlayed ?? 0) / 0.9)}
            />
            <KpiCard
              label="Goals / Assists"
              value={`${formatNumber(progress?.goals)} / ${formatNumber(progress?.assists)}`}
              detail="From recorded match stats"
              icon={Goal}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-cyan-300" />
                  Player Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-white/[0.035] p-4">
                  <p className="text-xs text-slate-400">Position</p>
                  <p className="mt-1 font-semibold text-white">{position}</p>
                </div>
                <div className="rounded-lg bg-white/[0.035] p-4">
                  <p className="text-xs text-slate-400">Group</p>
                  <p className="mt-1 font-semibold text-white">
                    {profile?.group_name || "Not set"}
                  </p>
                </div>
                <div className="rounded-lg bg-white/[0.035] p-4">
                  <p className="text-xs text-slate-400">Branch</p>
                  <p className="mt-1 font-semibold text-white">
                    {profile?.branch_name || "Not set"}
                  </p>
                </div>
                <div className="rounded-lg bg-white/[0.035] p-4">
                  <p className="text-xs text-slate-400">Profile</p>
                  <p className="mt-1 font-semibold text-white">
                    {titleCase(profile?.profile_status)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {nextMatch ? (
              <MatchCard match={nextMatch} />
            ) : (
              <Card className="border-white/10 bg-white/[0.045] shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Next Match</CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState text="No upcoming match has been scheduled for your group yet." />
                </CardContent>
              </Card>
            )}
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Dumbbell className="h-4 w-4 text-cyan-300" />
                  Upcoming Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingEvents.length ? (
                  upcomingEvents.map((event) => <EventRow key={event.id} event={event} />)
                ) : (
                  <EmptyState text="No upcoming training or calendar events are listed yet." />
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-4 w-4 text-cyan-300" />
                  Latest Coach Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LatestEvaluation evaluation={latestEvaluation} />
              </CardContent>
            </Card>
          </section>

          <Card className="border-white/10 bg-white/[0.045] shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Recent Match</CardTitle>
            </CardHeader>
            <CardContent>
              {latestMatch ? (
                <MatchCard match={latestMatch} />
              ) : (
                <EmptyState text="No completed matches with your data yet." />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
