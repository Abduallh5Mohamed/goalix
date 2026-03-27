"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockBirthYears, mockBranches } from "@/lib/mock-data";
import type { BirthYear } from "@/lib/types";
import { Plus, Calendar, Users, Layers } from "lucide-react";

const columns: Column<BirthYear>[] = [
  {
    key: "year",
    header: "Birth Year",
    accessor: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
          <Calendar className="h-4 w-4 text-accent" />
        </div>
        <span className="text-lg font-bold text-foreground">{row.year}</span>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.year,
  },
  {
    key: "branch",
    header: "Branch",
    accessor: (row) => {
      const branch = mockBranches.find((b) => b.id === row.branchId);
      return (
        <Badge variant="outline">{branch?.name ?? "Unknown"}</Badge>
      );
    },
    sortable: true,
    sortValue: (row) => {
      const branch = mockBranches.find((b) => b.id === row.branchId);
      return branch?.name ?? "";
    },
  },
  {
    key: "groups",
    header: "Groups",
    accessor: (row) => (
      <div className="flex items-center gap-1.5">
        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{row.groupCount}</span>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.groupCount,
  },
  {
    key: "players",
    header: "Players",
    accessor: (row) => (
      <div className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{row.playerCount}</span>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.playerCount,
  },
];

export default function BirthYearsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Birth Years"
        description="Manage age categories across branches."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Academy" },
          { label: "Birth Years" },
        ]}
        actions={
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Birth Year
          </Button>
        }
      />

      <DataTable
        data={mockBirthYears}
        columns={columns}
        searchable
        searchPlaceholder="Search by year..."
        searchKey={(row) => `${row.year}`}
      />
    </div>
  );
}
