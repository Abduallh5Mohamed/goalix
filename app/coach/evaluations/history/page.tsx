"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { mockEvaluations } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function CoachEvaluationHistoryPage() {
  const myEvaluations = mockEvaluations.filter((e) => e.coachId === "c1");

  const columns = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      accessor: (row: (typeof myEvaluations)[0]) => formatDate(row.date),
    },
    {
      key: "playerName",
      header: "Player",
      sortable: true,
      accessor: (row: (typeof myEvaluations)[0]) => row.playerName,
    },
    {
      key: "technicalScore",
      header: "Technical",
      accessor: (row: (typeof myEvaluations)[0]) => (
        <span className="font-semibold">{row.technicalScore}</span>
      ),
    },
    {
      key: "tacticalScore",
      header: "Tactical",
      accessor: (row: (typeof myEvaluations)[0]) => (
        <span className="font-semibold">{row.tacticalScore}</span>
      ),
    },
    {
      key: "physicalScore",
      header: "Physical",
      accessor: (row: (typeof myEvaluations)[0]) => (
        <span className="font-semibold">{row.physicalScore}</span>
      ),
    },
    {
      key: "mentalScore",
      header: "Mental",
      accessor: (row: (typeof myEvaluations)[0]) => (
        <span className="font-semibold">{row.mentalScore}</span>
      ),
    },
    {
      key: "overallScore",
      header: "Overall",
      sortable: true,
      accessor: (row: (typeof myEvaluations)[0]) => {
        const score = row.overallScore;
        const color =
          score >= 8 ? "text-emerald-400" : score >= 6 ? "text-amber-400" : "text-red-400";
        return <span className={`text-lg font-bold ${color}`}>{score}</span>;
      },
    },
    {
      key: "notes",
      header: "Notes",
      accessor: (row: (typeof myEvaluations)[0]) => (
        <span className="max-w-[200px] truncate text-xs text-muted-foreground">
          {row.notes || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluation History"
        description="Past player evaluations"
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Evaluations" },
          { label: "History" },
        ]}
      />

      <DataTable
        data={myEvaluations}
        columns={columns}
        searchKey={(row) => row.playerName}
        searchPlaceholder="Search players..."
      />
    </div>
  );
}
