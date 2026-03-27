"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LineChart } from "@/components/charts/LineChart";
import {
  mockPlayers,
  mockEvaluations,
  mockRankings,
  mockSessions,
  mockMeasurements,
  mockNotifications,
} from "@/lib/mock-data";
import { TREND_CONFIG, PLAYER_LEVELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  Trophy,
  TrendingUp,
  Star,
  Calendar,
  Activity,
  ChevronRight,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function PlayerHomePage() {
  // Current player: Youssef Ali (p1)
  const player = mockPlayers.find((p) => p.id === "p1")!;
  const evaluations = mockEvaluations.filter((e) => e.playerId === "p1");
  const rankings = mockRankings.filter((r) => r.playerId === "p1");
  const measurements = mockMeasurements.filter((m) => m.playerId === "p1");
  const nextSession = mockSessions.find((s) => s.groupId === player.groupId);
  const playerNotifs = mockNotifications.filter(
    (n) => n.targetRole === "player"
  );

  const latestEval = evaluations[evaluations.length - 1];
  const latestRanking = rankings[0];

  const stats = [
    {
      label: "Rank in Group",
      value: `#${player.rankInGroup}`,
      icon: "Trophy" as const,
      change: latestRanking ? latestRanking.previousRank - latestRanking.rank : 0,
      changeLabel: "vs last week",
    },
    {
      label: "Performance",
      value: player.performanceScore,
      icon: "Star" as const,
      change: 3,
      changeLabel: "vs last month",
    },
    {
      label: "Attendance",
      value: `${player.attendanceRate}%`,
      icon: "ClipboardCheck" as const,
      change: 2,
      changeLabel: "vs last month",
    },
    {
      label: "Level",
      value: `Level ${player.level}`,
      icon: "TrendingUp" as const,
      change: 0,
      changeLabel: "current",
    },
  ];

  // Performance trend data
  const perfData = measurements.map((m) => ({
    label: formatDate(m.date).split(",")[0],
    value: (((m.sprintSpeed ?? 0) + (m.endurance ?? 0) + (m.flexibility ?? 0)) / 3) * 10,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${player.fullName}!`}
        description={`${player.groupName} · ${player.position}`}
        breadcrumbs={[{ label: "Home" }]}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatsCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Performance Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Latest Evaluation */}
          {latestEval && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">
                  Latest Evaluation
                </CardTitle>
                <Link href="/player/performance/progress">
                  <Button variant="ghost" size="sm">
                    View All <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    By {latestEval.coachName} · {formatDate(latestEval.date)}
                  </p>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">
                      {latestEval.overallScore}
                    </p>
                    <p className="text-xs text-muted-foreground">Overall</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: "Technical", value: latestEval.technicalScore, emoji: "⚽" },
                    { label: "Tactical", value: latestEval.tacticalScore, emoji: "🧠" },
                    { label: "Physical", value: latestEval.physicalScore, emoji: "💪" },
                    { label: "Mental", value: latestEval.mentalScore, emoji: "🎯" },
                  ].map((cat) => (
                    <div
                      key={cat.label}
                      className="rounded-lg bg-muted/20 p-3 text-center"
                    >
                      <p className="mb-1 text-lg">{cat.emoji}</p>
                      <p className="text-lg font-bold">{cat.value}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {cat.label}
                      </p>
                    </div>
                  ))}
                </div>
                {latestEval.notes && (
                  <div className="mt-4 rounded-lg bg-muted/20 p-3">
                    <p className="text-sm text-muted-foreground italic">
                      &quot;{latestEval.notes}&quot;
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Performance Trend */}
          {perfData.length > 0 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Performance Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart
                  labels={perfData.map((d) => d.label)}
                  datasets={[{ label: "Score", data: perfData.map((d) => d.value), color: "#22d3ee" }]}
                  height={250}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Player Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
                <span className="text-3xl font-bold text-primary">
                  {player.fullName.charAt(0)}
                </span>
              </div>
              <h3 className="text-lg font-bold">{player.fullName}</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                {player.position} · Age {player.age}
              </p>
              <div className="flex justify-center gap-2">
                <Badge className="bg-primary/20 text-primary">
                  Level {player.level}
                </Badge>
                <Badge
                  style={{ color: TREND_CONFIG[player.trend]?.color }}
                  variant="outline"
                >
                  {TREND_CONFIG[player.trend]?.icon}{" "}
                  {TREND_CONFIG[player.trend]?.label}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-card/50 p-2">
                  <p className="text-lg font-bold">{player.height}cm</p>
                  <p className="text-[10px] text-muted-foreground">Height</p>
                </div>
                <div className="rounded-lg bg-card/50 p-2">
                  <p className="text-lg font-bold">{player.weight}kg</p>
                  <p className="text-[10px] text-muted-foreground">Weight</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Session */}
          {nextSession && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Calendar className="h-4 w-4 text-primary" />
                  Next Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{nextSession.groupName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(nextSession.date)} · {nextSession.startTime} -{" "}
                  {nextSession.endTime}
                </p>
                <Badge className="mt-2" variant="secondary">
                  {nextSession.type}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Quick Links */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Link href="/player/performance/ranking">
                <Button
                  variant="outline"
                  className="h-16 w-full flex-col gap-1"
                >
                  <Trophy className="h-4 w-4 text-yellow-400" />
                  <span className="text-[10px]">Rankings</span>
                </Button>
              </Link>
              <Link href="/player/profile/measurements">
                <Button
                  variant="outline"
                  className="h-16 w-full flex-col gap-1"
                >
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-[10px]">Measurements</span>
                </Button>
              </Link>
              <Link href="/player/training">
                <Button
                  variant="outline"
                  className="h-16 w-full flex-col gap-1"
                >
                  <Zap className="h-4 w-4 text-accent" />
                  <span className="text-[10px]">Training</span>
                </Button>
              </Link>
              <Link href="/player/attendance">
                <Button
                  variant="outline"
                  className="h-16 w-full flex-col gap-1"
                >
                  <Target className="h-4 w-4 text-emerald-400" />
                  <span className="text-[10px]">Attendance</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
