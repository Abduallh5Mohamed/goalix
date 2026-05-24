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
import { useGetGroupsQuery, useGetWeeklyRankingsQuery } from "@/lib/store/api/adminApi";

export default function WeeklyRankingsPage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState("all");

  const { data, isLoading, isError, refetch } = useGetWeeklyRankingsQuery(
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

  const rankings = [...(data?.data ?? [])].sort((a, b) => a.rank - b.rank);
  const medalColor = (rank: number) =>
    rank === 1 ? "text-amber-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "";

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Weekly Rankings"
        description="Current week leaderboard by group."
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
                  {ranking.rank <= 3 ? (
                    <Medal className={`h-6 w-6 ${medalColor(ranking.rank)}`} />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">#{ranking.rank}</span>
                  )}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-sm text-primary">
                    {getInitials(ranking.player_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{ranking.player_name}</p>
                  <p className="text-xs text-muted-foreground">{ranking.group_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{parseFloat(ranking.total_score).toFixed(1)}</p>
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
