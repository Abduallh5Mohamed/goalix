"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart } from "@/components/charts/BarChart";
import { getInitials } from "@/lib/utils";
import { CalendarDays, Goal, Medal, RefreshCw, Shield, User } from "lucide-react";
import {
  useGetAdminRankingSystemInputsQuery,
  useGetGroupsQuery,
} from "@/lib/store/api/adminApi";
import {
  buildMonthlyRankingRows,
  latestRankingMonthKey,
  numberValue,
  rankingMonthRange,
  rankingWeeksInMonthLabel,
  type MonthlyRankingRow,
} from "@/lib/rankings/monthlyRanking";

type RoleKey = Exclude<MonthlyRankingRow["roleFamily"], "unknown">;

const roleCards: Array<{
  role: RoleKey;
  title: string;
  icon: typeof Goal;
  className: string;
}> = [
  { role: "attack", title: "Best Attack", icon: Goal, className: "border-rose-400/35 bg-rose-500/10 text-rose-100" },
  { role: "midfield", title: "Best Midfield", icon: Medal, className: "border-cyan-400/35 bg-cyan-500/10 text-cyan-100" },
  { role: "defense", title: "Best Defense", icon: Shield, className: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100" },
  { role: "goalkeeper", title: "Best Goalkeeper", icon: User, className: "border-amber-400/35 bg-amber-500/10 text-amber-100" },
];

const formatScore = (value: unknown) => {
  const numeric = numberValue(value);
  if (numeric === null) return "-";
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
};

export default function MonthlyRankingsPage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState("all");

  const { data, isLoading, isError, refetch } = useGetAdminRankingSystemInputsQuery(
    selectedGroup !== "all" ? { groupId: selectedGroup, limit: 100 } : { limit: 100 }
  );
  const { data: groups } = useGetGroupsQuery({});

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Failed to load rankings.</p>
        <Button variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const rows = data?.data ?? [];
  const latestMonth = latestRankingMonthKey(rows);
  const sorted = buildMonthlyRankingRows(rows, latestMonth);
  const monthRange = rankingMonthRange(latestMonth);
  const monthlyWeekStarts = [...new Set(sorted.flatMap((row) => row.weekStarts))].sort();
  const monthlyWeeksLabel = monthlyWeekStarts.length
    ? rankingWeeksInMonthLabel(monthlyWeekStarts, latestMonth)
    : "No completed weeks";
  const top10 = sorted.slice(0, 10);
  const roleLeader = (role: RoleKey) => sorted.find((row) => row.roleFamily === role);
  const medalColor = (rank: number) =>
    rank === 1 ? "text-amber-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "";

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Monthly Rankings"
        description="Monthly ranking from each player's completed weekly Ranking System scores in the selected month."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Rankings" },
          { label: "Monthly" },
        ]}
        actions={
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {(groups ?? []).map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Card className="border-border/50 bg-card">
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Month
            </p>
            <p className="mt-2 text-2xl font-black">{monthRange.label}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Period</p>
            <p className="mt-2 font-semibold">
              {monthRange.start ? `${monthRange.start} to ${monthRange.end}` : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Weeks counted</p>
            <p className="mt-2 text-sm font-semibold">{monthlyWeeksLabel}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {roleCards.map((config) => {
          const leader = roleLeader(config.role);
          const Icon = config.icon;
          return (
            <Card key={config.role} className={`border ${config.className}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{config.title}</p>
                    <p className="mt-1 text-xs text-current/75">Monthly role leader</p>
                  </div>
                  <span className="rounded-md bg-black/15 p-2">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                {leader ? (
                  <div className="mt-4">
                    <p className="truncate font-semibold">{leader.playerName}</p>
                    <p className="text-xs text-current/75">
                      #{leader.rank} - {formatScore(leader.score)} pts - {rankingWeeksInMonthLabel(leader.weekStarts, leader.month)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-current/75">No player data yet.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {top10.length > 0 && (
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">
              Top 10 Players - {monthRange.label} weekly average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              labels={top10.map((ranking) => ranking.playerName)}
              datasets={[
                {
                  label: "Score",
                  data: top10.map((ranking) => ranking.score ?? 0),
                  backgroundColor: top10.map((_, i) =>
                    i === 0 ? "#b6ff00" : i === 1 ? "#7bea28" : i === 2 ? "#2ee8c9" : "#2d9ad5"
                  ),
                },
              ]}
              height={300}
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {sorted.map((ranking) => (
          <div
            key={ranking.id}
            className="flex cursor-pointer items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-lg"
            onClick={() => router.push(`/admin/players/${ranking.playerId}`)}
          >
            <div className="flex h-10 w-10 items-center justify-center">
              {ranking.rank <= 3 ? (
                <Medal className={`h-6 w-6 ${medalColor(ranking.rank)}`} />
              ) : (
                <span className="text-lg font-bold text-muted-foreground">#{ranking.rank}</span>
              )}
            </div>
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-accent/20 text-sm text-accent">
                {getInitials(ranking.playerName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{ranking.playerName}</p>
              <p className="text-xs text-muted-foreground">
                {[ranking.position, ranking.roleFamily, rankingWeeksInMonthLabel(ranking.weekStarts, ranking.month)].filter(Boolean).join(" - ")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatScore(ranking.score)}</p>
              <p className="text-[10px] text-muted-foreground">pts</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
