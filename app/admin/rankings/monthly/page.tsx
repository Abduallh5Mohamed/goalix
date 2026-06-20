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
import { useGetGroupsQuery, useGetMonthlyRankingsQuery } from "@/lib/store/api/adminApi";

export default function MonthlyRankingsPage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState("all");

  const { data, isLoading, isError, refetch } = useGetMonthlyRankingsQuery(
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

  const sorted = [...(data?.data ?? [])].sort((a, b) => a.rank - b.rank);
  const top10 = sorted.slice(0, 10);
  const medalColor = (rank: number) =>
    rank === 1 ? "text-amber-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "";

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Monthly Rankings"
        description="Monthly rankings with score comparison across all groups."
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
              labels={top10.map((ranking) => ranking.player_name)}
              datasets={[
                {
                  label: "Score",
                  data: top10.map((ranking) => parseFloat(ranking.total_score)),
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
            onClick={() => router.push(`/admin/players/${ranking.player_id}`)}
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
                {getInitials(ranking.player_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{ranking.player_name}</p>
              <p className="text-xs text-muted-foreground">{ranking.group_name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{parseFloat(ranking.total_score).toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">pts</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
