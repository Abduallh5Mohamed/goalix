"use client";

import { Calendar, CalendarCheck, Clock, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import {
  useGetPlayerAttendanceQuery,
  useGetPlayerProgressQuery,
} from "@/lib/store/api/calendarApi";
import type { PlayerAttendanceRecord } from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

const attendanceLabels: Record<PlayerAttendanceRecord["status"], string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
  injured: "Injured",
};

const countAttendance = (records: PlayerAttendanceRecord[]) =>
  records.reduce(
    (counts, record) => ({
      ...counts,
      [record.status]: counts[record.status] + 1,
    }),
    {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      injured: 0,
    },
  );

const statusVariant = (status: PlayerAttendanceRecord["status"]) => {
  if (["present"].includes(status)) return "success" as const;
  if (["late", "excused"].includes(status)) return "warning" as const;
  if (["absent", "injured"].includes(status)) return "destructive" as const;
  return "secondary" as const;
};

export default function PlayerAttendancePage() {
  const attendanceQuery = useGetPlayerAttendanceQuery();
  const progressQuery = useGetPlayerProgressQuery();
  const records = attendanceQuery.data?.data ?? [];
  const statusCounts = countAttendance(records);
  const chartData = Object.entries(attendanceLabels).map(([key, label]) => ({
    label,
    value: statusCounts[key as PlayerAttendanceRecord["status"]] || 0,
  }));
  const attended = statusCounts.present + statusCounts.late;
  const attendanceRate =
    progressQuery.data?.attendancePercentage ??
    (records.length ? Math.round((attended / records.length) * 100) : 0);
  const isLoading = attendanceQuery.isLoading || progressQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance"
        description="Your live attendance record from training sessions and matches."
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Attendance" },
        ]}
      />

      {isLoading ? (
        <Card className="border-white/10 bg-white/[0.045] shadow-none">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading attendance...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-cyan-200">
                  {Math.round(attendanceRate)}%
                </p>
                <p className="text-xs text-slate-400">Attendance Rate</p>
              </CardContent>
            </Card>
            {Object.entries(attendanceLabels).map(([key, label]) => (
              <Card
                key={key}
                className="border-white/10 bg-white/[0.045] shadow-none"
              >
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-white">
                    {statusCounts[key as PlayerAttendanceRecord["status"]]}
                  </p>
                  <p className="text-xs text-slate-400">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DoughnutChart
                  labels={chartData.map((item) => item.label)}
                  data={chartData.map((item) => item.value)}
                  height={250}
                />
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.045] shadow-none lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Recent Records
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-200">
                        <CalendarCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {record.title || "Session"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <Badge variant="outline">
                            {record.record_type === "match" ? "Match" : "Training"}
                          </Badge>
                          <Calendar className="h-3 w-3" />
                          {record.start_datetime
                            ? formatDate(record.start_datetime)
                            : "Not set"}
                          {record.start_datetime && (
                            <>
                              <Clock className="ml-1 h-3 w-3" />
                              {formatTime12(record.start_datetime)}
                            </>
                          )}
                        </div>
                        {(record.notes || record.reason) && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {record.notes || record.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={statusVariant(record.status)}>
                      {attendanceLabels[record.status] || record.status}
                    </Badge>
                  </div>
                ))}
                {!records.length && (
                  <p className="py-8 text-center text-slate-400">
                    No attendance records yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
