"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetPlayersQuery } from "@/lib/store/api/adminApi";
import { FileDown } from "lucide-react";

export default function PlayerProgressReportPage() {
  const { data: res, isLoading } = useGetPlayersQuery({ limit: 100 });
  const players = res?.data ?? [];

  if (isLoading) return <LoadingSkeleton />;

  const levelCounts = {
    A: players.filter((p) => p.level === "A").length,
    B: players.filter((p) => p.level === "B").length,
    C: players.filter((p) => p.level === "C").length,
    D: players.filter((p) => p.level === "D").length,
    F: players.filter((p) => p.level === "F").length,
  };

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div>
              <p className="text-2xl font-bold text-emerald-400">{levelCounts.A}</p>
              <p className="text-sm text-muted-foreground">Level A</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div>
              <p className="text-2xl font-bold text-amber-400">{levelCounts.B}</p>
              <p className="text-sm text-muted-foreground">Level B</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div>
              <p className="text-2xl font-bold text-amber-400">{levelCounts.C}</p>
              <p className="text-sm text-muted-foreground">Level C</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div>
              <p className="text-2xl font-bold text-orange-400">{levelCounts.D}</p>
              <p className="text-sm text-muted-foreground">Level D</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div>
              <p className="text-2xl font-bold text-red-400">{levelCounts.F}</p>
              <p className="text-sm text-muted-foreground">Level F</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-base">All Players ({players.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {players.map((player) => (
              <div key={player.id} className="flex items-center gap-4 rounded-lg border border-border/50 p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{player.full_name}</p>
                  <p className="text-xs text-muted-foreground">{player.position ?? "No position"}</p>
                </div>
                <Badge variant={player.level === "A" ? "success" : player.level === "B" || player.level === "C" ? "warning" : "destructive"}>
                  {player.level ?? "\u2014"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
