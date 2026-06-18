"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "@/components/charts/LineChart";
import { mockMeasurements, mockPlayers } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function ParentChildMeasurementsPage() {
  const child = mockPlayers.find((p) => p.id === "p1")!;
  const measurements = mockMeasurements
    .filter((m) => m.playerId === "p1")
    .sort((a, b) => a.date.localeCompare(b.date));

  const latest = measurements[measurements.length - 1];

  const heightData = measurements.map((m) => ({
    label: formatDate(m.date).split(",")[0],
    value: m.height,
  }));
  const weightData = measurements.map((m) => ({
    label: formatDate(m.date).split(",")[0],
    value: m.weight,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Child Measurements"
        description={`${child.fullName}'s physical measurements`}
        breadcrumbs={[
          { label: "Home", href: "/parent/home" },
          { label: "Child" },
          { label: "Measurements" },
        ]}
      />

      {/* Current */}
      {latest && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Height", value: `${latest.height} cm`, color: "text-primary" },
            { label: "Weight", value: `${latest.weight} kg`, color: "text-accent" },
            { label: "Sprint", value: `${latest.sprintSpeed}s`, color: "text-amber-400" },
            { label: "Endurance", value: `${latest.endurance}/10`, color: "text-emerald-400" },
            { label: "Flexibility", value: `${latest.flexibility}/10`, color: "text-purple-400" },
          ].map((s) => (
            <Card key={s.label} className="border-border/50 bg-card">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Height Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              labels={heightData.map((d) => d.label)}
              datasets={[{ label: "Height (cm)", data: heightData.map((d) => d.value), color: "#2d9ad5" }]}
              height={250}
            />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Weight Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              labels={weightData.map((d) => d.label)}
              datasets={[{ label: "Weight (kg)", data: weightData.map((d) => d.value), color: "#51b848" }]}
              height={250}
            />
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">History</CardTitle>
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
                    <tr key={m.id} className="border-b border-border/20 last:border-0">
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
