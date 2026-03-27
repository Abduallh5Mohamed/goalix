"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { mockEvaluations, mockMeasurements, mockPlayers } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function PlayerProgressPage() {
  const player = mockPlayers.find((p) => p.id === "p1")!;
  const evaluations = mockEvaluations
    .filter((e) => e.playerId === "p1")
    .sort((a, b) => a.date.localeCompare(b.date));
  const measurements = mockMeasurements
    .filter((m) => m.playerId === "p1")
    .sort((a, b) => a.date.localeCompare(b.date));

  const overallData = evaluations.map((e) => ({
    label: formatDate(e.date).split(",")[0],
    value: e.overallScore * 10,
  }));

  const technicalData = evaluations.map((e) => ({
    label: formatDate(e.date).split(",")[0],
    value: e.technicalScore * 10,
  }));

  const tacticalData = evaluations.map((e) => ({
    label: formatDate(e.date).split(",")[0],
    value: e.tacticalScore * 10,
  }));

  const physicalData = evaluations.map((e) => ({
    label: formatDate(e.date).split(",")[0],
    value: e.physicalScore * 10,
  }));

  const mentalData = evaluations.map((e) => ({
    label: formatDate(e.date).split(",")[0],
    value: e.mentalScore * 10,
  }));

  const latestEval = evaluations[evaluations.length - 1];
  const radarData = latestEval
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
        title="Progress Chart"
        description="Track your performance over time"
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Performance" },
          { label: "Progress Chart" },
        ]}
      />

      {/* Overall Score Trend */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Overall Score Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            labels={overallData.map((d) => d.label)}
            datasets={[{ label: "Overall Score", data: overallData.map((d) => d.value), color: "#22d3ee" }]}
            height={300}
          />
        </CardContent>
      </Card>

      {/* Skill Breakdown */}
      {latestEval && (
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Latest Skill Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              labels={radarData.map((d) => d.label)}
              datasets={[{ label: "Score", data: radarData.map((d) => d.value), color: "#3ddc84" }]}
              height={250}
            />
          </CardContent>
        </Card>
      )}

      {/* Category Trends */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              ⚽ Technical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              labels={technicalData.map((d) => d.label)}
              datasets={[{ label: "Technical", data: technicalData.map((d) => d.value), color: "#22d3ee" }]}
              height={200}
            />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              🧠 Tactical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              labels={tacticalData.map((d) => d.label)}
              datasets={[{ label: "Tactical", data: tacticalData.map((d) => d.value), color: "#3ddc84" }]}
              height={200}
            />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              💪 Physical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              labels={physicalData.map((d) => d.label)}
              datasets={[{ label: "Physical", data: physicalData.map((d) => d.value), color: "#f59e0b" }]}
              height={200}
            />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              🎯 Mental
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              labels={mentalData.map((d) => d.label)}
              datasets={[{ label: "Mental", data: mentalData.map((d) => d.value), color: "#a855f7" }]}
              height={200}
            />
          </CardContent>
        </Card>
      </div>

      {/* Coach Feedback History */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Coach Feedback
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
                    <p className="text-sm font-medium">{ev.coachName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(ev.date)}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-primary">
                    {ev.overallScore}
                  </p>
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
