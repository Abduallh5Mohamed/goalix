"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetCoachSessionsQuery } from "@/lib/store/api/coachApi";
import { formatDate, formatTime12 } from "@/lib/utils";
import { Calendar, Clock, Users, Loader2 } from "lucide-react";
import Link from "next/link";

export default function CoachSchedulePage() {
  const { data, isLoading, isError } = useGetCoachSessionsQuery({ limit: 100 });
  const mySessions = [...(data?.data ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // Group sessions by date
  const sessionsByDate = mySessions.reduce(
    (acc, session) => {
      if (!acc[session.date]) acc[session.date] = [];
      acc[session.date].push(session);
      return acc;
    },
    {} as Record<string, typeof mySessions>,
  );

  const typeColors: Record<string, string> = {
    training: "bg-primary/20 text-primary",
    match: "bg-red-500/20 text-red-400",
    assessment: "bg-amber-500/20 text-amber-400",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        description="Your upcoming sessions and events"
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Schedule" },
          { label: "Calendar" },
        ]}
      />

      {isLoading && (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading schedule...
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="p-4 text-sm text-red-300">
            Could not load coach schedule.
          </CardContent>
        </Card>
      )}

      {/* Calendar-style view */}
      <div className="space-y-6">
        {Object.entries(sessionsByDate).map(([date, sessions]) => (
          <div key={date}>
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">{formatDate(date)}</h3>
              <Badge variant="outline" className="text-xs">
                {sessions.length} session{sessions.length > 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="ml-2 space-y-3 border-l-2 border-primary/20 pl-6">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/coach/schedule/session?id=${session.id}`}
                >
                  <Card className="border-border/50 bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {session.groupName}
                            </h4>
                            <Badge
                              className={typeColors[session.type] || ""}
                              variant="secondary"
                            >
                              {session.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTime12(session.startTime)} -{" "}
                              {formatTime12(session.endTime)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {session.attendanceCount}/{session.totalPlayers}
                            </span>
                          </div>
                          {session.notes && (
                            <p className="text-xs text-muted-foreground">
                              {session.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted/30">
                          <span className="text-lg font-bold text-primary">
                            {formatTime12(session.startTime).replace(
                              /:00\s/,
                              " ",
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {mySessions.length === 0 && (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex min-h-[200px] items-center justify-center">
            <p className="text-muted-foreground">No upcoming sessions</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
