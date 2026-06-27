"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetAttendanceOverviewQuery } from "@/lib/store/api/adminApi";
import Link from "next/link";

export default function AttendanceOverviewPage() {
  const { data, isLoading, isError, refetch } = useGetAttendanceOverviewQuery(
    undefined,
    { refetchOnMountOrArgChange: 30 },
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
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
    avgRate = 0,
    presentCount = 0,
    absentCount = 0,
    lateCount = 0,
    excusedCount = 0,
    injuredCount = 0,
    byGroup = [],
  } = data ?? {};

  const overallRate = Math.round(avgRate);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Attendance Overview"
        description="Live training attendance from the academy database."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Attendance" },
          { label: "Overview" },
        ]}
        actions={
          <Button asChild variant="outline" className="gap-1.5">
            <Link href="/admin/reports/attendance">
              <FileDown className="h-4 w-4" />
              Open Report
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard label="Overall Rate" value={`${overallRate}%`} icon="ClipboardCheck" />
        <StatsCard label="Total Trainings" value={totalTrainings} icon="Calendar" />
        <StatsCard label="Present" value={presentCount} icon="UserCheck" />
        <StatsCard label="Absent" value={absentCount} icon="AlertTriangle" />
        <StatsCard
          label="Late / Excused / Injured"
          value={lateCount + excusedCount + injuredCount}
          icon="Users"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/50 bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Attendance by Group</CardTitle>
          </CardHeader>
          <CardContent>
            {byGroup.length === 0 ? (
              <p className="text-sm text-muted-foreground">No group data available.</p>
            ) : (
              <div className="space-y-3">
                {byGroup.map((group) => (
                  <div key={group.groupId} className="flex items-center gap-3">
                    <span className="w-32 truncate text-sm">{group.groupName}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(0, group.rate))}%`,
                          backgroundColor: group.rate >= 80 ? "#7bea28" : group.rate >= 60 ? "#b6ff00" : "#2d9ad5",
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-medium">{Math.round(group.rate)}%</span>
                  </div>
                ))}
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
              colors={["#7bea28", "#2d9ad5", "#b6ff00", "#2ee8c9", "#fb7185"]}
              height={240}
              centerValue={`${overallRate}%`}
              centerLabel="Rate"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
