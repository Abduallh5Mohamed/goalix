"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart } from "@/components/charts/AreaChart";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import {
  mockAttendanceChartData,
  mockAttendanceRecords,
  mockBranches,
  mockSessions,
} from "@/lib/mock-data";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AttendanceOverviewPage() {
  const totalRecords = mockAttendanceRecords.length;
  const presentCount = mockAttendanceRecords.filter((r) => r.status === "present").length;
  const absentCount = mockAttendanceRecords.filter((r) => r.status === "absent").length;
  const lateCount = mockAttendanceRecords.filter((r) => r.status === "late").length;
  const excusedCount = mockAttendanceRecords.filter((r) => r.status === "excused").length;
  const overallRate = Math.round((presentCount / totalRecords) * 100);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Attendance Overview"
        description="Monitor attendance rates across all branches and groups."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Attendance" },
          { label: "Overview" },
        ]}
        actions={
          <Button variant="outline" className="gap-1.5">
            <FileDown className="h-4 w-4" />
            Export Report
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard label="Overall Rate" value={`${overallRate}%`} icon="ClipboardCheck" change={3.2} changeLabel="vs last week" />
        <StatsCard label="Present" value={presentCount} icon="UserCheck" />
        <StatsCard label="Absent" value={absentCount} icon="AlertTriangle" />
        <StatsCard label="Late" value={lateCount} icon="Users" />
        <StatsCard label="Excused" value={excusedCount} icon="Users" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/50 bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart
              labels={mockAttendanceChartData.map((d) => d.label)}
              datasets={[
                {
                  label: "Attendance %",
                  data: mockAttendanceChartData.map((d) => d.value),
                  color: "#22d3ee",
                },
              ]}
              height={300}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DoughnutChart
              labels={["Present", "Absent", "Late", "Excused"]}
              data={[presentCount, absentCount, lateCount, excusedCount]}
              colors={["#3ddc84", "#ef4444", "#f59e0b", "#6b7280"]}
              height={240}
              centerValue={`${overallRate}%`}
              centerLabel="Rate"
            />
          </CardContent>
        </Card>
      </div>

      {/* Branch Breakdown */}
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Attendance by Branch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mockBranches.filter((b) => b.status === "active").map((branch) => (
              <div
                key={branch.id}
                className="rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/30"
              >
                <p className="font-medium text-sm">{branch.name}</p>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-2xl font-bold text-primary">87%</span>
                  <Badge variant="success" className="text-[10px]">+2.1%</Badge>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: "87%" }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
