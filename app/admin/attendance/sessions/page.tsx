"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockSessions } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import type { Session } from "@/lib/types";
import { FileDown, Clock } from "lucide-react";

const typeColors: Record<string, string> = {
  training: "default",
  match: "success",
  assessment: "warning",
};

const columns: Column<Session>[] = [
  {
    key: "group",
    header: "Group",
    accessor: (row) => (
      <div>
        <p className="font-medium">{row.groupName}</p>
        <p className="text-xs text-muted-foreground">Coach: {row.coachName}</p>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.groupName,
  },
  {
    key: "date",
    header: "Date",
    accessor: (row) => formatDate(row.date),
    sortable: true,
    sortValue: (row) => row.date,
  },
  {
    key: "time",
    header: "Time",
    accessor: (row) => (
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{row.startTime} – {row.endTime}</span>
      </div>
    ),
  },
  {
    key: "type",
    header: "Type",
    accessor: (row) => (
      <Badge variant={(typeColors[row.type] as "default" | "success" | "warning") || "default"}>
        {row.type}
      </Badge>
    ),
    sortable: true,
    sortValue: (row) => row.type,
  },
  {
    key: "attendance",
    header: "Attendance",
    accessor: (row) => {
      const pct = row.totalPlayers ? Math.round(((row.attendanceCount ?? 0) / row.totalPlayers) * 100) : 0;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.attendanceCount ?? 0}/{row.totalPlayers ?? 0}</span>
          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
      );
    },
    sortable: true,
    sortValue: (row) => row.attendanceCount ?? 0,
  },
  {
    key: "notes",
    header: "Notes",
    accessor: (row) => (
      <p className="max-w-[200px] truncate text-xs text-muted-foreground">
        {row.notes || "—"}
      </p>
    ),
  },
];

export default function SessionsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Sessions"
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
        data={mockSessions}
        columns={columns}
        searchable
        searchPlaceholder="Search sessions..."
        searchKey={(row) => `${row.groupName} ${row.coachName} ${row.type}`}
      />
    </div>
  );
}
