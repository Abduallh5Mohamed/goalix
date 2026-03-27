"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  mockAttendanceRecords,
  mockSessions,
  mockPlayers,
} from "@/lib/mock-data";
import { ATTENDANCE_STATUS_CONFIG } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { CalendarCheck, Calendar, Clock } from "lucide-react";

export default function ParentChildAttendancePage() {
  const child = mockPlayers.find((p) => p.id === "p1")!;
  const records = mockAttendanceRecords.filter((r) => r.playerId === "p1");

  const statusCounts = {
    present: records.filter((r) => r.status === "present").length,
    absent: records.filter((r) => r.status === "absent").length,
    late: records.filter((r) => r.status === "late").length,
    excused: records.filter((r) => r.status === "excused").length,
  };

  const chartData = Object.entries(ATTENDANCE_STATUS_CONFIG).map(
    ([key, config]) => ({
      label: config.label,
      value: statusCounts[key as keyof typeof statusCounts] || 0,
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Child Attendance"
        description={`${child.fullName}'s attendance record`}
        breadcrumbs={[
          { label: "Home", href: "/parent/home" },
          { label: "Child" },
          { label: "Attendance" },
        ]}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">
              {child.attendanceRate}%
            </p>
            <p className="text-xs text-muted-foreground">Rate</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-400">
              {statusCounts.present}
            </p>
            <p className="text-xs text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-400">
              {statusCounts.absent}
            </p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-400">
              {statusCounts.late}
            </p>
            <p className="text-xs text-muted-foreground">Late</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DoughnutChart
              labels={chartData.map((d) => d.label)}
              data={chartData.map((d) => d.value)}
              height={250}
            />
          </CardContent>
        </Card>

        {/* Records */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Records
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {records.map((record) => {
                const session = mockSessions.find(
                  (s) => s.id === record.sessionId
                );
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarCheck className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">
                          {session?.groupName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {session ? formatDate(session.date) : "—"}
                          <Clock className="h-3 w-3" />
                          {session?.startTime}
                        </div>
                        {record.notes && (
                          <p className="text-xs text-muted-foreground">
                            {record.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <StatusBadge
                      status={record.status}
                      type="attendance"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
