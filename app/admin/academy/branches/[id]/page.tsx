"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockBranches, mockGroups, mockCoaches } from "@/lib/mock-data";
import type { Group } from "@/lib/types";
import { Edit, MapPin, Users, Layers, UserCheck, Plus } from "lucide-react";

const groupColumns: Column<Group>[] = [
  {
    key: "name",
    header: "Group",
    accessor: (row) => <span className="font-medium">{row.name}</span>,
    sortable: true,
    sortValue: (row) => row.name,
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
    accessor: (row) => `${row.playerCount}/${row.maxPlayers}`,
    sortable: true,
    sortValue: (row) => row.playerCount,
  },
  {
    key: "schedule",
    header: "Schedule",
    accessor: (row) => (
      <span className="text-xs text-muted-foreground">{row.schedule}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    accessor: (row) => (
      <Badge variant={row.status === "active" ? "success" : "secondary"}>
        {row.status}
      </Badge>
    ),
  },
];

export default function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const branch = mockBranches.find((b) => b.id === id);
  const branchGroups = mockGroups.filter((g) => g.branchId === id);
  const branchCoaches = mockCoaches.filter((c) => c.branchId === id);

  if (!branch) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Branch not found.</p>
      </div>
    );
  }

  const capacityPct = Math.round((branch.currentPlayers / branch.capacity) * 100);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={branch.name}
        description={branch.address}
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Academy" },
          { label: "Branches", href: "/admin/academy/branches" },
          { label: branch.name },
        ]}
        actions={
          <Button variant="outline" className="gap-1.5">
            <Edit className="h-4 w-4" />
            Edit Branch
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Players" value={branch.currentPlayers} icon="Users" />
        <StatsCard label="Capacity" value={`${capacityPct}%`} icon="Layers" />
        <StatsCard label="Coaches" value={branch.coachCount} icon="UserCheck" />
        <StatsCard label="Groups" value={branch.groupCount} icon="Layers" />
      </div>

      {/* Coaches */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Coaches</CardTitle>
          <Badge variant="secondary">{branchCoaches.length} coaches</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {branchCoaches.map((coach) => (
              <div
                key={coach.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/30 cursor-pointer"
                onClick={() => router.push(`/admin/coaches/${coach.id}`)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
                  {coach.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{coach.fullName}</p>
                  <p className="text-xs text-muted-foreground">{coach.specialization}</p>
                </div>
                <Badge variant={coach.status === "active" ? "success" : "secondary"} className="text-[10px]">
                  {coach.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Groups */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Groups</CardTitle>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Group
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={branchGroups}
            columns={groupColumns}
            searchable={false}
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}
