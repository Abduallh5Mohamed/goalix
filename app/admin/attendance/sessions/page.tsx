"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatTime12 } from "@/lib/utils";
import { Clock, FileDown, RefreshCw } from "lucide-react";
import {
  useGetSessionsQuery,
  type AttendanceSession,
} from "@/lib/store/api/adminApi";

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "destructive" | "secondary" | "default"
> = {
  completed: "success",
  active: "warning",
  scheduled: "default",
  cancelled: "destructive",
};

const columns: Column<AttendanceSession>[] = [
  {
    key: "group",
    header: "Group",
    accessor: (row) => (
      <div>
        <p className="font-medium">{row.group_name ?? row.group_id}</p>
        <p className="text-xs text-muted-foreground">
          Coach: {row.coach_name ?? "Unassigned"}
        </p>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.group_name ?? row.group_id,
  },
  {
    key: "date",
    header: "Date",
    accessor: (row) => formatDate(row.session_date),
    sortable: true,
    sortValue: (row) => row.session_date,
  },
  {
    key: "time",
    header: "Time",
    accessor: (row) => (
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span>
          {formatTime12(row.start_time)} - {formatTime12(row.end_time)}
        </span>
      </div>
    ),
  },
  {
    key: "type",
    header: "Type",
    accessor: (row) => (
      <Badge variant="outline" className="capitalize">
        {row.session_type ?? "training"}
      </Badge>
    ),
    sortable: true,
    sortValue: (row) => row.session_type ?? "",
  },
  {
    key: "status",
    header: "Status",
    accessor: (row) => (
      <Badge
        variant={STATUS_VARIANT[row.status] ?? "secondary"}
        className="capitalize"
      >
        {row.status}
      </Badge>
    ),
    sortable: true,
    sortValue: (row) => row.status,
  },
  {
    key: "notes",
    header: "Notes",
    accessor: (row) => (
      <p className="max-w-[200px] truncate text-xs text-muted-foreground">
        {row.notes ?? "No notes"}
      </p>
    ),
  },
];

export default function SessionsPage() {
  const { data, isLoading, isError, refetch } = useGetSessionsQuery({
    limit: 50,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Failed to load sessions.</p>
        <Button variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const sessions = data?.data ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Sessions (${data?.pagination?.total ?? sessions.length})`}
        description="All training sessions with attendance details."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Attendance" },
          { label: "Sessions" },
        ]}
        actions={
          <Button variant="outline" className="gap-1.5">
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        }
      />

      <DataTable
        data={sessions}
        columns={columns}
        searchable
        searchPlaceholder="Search sessions..."
        searchKey={(row) =>
          `${row.group_name ?? ""} ${row.coach_name ?? ""} ${row.status} ${row.session_type ?? ""}`
        }
      />
    </div>
  );
}
