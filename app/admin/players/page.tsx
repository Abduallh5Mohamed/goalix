"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mockPlayers } from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";
import type { Player } from "@/lib/types";
import { TREND_CONFIG } from "@/lib/constants";
import { Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";

const trendIcons: Record<string, React.ElementType> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

const columns: Column<Player>[] = [
  {
    key: "name",
    header: "Player",
    accessor: (row) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/20 text-sm text-primary">
            {getInitials(row.fullName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{row.fullName}</p>
          <p className="text-xs text-muted-foreground">{row.position} · Age {row.age}</p>
        </div>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.fullName,
  },
  {
    key: "branch",
    header: "Branch / Group",
    accessor: (row) => (
      <div>
        <p className="text-sm">{row.branchName}</p>
        <p className="text-xs text-muted-foreground">{row.groupName}</p>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.branchName,
  },
  {
    key: "level",
    header: "Level",
    accessor: (row) => (
      <Badge
        variant={row.level === "A" ? "success" : row.level === "B" ? "warning" : "destructive"}
      >
        Level {row.level}
      </Badge>
    ),
    sortable: true,
    sortValue: (row) => row.level,
  },
  {
    key: "attendance",
    header: "Attendance",
    accessor: (row) => (
      <div className="flex items-center gap-2">
        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${row.attendanceRate}%`,
              backgroundColor: row.attendanceRate >= 90 ? "#3ddc84" : row.attendanceRate >= 75 ? "#f59e0b" : "#ef4444",
            }}
          />
        </div>
        <span className="text-xs font-medium">{row.attendanceRate}%</span>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.attendanceRate,
  },
  {
    key: "score",
    header: "Score",
    accessor: (row) => (
      <span className="font-semibold">{row.performanceScore}</span>
    ),
    sortable: true,
    sortValue: (row) => row.performanceScore,
  },
  {
    key: "trend",
    header: "Trend",
    accessor: (row) => {
      const cfg = TREND_CONFIG[row.trend];
      const Icon = trendIcons[row.trend];
      return (
        <div className="flex items-center gap-1.5" style={{ color: cfg.color }}>
          <Icon className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{cfg.label}</span>
        </div>
      );
    },
    sortable: true,
    sortValue: (row) => row.trend,
  },
  {
    key: "status",
    header: "Status",
    accessor: (row) => (
      <Badge
        variant={
          row.status === "active" ? "success" : row.status === "injured" ? "destructive" : "secondary"
        }
      >
        {row.status}
      </Badge>
    ),
    sortable: true,
    sortValue: (row) => row.status,
  },
];

export default function PlayersPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Players"
        description="View and manage all registered players."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Players" },
        ]}
        actions={
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Player
          </Button>
        }
      />

      <DataTable
        data={mockPlayers}
        columns={columns}
        searchable
        searchPlaceholder="Search players..."
        searchKey={(row) => `${row.fullName} ${row.groupName} ${row.branchName} ${row.position}`}
        onRowClick={(row) => router.push(`/admin/players/${row.id}`)}
      />
    </div>
  );
}
