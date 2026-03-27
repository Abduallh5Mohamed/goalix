"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockSessions, mockPlayers, mockGroups } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  CalendarDays,
} from "lucide-react";

export default function ParentSchedulePage() {
  // Get child's group → sessions
  const child = mockPlayers.find((p) => p.id === "p1");
  const childGroup = mockGroups.find((g) => g.id === child?.groupId);
  const sessions = mockSessions
    .filter((s) => s.groupId === child?.groupId)
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

  const statusColor: Record<string, string> = {
    upcoming: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  // Group by date
  const grouped = sessions.reduce(
    (acc, session) => {
      const date = session.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(session);
      return acc;
    },
    {} as Record<string, typeof sessions>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        description={`Upcoming sessions for ${child?.fullName || "your child"}`}
        breadcrumbs={[
          { label: "Home", href: "/parent/home" },
          { label: "Schedule" },
        ]}
      />

      {/* Child + Group Info */}
      <Card className="border-border/50 bg-card">
        <CardContent className="flex flex-wrap items-center gap-6 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{child?.fullName}</p>
              <p className="text-xs text-muted-foreground">Player</p>
            </div>
          </div>
          <div className="h-8 w-px bg-border/30" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10">
              <Users className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">{childGroup?.name}</p>
              <p className="text-xs text-muted-foreground">
                {childGroup?.schedule}
              </p>
            </div>
          </div>
          <div className="h-8 w-px bg-border/30" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
              <CalendarDays className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">{sessions.length}</p>
              <p className="text-xs text-muted-foreground">Total Sessions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Timeline */}
      {Object.entries(grouped).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateSessions]) => (
            <div key={date}>
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{formatDate(date)}</h3>
                <Badge variant="outline" className="text-[10px]">
                  {dateSessions.length} session
                  {dateSessions.length > 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {dateSessions.map((session) => {
                  const group = mockGroups.find(
                    (g) => g.id === session.groupId
                  );
                  return (
                    <Card
                      key={session.id}
                      className="border-border/30 bg-card transition-all hover:border-border/60"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{session.groupName}</h4>
                            <p className="text-xs text-muted-foreground">
                              {group?.name}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="capitalize text-xs"
                          >
                            {session.type}
                          </Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {session.startTime} — {session.endTime}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            Main Field
                          </span>
                          <span className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            {session.coachName}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-border/30 bg-card">
          <CardContent className="flex flex-col items-center gap-3 p-12">
            <Calendar className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No upcoming sessions</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
