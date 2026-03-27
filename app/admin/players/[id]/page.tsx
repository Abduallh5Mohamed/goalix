"use client";

import { use } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart } from "@/components/charts/LineChart";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import {
  mockPlayers,
  mockEvaluations,
  mockMeasurements,
  mockAttendanceRecords,
  mockRankings,
} from "@/lib/mock-data";
import { getInitials, formatDate } from "@/lib/utils";
import { TREND_CONFIG } from "@/lib/constants";
import {
  Edit, Mail, Phone, MapPin, Calendar, Star, TrendingUp, TrendingDown, Minus,
  Ruler, Weight, Zap, Heart, Activity, Shield,
} from "lucide-react";

export default function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const player = mockPlayers.find((p) => p.id === id);
  const evals = mockEvaluations.filter((e) => e.playerId === id);
  const measurements = mockMeasurements.filter((m) => m.playerId === id);
  const attendance = mockAttendanceRecords.filter((a) => a.playerId === id);
  const rankings = mockRankings.filter((r) => r.playerId === id);

  if (!player) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Player not found.</p>
      </div>
    );
  }

  const trendCfg = TREND_CONFIG[player.trend];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={player.fullName}
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Players", href: "/admin/players" },
          { label: player.fullName },
        ]}
        actions={
          <Button variant="outline" className="gap-1.5">
            <Edit className="h-4 w-4" />
            Edit Player
          </Button>
        }
      />

      {/* Profile + Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="border-border/50 bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary/20 text-2xl font-bold text-primary">
                  {getInitials(player.fullName)}
                </AvatarFallback>
              </Avatar>
              <h3 className="mt-4 text-lg font-bold">{player.fullName}</h3>
              <p className="text-sm text-muted-foreground">{player.position}</p>
              <div className="mt-2 flex gap-2">
                <Badge variant={player.level === "A" ? "success" : player.level === "B" ? "warning" : "destructive"}>
                  Level {player.level}
                </Badge>
                <Badge variant={player.status === "active" ? "success" : player.status === "injured" ? "destructive" : "secondary"}>
                  {player.status}
                </Badge>
              </div>

              <div className="mt-6 w-full space-y-3 text-left text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Age</div>
                  <span className="text-foreground font-medium">{player.age} years</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-2"><Ruler className="h-4 w-4" /> Height</div>
                  <span className="text-foreground font-medium">{player.height} cm</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-2"><Weight className="h-4 w-4" /> Weight</div>
                  <span className="text-foreground font-medium">{player.weight} kg</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Foot</div>
                  <span className="text-foreground font-medium capitalize">{player.preferredFoot}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Branch</div>
                  <span className="text-foreground font-medium">{player.branchName}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-2"><Shield className="h-4 w-4" /> Group</div>
                  <span className="text-foreground font-medium text-xs">{player.groupName}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatsCard label="Performance" value={player.performanceScore} icon="UserCheck" />
            <StatsCard label="Attendance" value={`${player.attendanceRate}%`} icon="ClipboardCheck" />
            <StatsCard label="Rank in Group" value={`#${player.rankInGroup}`} icon="Trophy" />
            <div className="rounded-xl border border-border/50 bg-card p-6">
              <p className="text-sm font-medium text-muted-foreground">Trend</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-bold" style={{ color: trendCfg.color }}>
                  {trendCfg.icon}
                </span>
                <span className="text-lg font-semibold" style={{ color: trendCfg.color }}>
                  {trendCfg.label}
                </span>
              </div>
            </div>
          </div>

          <Tabs defaultValue="evaluations">
            <TabsList>
              <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
              <TabsTrigger value="measurements">Measurements</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
            </TabsList>

            <TabsContent value="evaluations" className="mt-4 space-y-3">
              {evals.length > 0 ? (
                evals.map((ev) => (
                  <Card key={ev.id} className="border-border/50 bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(ev.date)} · by {ev.coachName}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Star className="h-4 w-4 text-amber-400" />
                          <span className="text-lg font-bold">{ev.overallScore}</span>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {(["technicalScore", "tacticalScore", "physicalScore", "mentalScore"] as const).map((key) => (
                          <div key={key} className="rounded-lg bg-muted/50 p-2 text-center">
                            <p className="text-[10px] text-muted-foreground capitalize">{key.replace("Score", "")}</p>
                            <p className="text-sm font-semibold">{ev[key]}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{ev.notes}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No evaluations yet.</p>
              )}
            </TabsContent>

            <TabsContent value="measurements" className="mt-4">
              {measurements.length > 0 ? (
                <div className="space-y-4">
                  <LineChart
                    labels={measurements.map((m) => formatDate(m.date))}
                    datasets={[
                      {
                        label: "Height (cm)",
                        data: measurements.map((m) => m.height),
                        borderColor: "#22d3ee",
                        backgroundColor: "rgba(34,211,238,0.1)",
                      },
                      {
                        label: "Weight (kg)",
                        data: measurements.map((m) => m.weight),
                        borderColor: "#3ddc84",
                        backgroundColor: "rgba(61,220,132,0.1)",
                      },
                    ]}
                    height={280}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {measurements.map((m) => (
                      <Card key={m.id} className="border-border/50 bg-card">
                        <CardContent className="p-3 text-sm">
                          <p className="text-xs text-muted-foreground">{formatDate(m.date)}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Height</p>
                              <p className="font-semibold">{m.height} cm</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Weight</p>
                              <p className="font-semibold">{m.weight} kg</p>
                            </div>
                            {m.sprintSpeed && (
                              <div>
                                <p className="text-[10px] text-muted-foreground">Sprint</p>
                                <p className="font-semibold">{m.sprintSpeed}s</p>
                              </div>
                            )}
                            {m.endurance && (
                              <div>
                                <p className="text-[10px] text-muted-foreground">Endurance</p>
                                <p className="font-semibold">{m.endurance}/10</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No measurements yet.</p>
              )}
            </TabsContent>

            <TabsContent value="attendance" className="mt-4 space-y-3">
              {attendance.length > 0 ? (
                attendance.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          att.status === "present" ? "#3ddc84" :
                          att.status === "absent" ? "#ef4444" :
                          att.status === "late" ? "#f59e0b" : "#6b7280",
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">{att.status}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(att.markedAt)}</p>
                    </div>
                    {att.notes && (
                      <span className="text-xs text-muted-foreground">{att.notes}</span>
                    )}
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No attendance records.</p>
              )}
            </TabsContent>

            <TabsContent value="ranking" className="mt-4 space-y-3">
              {rankings.length > 0 ? (
                rankings.map((rank) => (
                  <div key={rank.id} className="flex items-center gap-4 rounded-lg border border-border/50 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-lg font-bold text-primary">#{rank.rank}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{rank.groupName}</p>
                      <p className="text-xs text-muted-foreground">{rank.period} · {formatDate(rank.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{rank.score} pts</p>
                      <p className="text-xs" style={{ color: TREND_CONFIG[rank.trend].color }}>
                        {rank.previousRank !== rank.rank && (
                          <span>was #{rank.previousRank} </span>
                        )}
                        {TREND_CONFIG[rank.trend].icon} {TREND_CONFIG[rank.trend].label}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No ranking data.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
