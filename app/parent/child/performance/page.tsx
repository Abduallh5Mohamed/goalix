"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { mockPlayers, mockEvaluations, mockRankings } from "@/lib/mock-data";
import { TREND_CONFIG } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { TrendingUp, Star } from "lucide-react";

export default function ParentChildPerformancePage() {
  const child = mockPlayers.find((p) => p.id === "p1")!;
  const evaluations = mockEvaluations
    .filter((e) => e.playerId === "p1")
    .sort((a, b) => a.date.localeCompare(b.date));
  const ranking = mockRankings.find((r) => r.playerId === "p1");
  const latestEval = evaluations[evaluations.length - 1];

  const scoreData = evaluations.map((e) => ({
    label: formatDate(e.date).split(",")[0],
    value: e.overallScore * 10,
  }));

  const skillData = latestEval
    ? [
        { label: "Technical", value: latestEval.technicalScore * 10 },
        { label: "Tactical", value: latestEval.tacticalScore * 10 },
        { label: "Physical", value: latestEval.physicalScore * 10 },
        { label: "Mental", value: latestEval.mentalScore * 10 },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Child Performance"
        description={`${child.fullName}'s performance overview`}
        breadcrumbs={[
          { label: "Home", href: "/parent/home" },
          { label: "Child" },
          { label: "Performance" },
        ]}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">
              {child.performanceScore}
            </p>
            <p className="text-xs text-muted-foreground">Performance Score</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-accent">
              Level {child.level}
            </p>
            <p className="text-xs text-muted-foreground">Current Level</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-400">
              #{child.rankInGroup}
            </p>
            <p className="text-xs text-muted-foreground">Group Rank</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <Badge
              variant="outline"
              style={{ color: TREND_CONFIG[child.trend]?.color }}
              className="text-lg"
            >
              {TREND_CONFIG[child.trend]?.icon}{" "}
              {TREND_CONFIG[child.trend]?.label}
            </Badge>
            <p className="mt-1 text-xs text-muted-foreground">Trend</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Score Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              labels={scoreData.map((d) => d.label)}
              datasets={[{ label: "Overall Score", data: scoreData.map((d) => d.value), color: "#2d9ad5" }]}
              height={280}
            />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Skill Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              labels={skillData.map((d) => d.label)}
              datasets={[{ label: "Score", data: skillData.map((d) => d.value), color: "#7bea28" }]}
              height={280}
            />
          </CardContent>
        </Card>
      </div>

      {/* Evaluation History */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Coach Evaluations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {evaluations
            .slice()
            .reverse()
            .map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-border/30 bg-muted/20 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{ev.coachName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(ev.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div>
                        <p className="font-bold">{ev.technicalScore}</p>
                        <p className="text-muted-foreground">Tech</p>
                      </div>
                      <div>
                        <p className="font-bold">{ev.tacticalScore}</p>
                        <p className="text-muted-foreground">Tact</p>
                      </div>
                      <div>
                        <p className="font-bold">{ev.physicalScore}</p>
                        <p className="text-muted-foreground">Phys</p>
                      </div>
                      <div>
                        <p className="font-bold">{ev.mentalScore}</p>
                        <p className="text-muted-foreground">Ment</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {ev.overallScore}
                    </p>
                  </div>
                </div>
                {ev.notes && (
                  <p className="text-sm text-muted-foreground italic">
                    &quot;{ev.notes}&quot;
                  </p>
                )}
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
