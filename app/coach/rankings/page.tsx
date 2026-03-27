"use client";

import { useState } from "react";
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
import { mockGroups, mockPlayers, mockRankings } from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";
import { TREND_CONFIG } from "@/lib/constants";
import { Trophy, TrendingUp, TrendingDown, Minus, Medal } from "lucide-react";

const trendIcons: Record<string, React.ElementType> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

export default function CoachRankingsPage() {
  const myGroups = mockGroups.filter((g) => ["g1", "g3"].includes(g.id));
  const [selectedGroup, setSelectedGroup] = useState(myGroups[0]?.id || "");

  const groupRankings = mockRankings
    .filter((r) => r.groupId === selectedGroup)
    .sort((a, b) => a.rank - b.rank);

  const medalColors = ["text-yellow-400", "text-gray-400", "text-amber-600"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Group Rankings"
        description="Player rankings in your groups"
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Rankings" },
        ]}
      />

      {/* Group Selector */}
      <div className="w-64">
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger>
            <SelectValue placeholder="Select group" />
          </SelectTrigger>
          <SelectContent>
            {myGroups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Top 3 Podium */}
      {groupRankings.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {[groupRankings[1], groupRankings[0], groupRankings[2]].map(
            (ranking, idx) => {
              if (!ranking) return null;
              const order = [2, 1, 3];
              const heights = ["h-32", "h-40", "h-28"];
              const player = mockPlayers.find(
                (p) => p.id === ranking.playerId
              );
              return (
                <div
                  key={ranking.id}
                  className="flex flex-col items-center"
                >
                  <Avatar className="mb-2 h-14 w-14 border-2 border-primary/30">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {getInitials(ranking.playerName)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="mb-1 text-sm font-semibold">
                    {ranking.playerName}
                  </p>
                  <p className="mb-2 text-2xl font-bold text-primary">
                    {ranking.score}
                  </p>
                  <div
                    className={`${heights[idx]} flex w-full items-start justify-center rounded-t-lg bg-gradient-to-b from-primary/20 to-primary/5 pt-3`}
                  >
                    <div className="flex items-center gap-1">
                      <Medal className={`h-5 w-5 ${medalColors[order[idx] - 1]}`} />
                      <span className="text-lg font-bold">#{order[idx]}</span>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* Full Ranking List */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Full Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {groupRankings.map((ranking) => {
            const TrendIcon = trendIcons[ranking.trend] || Minus;
            const trendConfig = TREND_CONFIG[ranking.trend];
            const rankChange = ranking.previousRank - ranking.rank;

            return (
              <div
                key={ranking.id}
                className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-bold">
                    {ranking.rank <= 3 ? (
                      <Medal
                        className={`h-5 w-5 ${
                          medalColors[ranking.rank - 1] || "text-muted-foreground"
                        }`}
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {ranking.rank}
                      </span>
                    )}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/20 text-sm text-primary">
                      {getInitials(ranking.playerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{ranking.playerName}</p>
                    <div
                      className="flex items-center gap-1 text-xs"
                      style={{ color: trendConfig?.color }}
                    >
                      <TrendIcon className="h-3 w-3" />
                      <span>{trendConfig?.label}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {rankChange !== 0 && (
                    <Badge
                      variant={rankChange > 0 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {rankChange > 0 ? `↑${rankChange}` : `↓${Math.abs(rankChange)}`}
                    </Badge>
                  )}
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {ranking.score}
                    </p>
                    <p className="text-[10px] text-muted-foreground">points</p>
                  </div>
                </div>
              </div>
            );
          })}
          {groupRankings.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              No rankings available for this group
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
