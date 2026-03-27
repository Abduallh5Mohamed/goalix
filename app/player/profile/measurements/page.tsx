"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "@/components/charts/LineChart";
import { mockMeasurements, mockPlayers } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { Ruler, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function PlayerMeasurementsPage() {
  const player = mockPlayers.find((p) => p.id === "p1")!;
  const measurements = mockMeasurements
    .filter((m) => m.playerId === "p1")
    .sort((a, b) => a.date.localeCompare(b.date));

  const latest = measurements[measurements.length - 1];
  const previous = measurements.length > 1 ? measurements[measurements.length - 2] : null;

  const heightData = measurements.map((m) => ({
    label: formatDate(m.date).split(",")[0],
    value: m.height,
  }));
  const weightData = measurements.map((m) => ({
    label: formatDate(m.date).split(",")[0],
    value: m.weight,
  }));
  const sprintData = measurements.map((m) => ({
    label: formatDate(m.date).split(",")[0],
    value: m.sprintSpeed,
  }));
  const enduranceData = measurements.map((m) => ({
    label: formatDate(m.date).split(",")[0],
    value: m.endurance,
  }));

  const getDiff = (curr: number | undefined, prev: number | undefined) => {
    if (curr == null || prev == null) return null;
    const diff = curr - prev;
    return {
      value: Math.abs(diff).toFixed(1),
      positive: diff >= 0,
      icon: diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus,
    };
  };

  const statCards = latest
    ? [
        {
          label: "Height",
          value: `${latest.height} cm`,
          diff: getDiff(latest.height, previous?.height),
          color: "text-primary",
        },
        {
          label: "Weight",
          value: `${latest.weight} kg`,
          diff: getDiff(latest.weight, previous?.weight),
          color: "text-accent",
        },
        {
          label: "Sprint Speed",
          value: `${latest.sprintSpeed}s`,
          diff: getDiff(latest.sprintSpeed, previous?.sprintSpeed),
          color: "text-amber-400",
          inverseBetter: true,
        },
        {
          label: "Endurance",
          value: `${latest.endurance}/10`,
          diff: getDiff(latest.endurance, previous?.endurance),
          color: "text-emerald-400",
        },
        {
          label: "Flexibility",
          value: `${latest.flexibility}/10`,
          diff: getDiff(latest.flexibility, previous?.flexibility),
          color: "text-purple-400",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Measurements"
        description="Track your physical development over time"
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Profile", href: "/player/profile" },
          { label: "Measurements" },
        ]}
      />

      {/* Current Stats */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="mb-1 text-xs text-muted-foreground">{stat.label}</p>
              {stat.diff && (
                <div
                  className={`flex items-center justify-center gap-1 text-xs ${
                    stat.inverseBetter
                      ? stat.diff.positive
                        ? "text-red-400"
                        : "text-emerald-400"
                      : stat.diff.positive
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  <stat.diff.icon className="h-3 w-3" />
                  <span>{stat.diff.value}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Height Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart labels={heightData.map(d => d.label)} datasets={[{ label: "Height (cm)", data: heightData.map(d => d.value), color: "#22d3ee" }]} height={250} />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Weight Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart labels={weightData.map(d => d.label)} datasets={[{ label: "Weight (kg)", data: weightData.map(d => d.value), color: "#3ddc84" }]} height={250} />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Sprint Speed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart labels={sprintData.map(d => d.label)} datasets={[{ label: "Seconds", data: sprintData.map(d => d.value ?? 0), color: "#f59e0b" }]} height={250} />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Endurance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart labels={enduranceData.map(d => d.label)} datasets={[{ label: "Score", data: enduranceData.map(d => d.value ?? 0), color: "#a855f7" }]} height={250} />
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Measurement History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-left text-muted-foreground">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Height</th>
                  <th className="pb-3 pr-4">Weight</th>
                  <th className="pb-3 pr-4">Sprint</th>
                  <th className="pb-3 pr-4">Endurance</th>
                  <th className="pb-3">Flexibility</th>
                </tr>
              </thead>
              <tbody>
                {measurements
                  .slice()
                  .reverse()
                  .map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-border/20 last:border-0"
                    >
                      <td className="py-3 pr-4">{formatDate(m.date)}</td>
                      <td className="py-3 pr-4 font-medium">{m.height} cm</td>
                      <td className="py-3 pr-4 font-medium">{m.weight} kg</td>
                      <td className="py-3 pr-4 font-medium">{m.sprintSpeed}s</td>
                      <td className="py-3 pr-4 font-medium">{m.endurance}/10</td>
                      <td className="py-3 font-medium">{m.flexibility}/10</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
