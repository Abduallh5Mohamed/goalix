"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockGroups, mockBranches } from "@/lib/mock-data";
import type { Group } from "@/lib/types";
import { Plus, Users, Calendar } from "lucide-react";

const columns: Column<Group>[] = [
  {
    key: "name",
    header: "Group Name",
    accessor: (row) => (
      <div>
        <p className="font-medium text-foreground">{row.name}</p>
        <p className="text-xs text-muted-foreground">{row.schedule}</p>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.name,
  },
  {
    key: "branch",
    header: "Branch",
    accessor: (row) => {
      const branch = mockBranches.find((b) => b.id === row.branchId);
      return <Badge variant="outline">{branch?.name ?? "Unknown"}</Badge>;
    },
    sortable: true,
    sortValue: (row) => {
      const branch = mockBranches.find((b) => b.id === row.branchId);
      return branch?.name ?? "";
    },
  },
  {
    key: "coach",
    header: "Coach",
    accessor: (row) => row.coachName,
    sortable: true,
    sortValue: (row) => row.coachName,
  },
  {
    key: "players",
    header: "Players",
    accessor: (row) => (
      <div className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{row.playerCount}/{row.maxPlayers}</span>
        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(row.playerCount / row.maxPlayers) * 100}%` }}
          />
        </div>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.playerCount,
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

export default function GroupsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Groups"
        description="Manage groups and their assignment to birth years and branches."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Academy" },
          { label: "Groups" },
        ]}
        actions={
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        }
      />

      <DataTable
        data={mockGroups}
        columns={columns}
        searchable
        searchPlaceholder="Search groups..."
        searchKey={(row) => `${row.name} ${row.coachName}`}
      />
    </div>
  );
}
