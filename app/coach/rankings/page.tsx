"use client";

import { useMemo, useState } from "react";
import type { ElementType } from "react";
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
import { Button } from "@/components/ui/button";
import {
  useGetCoachGroupQuery,
  useGetCoachGroupsQuery,
  type CoachPlayer,
} from "@/lib/store/api/coachApi";
import { getInitials } from "@/lib/utils";
import { TREND_CONFIG } from "@/lib/constants";
import {
  Loader2,
  Medal,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";

const trendIcons: Record<string, ElementType> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

type RankedPlayer = CoachPlayer & { displayRank: number };

export default function CoachRankingsPage() {
  const { data: groups = [], isLoading: loadingGroups, isError: groupsError, refetch } =
    useGetCoachGroupsQuery();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const selectedGroup = selectedGroupId || groups[0]?.id || "";
  const { data: groupDetail, isFetching: loadingPlayers } = useGetCoachGroupQuery(
    selectedGroup,
    { skip: !selectedGroup }
  );

  const rankedPlayers = useMemo<RankedPlayer[]>(() => {
    const players = groupDetail?.players ?? [];
    return [...players]
      .sort(
        (a, b) =>
          (a.rankInGroup || Number.MAX_SAFE_INTEGER) -
            (b.rankInGroup || Number.MAX_SAFE_INTEGER) ||
          b.performanceScore - a.performanceScore ||
          a.fullName.localeCompare(b.fullName)
      )
      .map((player, index) => ({
        ...player,
        displayRank: player.rankInGroup || index + 1,
      }));
  }, [groupDetail?.players]);

  const medalColors = ["text-yellow-400", "text-gray-400", "text-amber-600"];
  const podiumOrder = [rankedPlayers[1], rankedPlayers[0], rankedPlayers[2]];

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

      {groupsError && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center justify-between gap-3 p-4 text-sm text-red-300">
            <span>Could not load your groups.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="w-full sm:w-64">
        <Select
          value={selectedGroup}
          onValueChange={setSelectedGroupId}
          disabled={loadingGroups || groups.length === 0}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={loadingGroups ? "Loading groups..." : "Select group"}
            />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadingGroups || loadingPlayers ? (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading rankings...
          </CardContent>
        </Card>
      ) : null}

      {!loadingGroups && groups.length === 0 && (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            No groups assigned yet.
          </CardContent>
        </Card>
      )}

      {rankedPlayers.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {podiumOrder.map((player, idx) => {
            if (!player) return null;
            const heights = ["h-32", "h-40", "h-28"];
            return (
              <div key={player.id} className="flex flex-col items-center">
                <Avatar className="mb-2 h-14 w-14 border-2 border-primary/30">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {getInitials(player.fullName)}
                  </AvatarFallback>
                </Avatar>
                <p className="mb-1 max-w-full truncate text-sm font-semibold">
                  {player.fullName}
                </p>
                <p className="mb-2 text-2xl font-bold text-primary">
                  {player.performanceScore}
                </p>
                <div
                  className={`${heights[idx]} flex w-full items-start justify-center rounded-t-lg bg-primary/10 pt-3`}
                >
                  <div className="flex items-center gap-1">
                    <Medal
                      className={`h-5 w-5 ${
                        medalColors[player.displayRank - 1] || "text-muted-foreground"
                      }`}
                    />
                    <span className="text-lg font-bold">#{player.displayRank}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Full Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rankedPlayers.map((player) => {
            const TrendIcon = trendIcons[player.trend] || Minus;
            const trendConfig = TREND_CONFIG[player.trend];

            return (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-4"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold">
                    {player.displayRank <= 3 ? (
                      <Medal
                        className={`h-5 w-5 ${
                          medalColors[player.displayRank - 1] ||
                          "text-muted-foreground"
                        }`}
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {player.displayRank}
                      </span>
                    )}
                  </div>
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/20 text-sm text-primary">
                      {getInitials(player.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{player.fullName}</p>
                    <div
                      className="flex items-center gap-1 text-xs"
                      style={{ color: trendConfig?.color }}
                    >
                      <TrendIcon className="h-3 w-3" />
                      <span>{trendConfig?.label ?? player.trend}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="hidden text-xs sm:inline-flex">
                    {player.position}
                  </Badge>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {player.performanceScore}
                    </p>
                    <p className="text-[10px] text-muted-foreground">points</p>
                  </div>
                </div>
              </div>
            );
          })}
          {!loadingPlayers && rankedPlayers.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">
              <Trophy className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p>No rankings available for this group</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
