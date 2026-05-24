"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useGetCoachAttendanceHistoryQuery,
  type CoachAttendanceRecord,
} from "@/lib/store/api/coachApi";
import { formatDate } from "@/lib/utils";
import { Loader2, RefreshCw } from "lucide-react";

const columns: Column<CoachAttendanceRecord>[] = [
  {
    key: "date",
    header: "Date",
    sortable: true,
    sortValue: (row) => row.session_date ?? row.markedAt,
    accessor: (row) => formatDate(row.session_date ?? row.markedAt),
  },
  {
    key: "groupName",
    header: "Group",
    accessor: (row) => row.group_name ?? "Unassigned",
    sortable: true,
    sortValue: (row) => row.group_name ?? "",
  },
  {
    key: "sessionType",
    header: "Type",
    accessor: (row) => row.session_type ?? "training",
    sortable: true,
    sortValue: (row) => row.session_type ?? "",
  },
  {
    key: "playerName",
    header: "Player",
    sortable: true,
    sortValue: (row) => row.playerName,
    accessor: (row) => row.playerName,
  },
  {
    key: "status",
    header: "Status",
    accessor: (row) => <StatusBadge status={row.status} type="attendance" />,
  },
  {
    key: "notes",
    header: "Notes",
    accessor: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.notes || "No notes"}
      </span>
    ),
  },
];

export default function CoachAttendanceHistoryPage() {
  const { data, isLoading, isError, refetch } =
    useGetCoachAttendanceHistoryQuery({ limit: 100 });
  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance History"
        description="View past attendance records"
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Attendance" },
          { label: "History" },
        ]}
      />

      {isLoading && (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading attendance records...
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center justify-between gap-3 p-4 text-sm text-red-300">
            <span>Could not load attendance history.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && (
        <DataTable
          data={rows}
          columns={columns}
          searchKey={(row) =>
            `${row.playerName} ${row.group_name ?? ""} ${row.status}`
          }
          searchPlaceholder="Search players..."
          emptyTitle="No attendance yet"
          emptyDescription="Marked attendance records will appear here."
        />
      )}
    </div>
  );
}
