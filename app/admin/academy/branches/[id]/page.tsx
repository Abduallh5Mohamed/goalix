"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { StatsCard } from "@/components/shared/StatsCard";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useGetBranchByIdQuery,
  useGetGroupsQuery,
  type Group,
} from "@/lib/store/api/adminApi";
import { Edit, Plus } from "lucide-react";

const groupColumns: Column<Group>[] = [
  { key: "name", header: "Group", accessor: (row) => <span className="font-medium">{row.name}</span>, sortable: true, sortValue: (row) => row.name },
  { key: "birthYear", header: "Birth Year", accessor: (row) => row.birth_year ?? "No birth year", sortable: true, sortValue: (row) => row.birth_year ?? 0 },
  { key: "players", header: "Max Players", accessor: (row) => row.max_players ?? "\u2014", sortable: true, sortValue: (row) => row.max_players ?? 0 },
  { key: "status", header: "Status", accessor: (row) => <Badge variant={row.is_active ? "success" : "secondary"}>{row.is_active ? "active" : "inactive"}</Badge> },
];

export default function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: branch, isLoading, error } = useGetBranchByIdQuery(id);
  const { data: groups } = useGetGroupsQuery({ branchId: id });

  if (isLoading) return <LoadingSkeleton />;
  if (error || !branch) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Branch not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={branch.name}
        description={branch.address ?? ""}
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
        <StatsCard label="Capacity" value={branch.capacity ?? "\u2014"} icon="Layers" />
        <StatsCard label="Groups" value={groups?.length ?? 0} icon="Layers" />
        <StatsCard label="Status" value={branch.is_active ? "Active" : "Inactive"} icon="UserCheck" />
        <StatsCard label="City" value={branch.city ?? "\u2014"} icon="MapPin" />
      </div>
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Groups</CardTitle>
          <Button size="sm" className="gap-1.5" onClick={() => router.push("/admin/academy/groups")}>
            <Plus className="h-3.5 w-3.5" />
            Add Group
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable data={groups ?? []} columns={groupColumns} searchable={false} pageSize={10} />
        </CardContent>
      </Card>
    </div>
  );
}
