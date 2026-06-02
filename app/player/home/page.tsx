"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Goal,
  HeartPulse,
  Loader2,
  MapPin,
  Medal,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useGetPlayerAttendanceQuery,
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
  PlayerAttendanceRecord,
  PlayerEvaluationRecord,
  PlayerProfile,
} from "@/lib/store/api/calendarApi";
import {
  cn,
  formatDate,
  formatTime12,
  localDateTimeTimestamp,
} from "@/lib/utils";

type IconType = React.ComponentType<{ className?: string }>;

interface KpiItem {
  label: string;
  value: string;
  detail: string;
  icon: IconType;
  progress?: number;
  tone: "cyan" | "lime" | "amber" | "rose" | "violet" | "emerald";
}

interface TrendPoint {
  label: string;
  value: number;
  source: "Training" | "Match";
}

const toneClasses: Record<KpiItem["tone"], string> = {
  cyan: "bg-cyan-500/10 text-cyan-300 ring-cyan-400/20",
  lime: "bg-lime-500/10 text-lime-300 ring-lime-400/20",
  amber: "bg-amber-500/10 text-amber-300 ring-amber-400/20",
  rose: "bg-rose-500/10 text-rose-300 ring-rose-400/20",
  violet: "bg-violet-500/10 text-violet-300 ring-violet-400/20",
  emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
};

const clampPercent = (value: number | null | undefined) =>
  Math.max(0, Math.min(100, Number.isFinite(value ?? NaN) ? Number(value) : 0));

const numberValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const textValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const joined = value.map(textValue).filter(Boolean).join(", ");
    return joined || null;
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
  const directEntries = Object.entries(profile as Record<string, unknown>);
  for (const [key, value] of directEntries) {
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

const safeDate = (value: string | Date | null | undefined) => {
  if (!value) return "Not set";
  const timestamp = Date.parse(String(value));
  if (Number.isNaN(timestamp)) return String(value);
  return formatDate(value);
};

const safeTime = (value: string | Date | null | undefined) => {
  if (!value) return "--";
  return formatTime12(value);
};

const matchTimestamp = (match: Match) => {
  const timestamp = localDateTimeTimestamp(match.match_date, match.match_time);
  if (timestamp) return timestamp;
  return Date.parse(`${match.match_date}T00:00:00`) || 0;
};

const eventTimestamp = (event: CalendarEvent | PlayerEvaluationRecord) => {
  const timestamp = Date.parse(event.start_datetime ?? "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatRating = (value: unknown, max = 10) => {
  const rating = numberValue(value);
  if (rating === null) return "N/A";
  const display = Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
  return `${display}/${max}`;
};

const formatNumber = (value: unknown) => {
  const numeric = numberValue(value);
  return numeric === null ? "0" : String(Math.round(numeric));
};

const titleCase = (value: string | null | undefined) =>
  (value || "Not set")
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const ageFromBirthDate = (value: string | null | undefined) => {
  if (!value) return null;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? String(age) : null;
};

const attendanceCounts = (records: PlayerAttendanceRecord[]) =>
  records.reduce(
    (counts, record) => {
      counts.total += 1;
      counts[record.status] += 1;
      return counts;
    },
    {
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      injured: 0,
    },
  );

const statusVariant = (status: string) => {
  if (["present", "completed", "finished", "starter"].includes(status)) {
    return "success" as const;
  }
  if (["scheduled", "substitute", "reserve"].includes(status)) {
    return "info" as const;
  }
  if (["late", "postponed", "excused"].includes(status)) {
    return "warning" as const;
  }
  if (["absent", "injured", "cancelled"].includes(status)) {
    return "destructive" as const;
  }
  return "secondary" as const;
};

const latestMatchStat = (matches: Match[]) => {
  return matches
    .flatMap((match) =>
      (match.stats ?? []).map((stat) => ({
        stat,
        timestamp: matchTimestamp(match),
      })),
    )
    .sort((a, b) => b.timestamp - a.timestamp)[0]?.stat;
};

const metricProgress = (value: unknown, multiplier = 10) => {
  const numeric = numberValue(value);
  if (numeric === null) return 0;
  return clampPercent(numeric * multiplier);
};

function KpiCard({ item }: { item: KpiItem }) {
  const Icon = item.icon;
  return (
    <Card className="border-white/10 bg-white/[0.045] shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {item.value}
            </p>
          </div>
          <div className={cn("rounded-lg p-2 ring-1", toneClasses[item.tone])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-3 min-h-5 text-sm text-slate-400">{item.detail}</p>
        {item.progress !== undefined && (
          <Progress
            value={clampPercent(item.progress)}
            className="mt-3 h-1.5 bg-slate-800"
          />
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon: IconType;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.035] px-3 py-2">
      <span className="flex items-center gap-2 text-sm text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="text-right text-sm font-medium text-slate-100">
        {value || "Not set"}
      </span>
    </div>
  );
}

function MiniTrend({ points }: { points: TrendPoint[] }) {
  if (!points.length) {
    return <EmptyState text="No ratings have been published yet." />;
  }

  const width = 420;
  const height = 150;
  const xGap = points.length > 1 ? width / (points.length - 1) : width;
  const coordinates = points.map((point, index) => {
    const y = height - clampPercent(point.value * 10) * (height / 100);
    return {
      x: points.length > 1 ? index * xGap : width / 2,
      y,
      ...point,
    };
  });
  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="space-y-4">
      <div className="h-[170px] rounded-lg bg-white/[0.03] p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full overflow-visible"
          role="img"
          aria-label="Recent rating trend"
        >
          <path
            d={path}
            fill="none"
            stroke="#22d3ee"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />
          {coordinates.map((point) => (
            <circle
              key={`${point.source}-${point.label}-${point.x}`}
              cx={point.x}
              cy={point.y}
              fill="#bef264"
              r="5"
              stroke="#020711"
              strokeWidth="3"
            />
          ))}
        </svg>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {points.slice(-4).map((point) => (
          <div
            key={`${point.source}-${point.label}-${point.value}`}
            className="flex items-center justify-between rounded-lg bg-white/[0.035] px-3 py-2 text-sm"
          >
            <span className="text-slate-400">
              {point.label} | {point.source}
            </span>
            <span className="font-semibold text-white">
              {formatRating(point.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlayerHomePage() {
  const profileQuery = useGetPlayerProfileQuery();
  const progressQuery = useGetPlayerProgressQuery();
  const matchesQuery = useGetPlayerMatchesQuery();
  const calendarQuery = useGetPlayerCalendarEventsQuery();
  const trainingsQuery = useGetPlayerTrainingsQuery();
  const evaluationsQuery = useGetPlayerEvaluationsQuery();
  const attendanceQuery = useGetPlayerAttendanceQuery();

  const profile = profileQuery.data;
  const progress = progressQuery.data;
  const matches = useMemo(() => matchesQuery.data?.data ?? [], [matchesQuery.data]);
  const calendarEvents = useMemo(
    () => calendarQuery.data?.data ?? [],
    [calendarQuery.data],
  );
  const trainings = useMemo(
    () => trainingsQuery.data?.data ?? [],
    [trainingsQuery.data],
  );
  const evaluations = useMemo(
    () => evaluationsQuery.data?.data ?? [],
    [evaluationsQuery.data],
  );
  const attendance = useMemo(
    () => attendanceQuery.data?.data ?? [],
    [attendanceQuery.data],
  );

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
    evaluationsQuery.isError ||
    attendanceQuery.isError;

  const playerName = profile?.full_name || progress?.playerName || "Player";
  const mainPosition =
    profileValue(profile, ["main_position", "main position"]) ||
    profile?.position ||
    "Not set";
  const age = ageFromBirthDate(profile?.date_of_birth);
  const latestEvaluation = evaluations[0];
  const recentMatchStat = latestMatchStat(matches);
  const latestFatigue =
    latestEvaluation?.fatigue_rating ?? recentMatchStat?.fatigue_rating ?? null;
  const latestRating =
    recentMatchStat?.performance_rating ??
    latestEvaluation?.overall_rating ??
    progress?.averageMatchRating ??
    progress?.averageTrainingRating ??
    null;
  const photoValue = textValue(profile?.photo_url);
  const photoSrc = photoValue?.startsWith("/") ? photoValue : "/Player.png";
  const latestMeasurement = profile?.latestMeasurement as
    | Record<string, unknown>
    | null
    | undefined;
  const attendanceSummary = attendanceCounts(attendance);
  const nextMatch = matches
    .filter((match) => {
      const status = match.status || match.match_status;
      return !["finished", "completed", "cancelled"].includes(status);
    })
    .sort((a, b) => matchTimestamp(a) - matchTimestamp(b))[0];
  const latestCompletedMatch = matches
    .filter((match) =>
      ["finished", "completed"].includes(match.status || match.match_status),
    )
    .sort((a, b) => matchTimestamp(b) - matchTimestamp(a))[0];
  const nextTraining = trainings
    .filter(
      (event) =>
        !["completed", "finished", "cancelled"].includes(event.status),
    )
    .sort((a, b) => eventTimestamp(a) - eventTimestamp(b))[0];
  const upcomingAgenda = calendarEvents
    .filter(
      (event) =>
        !["completed", "finished", "cancelled"].includes(event.status),
    )
    .sort((a, b) => eventTimestamp(a) - eventTimestamp(b))
    .slice(0, 6);
  const recentMatches = matches
    .filter((match) => {
      const status = match.status || match.match_status;
      return !["finished", "completed", "cancelled"].includes(status);
    })
    .sort((a, b) => matchTimestamp(a) - matchTimestamp(b))
    .slice(0, 3);
  const mySquad = nextMatch?.squad?.[0];
  const myStats = recentMatchStat as MatchPlayerStats | undefined;
  const trendPoints = [
    ...evaluations.flatMap((evaluation) => {
      const value = numberValue(evaluation.overall_rating);
      if (value === null) return [];
      return [
        {
          label: safeDate(evaluation.start_datetime),
          value,
          source: "Training" as const,
          timestamp: eventTimestamp(evaluation),
        },
      ];
    }),
    ...matches.flatMap((match) =>
      (match.stats ?? []).flatMap((stat) => {
        const value = numberValue(stat.performance_rating);
        if (value === null) return [];
        return [
          {
            label: safeDate(match.match_date),
            value,
            source: "Match" as const,
            timestamp: matchTimestamp(match),
          },
        ];
      }),
    ),
  ]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-8)
    .map((point) => ({
      label: point.label,
      value: point.value,
      source: point.source,
    }));

  const profileFields = [
    {
      label: "Main Position",
      value: mainPosition,
      icon: ShieldCheck,
    },
    {
      label: "Group",
      value: profile?.group_name,
      icon: User,
    },
    {
      label: "Branch",
      value: profile?.branch_name,
      icon: MapPin,
    },
    {
      label: "Preferred Foot",
      value: profileValue(profile, ["preferred_foot", "preferred foot"]),
      icon: Goal,
    },
    {
      label: "Height",
      value:
        profileValue(profile, ["height", "height_cm", "Height"]) ||
        textValue(latestMeasurement?.height_cm),
      icon: Activity,
    },
    {
      label: "Weight",
      value:
        profileValue(profile, ["weight", "weight_kg", "Weight"]) ||
        textValue(latestMeasurement?.weight_kg),
      icon: HeartPulse,
    },
  ];

  const kpis: KpiItem[] = [
    {
      label: "Overall",
      value: formatRating(latestRating),
      detail: recentMatchStat ? "Latest match rating" : "Latest available rating",
      icon: Medal,
      progress: metricProgress(latestRating),
      tone: "cyan",
    },
    {
      label: "Attendance",
      value: `${Math.round(progress?.attendancePercentage ?? 0)}%`,
      detail: `${attendanceSummary.present + attendanceSummary.late}/${attendanceSummary.total} recorded activities`,
      icon: CheckCircle2,
      progress: progress?.attendancePercentage ?? 0,
      tone: "emerald",
    },
    {
      label: "Weekly Minutes",
      value: formatNumber(progress?.weeklyMinutesPlayed),
      detail: `${formatNumber(progress?.weeklyMatchesPlayed)} match entries this week`,
      icon: Clock,
      progress: Math.min(100, Number(progress?.weeklyMinutesPlayed ?? 0) / 0.9),
      tone: "amber",
    },
    {
      label: "Goals",
      value: formatNumber(progress?.goals),
      detail: `${formatNumber(progress?.assists)} assists`,
      icon: Trophy,
      tone: "lime",
    },
    {
      label: "Fatigue",
      value: formatRating(latestFatigue),
      detail: "Latest training or match input",
      icon: HeartPulse,
      progress: metricProgress(latestFatigue),
      tone: "rose",
    },
    {
      label: "Discipline",
      value: `${formatNumber(progress?.disciplineRecord?.yellowCards)}Y/${formatNumber(progress?.disciplineRecord?.redCards)}R`,
      detail: "Cards from match stats",
      icon: ShieldCheck,
      tone: "violet",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Player Home"
        description="Your live academy data, next sessions, match plan, and coach feedback."
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
            Some player data could not load. The page will still show anything
            available from the backend.
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
          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden border-white/10 bg-white/[0.045] shadow-none">
              <CardContent className="p-0">
                <div className="grid gap-5 p-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                  <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                    <Image
                      src={photoSrc}
                      alt={playerName}
                      fill
                      sizes="96px"
                      className="object-cover"
                      priority
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold text-white">
                        {playerName}
                      </h2>
                      <Badge variant={profile?.profile_status === "complete" ? "success" : "warning"}>
                        {titleCase(profile?.profile_status)}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-300">
                      <Badge variant="info">{mainPosition}</Badge>
                      {profile?.group_name && (
                        <Badge variant="outline">{profile.group_name}</Badge>
                      )}
                      {age && <Badge variant="secondary">Age {age}</Badge>}
                    </div>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                      {progress?.monthlyProgressSummary ||
                        "No monthly progress summary has been published yet."}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-center lg:min-w-72">
                    <div>
                      <p className="text-xl font-semibold text-cyan-200">
                        {formatRating(progress?.averageTrainingRating)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">Training</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-lime-200">
                        {formatRating(progress?.averageMatchRating)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">Matches</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-amber-200">
                        {formatNumber(progress?.matchesPlayed)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">Played</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Profile Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {profileFields.map((field) => (
                  <InfoRow
                    key={field.label}
                    label={field.label}
                    value={field.value}
                    icon={field.icon}
                  />
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {kpis.map((item) => (
              <KpiCard key={item.label} item={item} />
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4 text-cyan-300" />
                    Next Match Plan
                  </CardTitle>
                  <Link
                    href="/player/matches"
                    className="text-sm font-medium text-cyan-200 hover:text-cyan-100"
                  >
                    View all
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {nextMatch ? (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">
                            {nextMatch.opponent_name}
                          </h3>
                          <Badge variant={statusVariant(nextMatch.status)}>
                            {titleCase(nextMatch.status)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">
                          {safeDate(nextMatch.match_date)} |{" "}
                          {safeTime(nextMatch.match_time)}
                          {nextMatch.location ? ` | ${nextMatch.location}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {titleCase(nextMatch.venue_type)}
                        </Badge>
                        <Badge variant="secondary">
                          {titleCase(nextMatch.match_type)}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg bg-white/[0.035] p-4">
                        <p className="text-xs uppercase text-slate-500">Role</p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {titleCase(mySquad?.squad_role)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/[0.035] p-4">
                        <p className="text-xs uppercase text-slate-500">
                          Position
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {mySquad?.position || "Not assigned"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/[0.035] p-4">
                        <p className="text-xs uppercase text-slate-500">
                          Formation
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {nextMatch.tactics?.formation || "Not set"}
                        </p>
                      </div>
                    </div>

                    {(mySquad?.player_instruction ||
                      nextMatch.tactics?.tactical_notes ||
                      nextMatch.organizer_notes) && (
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4">
                          <p className="text-xs font-semibold uppercase text-cyan-200">
                            Player Instruction
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-200">
                            {mySquad?.player_instruction ||
                              "No individual instruction yet."}
                          </p>
                        </div>
                        <div className="rounded-lg border border-lime-400/20 bg-lime-400/10 p-4">
                          <p className="text-xs font-semibold uppercase text-lime-200">
                            Tactical Notes
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-200">
                            {nextMatch.tactics?.tactical_notes ||
                              nextMatch.organizer_notes ||
                              "No tactical notes yet."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState text="No upcoming match has been scheduled for your group yet." />
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Dumbbell className="h-4 w-4 text-lime-300" />
                  Next Training Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextTraining ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-white">
                          {nextTraining.title}
                        </h3>
                        <Badge variant={statusVariant(nextTraining.status)}>
                          {titleCase(nextTraining.status)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">
                        {safeDate(nextTraining.start_datetime)} |{" "}
                        {safeTime(nextTraining.start_datetime)}
                        {nextTraining.location ? ` | ${nextTraining.location}` : ""}
                      </p>
                    </div>
                    <InfoRow
                      label="Focus"
                      value={nextTraining.training?.training_focus}
                      icon={Target}
                    />
                    <InfoRow
                      label="Intensity"
                      value={titleCase(nextTraining.training?.intensity_level)}
                      icon={Activity}
                    />
                    <div className="rounded-lg bg-white/[0.035] p-4">
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Objectives
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-200">
                        {nextTraining.training?.objectives ||
                          nextTraining.training?.session_plan ||
                          nextTraining.notes ||
                          "No training plan details yet."}
                      </p>
                    </div>
                    {nextTraining.training?.equipment_needed && (
                      <div className="rounded-lg bg-white/[0.035] p-4">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Equipment
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">
                          {nextTraining.training.equipment_needed}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState text="No upcoming training plan has been assigned yet." />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <Card className="border-white/10 bg-white/[0.045] shadow-none xl:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="h-4 w-4 text-cyan-300" />
                    Upcoming Schedule
                  </CardTitle>
                  <Link
                    href="/player/calendar"
                    className="text-sm font-medium text-cyan-200 hover:text-cyan-100"
                  >
                    Full calendar
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingAgenda.length ? (
                  upcomingAgenda.map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-cyan-400/10 p-2 text-cyan-200">
                          <CalendarClock className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-white">
                              {event.title}
                            </h3>
                            <Badge variant="outline">
                              {titleCase(event.event_type)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-400">
                            {safeDate(event.start_datetime)} |{" "}
                            {safeTime(event.start_datetime)}
                            {event.location ? ` | ${event.location}` : ""}
                          </p>
                        </div>
                      </div>
                      <Badge variant={statusVariant(event.status)}>
                        {titleCase(event.status)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <EmptyState text="No upcoming events are visible for you yet." />
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-4 w-4 text-amber-300" />
                  Latest Coach Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestEvaluation ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            {latestEvaluation.title || "Training evaluation"}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {safeDate(latestEvaluation.start_datetime)}
                          </p>
                        </div>
                        <p className="text-xl font-semibold text-cyan-200">
                          {formatRating(latestEvaluation.overall_rating)}
                        </p>
                      </div>
                    </div>
                    <InfoRow
                      label="Fatigue"
                      value={formatRating(latestEvaluation.fatigue_rating)}
                      icon={HeartPulse}
                    />
                    {latestEvaluation.strengths && (
                      <div className="rounded-lg bg-emerald-400/10 p-4">
                        <p className="text-xs font-semibold uppercase text-emerald-200">
                          Strengths
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">
                          {latestEvaluation.strengths}
                        </p>
                      </div>
                    )}
                    {latestEvaluation.improvement_plan && (
                      <div className="rounded-lg bg-amber-400/10 p-4">
                        <p className="text-xs font-semibold uppercase text-amber-200">
                          Improvement Plan
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">
                          {latestEvaluation.improvement_plan}
                        </p>
                      </div>
                    )}
                    {latestEvaluation.coach_notes && (
                      <div className="rounded-lg bg-white/[0.035] p-4">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Coach Notes
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">
                          {latestEvaluation.coach_notes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState text="No player-visible feedback has been published yet." />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-lime-300" />
                  Rating Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniTrend points={trendPoints} />
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Goal className="h-4 w-4 text-cyan-300" />
                  Matches Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-white/[0.035] p-4">
                    <p className="text-xs uppercase text-slate-500">
                      Last Match
                    </p>
                    <p className="mt-2 font-semibold text-white">
                      {latestCompletedMatch?.opponent_name || "No result yet"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/[0.035] p-4">
                    <p className="text-xs uppercase text-slate-500">Minutes</p>
                    <p className="mt-2 font-semibold text-white">
                      {formatNumber(myStats?.minutes_played)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/[0.035] p-4">
                    <p className="text-xs uppercase text-slate-500">
                      Goals | Assists
                    </p>
                    <p className="mt-2 font-semibold text-white">
                      {formatNumber(myStats?.goals)} |{" "}
                      {formatNumber(myStats?.assists)}
                    </p>
                  </div>
                </div>
                {recentMatches.length ? (
                  recentMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-white">
                          {match.opponent_name}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {safeDate(match.match_date)} |{" "}
                          {safeTime(match.match_time)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {match.squad?.[0]?.position && (
                          <Badge variant="info">{match.squad[0].position}</Badge>
                        )}
                        <Badge variant={statusVariant(match.status)}>
                          {titleCase(match.status)}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState text="No upcoming matches are listed yet." />
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
