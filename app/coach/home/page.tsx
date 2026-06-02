"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Loader2,
  MapPin,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  type CalendarEvent,
  type CoachGroup,
  type CoachPlayer,
  type Match,
  useGetCoachCalendarEventsQuery,
  useGetCoachGroupsScopedQuery,
  useGetCoachMatchesQuery,
  useGetCoachPlayersScopedQuery,
} from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12, getInitials, localDateTimeTimestamp } from "@/lib/utils";

type IconType = React.ComponentType<{ className?: string }>;

const closedStatuses = new Set(["completed", "finished", "cancelled"]);

const titleCase = (value: string | null | undefined) =>
  (value || "Not set")
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const eventTimestamp = (event: CalendarEvent) => {
  const timestamp = Date.parse(event.start_datetime ?? "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const matchTimestamp = (match: Match) => {
  const timestamp = localDateTimeTimestamp(match.match_date, match.match_time);
  if (timestamp) return timestamp;
  return Date.parse(`${match.match_date}T00:00:00`) || 0;
};

const statusVariant = (status: string) => {
  if (["completed", "finished", "present", "starter"].includes(status)) return "success" as const;
  if (["scheduled", "substitute", "reserve"].includes(status)) return "info" as const;
  if (["postponed", "late"].includes(status)) return "warning" as const;
  if (["cancelled", "absent", "injured"].includes(status)) return "destructive" as const;
  return "secondary" as const;
};

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`goalix-dashboard-panel rounded-[18px] border border-[#2a4460]/80 bg-[#07172a]/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-5 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  tone = "cyan",
}: {
  icon: IconType;
  value: string | number;
  label: string;
  tone?: "cyan" | "lime" | "amber" | "teal";
}) {
  const colors = {
    cyan: "text-cyan-300 bg-cyan-400/10",
    lime: "text-lime-300 bg-lime-400/10",
    amber: "text-amber-300 bg-amber-400/10",
    teal: "text-teal-300 bg-teal-400/10",
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#2a4460] bg-white/[0.025] p-4">
      <span className={`grid h-11 w-11 place-items-center rounded-xl ${colors[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-display text-3xl font-bold leading-none text-white">{value}</span>
        <span className="mt-1 block text-sm text-slate-300">{label}</span>
      </span>
    </div>
  );
}

function TrainingRow({ event }: { event: CalendarEvent }) {
  return (
    <Link
      href={`/coach/training/${event.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-[#2a4460] bg-white/[0.025] p-4 transition hover:border-lime-300/40 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-lime-400/10 text-lime-300">
          <Dumbbell className="h-5 w-5" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-white">{event.title}</p>
            <Badge variant={statusVariant(event.status)}>{titleCase(event.status)}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {formatDate(event.start_datetime)} - {formatTime12(event.start_datetime)}
            {event.location ? ` - ${event.location}` : ""}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {event.groups?.map((group) => group.name).join(", ") || "No target groups"}
          </p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-500" />
    </Link>
  );
}

function MatchRow({ match }: { match: Match }) {
  return (
    <Link
      href={`/coach/matches/match-day/${match.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-[#2a4460] bg-white/[0.025] p-4 transition hover:border-cyan-300/40 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
          <Trophy className="h-5 w-5" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-white">vs {match.opponent_name}</p>
            <Badge variant={statusVariant(match.status)}>{titleCase(match.status)}</Badge>
            <Badge variant="outline">{titleCase(match.match_type)}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {formatDate(match.match_date)} - {formatTime12(match.match_time)}
            {match.location ? ` - ${match.location}` : ""}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {match.groups?.map((group) => group.name).join(", ") || "No target groups"}
          </p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-500" />
    </Link>
  );
}

function PlayerRow({ player }: { player: CoachPlayer }) {
  return (
    <Link
      href={`/coach/players/${player.id}`}
      className="flex items-center gap-3 rounded-2xl border border-[#2a4460] bg-white/[0.025] p-3 transition hover:border-lime-300/40"
    >
      <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-lime-300 to-cyan-300 font-black text-[#06111f]">
        {getInitials(player.full_name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{player.full_name}</p>
        <p className="text-xs text-slate-400">
          {player.position || "No position"} - {titleCase(player.profile_status)}
        </p>
      </div>
      <Badge variant={player.profile_status === "complete" ? "success" : "warning"}>
        {titleCase(player.profile_status)}
      </Badge>
    </Link>
  );
}

function GroupCard({ group }: { group: CoachGroup }) {
  return (
    <Link
      href={`/coach/my-groups/${group.group_id}`}
      className="rounded-2xl border border-[#2a4460] bg-white/[0.025] p-4 transition hover:border-lime-300/40"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-white">{group.group_name}</h3>
        <Badge variant={group.can_create_training ? "success" : "secondary"}>
          {group.role}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-slate-400">{group.branch_name}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {group.can_create_training && <Badge variant="outline">Training</Badge>}
        {group.can_take_attendance && <Badge variant="outline">Attendance</Badge>}
        {group.can_evaluate_players && <Badge variant="outline">Evaluation</Badge>}
      </div>
    </Link>
  );
}

export default function CoachHomePage() {
  const groupsQuery = useGetCoachGroupsScopedQuery();
  const playersQuery = useGetCoachPlayersScopedQuery({ limit: 200 });
  const eventsQuery = useGetCoachCalendarEventsQuery();
  const matchesQuery = useGetCoachMatchesQuery();

  const groups = groupsQuery.data ?? [];
  const players = playersQuery.data?.data ?? [];
  const events = useMemo(() => eventsQuery.data?.data ?? [], [eventsQuery.data?.data]);
  const matches = useMemo(() => matchesQuery.data?.data ?? [], [matchesQuery.data?.data]);

  const trainings = useMemo(
    () =>
      events
        .filter((event) => event.event_type === "training")
        .sort((a, b) => eventTimestamp(a) - eventTimestamp(b)),
    [events],
  );
  const upcomingTrainings = trainings.filter((event) => !closedStatuses.has(event.status));
  const completedTrainings = trainings.filter((event) =>
    ["completed", "finished"].includes(event.status),
  );
  const upcomingMatches = matches
    .filter((match) => !closedStatuses.has(match.status))
    .slice()
    .sort((a, b) => matchTimestamp(a) - matchTimestamp(b));
  const completedMatches = matches.filter((match) =>
    ["completed", "finished"].includes(match.status),
  );
  const scheduledTrainings = trainings.filter((event) => event.status === "scheduled");
  const focusPlayers = players.slice(0, 5);
  const agenda = [
    ...upcomingTrainings.slice(0, 4).map((event) => ({
      id: event.id,
      type: "training" as const,
      title: event.title,
      date: event.start_datetime,
      time: event.start_datetime,
      location: event.location,
      href: `/coach/training/${event.id}`,
      Icon: Dumbbell,
    })),
    ...upcomingMatches.slice(0, 4).map((match) => ({
      id: match.id,
      type: "match" as const,
      title: `vs ${match.opponent_name}`,
      date: match.match_date,
      time: match.match_time,
      location: match.location,
      href: `/coach/matches/match-day/${match.id}`,
      Icon: Trophy,
    })),
  ]
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .slice(0, 6);

  const isLoading =
    groupsQuery.isLoading ||
    playersQuery.isLoading ||
    eventsQuery.isLoading ||
    matchesQuery.isLoading;
  const hasError =
    groupsQuery.isError ||
    playersQuery.isError ||
    eventsQuery.isError ||
    matchesQuery.isError;

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-lime-300">
            Coach performance hub
          </p>
          <h1 className="font-display text-5xl font-bold leading-none tracking-normal md:text-6xl">
            Welcome back, Coach
          </h1>
          <p className="mt-2 text-lg text-slate-300">
            Live training, matches, groups, and player data from the backend.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={Users} value={players.length} label="Active Players" tone="cyan" />
          <StatCard icon={Dumbbell} value={upcomingTrainings.length} label="Training Sessions" tone="lime" />
          <StatCard icon={Trophy} value={upcomingMatches.length} label="Upcoming Matches" tone="amber" />
          <StatCard icon={UserCheck} value={groups.length} label="Assigned Groups" tone="teal" />
        </div>
      </section>

      {hasError && (
        <Panel className="border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Some coach dashboard data could not load. Check backend login/session and API availability.
        </Panel>
      )}

      {isLoading ? (
        <Panel className="flex items-center gap-3 p-5 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading coach dashboard from backend...
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Panel className="p-5">
              <p className="text-sm font-semibold text-white">Open Trainings</p>
              <p className="mt-3 font-display text-3xl font-bold text-lime-300">
                {scheduledTrainings.length}
              </p>
              <p className="mt-1 text-sm text-slate-300">Scheduled sessions</p>
            </Panel>
            <Panel className="p-5">
              <p className="text-sm font-semibold text-white">Completed Trainings</p>
              <p className="mt-3 font-display text-3xl font-bold text-cyan-300">
                {completedTrainings.length}
              </p>
              <p className="mt-1 text-sm text-slate-300">Recorded sessions</p>
            </Panel>
            <Panel className="p-5">
              <p className="text-sm font-semibold text-white">Completed Matches</p>
              <p className="mt-3 font-display text-3xl font-bold text-lime-300">
                {completedMatches.length}
              </p>
              <p className="mt-1 text-sm text-slate-300">With match history</p>
            </Panel>
            <Panel className="p-5">
              <p className="text-sm font-semibold text-white">Squad Ready</p>
              <p className="mt-3 font-display text-3xl font-bold text-white">
                {players.filter((player) => player.profile_status === "complete").length}
              </p>
              <p className="mt-1 text-sm text-slate-300">Completed profiles</p>
            </Panel>
            <Panel className="p-5">
              <p className="text-sm font-semibold text-white">Permissions</p>
              <p className="mt-3 font-display text-3xl font-bold text-teal-300">
                {groups.filter((group) => group.can_evaluate_players).length}
              </p>
              <p className="mt-1 text-sm text-slate-300">Evaluation groups</p>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Panel className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Upcoming Training</h2>
                <Link href="/coach/training" className="text-sm text-cyan-300">
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {upcomingTrainings.slice(0, 5).map((event) => (
                  <TrainingRow key={event.id} event={event} />
                ))}
                {!upcomingTrainings.length && (
                  <EmptyState text="No backend training sessions are assigned to you yet." />
                )}
              </div>
            </Panel>

            <Panel className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Upcoming Matches</h2>
                <Link href="/coach/matches" className="text-sm text-cyan-300">
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {upcomingMatches.slice(0, 5).map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
                {!upcomingMatches.length && (
                  <EmptyState text="No backend matches are assigned to you yet." />
                )}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <Panel className="p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Next Agenda</h2>
                <Link href="/coach/calendar" className="text-sm text-cyan-300">
                  Calendar
                </Link>
              </div>
              <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                {agenda.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.href}
                    className="min-h-[178px] rounded-2xl border border-[#2a4460] bg-white/[0.025] p-3 transition hover:border-cyan-300/40"
                  >
                    <div className="text-sm font-semibold">{formatDate(item.date).split(",")[0]}</div>
                    <div className="text-xs text-slate-400">{formatTime12(item.time)}</div>
                    <item.Icon className={item.type === "match" ? "mt-5 h-8 w-8 text-cyan-300" : "mt-5 h-8 w-8 text-lime-300"} />
                    <p className="mt-4 line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
                    {item.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" />
                        {item.location}
                      </p>
                    )}
                  </Link>
                ))}
                {!agenda.length && (
                  <div className="md:col-span-3 xl:col-span-6">
                    <EmptyState text="No upcoming training or match agenda from backend yet." />
                  </div>
                )}
              </div>
            </Panel>

            <Panel className="p-5">
              <h2 className="mb-5 text-xl font-semibold">Focus Players</h2>
              <div className="space-y-3">
                {focusPlayers.map((player) => (
                  <PlayerRow key={player.id} player={player} />
                ))}
                {!focusPlayers.length && (
                  <EmptyState text="No backend players are assigned to you yet." />
                )}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
            <Panel className="p-5 xl:col-span-2">
              <h2 className="mb-4 text-xl font-semibold">Assigned Groups</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {groups.map((group) => (
                  <GroupCard key={group.group_id} group={group} />
                ))}
                {!groups.length && (
                  <div className="md:col-span-2">
                    <EmptyState text="No backend groups are assigned to your coach account yet." />
                  </div>
                )}
              </div>
            </Panel>

            <Panel className="p-5">
              <h2 className="mb-4 text-xl font-semibold">Coach Actions</h2>
              <div className="space-y-1">
                {[
                  { icon: ClipboardCheck, title: "Training Attendance", subtitle: `${scheduledTrainings.length} scheduled sessions`, href: "/coach/training" },
                  { icon: Star, title: "New Evaluation", subtitle: "Evaluate assigned players", href: "/coach/evaluations/new" },
                  { icon: Target, title: "Match Configuration", subtitle: `${upcomingMatches.length} upcoming matches`, href: "/coach/matches/configuration" },
                  { icon: ShieldCheck, title: "Injury Risk AI", subtitle: `${players.length} assigned players`, href: "/coach/injury-risk-ai" },
                ].map((action) => (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="flex items-center gap-3 border-b border-[#2a4460] py-3 last:border-b-0"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#2a4460] bg-white/[0.03] text-white">
                      <action.icon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-white">{action.title}</span>
                      <span className="text-sm text-slate-400">{action.subtitle}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
