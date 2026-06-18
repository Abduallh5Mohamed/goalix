"use client";

import {
  CalendarClock,
  CalendarDays,
  Clock,
  Dumbbell,
  Loader2,
  MapPin,
  ShieldCheck,
  Target,
  Trophy,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetPlayerCalendarEventsQuery,
  useGetPlayerMatchesQuery,
} from "@/lib/store/api/calendarApi";
import type { CalendarEvent, Match } from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12, localDateTimeTimestamp } from "@/lib/utils";

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
  if (["completed", "finished", "present", "starter"].includes(status)) {
    return "success" as const;
  }
  if (["scheduled", "substitute", "reserve"].includes(status)) {
    return "info" as const;
  }
  if (["postponed", "late"].includes(status)) return "warning" as const;
  if (["cancelled", "absent", "injured"].includes(status)) {
    return "destructive" as const;
  }
  return "secondary" as const;
};

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function EventIcon({ type }: { type: string }) {
  const Icon = type === "training" ? Dumbbell : type === "match" ? Trophy : CalendarDays;
  return (
    <div className="rounded-lg bg-cyan-400/10 p-2 text-cyan-200">
      <Icon className="h-5 w-5" />
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <EventIcon type={event.event_type} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-white">{event.title}</h3>
              <Badge variant="outline">{titleCase(event.event_type)}</Badge>
              <Badge variant={statusVariant(event.status)}>
                {titleCase(event.status)}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <CalendarClock className="h-4 w-4" />
                {formatDate(event.start_datetime)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime12(event.start_datetime)}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {event.training && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-white/[0.035] p-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <Target className="h-4 w-4" />
              Focus
            </p>
            <p className="mt-2 text-sm text-slate-200">
              {event.training.training_focus || "Not set"}
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.035] p-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              Intensity
            </p>
            <p className="mt-2 text-sm text-slate-200">
              {titleCase(event.training.intensity_level)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchReminder({ match }: { match: Match }) {
  const squad = match.squad?.[0];
  const hasPlan = Boolean(match.tactics || squad);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white">{match.opponent_name}</h3>
            <Badge variant={statusVariant(match.status)}>
              {titleCase(match.status)}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {formatDate(match.match_date)} | {formatTime12(match.match_time)}
            {match.location ? ` | ${match.location}` : ""}
          </p>
        </div>
        <Badge variant={squad ? statusVariant(squad.squad_role) : "secondary"}>
          {squad ? titleCase(squad.squad_role) : "Not selected"}
        </Badge>
      </div>

      {hasPlan ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-cyan-400/10 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase text-cyan-200">
                <UserCheck className="h-4 w-4" />
                Your Position
              </p>
              <p className="mt-2 font-semibold text-white">
                {squad?.position || "Not assigned"}
              </p>
            </div>
            <div className="rounded-lg bg-lime-400/10 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase text-lime-200">
                <ShieldCheck className="h-4 w-4" />
                Formation
              </p>
              <p className="mt-2 font-semibold text-white">
                {match.tactics?.formation || "Not set"}
              </p>
            </div>
          </div>
          {(squad?.player_instruction || match.tactics?.tactical_notes) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {squad?.player_instruction && (
                <div className="rounded-lg bg-cyan-400/10 p-3">
                  <p className="text-xs font-semibold uppercase text-cyan-200">
                    Your Instructions
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {squad.player_instruction}
                  </p>
                </div>
              )}
              {match.tactics?.tactical_notes && (
                <div className="rounded-lg bg-lime-400/10 p-3">
                  <p className="text-xs font-semibold uppercase text-lime-200">
                    Tactical Notes
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {match.tactics.tactical_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-white/[0.035] p-3 text-sm text-slate-400">
          Match configuration has not been published for you yet.
        </p>
      )}
    </div>
  );
}

export default function PlayerCalendarPage() {
  const eventsQuery = useGetPlayerCalendarEventsQuery();
  const matchesQuery = useGetPlayerMatchesQuery(undefined, {
    pollingInterval: 15000,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });
  const events = (eventsQuery.data?.data ?? [])
    .slice()
    .sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
  const matches = (matchesQuery.data?.data ?? [])
    .slice()
    .sort((a, b) => matchTimestamp(a) - matchTimestamp(b));
  const isLoading = eventsQuery.isLoading || matchesQuery.isLoading;

  const upcomingEvents = events.filter(
    (event) => !["completed", "finished", "cancelled"].includes(event.status),
  );
  const pastEvents = events
    .filter((event) => ["completed", "finished"].includes(event.status))
    .slice()
    .reverse()
    .slice(0, 8);
  const matchReminders = matches
    .filter((match) => !["completed", "finished", "cancelled"].includes(match.status))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Your visible academy events, training sessions, match reminders, and published plans."
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Calendar" },
        ]}
      />

      {isLoading ? (
        <Card className="border-white/10 bg-white/[0.045] shadow-none">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading calendar...
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
          <Card className="border-white/10 bg-white/[0.045] shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Upcoming Agenda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.length ? (
                upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))
              ) : (
                <EmptyState text="No upcoming calendar events are visible for you yet." />
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Match Reminders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {matchReminders.length ? (
                  matchReminders.map((match) => (
                    <MatchReminder key={match.id} match={match} />
                  ))
                ) : (
                  <EmptyState text="No match reminders yet." />
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pastEvents.length ? (
                  pastEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.035] p-3"
                    >
                      <div>
                        <p className="font-medium text-white">{event.title}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {formatDate(event.start_datetime)}
                        </p>
                      </div>
                      <Badge variant={statusVariant(event.status)}>
                        {titleCase(event.status)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <EmptyState text="No recent events yet." />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
