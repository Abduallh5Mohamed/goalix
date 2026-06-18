"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/charts/BarChart";
import { Button } from "@/components/ui/button";
import {
  useGetAttendanceOverviewQuery,
  useGetBranchesQuery,
} from "@/lib/store/api/adminApi";
import { FileDown } from "lucide-react";

export default function AttendanceReportPage() {
  const { data: overview, isLoading } = useGetAttendanceOverviewQuery();
  const { data: branches } = useGetBranchesQuery();

  if (isLoading) return <LoadingSkeleton />;

  const totalRecords = (overview?.presentCount ?? 0) + (overview?.absentCount ?? 0) + (overview?.lateCount ?? 0) + (overview?.excusedCount ?? 0);
  const overallRate = totalRecords > 0 ? Math.round(((overview?.presentCount ?? 0) / totalRecords) * 100) : 0;

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
        <StatsCard label="Overall Rate" value={`${overallRate}%`} icon="ClipboardCheck" />
        <StatsCard label="Total Sessions" value={overview?.totalSessions ?? 0} icon="Layers" />
        <StatsCard label="Present" value={overview?.presentCount ?? 0} icon="UserCheck" />
        <StatsCard label="Absent" value={overview?.absentCount ?? 0} icon="Users" />
      </div>
      {overview?.byGroup && overview.byGroup.length > 0 && (
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Attendance by Group</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              labels={overview.byGroup.map((g) => g.groupName)}
              datasets={[
                {
                  label: "Attendance %",
                  data: overview.byGroup.map((g) => g.rate),
                  backgroundColor: "#51b848",
                },
              ]}
              height={280}
            />
          </CardContent>
        </Card>
      )}
      {branches && branches.length > 0 && (
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Branches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {branches.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <span className="font-medium text-sm">{b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.city ?? ""}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
