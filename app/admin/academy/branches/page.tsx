"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockBranches } from "@/lib/mock-data";
import type { Branch } from "@/lib/types";
import { Plus, MapPin, Users, Layers } from "lucide-react";

const columns: Column<Branch>[] = [
  {
    key: "name",
    header: "Branch Name",
    accessor: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <MapPin className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.address}</p>
        </div>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.name,
  },
  {
    key: "players",
    header: "Players",
    accessor: (row) => (
      <div className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span>
          {row.currentPlayers}/{row.capacity}
        </span>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.currentPlayers,
  },
  {
    key: "coaches",
    header: "Coaches",
    accessor: (row) => row.coachCount,
    sortable: true,
    sortValue: (row) => row.coachCount,
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
    key: "capacity",
    header: "Capacity",
    accessor: (row) => {
      const pct = Math.round((row.currentPlayers / row.capacity) * 100);
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
      );
    },
    sortable: true,
    sortValue: (row) => row.currentPlayers / row.capacity,
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

export default function BranchesPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Branches"
        description="Manage all academy branches and their details."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Academy" },
          { label: "Branches" },
        ]}
        actions={
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Branch
          </Button>
        }
      />

      <DataTable
        data={mockBranches}
        columns={columns}
        searchable
        searchPlaceholder="Search branches..."
        searchKey={(row) => `${row.name} ${row.address}`}
        onRowClick={(row) => router.push(`/admin/academy/branches/${row.id}`)}
      />
    </div>
  );
}
