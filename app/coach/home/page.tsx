"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  mockSessions,
  mockGroups,
  mockPlayers,
  mockAttendanceRecords,
  mockEvaluations,
  mockNotifications,
} from "@/lib/mock-data";
import { getInitials, formatDate } from "@/lib/utils";
import {
  Users,
  ClipboardCheck,
  Star,
  Calendar,
  Clock,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Link from "next/link";

export default function CoachHomePage() {
  // Coach-specific data (Omar Mostafa - c1)
  const myGroups = mockGroups.filter((g) =>
    ["g1", "g3"].includes(g.id)
  );
  const todaySessions = mockSessions.filter(
    (s) => s.coachId === "c1"
  ).slice(0, 3);
  const myPlayers = mockPlayers.filter((p) =>
    ["g1", "g3"].includes(p.groupId)
  );
  const recentEvaluations = mockEvaluations.filter(
    (e) => e.coachId === "c1"
  ).slice(0, 3);
  const coachNotifications = mockNotifications.filter(
    (n) => n.targetRole === "coach"
  );

  const stats = [
    {
      label: "My Groups",
      value: myGroups.length,
      icon: "Users" as const,
      change: 0,
      changeLabel: "assigned",
    },
    {
      label: "Total Players",
      value: myPlayers.length,
      icon: "UserCheck" as const,
      change: 2,
      changeLabel: "new this month",
    },
    {
      label: "Avg Attendance",
      value: "91%",
      icon: "ClipboardCheck" as const,
      change: 3.5,
      changeLabel: "vs last week",
    },
    {
      label: "Evaluations Done",
      value: mockEvaluations.filter((e) => e.coachId === "c1").length,
      icon: "Star" as const,
      change: 4,
      changeLabel: "this month",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Welcome, Coach Omar"
        description="Here's your overview for today"
        breadcrumbs={[{ label: "Home" }]}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatsCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Sessions */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">
                Today&apos;s Sessions
              </CardTitle>
              <Link href="/coach/schedule">
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{session.groupName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {session.startTime} - {session.endTime}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        session.type === "match"
                          ? "destructive"
                          : session.type === "assessment"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {session.type}
                    </Badge>
                    <Link href="/coach/attendance/mark">
                      <Button size="sm">
                        <ClipboardCheck className="mr-1 h-4 w-4" />
                        Mark
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {todaySessions.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  No sessions scheduled for today
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + Notifications */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Link href="/coach/attendance/mark">
                <Button
                  variant="outline"
                  className="h-20 w-full flex-col gap-2"
                >
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  <span className="text-xs">Mark Attendance</span>
                </Button>
              </Link>
              <Link href="/coach/evaluations/new">
                <Button
                  variant="outline"
                  className="h-20 w-full flex-col gap-2"
                >
                  <Star className="h-5 w-5 text-amber-400" />
                  <span className="text-xs">New Evaluation</span>
                </Button>
              </Link>
              <Link href="/coach/measurements">
                <Button
                  variant="outline"
                  className="h-20 w-full flex-col gap-2"
                >
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  <span className="text-xs">Measurements</span>
                </Button>
              </Link>
              <Link href="/coach/rankings">
                <Button
                  variant="outline"
                  className="h-20 w-full flex-col gap-2"
                >
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  <span className="text-xs">Rankings</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {coachNotifications.slice(0, 3).map((notif) => (
                <div
                  key={notif.id}
                  className="flex items-start gap-3 rounded-lg bg-muted/20 p-3"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))}
              {coachNotifications.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No alerts
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* My Groups Overview */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">My Groups</CardTitle>
          <Link href="/coach/my-groups">
            <Button variant="ghost" size="sm">
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {myGroups.map((group) => {
              const groupPlayers = myPlayers.filter(
                (p) => p.groupId === group.id
              );
              return (
                <Link
                  key={group.id}
                  href={`/coach/my-groups/${group.id}`}
                  className="rounded-lg border border-border/30 bg-muted/20 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">{group.name}</h3>
                    <Badge variant="outline">
                      {group.playerCount}/{group.maxPlayers}
                    </Badge>
                  </div>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {group.schedule}
                  </p>
                  <div className="flex -space-x-2">
                    {groupPlayers.slice(0, 5).map((player) => (
                      <Avatar
                        key={player.id}
                        className="h-8 w-8 border-2 border-card"
                      >
                        <AvatarFallback className="bg-primary/20 text-[10px] text-primary">
                          {getInitials(player.fullName)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {groupPlayers.length > 5 && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] text-muted-foreground">
                        +{groupPlayers.length - 5}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Evaluations */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">
            Recent Evaluations
          </CardTitle>
          <Link href="/coach/evaluations/history">
            <Button variant="ghost" size="sm">
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentEvaluations.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/20 text-xs text-primary">
                      {getInitials(ev.playerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{ev.playerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(ev.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {ev.overallScore}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Overall</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
