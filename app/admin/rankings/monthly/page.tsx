"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart } from "@/components/charts/BarChart";
import { mockRankings, mockGroups } from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";
import { TREND_CONFIG } from "@/lib/constants";
import { TrendingUp, TrendingDown, Minus, Medal, ArrowUpRight, ArrowDownRight } from "lucide-react";

const trendIcons: Record<string, React.ElementType> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

export default function MonthlyRankingsPage() {
  const router = useRouter();
  const sorted = [...mockRankings].sort((a, b) => b.score - a.score);
  const top10 = sorted.slice(0, 10);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Monthly Rankings"
        description="Monthly rankings with trend analysis across all groups."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Rankings" },
          { label: "Monthly" },
        ]}
      />

      {/* Top Bar Chart */}
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Top 10 Players – Score Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            labels={top10.map((r) => r.playerName)}
            datasets={[
              {
                label: "Score",
                data: top10.map((r) => r.score),
                backgroundColor: top10.map((_, i) =>
                  i === 0 ? "#fbbf24" : i === 1 ? "#9ca3af" : i === 2 ? "#d97706" : "#22d3ee"
                ),
              },
            ]}
            height={300}
          />
        </CardContent>
      </Card>

      {/* Ranking Table */}
      <div className="space-y-3">
        {sorted.map((ranking) => {
          const trendCfg = TREND_CONFIG[ranking.trend];
          const TrendIcon = trendIcons[ranking.trend];
          const rankChange = ranking.previousRank - ranking.rank;

          return (
            <div
              key={ranking.id}
              className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-lg cursor-pointer"
              onClick={() => router.push(`/admin/players/${ranking.playerId}`)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <span className="text-lg font-bold text-primary">#{ranking.rank}</span>
              </div>
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-accent/20 text-sm text-accent">
                  {getInitials(ranking.playerName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{ranking.playerName}</p>
                <p className="text-xs text-muted-foreground">{ranking.groupName}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5" style={{ color: trendCfg.color }}>
                  <TrendIcon className="h-4 w-4" />
                  <span className="text-xs">{trendCfg.label}</span>
                </div>
                {rankChange !== 0 && (
                  <div className={`flex items-center gap-0.5 text-xs ${rankChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {rankChange > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {Math.abs(rankChange)}
                  </div>
                )}
                <div className="w-20 text-right">
                  <p className="text-lg font-bold">{ranking.score}</p>
                  <p className="text-[10px] text-muted-foreground">pts</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
