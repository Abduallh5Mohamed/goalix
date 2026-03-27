"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  mockGroups,
  mockPlayers,
  mockEvaluations,
  mockRankings,
} from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";
import { PLAYER_LEVELS, TREND_CONFIG } from "@/lib/constants";
import {
  ClipboardCheck,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const trendIcons: Record<string, React.ElementType> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

export default function CoachGroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const group = mockGroups.find((g) => g.id === groupId);
  const players = mockPlayers
    .filter((p) => p.groupId === groupId)
    .sort((a, b) => a.rankInGroup - b.rankInGroup);

  if (!group) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Group not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={group.name}
        description={group.schedule}
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "My Groups", href: "/coach/my-groups" },
          { label: group.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href="/coach/attendance/mark">
              <Button size="sm">
                <ClipboardCheck className="mr-1 h-4 w-4" />
                Mark Attendance
              </Button>
            </Link>
            <Link href="/coach/evaluations/new">
              <Button size="sm" variant="outline">
                <Star className="mr-1 h-4 w-4" />
                Evaluate
              </Button>
            </Link>
          </div>
        }
      />

      {/* Group Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{players.length}</p>
            <p className="text-xs text-muted-foreground">Total Players</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {players.length > 0
                ? Math.round(
                    players.reduce((a, p) => a + p.attendanceRate, 0) /
                      players.length
                  )
                : 0}
              %
            </p>
            <p className="text-xs text-muted-foreground">Avg Attendance</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-accent">
              {players.length > 0
                ? (
                    players.reduce((a, p) => a + p.performanceScore, 0) /
                    players.length
                  ).toFixed(1)
                : 0}
            </p>
            <p className="text-xs text-muted-foreground">Avg Performance</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">
              {players.filter((p) => p.level === "A").length}
            </p>
            <p className="text-xs text-muted-foreground">Level A Players</p>
          </CardContent>
        </Card>
      </div>

      {/* Player Roster */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Player Roster
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {players.map((player) => {
              const TrendIcon = trendIcons[player.trend] || Minus;
              const trendConfig = TREND_CONFIG[player.trend];
              const levelConfig =
                PLAYER_LEVELS[player.level as keyof typeof PLAYER_LEVELS];

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                      #{player.rankInGroup}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/20 text-sm text-primary">
                        {getInitials(player.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{player.fullName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{player.position}</span>
                        <span>·</span>
                        <span>Age {player.age}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Level */}
                    <Badge
                      variant="outline"
                      className={`border-${levelConfig?.color}-500/30 text-${levelConfig?.color}-400`}
                    >
                      {levelConfig?.label}
                    </Badge>

                    {/* Attendance */}
                    <div className="hidden w-32 items-center gap-2 md:flex">
                      <Progress
                        value={player.attendanceRate}
                        className="h-2"
                      />
                      <span className="text-xs text-muted-foreground">
                        {player.attendanceRate}%
                      </span>
                    </div>

                    {/* Performance */}
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {player.performanceScore}
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
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
