"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
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
import { getInitials } from "@/lib/utils";
import { Medal, RefreshCw, Trophy } from "lucide-react";
import {
  useGetAdminRankingSystemInputsQuery,
  useGetGroupsQuery,
} from "@/lib/store/api/adminApi";
import type { RankingSystemInput } from "@/lib/store/api/calendarApi";

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

const rankValue = (row: RankingSystemInput) =>
  row.final_api_response?.rank ?? row.rank;

const sortByModelRank = (rows: RankingSystemInput[]) =>
  [...rows].sort((a, b) => {
    const rankDiff = rankValue(a) - rankValue(b);
    if (rankDiff) return rankDiff;
    const scoreDiff = (scoreValue(b) ?? -1) - (scoreValue(a) ?? -1);
    if (scoreDiff) return scoreDiff;
    return String(a.player_name || "").localeCompare(String(b.player_name || ""));
  });

const formatScore = (value: unknown) => {
  const numeric = numberValue(value);
  if (numeric === null) return "-";
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
};

export default function WeeklyRankingsPage() {
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

  const rows = data?.data ?? [];
  const latestWeek = rows
    .map((row) => String(row.week_start || ""))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))[0];
  const rankings = sortByModelRank(rows.filter((row) => row.week_start === latestWeek));
  const medalColor = (rank: number) =>
    rank === 1 ? "text-amber-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "";

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Weekly Rankings"
        description="Latest weekly Ranking System output, using the same model order shown to coaches."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Rankings" },
          { label: "Weekly" },
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

      {rankings.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="text-center">
            <Trophy className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>No rankings available yet.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rankings.map((ranking) => (
            <Card
              key={ranking.id}
              className="cursor-pointer border-border/50 bg-card transition-all hover:border-primary/30 hover:shadow-lg"
              onClick={() => router.push(`/admin/players/${ranking.player_id}`)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center">
                  {rankValue(ranking) <= 3 ? (
                    <Medal className={`h-6 w-6 ${medalColor(rankValue(ranking))}`} />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">#{rankValue(ranking)}</span>
                  )}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-sm text-primary">
                    {getInitials(ranking.player_name || "Player")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{ranking.player_name || "Player"}</p>
                  <p className="text-xs text-muted-foreground">
                    {[ranking.position, ranking.role_family, latestWeek].filter(Boolean).join(" - ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{formatScore(scoreValue(ranking))}</p>
                  <p className="text-[10px] text-muted-foreground">points</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
