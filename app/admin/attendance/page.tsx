"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  Clock3,
  FileDown,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useGetAttendanceOverviewQuery } from "@/lib/store/api/adminApi";
import { formatDateTime } from "@/lib/utils";

const statusColor = (rate: number) => {
  if (rate >= 85) return "bg-emerald-400";
  if (rate >= 70) return "bg-lime-400";
  if (rate >= 50) return "bg-amber-400";
  return "bg-red-400";
};

const statusVariant = (status: string) => {
  if (["finished", "completed"].includes(status)) return "success" as const;
  if (status === "cancelled") return "destructive" as const;
  if (status === "postponed") return "warning" as const;
  return "secondary" as const;
};

const compactNumber = (value: number | undefined) => value ?? 0;

export default function AttendanceOverviewPage() {
  const { data, isLoading, isError, refetch } = useGetAttendanceOverviewQuery(
    undefined,
    { refetchOnMountOrArgChange: 30 },
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Failed to load attendance data.</p>
        <Button variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const {
    totalTrainings = 0,
    totalRecords = 0,
    attendedCount = 0,
    missedCount = 0,
    avgRate = 0,
    presentCount = 0,
    absentCount = 0,
    lateCount = 0,
    excusedCount = 0,
    injuredCount = 0,
    trainingStatusCounts,
    byGroup = [],
    byBranch = [],
    recentSessions = [],
    lowAttendancePlayers = [],
  } = data ?? {};

  const overallRate = Math.round(avgRate);
  const completedTrainings = compactNumber(trainingStatusCounts?.completed);
  const scheduledTrainings = compactNumber(trainingStatusCounts?.scheduled);
  const cancelledTrainings = compactNumber(trainingStatusCounts?.cancelled);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Attendance Overview"
        description="Academy-wide training attendance, sessions, branches, groups, and player follow-up."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Attendance" },
          { label: "Overview" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button asChild variant="outline" className="gap-1.5">
              <Link href="/admin/reports/attendance">
                <FileDown className="h-4 w-4" />
                Open Report
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatsCard label="Overall Rate" value={`${overallRate}%`} icon="ClipboardCheck" />
        <StatsCard label="Training Sessions" value={totalTrainings} icon="Calendar" />
        <StatsCard label="Attendance Records" value={totalRecords} icon="Users" />
        <StatsCard label="Attended" value={attendedCount} icon="UserCheck" />
        <StatsCard label="Missed / Excused" value={missedCount} icon="AlertTriangle" />
        <StatsCard label="Completed / Scheduled" value={`${completedTrainings}/${scheduledTrainings}`} icon="Layers" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <Card className="border-border/50 bg-card xl:col-span-3">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Group Details</CardTitle>
            <Badge variant="outline">{byGroup.length} groups</Badge>
          </CardHeader>
          <CardContent>
            {byGroup.length === 0 ? (
              <p className="text-sm text-muted-foreground">No group attendance records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b border-border/60 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-3 pr-4">Group</th>
                      <th className="py-3 pr-4">Rate</th>
                      <th className="py-3 pr-4">Records</th>
                      <th className="py-3 pr-4">Present</th>
                      <th className="py-3 pr-4">Late</th>
                      <th className="py-3 pr-4">Absent</th>
                      <th className="py-3 pr-4">Excused</th>
                      <th className="py-3">Injured</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {byGroup.map((group) => (
                      <tr key={group.groupId}>
                        <td className="py-3 pr-4 font-medium">{group.groupName}</td>
                        <td className="py-3 pr-4">
                          <div className="flex min-w-40 items-center gap-3">
                            <Progress
                              value={group.rate}
                              indicatorClassName={statusColor(group.rate)}
                              className="h-2"
                            />
                            <span className="w-10 text-right text-xs font-semibold">
                              {Math.round(group.rate)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">{group.total}</td>
                        <td className="py-3 pr-4 text-emerald-300">{group.present ?? 0}</td>
                        <td className="py-3 pr-4 text-lime-300">{group.late ?? 0}</td>
                        <td className="py-3 pr-4 text-red-300">{group.absent ?? 0}</td>
                        <td className="py-3 pr-4 text-cyan-300">{group.excused ?? 0}</td>
                        <td className="py-3 text-rose-300">{group.injured ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DoughnutChart
              labels={["Present", "Absent", "Late", "Excused", "Injured"]}
              data={[
                presentCount,
                absentCount,
                lateCount,
                excusedCount,
                injuredCount,
              ]}
              colors={["#7bea28", "#fb7185", "#b6ff00", "#2ee8c9", "#f43f5e"]}
              height={260}
              centerValue={`${overallRate}%`}
              centerLabel="Rate"
            />
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <Badge variant="success">Completed {completedTrainings}</Badge>
              <Badge variant="secondary">Scheduled {scheduledTrainings}</Badge>
              <Badge variant="destructive">Cancelled {cancelledTrainings}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Branch Details</CardTitle>
            <MapPin className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {byBranch.length === 0 ? (
              <p className="text-sm text-muted-foreground">No branch attendance records yet.</p>
            ) : (
              <div className="space-y-4">
                {byBranch.map((branch) => (
                  <div key={branch.branchId} className="rounded-lg border border-border/50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{branch.branchName}</p>
                        <p className="text-xs text-muted-foreground">
                          {branch.attended}/{branch.total} attended
                        </p>
                      </div>
                      <Badge variant={branch.rate >= 80 ? "success" : branch.rate >= 60 ? "warning" : "destructive"}>
                        {branch.rate}%
                      </Badge>
                    </div>
                    <Progress value={branch.rate} indicatorClassName={statusColor(branch.rate)} />
                    <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
                      <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-300">P {branch.present}</span>
                      <span className="rounded-md bg-lime-500/10 px-2 py-1 text-lime-300">L {branch.late}</span>
                      <span className="rounded-md bg-red-500/10 px-2 py-1 text-red-300">A {branch.absent}</span>
                      <span className="rounded-md bg-cyan-500/10 px-2 py-1 text-cyan-300">E {branch.excused}</span>
                      <span className="rounded-md bg-rose-500/10 px-2 py-1 text-rose-300">I {branch.injured}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Players To Follow Up</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-300" />
          </CardHeader>
          <CardContent>
            {lowAttendancePlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No player attendance records yet.</p>
            ) : (
              <div className="space-y-3">
                {lowAttendancePlayers.map((player) => (
                  <div
                    key={`${player.playerId}-${player.groupId}`}
                    className="flex flex-col gap-3 rounded-lg border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{player.playerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {player.branchName} · {player.groupName}
                        {player.position ? ` · ${player.position}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last session {player.lastSessionAt ? formatDateTime(player.lastSessionAt) : "--"}
                      </p>
                    </div>
                    <div className="min-w-36 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>{player.attended}/{player.total}</span>
                        <span className="font-semibold">{player.rate}%</span>
                      </div>
                      <Progress value={player.rate} indicatorClassName={statusColor(player.rate)} />
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>Absent {player.absent}</span>
                        <span>Injured {player.injured}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Training Sessions</CardTitle>
          <CalendarCheck className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent training sessions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-sm">
                <thead className="border-b border-border/60 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4">Session</th>
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Coach</th>
                    <th className="py-3 pr-4">Groups</th>
                    <th className="py-3 pr-4">Focus</th>
                    <th className="py-3 pr-4">Rate</th>
                    <th className="py-3 pr-4">Recorded</th>
                    <th className="py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentSessions.map((session) => (
                    <tr key={session.id}>
                      <td className="py-3 pr-4">
                        <div className="font-medium">{session.title}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {session.location || "No location"}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDateTime(session.startDatetime)}
                        </div>
                      </td>
                      <td className="py-3 pr-4">{session.coachName || "--"}</td>
                      <td className="max-w-56 truncate py-3 pr-4">{session.groupNames || "--"}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1.5">
                          {session.trainingFocus && <Badge variant="outline">{session.trainingFocus}</Badge>}
                          {session.intensityLevel && <Badge variant="secondary">{session.intensityLevel}</Badge>}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={session.rate >= 80 ? "success" : session.rate >= 60 ? "warning" : "destructive"}>
                          {session.rate}%
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {session.attendedCount}/{session.recordedCount}
                        <span className="ml-2 text-xs text-muted-foreground">
                          A {session.absentCount} · I {session.injuredCount}
                        </span>
                      </td>
                      <td className="py-3">
                        <Badge variant={statusVariant(session.status)}>{session.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
