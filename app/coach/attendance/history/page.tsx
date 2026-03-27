"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { mockAttendanceRecords, mockSessions } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function CoachAttendanceHistoryPage() {
  const coachSessions = mockSessions.filter((s) => s.coachId === "c1");
  const coachAttendance = mockAttendanceRecords.filter((r) =>
    coachSessions.some((s) => s.id === r.sessionId)
  );

  const rows = coachAttendance.map((record) => {
    const session = coachSessions.find((s) => s.id === record.sessionId);
    return {
      ...record,
      date: session?.date || "",
      groupName: session?.groupName || "",
      sessionType: session?.type || "",
    };
  });

  const columns = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      accessor: (row: (typeof rows)[0]) => formatDate(row.date),
    },
    {
      key: "groupName",
      header: "Group",
      accessor: (row: (typeof rows)[0]) => row.groupName,
    },
    {
      key: "playerName",
      header: "Player",
      sortable: true,
      accessor: (row: (typeof rows)[0]) => row.playerName,
    },
    {
      key: "status",
      header: "Status",
      accessor: (row: (typeof rows)[0]) => (
        <StatusBadge
          status={row.status}
          type="attendance"
        />
      ),
    },
    {
      key: "notes",
      header: "Notes",
      accessor: (row: (typeof rows)[0]) => (
        <span className="text-xs text-muted-foreground">
          {row.notes || "—"}
        </span>
      ),
    },
  ];

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

      <DataTable
        data={rows}
        columns={columns}
        searchKey={(row) => row.playerName}
        searchPlaceholder="Search players..."
      />
    </div>
  );
}
