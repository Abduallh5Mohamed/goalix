"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  mockAttendanceRecords,
  mockSessions,
  mockPlayers,
} from "@/lib/mock-data";
import { ATTENDANCE_STATUS_CONFIG } from "@/lib/constants";
import { formatDate, formatTime12 } from "@/lib/utils";
import { CalendarCheck, Clock, Calendar } from "lucide-react";

export default function PlayerAttendancePage() {
  const player = mockPlayers.find((p) => p.id === "p1")!;
  const playerRecords = mockAttendanceRecords.filter(
    (r) => r.playerId === "p1",
  );

  const statusCounts = {
    present: playerRecords.filter((r) => r.status === "present").length,
    absent: playerRecords.filter((r) => r.status === "absent").length,
    late: playerRecords.filter((r) => r.status === "late").length,
    excused: playerRecords.filter((r) => r.status === "excused").length,
  };

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const chartData = Object.entries(ATTENDANCE_STATUS_CONFIG).map(
    ([key, config]) => ({
      label: config.label,
      value: statusCounts[key as keyof typeof statusCounts] || 0,
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance"
        description="Your attendance record"
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Attendance" },
        ]}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">
              {player.attendanceRate}%
            </p>
            <p className="text-xs text-muted-foreground">Attendance Rate</p>
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
            <CardTitle className="text-base font-semibold">Breakdown</CardTitle>
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
                Recent Records
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {playerRecords.map((record) => {
                const session = mockSessions.find(
                  (s) => s.id === record.sessionId,
                );
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <CalendarCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {session?.groupName || "Session"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {session ? formatDate(session.date) : "—"}
                          {session && (
                            <>
                              <Clock className="ml-1 h-3 w-3" />
                              {formatTime12(session.startTime)}
                            </>
                          )}
                        </div>
                        {record.notes && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {record.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={record.status} type="attendance" />
                  </div>
                );
              })}
              {playerRecords.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  No attendance records yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
