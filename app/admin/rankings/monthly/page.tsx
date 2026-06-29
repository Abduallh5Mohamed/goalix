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
import { Medal, RefreshCw } from "lucide-react";
import {
  useGetAdminRankingSystemInputsQuery,
  useGetGroupsQuery,
} from "@/lib/store/api/adminApi";
import type { RankingSystemInput } from "@/lib/store/api/calendarApi";

type MonthlyRankingRow = {
  id: string;
  playerId: string;
  playerName: string;
  position: string | null;
  roleFamily: RankingSystemInput["role_family"];
  score: number | null;
  rank: number;
  weekCount: number;
};

const numberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const scoreValue = (row: RankingSystemInput) =>
  numberValue(row.final_api_response?.weekly_score ?? row.weekly_score);

const monthKey = (value: string | null | undefined) =>
  String(value || "").slice(0, 7);

const average = (values: Array<number | null>) => {
  const numeric = values.filter((value): value is number => value !== null);
  if (!numeric.length) return null;
  return Number(
    (numeric.reduce((sum, value) => sum + value, 0) / numeric.length).toFixed(2),
  );
};

const buildLatestMonthlyRows = (rows: RankingSystemInput[]): MonthlyRankingRow[] => {
  const latestMonth = rows
    .map((row) => monthKey(row.week_start))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))[0];
  const monthRows = rows.filter((row) => monthKey(row.week_start) === latestMonth);
  const byPlayer = new Map<string, RankingSystemInput[]>();
  monthRows.forEach((row) => {
    if (!byPlayer.has(row.player_id)) byPlayer.set(row.player_id, []);
    byPlayer.get(row.player_id)?.push(row);
  });

  const displayRows = [...byPlayer.entries()].map(([playerId, playerRows]) => {
    const latest = playerRows
      .slice()
      .sort((a, b) => String(b.week_start || "").localeCompare(String(a.week_start || "")))[0];
    return {
      id: `${latestMonth}:${playerId}`,
      playerId,
      playerName: latest?.player_name || "Player",
      position: latest?.position || null,
      roleFamily: latest?.role_family || "unknown",
      score: average(playerRows.map(scoreValue)),
      rank: 0,
      weekCount: new Set(playerRows.map((row) => row.week_start)).size,
    };
  });

  return displayRows
    .sort((a, b) => {
      const scoreDiff = (b.score ?? -1) - (a.score ?? -1);
      if (scoreDiff) return scoreDiff;
      return a.playerName.localeCompare(b.playerName);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
};

const formatScore = (value: unknown) => {
  const numeric = numberValue(value);
  if (numeric === null) return "-";
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
};

export default function MonthlyRankingsPage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState("all");

  const { data, isLoading, isError, refetch } = useGetAdminRankingSystemInputsQuery(
    selectedGroup !== "all" ? { groupId: selectedGroup, limit: 500 } : { limit: 500 }
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

  const sorted = buildLatestMonthlyRows(data?.data ?? []);
  const top10 = sorted.slice(0, 10);
  const medalColor = (rank: number) =>
    rank === 1 ? "text-amber-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "";

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Monthly Rankings"
        description="Monthly overview from the same Ranking System output used by coaches."
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

      {top10.length > 0 && (
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Top 10 Players - Score Comparison</CardTitle>
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
                {[ranking.position, ranking.roleFamily, `${ranking.weekCount} weeks`].filter(Boolean).join(" - ")}
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
