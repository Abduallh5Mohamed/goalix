"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockRankings, mockGroups } from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";
import { TREND_CONFIG } from "@/lib/constants";
import { Trophy, TrendingUp, TrendingDown, Minus, Medal } from "lucide-react";
import { useState } from "react";

const trendIcons: Record<string, React.ElementType> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

export default function WeeklyRankingsPage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState("all");

  const rankings =
    selectedGroup === "all"
      ? mockRankings
      : mockRankings.filter((r) => r.groupId === selectedGroup);

  const sorted = [...rankings].sort((a, b) => a.rank - b.rank);

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
              {mockGroups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="space-y-3">
        {sorted.map((ranking, idx) => {
          const trendCfg = TREND_CONFIG[ranking.trend];
          const TrendIcon = trendIcons[ranking.trend];
          const isTop3 = ranking.rank <= 3;
          const medalColor =
            ranking.rank === 1 ? "text-amber-400" :
            ranking.rank === 2 ? "text-gray-300" :
            ranking.rank === 3 ? "text-amber-600" : "";

          return (
            <Card
              key={ranking.id}
              className={`border-border/50 bg-card cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg ${isTop3 ? "hover:shadow-primary/5" : ""}`}
              onClick={() => router.push(`/admin/players/${ranking.playerId}`)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center">
                  {isTop3 ? (
                    <Medal className={`h-6 w-6 ${medalColor}`} />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">#{ranking.rank}</span>
                  )}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-sm text-primary">
                    {getInitials(ranking.playerName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{ranking.playerName}</p>
                  <p className="text-xs text-muted-foreground">{ranking.groupName}</p>
                </div>
                <div className="flex items-center gap-1.5" style={{ color: trendCfg.color }}>
                  <TrendIcon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{trendCfg.label}</span>
                </div>
                {ranking.previousRank !== ranking.rank && (
                  <Badge
                    variant={ranking.rank < ranking.previousRank ? "success" : "destructive"}
                    className="text-[10px]"
                  >
                    {ranking.rank < ranking.previousRank ? "↑" : "↓"}{Math.abs(ranking.rank - ranking.previousRank)}
                  </Badge>
                )}
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{ranking.score}</p>
                  <p className="text-[10px] text-muted-foreground">points</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
