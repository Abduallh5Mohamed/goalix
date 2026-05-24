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
  Activity,
  Bed,
  ChevronDown,
  Cloud,
  Dumbbell,
  Goal,
  HeartPulse,
  Medal,
  Moon,
  Star,
  Target,
  Trophy,
  User,
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
        <blockquote className="border-l border-[#263f59] pl-7 text-slate-200">
          <span className="text-4xl font-black text-lime-300">“</span> Focus on the process, the results will follow.
          <p className="mt-2 text-sm text-slate-400">- Coach</p>
        </blockquote>
        <Ring value={82} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_2.8fr]">
        <Panel className="overflow-hidden xl:row-span-2">
          <div className="relative min-h-[405px] p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(182,255,0,0.28),transparent_28%)]" />
            <div className="absolute right-7 top-10 font-display text-[210px] font-black leading-none text-lime-300/20">X</div>
            <Image src="/Player.png" alt="Goalix player placeholder" fill sizes="360px" className="object-cover object-center opacity-80 mix-blend-screen" priority />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#07172a] to-transparent" />
            <div className="absolute bottom-6 left-5 right-5">
              <h2 className="text-3xl font-semibold">Noah Williams</h2>
              <p className="mt-1 text-lg"><span className="font-bold text-lime-300">RW</span> <span className="text-slate-300">• Winger</span></p>
              <div className="mt-5 grid grid-cols-4 gap-3 border-t border-[#2a4460] pt-4 text-sm">
                {["Age|24", "Height|178 cm", "Weight|72 kg", "Foot|Left"].map((item) => {
                  const [label, value] = item.split("|");
                  return <div key={label}><div className="text-slate-400">{label}</div><div className="font-semibold">{value}</div></div>;
                })}
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

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.75fr_1.65fr_1.05fr]">
        <Panel className="p-4"><h2 className="mb-4 text-xl font-semibold">Wellness</h2>{wellness.map((w) => <div key={w.label} className="flex items-center gap-4 border-b border-[#2a4460] py-4 last:border-b-0"><w.icon className="text-cyan-300" /><span className="flex-1">{w.label}</span><span className="text-right"><strong>{w.value}</strong><p className="text-xs text-lime-300">{w.sub}</p></span></div>)}</Panel>
        <Panel className="p-5"><div className="mb-5 flex justify-between"><h2 className="text-xl font-semibold">Weekly Training Schedule</h2><button className="rounded-xl border border-[#2a4460] px-3 py-1 text-sm text-slate-300">This Week</button></div><div className="grid gap-2 md:grid-cols-7">{schedule.map((s) => <div key={s.day} className="border-r border-[#2a4460] p-3 text-center last:border-r-0"><p className="font-semibold">{s.day}</p><p className="text-xs text-slate-400">{s.date}</p><s.icon className="mx-auto mt-5 h-8 w-8 text-lime-300" /><p className="mt-4 text-sm font-semibold">{s.title}</p><p className="mt-1 text-xs text-slate-400">10:00</p><span className={`mx-auto mt-4 grid h-6 w-6 place-items-center rounded-full ${s.done ? "bg-lime-300 text-[#06111f]" : "border border-cyan-300"}`}>{s.done ? "✓" : ""}</span></div>)}</div></Panel>
        <Panel className="p-5"><div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold">Upcoming Match</h2><p className="mt-7 text-lg font-semibold">vs City Rovers</p><p className="mt-2 text-sm text-slate-300">Saturday, 31 May • 20:00</p><p className="text-sm text-slate-400">Riverside Stadium</p></div><span className="rounded-full border border-cyan-300/40 px-4 py-2 text-cyan-300">Away Match</span></div><div className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-[#2a4460] p-4"><div className="flex gap-3"><Cloud className="text-cyan-300" /><span>Weather<br /><strong>18°C</strong></span></div><div className="flex gap-3"><Target className="text-lime-300" /><span>Focus Area<br /><strong>Final Third</strong></span></div></div></Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_0.45fr_0.45fr_1fr_0.65fr]">
        <Panel className="grid grid-cols-5 gap-0 p-5 text-center"><h2 className="col-span-5 mb-5 text-left text-xl font-semibold">Season Highlights</h2>{[["9","Goals"],["6","Assists"],["23","Key Passes"],["24","Shots on Target"],["8.2","Avg Rating"]].map(([v,l]) => <div key={l} className="border-r border-[#2a4460] last:border-r-0"><Star className="mx-auto mb-3 text-lime-300" /><strong className="font-display text-3xl">{v}</strong><p className="text-sm text-slate-400">{l}</p></div>)}</Panel>
        <Panel className="p-5 text-center"><h2 className="text-left text-lg font-semibold">Top Speed</h2><Ring value={84} color="cyan" /><strong className="font-display text-4xl">33.6</strong><p className="text-sm text-slate-400">km/h</p></Panel>
        <Panel className="p-5 text-center"><h2 className="text-left text-lg font-semibold">Distance</h2><Ring value={72} color="cyan" /><strong className="font-display text-4xl">11.2</strong><p className="text-sm text-slate-400">km</p></Panel>
        <Panel className="p-5"><h2 className="mb-5 text-xl font-semibold">Achievements</h2><div className="grid grid-cols-3 gap-4 text-center">{["Player of the Match|3x","Top Performer|5x","Consistency Streak|7 Matches"].map((a) => { const [t,v]=a.split("|"); return <div key={t}><Medal className="mx-auto h-14 w-14 text-yellow-400" /><p className="mt-2 text-sm">{t}</p><strong className="text-lime-300">{v}</strong></div>; })}</div></Panel>
        <Panel className="p-5 text-center"><h2 className="mb-5 text-left text-xl font-semibold">Next Milestone</h2><Ring value={80} color="teal" /><p className="mt-3 font-semibold">Goal Contribution</p><p className="text-sm text-slate-400">2 more to unlock</p></Panel>
      </div>
    </div>
  );
}
