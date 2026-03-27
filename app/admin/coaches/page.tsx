"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mockCoaches } from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";
import type { Coach } from "@/lib/types";
import { Plus, Star } from "lucide-react";

const columns: Column<Coach>[] = [
  {
    key: "name",
    header: "Coach",
    accessor: (row) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-accent/20 text-sm text-accent">
            {getInitials(row.fullName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{row.fullName}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.fullName,
  },
  {
    key: "branch",
    header: "Branch",
    accessor: (row) => <Badge variant="outline">{row.branchName}</Badge>,
    sortable: true,
    sortValue: (row) => row.branchName,
  },
  {
    key: "specialization",
    header: "Specialization",
    accessor: (row) => row.specialization,
  },
  {
    key: "groups",
    header: "Groups",
    accessor: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.groupNames.length > 0 ? (
          row.groupNames.map((g) => (
            <Badge key={g} variant="secondary" className="text-[10px]">
              {g}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No groups</span>
        )}
      </div>
    ),
  },
  {
    key: "performance",
    header: "Performance",
    accessor: (row) => (
      <div className="flex items-center gap-1.5">
        <Star className="h-3.5 w-3.5 text-amber-400" />
        <span className="font-semibold">{row.performanceScore}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.performanceScore,
  },
  {
    key: "status",
    header: "Status",
    accessor: (row) => (
      <Badge variant={row.status === "active" ? "success" : "secondary"}>
        {row.status}
      </Badge>
    ),
    sortable: true,
    sortValue: (row) => row.status,
  },
];

export default function CoachesPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Coaches"
        description="Manage all coaches, their assignments, and performance."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Coaches" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => router.push("/admin/coaches/assign")}>
              Assign Coach
            </Button>
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Coach
            </Button>
          </div>
        }
      />

      <DataTable
        data={mockCoaches}
        columns={columns}
        searchable
        searchPlaceholder="Search coaches..."
        searchKey={(row) => `${row.fullName} ${row.email} ${row.specialization}`}
        onRowClick={(row) => router.push(`/admin/coaches/${row.id}`)}
      />
    </div>
  );
}
