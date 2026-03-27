"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart } from "@/components/charts/AreaChart";
import { BarChart } from "@/components/charts/BarChart";
import { Button } from "@/components/ui/button";
import { mockAttendanceChartData, mockBranches, mockAttendanceRecords } from "@/lib/mock-data";
import { FileDown } from "lucide-react";

export default function AttendanceReportPage() {
  const totalRecords = mockAttendanceRecords.length;
  const presentCount = mockAttendanceRecords.filter((r) => r.status === "present").length;
  const overallRate = Math.round((presentCount / totalRecords) * 100);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Attendance Report"
        description="Detailed attendance analytics and trends."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Reports" },
          { label: "Attendance" },
        ]}
        actions={
          <Button variant="outline" className="gap-1.5">
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatsCard label="Overall Rate" value={`${overallRate}%`} icon="ClipboardCheck" change={3.2} changeLabel="vs last month" />
        <StatsCard label="Total Sessions" value="24" icon="Layers" />
        <StatsCard label="Avg per Session" value="14.2" icon="Users" />
        <StatsCard label="Perfect Attendance" value="3" icon="UserCheck" />
      </div>

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Weekly Attendance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <AreaChart
            labels={mockAttendanceChartData.map((d) => d.label)}
            datasets={[
              {
                label: "Attendance %",
                data: mockAttendanceChartData.map((d) => d.value),
                borderColor: "#22d3ee",
                backgroundColor: "rgba(34,211,238,0.1)",
              },
            ]}
            height={300}
          />
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Attendance by Branch</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            labels={mockBranches.filter((b) => b.status === "active").map((b) => b.name)}
            datasets={[
              {
                label: "Attendance %",
                data: [87, 91, 84],
                backgroundColor: "#3ddc84",
              },
            ]}
            height={280}
          />
        </CardContent>
      </Card>
    </div>
  );
}
