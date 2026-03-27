"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mockRankings, mockPlayers } from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";
import { TREND_CONFIG } from "@/lib/constants";
import {
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

const trendIcons: Record<string, React.ElementType> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

export default function PlayerRankingPage() {
  const currentPlayer = mockPlayers.find((p) => p.id === "p1")!;
  const groupRankings = mockRankings
    .filter((r) => r.groupId === currentPlayer.groupId)
    .sort((a, b) => a.rank - b.rank);

  const myRanking = groupRankings.find((r) => r.playerId === "p1");
  const medalColors = ["text-yellow-400", "text-gray-400", "text-amber-600"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Ranking"
        description={`Rankings in ${currentPlayer.groupName}`}
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Performance" },
          { label: "Ranking" },
        ]}
      />

      {/* My Position Highlight */}
      {myRanking && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-accent/10">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Rank</p>
                <p className="text-4xl font-bold text-primary">
                  #{myRanking.rank}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{myRanking.score}</p>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
              <div className="text-center">
                {myRanking.previousRank !== myRanking.rank ? (
                  <Badge
                    variant={
                      myRanking.previousRank > myRanking.rank
                        ? "default"
                        : "destructive"
                    }
                    className="text-lg"
                  >
                    {myRanking.previousRank > myRanking.rank
                      ? `↑${myRanking.previousRank - myRanking.rank}`
                      : `↓${myRanking.rank - myRanking.previousRank}`}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-lg">
                    —
                  </Badge>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  vs last week
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 3 */}
      {groupRankings.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {[groupRankings[1], groupRankings[0], groupRankings[2]].map(
            (ranking, idx) => {
              if (!ranking) return null;
              const order = [2, 1, 3];
              const heights = ["h-28", "h-36", "h-24"];
              const isMe = ranking.playerId === "p1";
              return (
                <div
                  key={ranking.id}
                  className={`flex flex-col items-center ${
                    isMe ? "scale-105" : ""
                  }`}
                >
                  <Avatar
                    className={`mb-2 h-12 w-12 border-2 ${
                      isMe ? "border-primary ring-2 ring-primary/30" : "border-border/30"
                    }`}
                  >
                    <AvatarFallback
                      className={`${
                        isMe ? "bg-primary/30 text-primary" : "bg-primary/20 text-primary"
                      }`}
                    >
                      {getInitials(ranking.playerName)}
                    </AvatarFallback>
                  </Avatar>
                  <p
                    className={`mb-1 text-sm font-semibold ${
                      isMe ? "text-primary" : ""
                    }`}
                  >
                    {ranking.playerName}
                    {isMe && " (You)"}
                  </p>
                  <p className="mb-2 text-xl font-bold text-primary">
                    {ranking.score}
                  </p>
                  <div
                    className={`${heights[idx]} flex w-full items-start justify-center rounded-t-lg ${
                      isMe
                        ? "bg-gradient-to-b from-primary/30 to-primary/10"
                        : "bg-gradient-to-b from-primary/20 to-primary/5"
                    } pt-3`}
                  >
                    <div className="flex items-center gap-1">
                      <Medal
                        className={`h-5 w-5 ${medalColors[order[idx] - 1]}`}
                      />
                      <span className="text-lg font-bold">#{order[idx]}</span>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* Full List */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Group Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {groupRankings.map((ranking) => {
            const TrendIcon = trendIcons[ranking.trend] || Minus;
            const trendConfig = TREND_CONFIG[ranking.trend];
            const isMe = ranking.playerId === "p1";

            return (
              <div
                key={ranking.id}
                className={`flex items-center justify-between rounded-lg border p-4 ${
                  isMe
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/30 bg-muted/20"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-bold">
                    {ranking.rank <= 3 ? (
                      <Medal
                        className={`h-5 w-5 ${mediaColors(ranking.rank)}`}
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {ranking.rank}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${isMe ? "text-primary" : ""}`}>
                      {ranking.playerName}
                      {isMe && " (You)"}
                    </p>
                    <div
                      className="flex items-center gap-1 text-xs"
                      style={{ color: trendConfig?.color }}
                    >
                      <TrendIcon className="h-3 w-3" />
                      <span>{trendConfig?.label}</span>
                    </div>
                  </div>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {ranking.score}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function mediaColors(rank: number): string {
  const colors = ["text-yellow-400", "text-gray-400", "text-amber-600"];
  return colors[rank - 1] || "text-muted-foreground";
}
