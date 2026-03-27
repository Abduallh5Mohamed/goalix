"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart } from "@/components/charts/LineChart";
import { mockPlayers } from "@/lib/mock-data";
import { TREND_CONFIG } from "@/lib/constants";
import { FileDown, TrendingUp, TrendingDown, Minus } from "lucide-react";

const trendIcons: Record<string, React.ElementType> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

export default function PlayerProgressReportPage() {
  const improving = mockPlayers.filter((p) => p.trend === "improving").length;
  const stable = mockPlayers.filter((p) => p.trend === "stable").length;
  const declining = mockPlayers.filter((p) => p.trend === "declining").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Player Progress Report"
        description="Track player development and performance trends."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Reports" },
          { label: "Player Progress" },
        ]}
        actions={
          <Button variant="outline" className="gap-1.5">
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <TrendingUp className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-emerald-400">{improving}</p>
              <p className="text-sm text-muted-foreground">Improving</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <Minus className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-amber-400">{stable}</p>
              <p className="text-sm text-muted-foreground">Stable</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <TrendingDown className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-red-400">{declining}</p>
              <p className="text-sm text-muted-foreground">Declining</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Avg Performance Score Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            labels={["Sep", "Oct", "Nov", "Dec", "Jan"]}
            datasets={[
              {
                label: "Avg Score",
                data: [72, 75, 78, 80, 82],
                borderColor: "#22d3ee",
                backgroundColor: "rgba(34,211,238,0.1)",
                fill: true,
              },
            ]}
            height={300}
          />
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-base">All Players</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockPlayers.map((player) => {
              const cfg = TREND_CONFIG[player.trend];
              const TrendIcon = trendIcons[player.trend];
              return (
                <div key={player.id} className="flex items-center gap-4 rounded-lg border border-border/50 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{player.fullName}</p>
                    <p className="text-xs text-muted-foreground">{player.groupName}</p>
                  </div>
                  <Badge variant={player.level === "A" ? "success" : player.level === "B" ? "warning" : "destructive"}>
                    {player.level}
                  </Badge>
                  <div className="w-16 text-center">
                    <p className="font-bold">{player.performanceScore}</p>
                  </div>
                  <div className="flex items-center gap-1.5 w-24" style={{ color: cfg.color }}>
                    <TrendIcon className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{cfg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
