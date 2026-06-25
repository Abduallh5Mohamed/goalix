"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import {
  Loader2,
  Medal,
  Minus,
  RefreshCw,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  type RankingSystemInput,
  useGetCoachRankingSystemInputsQuery,
} from "@/lib/store/api/calendarApi";
import { cn, formatDate, getInitials } from "@/lib/utils";

const roleLabels: Record<RankingSystemInput["role_family"], string> = {
  attack: "Attack",
  midfield: "Midfield",
  defense: "Defense",
  goalkeeper: "Goalkeeper",
  unknown: "Unknown",
};

const roleTone: Record<RankingSystemInput["role_family"], string> = {
  attack: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  midfield: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
  defense: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  goalkeeper: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  unknown: "border-slate-400/30 bg-slate-500/10 text-slate-200",
};

const gradeTone: Record<RankingSystemInput["grade"], string> = {
  A: "border-emerald-400/40 bg-emerald-500/20 text-emerald-100",
  B: "border-cyan-400/40 bg-cyan-500/20 text-cyan-100",
  C: "border-amber-400/45 bg-amber-500/20 text-amber-100",
  D: "border-orange-400/45 bg-orange-500/20 text-orange-100",
  F: "border-red-400/45 bg-red-500/20 text-red-100",
};

const trendIcons: Record<RankingSystemInput["trend"], ElementType> = {
  New: Trophy,
  Improving: TrendingUp,
  Declining: TrendingDown,
  Stable: Minus,
};

const trendTone: Record<RankingSystemInput["trend"], string> = {
  New: "text-cyan-300",
  Improving: "text-emerald-300",
  Declining: "text-red-300",
  Stable: "text-amber-300",
};

const leaderCards: Array<{
  key: "overall" | "attack" | "defense" | "goalkeeper";
  title: string;
  subtitle: string;
  icon: ElementType;
  tone: string;
}> = [
  {
    key: "overall",
    title: "Overall #1",
    subtitle: "Best player across all roles",
    icon: Trophy,
    tone: "from-yellow-500/20 to-cyan-500/10 text-yellow-200",
  },
  {
    key: "attack",
    title: "Top Attacker",
    subtitle: "Ranked among attackers only",
    icon: Target,
    tone: "from-rose-500/20 to-orange-500/10 text-rose-200",
  },
  {
    key: "defense",
    title: "Top Defender",
    subtitle: "Ranked among defenders only",
    icon: Shield,
    tone: "from-emerald-500/20 to-lime-500/10 text-emerald-200",
  },
  {
    key: "goalkeeper",
    title: "Top Goalkeeper",
    subtitle: "Ranked among goalkeepers only",
    icon: User,
    tone: "from-amber-500/20 to-cyan-500/10 text-amber-200",
  },
];

type RoleFamily = RankingSystemInput["role_family"];
type RoleTopKey = Exclude<RoleFamily, "unknown">;
type RankingDisplayRow = {
  id: string;
  playerId: string;
  playerName: string;
  position: string | null;
  roleFamily: RoleFamily;
  score: number | null;
  predicted: number | null;
  grade: RankingSystemInput["grade"];
  trend: RankingSystemInput["trend"];
  rank: number;
  weekCount: number;
};
type PeriodSummary = {
  key: string;
  label: string;
  subLabel: string;
  rows: RankingDisplayRow[];
  roleTop: Record<RoleTopKey, RankingDisplayRow[]>;
  weekCount: number;
};

const roleTopCards: Array<{
  role: RoleTopKey;
  title: string;
  icon: ElementType;
}> = [
  { role: "attack", title: "Top Attackers", icon: Target },
  { role: "midfield", title: "Top Midfielders", icon: Medal },
  { role: "defense", title: "Top Defenders", icon: Shield },
  { role: "goalkeeper", title: "Top Goalkeepers", icon: User },
];

const numberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const scoreValue = (row: RankingSystemInput) =>
  numberValue(row.final_api_response?.weekly_score ?? row.weekly_score);

const predictedValue = (row: RankingSystemInput) =>
  numberValue(
    row.final_api_response?.predicted_next_score ?? row.predicted_next_score,
  );

const gradeValue = (row: RankingSystemInput) =>
  row.final_api_response?.grade ?? row.grade;

const rankValue = (row: RankingSystemInput) =>
  row.final_api_response?.rank ?? row.rank;

const formatScore = (value: unknown) => {
  const numeric = numberValue(value);
  if (numeric === null) return "-";
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
};

const average = (values: Array<number | null>) => {
  const numeric = values.filter((value): value is number => value !== null);
  if (!numeric.length) return null;
  return Number(
    (numeric.reduce((sum, value) => sum + value, 0) / numeric.length).toFixed(2),
  );
};

const gradeForScore = (score: number | null): RankingSystemInput["grade"] => {
  const value = score ?? 0;
  if (value >= 90) return "A";
  if (value >= 80) return "B";
  if (value >= 70) return "C";
  if (value >= 60) return "D";
  return "F";
};

const sortByModelRank = (rows: RankingSystemInput[]) =>
  [...rows].sort((a, b) => {
    const rankDiff = rankValue(a) - rankValue(b);
    if (rankDiff) return rankDiff;
    const scoreDiff = (scoreValue(b) ?? -1) - (scoreValue(a) ?? -1);
    if (scoreDiff) return scoreDiff;
    return String(a.player_name || "").localeCompare(String(b.player_name || ""));
  });

const sortDisplayRows = (rows: RankingDisplayRow[]) =>
  [...rows].sort((a, b) => {
    const rankDiff = a.rank - b.rank;
    if (rankDiff) return rankDiff;
    const scoreDiff = (b.score ?? -1) - (a.score ?? -1);
    if (scoreDiff) return scoreDiff;
    return a.playerName.localeCompare(b.playerName);
  });

const toDisplayRow = (row: RankingSystemInput): RankingDisplayRow => ({
  id: row.id,
  playerId: row.player_id,
  playerName: row.player_name || "Player",
  position: row.position || null,
  roleFamily: row.role_family,
  score: scoreValue(row),
  predicted: predictedValue(row),
  grade: gradeValue(row),
  trend: row.final_api_response?.trend ?? row.trend,
  rank: rankValue(row),
  weekCount: 1,
});

const roleTopFromRows = (
  rows: RankingDisplayRow[],
): Record<RoleTopKey, RankingDisplayRow[]> => ({
  attack: sortDisplayRows(rows.filter((row) => row.roleFamily === "attack")).slice(
    0,
    3,
  ),
  midfield: sortDisplayRows(
    rows.filter((row) => row.roleFamily === "midfield"),
  ).slice(0, 3),
  defense: sortDisplayRows(rows.filter((row) => row.roleFamily === "defense")).slice(
    0,
    3,
  ),
  goalkeeper: sortDisplayRows(
    rows.filter((row) => row.roleFamily === "goalkeeper"),
  ).slice(0, 3),
});

const monthKey = (value: string | null | undefined) =>
  String(value || "").slice(0, 7);

const monthLabel = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key || "Unknown month";
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

const currentWeekStartKey = () => {
  const now = new Date();
  const utcDate = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - day + 1);
  return dateKey(utcDate);
};

const buildWeeklyHistory = (rows: RankingSystemInput[]): PeriodSummary[] => {
  const byWeek = new Map<string, RankingSystemInput[]>();
  rows.forEach((row) => {
    const key = String(row.week_start || "");
    if (!key) return;
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)?.push(row);
  });

  return [...byWeek.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, weekRows]) => {
      const rankedRows = sortDisplayRows(weekRows.map(toDisplayRow));
      const weekEnd = weekRows[0]?.week_end;
      return {
        key,
        label: `Week of ${formatDate(key)}`,
        subLabel: `${formatDate(key)} to ${formatDate(weekEnd)}`,
        rows: rankedRows,
        roleTop: roleTopFromRows(rankedRows),
        weekCount: 1,
      };
    });
};

const buildMonthlyHistory = (rows: RankingSystemInput[]): PeriodSummary[] => {
  const byMonth = new Map<string, RankingSystemInput[]>();
  rows.forEach((row) => {
    const key = monthKey(row.week_start);
    if (!key) return;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)?.push(row);
  });

  return [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, monthRows]) => {
      const byPlayer = new Map<string, RankingSystemInput[]>();
      monthRows.forEach((row) => {
        if (!byPlayer.has(row.player_id)) byPlayer.set(row.player_id, []);
        byPlayer.get(row.player_id)?.push(row);
      });

      const displayRows = [...byPlayer.entries()].map(([playerId, playerRows]) => {
        const latest = playerRows
          .slice()
          .sort((a, b) =>
            String(b.week_start || "").localeCompare(String(a.week_start || "")),
          )[0];
        const score = average(playerRows.map(scoreValue));
        const predicted = average(playerRows.map(predictedValue));
        const weekCount = new Set(playerRows.map((row) => row.week_start)).size;

        return {
          id: `${key}:${playerId}`,
          playerId,
          playerName: latest?.player_name || "Player",
          position: latest?.position || null,
          roleFamily: latest?.role_family || "unknown",
          score,
          predicted,
          grade: gradeForScore(score),
          trend: latest?.trend || "Stable",
          rank: 0,
          weekCount,
        };
      });

      const rankedRows = displayRows
        .sort((a, b) => {
          const scoreDiff = (b.score ?? -1) - (a.score ?? -1);
          if (scoreDiff) return scoreDiff;
          return a.playerName.localeCompare(b.playerName);
        })
        .map((row, index) => ({ ...row, rank: index + 1 }));
      const weekCount = new Set(monthRows.map((row) => row.week_start)).size;

      return {
        key,
        label: monthLabel(key),
        subLabel: `${weekCount} week${weekCount === 1 ? "" : "s"} aggregated by average score`,
        rows: rankedRows,
        roleTop: roleTopFromRows(rankedRows),
        weekCount,
      };
    });
};

function GradeBadge({ grade }: { grade: RankingSystemInput["grade"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "min-w-8 justify-center rounded-md px-2 font-mono font-bold",
        gradeTone[grade],
      )}
    >
      {grade}
    </Badge>
  );
}

function LeaderCard({
  title,
  subtitle,
  player,
  categoryRank,
  poolSize,
  icon: Icon,
  tone,
}: {
  title: string;
  subtitle: string;
  player?: RankingSystemInput;
  categoryRank?: number;
  poolSize?: number;
  icon: ElementType;
  tone: string;
}) {
  return (
    <Card className="overflow-hidden border-border/50 bg-card">
      <CardContent className="p-0">
        <div className={cn("bg-gradient-to-br p-4", tone)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs text-current/75">{subtitle}</p>
            </div>
            <span className="rounded-md bg-black/15 p-2">
              <Icon className="h-5 w-5" />
            </span>
          </div>
        </div>
        <div className="p-4">
          {player ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-primary/30">
                  <AvatarFallback className="bg-primary/15 text-primary">
                    {getInitials(player.player_name || "Player")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {player.player_name || "Player"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn("rounded-md", roleTone[player.role_family])}
                    >
                      {roleLabels[player.role_family]}
                    </Badge>
                    {player.position && (
                      <Badge variant="secondary" className="rounded-md">
                        {player.position}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/35 p-3">
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className="mt-1 font-mono text-xl font-bold text-primary">
                    {formatScore(scoreValue(player))}
                  </p>
                </div>
                <div className="rounded-md bg-muted/35 p-3">
                  <p className="text-xs text-muted-foreground">Rank</p>
                  <p className="mt-1 font-mono text-xl font-bold">
                    #{categoryRank ?? rankValue(player)}
                  </p>
                </div>
                <div className="rounded-md bg-muted/35 p-3">
                  <p className="text-xs text-muted-foreground">Grade</p>
                  <div className="mt-1 flex justify-center">
                    <GradeBadge grade={gradeValue(player)} />
                  </div>
                </div>
              </div>
              {poolSize !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Ranked against {poolSize} player{poolSize === 1 ? "" : "s"} in
                  this pool.
                </p>
              )}
            </div>
          ) : (
            <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border/50 text-sm text-muted-foreground">
              No model output for this role yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PodiumPlayer({
  player,
  place,
  title,
  orderClass,
  heightClass,
  cardTone,
  baseTone,
}: {
  player?: RankingSystemInput;
  place: 1 | 2 | 3;
  title: string;
  orderClass: string;
  heightClass: string;
  cardTone: string;
  baseTone: string;
}) {
  const Icon = place === 1 ? Trophy : Medal;

  return (
    <div className={cn("flex min-w-0 flex-col gap-3", orderClass)}>
      {player ? (
        <div
          className={cn(
            "rounded-lg border p-4 shadow-sm shadow-black/10",
            cardTone,
          )}
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 shrink-0 border border-white/15">
              <AvatarFallback className="bg-background/65 font-semibold text-primary">
                {getInitials(player.player_name || "Player")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">
                {player.player_name || "Player"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn("rounded-md", roleTone[player.role_family])}
                >
                  {roleLabels[player.role_family]}
                </Badge>
                {player.position && (
                  <Badge variant="secondary" className="rounded-md">
                    {player.position}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-background/35 p-2">
              <p className="text-[11px] text-muted-foreground">Score</p>
              <p className="mt-1 font-mono text-lg font-bold text-primary">
                {formatScore(scoreValue(player))}
              </p>
            </div>
            <div className="rounded-md bg-background/35 p-2">
              <p className="text-[11px] text-muted-foreground">Rank</p>
              <p className="mt-1 font-mono text-lg font-bold">#{rankValue(player)}</p>
            </div>
            <div className="rounded-md bg-background/35 p-2">
              <p className="text-[11px] text-muted-foreground">Grade</p>
              <div className="mt-1 flex justify-center">
                <GradeBadge grade={gradeValue(player)} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[152px] items-center justify-center rounded-lg border border-dashed border-border/50 text-sm text-muted-foreground">
          No player yet
        </div>
      )}

      <div
        className={cn(
          "flex flex-col items-center justify-end rounded-t-lg border px-4 pb-5 text-center",
          heightClass,
          baseTone,
        )}
      >
        <Icon className="mb-2 h-6 w-6" />
        <p className="font-mono text-4xl font-black leading-none">#{place}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-normal">
          {title}
        </p>
      </div>
    </div>
  );
}

function WinnerPodium({ players }: { players: RankingSystemInput[] }) {
  if (!players.length) return null;

  return (
    <Card className="overflow-hidden border-border/50 bg-card">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Trophy className="h-4 w-4 text-yellow-300" />
              Winner Podium
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Top 3 overall players from the selected weekly Ranking System output.
            </p>
          </div>
          <Badge variant="outline" className="w-fit rounded-md">
            Overall top 3
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid gap-4 md:grid-cols-[1fr_1.15fr_1fr] md:items-end">
          <PodiumPlayer
            player={players[1]}
            place={2}
            title="Second"
            orderClass="order-2 md:order-1"
            heightClass="h-28 md:h-36"
            cardTone="border-slate-300/25 bg-gradient-to-b from-slate-300/15 via-cyan-500/10 to-background/20"
            baseTone="border-slate-300/30 bg-slate-400/10 text-slate-100"
          />
          <PodiumPlayer
            player={players[0]}
            place={1}
            title="Winner"
            orderClass="order-1 md:order-2"
            heightClass="h-36 md:h-48"
            cardTone="border-yellow-400/35 bg-gradient-to-b from-yellow-400/25 via-amber-500/15 to-background/20"
            baseTone="border-yellow-400/40 bg-yellow-500/15 text-yellow-100"
          />
          <PodiumPlayer
            player={players[2]}
            place={3}
            title="Third"
            orderClass="order-3"
            heightClass="h-24 md:h-32"
            cardTone="border-orange-400/30 bg-gradient-to-b from-orange-500/20 via-amber-700/10 to-background/20"
            baseTone="border-orange-400/35 bg-orange-500/12 text-orange-100"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CompactRankRow({
  row,
  rankLabel,
  showWeeks = false,
}: {
  row: RankingDisplayRow;
  rankLabel?: string;
  showWeeks?: boolean;
}) {
  const TrendIcon = trendIcons[row.trend] || Minus;

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border/30 bg-muted/20 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background font-mono text-sm font-bold">
          {rankLabel ?? `#${row.rank}`}
        </div>
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-primary/15 text-xs text-primary">
            {getInitials(row.playerName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.playerName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn("rounded-md text-[11px]", roleTone[row.roleFamily])}
            >
              {roleLabels[row.roleFamily]}
            </Badge>
            {row.position && (
              <Badge variant="secondary" className="rounded-md text-[11px]">
                {row.position}
              </Badge>
            )}
            {showWeeks && (
              <span className="text-[11px] text-muted-foreground">
                {row.weekCount} wk{row.weekCount === 1 ? "" : "s"}
              </span>
            )}
            <span className={cn("inline-flex items-center gap-1 text-[11px]", trendTone[row.trend])}>
              <TrendIcon className="h-3 w-3" />
              {row.trend}
            </span>
          </div>
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-[72px_42px] items-center gap-2 text-right">
        <div>
          <p className="text-[11px] text-muted-foreground">Score</p>
          <p className="font-mono text-sm font-bold text-primary">
            {formatScore(row.score)}
          </p>
        </div>
        <div className="flex justify-end">
          <GradeBadge grade={row.grade} />
        </div>
      </div>
    </div>
  );
}

function RoleTopThreeSection({ rows }: { rows: RankingDisplayRow[] }) {
  const roleTop = roleTopFromRows(rows);

  return (
    <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      {roleTopCards.map(({ role, title, icon: Icon }) => {
        const players = roleTop[role];
        return (
          <Card key={role} className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold">
                <span>{title}</span>
                <span className={cn("rounded-md border p-2", roleTone[role])}>
                  <Icon className="h-4 w-4" />
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {players.map((player, index) => (
                <CompactRankRow
                  key={player.id}
                  row={player}
                  rankLabel={`#${index + 1}`}
                />
              ))}
              {!players.length && (
                <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border/50 text-sm text-muted-foreground">
                  No players in this role yet.
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

function PeriodHistoryCard({
  summary,
  mode,
}: {
  summary: PeriodSummary;
  mode: "weekly" | "monthly";
}) {
  const topOverall = summary.rows.slice(0, 3);
  const showWeeks = mode === "monthly";

  return (
    <div className="rounded-lg border border-border/40 bg-muted/15 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold">{summary.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{summary.subLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="info" className="rounded-md">
            {summary.rows.length} player{summary.rows.length === 1 ? "" : "s"}
          </Badge>
          {mode === "monthly" && (
            <Badge variant="outline" className="rounded-md">
              {summary.weekCount} week{summary.weekCount === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Overall Top 3
          </p>
          <div className="space-y-2">
            {topOverall.map((row) => (
              <CompactRankRow
                key={row.id}
                row={row}
                showWeeks={showWeeks}
              />
            ))}
            {!topOverall.length && (
              <div className="rounded-md border border-dashed border-border/50 p-4 text-center text-sm text-muted-foreground">
                No ranking rows for this period.
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Role Leaders
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {roleTopCards.map(({ role, title }) => {
              const leader = summary.roleTop[role][0];
              return leader ? (
                <div
                  key={role}
                  className="rounded-md border border-border/30 bg-background/35 p-3"
                >
                  <p className="text-xs text-muted-foreground">{title}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {leader.playerName}
                    </p>
                    <p className="font-mono text-sm font-bold text-primary">
                      {formatScore(leader.score)}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  key={role}
                  className="rounded-md border border-dashed border-border/40 p-3 text-xs text-muted-foreground"
                >
                  No {roleLabels[role].toLowerCase()} data
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Full Ranking
        </p>
        <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {summary.rows.map((row) => (
            <CompactRankRow
              key={row.id}
              row={row}
              showWeeks={showWeeks}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RankingHistory({
  weekly,
  monthly,
}: {
  weekly: PeriodSummary[];
  monthly: PeriodSummary[];
}) {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Ranking History</CardTitle>
        <p className="text-xs text-muted-foreground">
          Weekly records plus monthly aggregates from the Ranking System output.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weekly" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto bg-muted/30 sm:w-fit">
            <TabsTrigger value="weekly">Weekly ({weekly.length})</TabsTrigger>
            <TabsTrigger value="monthly">Monthly ({monthly.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="weekly" className="mt-0 space-y-3">
            {weekly.map((summary) => (
              <PeriodHistoryCard
                key={summary.key}
                summary={summary}
                mode="weekly"
              />
            ))}
            {!weekly.length && (
              <div className="py-10 text-center text-muted-foreground">
                No weekly ranking history is available yet.
              </div>
            )}
          </TabsContent>
          <TabsContent value="monthly" className="mt-0 space-y-3">
            {monthly.map((summary) => (
              <PeriodHistoryCard
                key={summary.key}
                summary={summary}
                mode="monthly"
              />
            ))}
            {!monthly.length && (
              <div className="py-10 text-center text-muted-foreground">
                No monthly ranking history is available yet.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function CoachRankingsPage() {
  const { data, isLoading, isError, refetch } =
    useGetCoachRankingSystemInputsQuery({ limit: 500 });

  const rows = useMemo(() => data?.data ?? [], [data?.data]);
  const weeklyHistory = useMemo(() => buildWeeklyHistory(rows), [rows]);
  const monthlyHistory = useMemo(() => buildMonthlyHistory(rows), [rows]);
  const [selectedWeek, setSelectedWeek] = useState("");
  const currentWeek = useMemo(() => currentWeekStartKey(), []);
  const defaultWeek =
    weeklyHistory.find((summary) => summary.key < currentWeek)?.key ??
    weeklyHistory[0]?.key ??
    "";
  const effectiveWeek = selectedWeek || defaultWeek;
  const selectedWeekSummary =
    weeklyHistory.find((summary) => summary.key === effectiveWeek) ??
    weeklyHistory[0];
  const selectedRows = useMemo(
    () =>
      selectedWeekSummary
        ? rows.filter((row) => row.week_start === selectedWeekSummary.key)
        : [],
    [rows, selectedWeekSummary],
  );
  const modelRows = useMemo(() => sortByModelRank(selectedRows), [selectedRows]);
  const podiumPlayers = useMemo(() => modelRows.slice(0, 3), [modelRows]);
  const selectedDisplayRows = useMemo(
    () => modelRows.map(toDisplayRow),
    [modelRows],
  );

  useEffect(() => {
    if (!defaultWeek) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (selectedWeek) setSelectedWeek("");
      return;
    }

    if (!selectedWeek || !weeklyHistory.some((summary) => summary.key === selectedWeek)) {
      setSelectedWeek(defaultWeek);
    }
  }, [defaultWeek, selectedWeek, weeklyHistory]);

  const leaders = useMemo(() => {
    const byRole = (role: RankingSystemInput["role_family"]) =>
      sortByModelRank(modelRows.filter((row) => row.role_family === role));

    const attack = byRole("attack");
    const defense = byRole("defense");
    const goalkeeper = byRole("goalkeeper");

    return {
      overall: modelRows[0],
      attack: attack[0],
      defense: defense[0],
      goalkeeper: goalkeeper[0],
      poolSizes: {
        overall: modelRows.length,
        attack: attack.length,
        defense: defense.length,
        goalkeeper: goalkeeper.length,
      },
    };
  }, [modelRows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rankings"
        description="Latest weekly rankings from the Ranking System model output."
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Rankings" },
        ]}
        actions={
          <Button variant="outline" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {isError && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="flex items-center justify-between gap-3 p-4 text-sm text-destructive">
            <span>Could not load Ranking System output.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading model rankings...
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border/50 bg-card">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Selected Week</p>
                <p className="text-xs text-muted-foreground">
                  {selectedWeekSummary
                    ? selectedWeekSummary.subLabel
                    : "No weekly model output yet"}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {weeklyHistory.length > 0 && (
                  <Select value={effectiveWeek} onValueChange={setSelectedWeek}>
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue placeholder="Choose week" />
                    </SelectTrigger>
                    <SelectContent>
                      {weeklyHistory.map((summary) => (
                        <SelectItem key={summary.key} value={summary.key}>
                          {summary.label} - {summary.rows.length} players
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Badge variant="info" className="w-fit rounded-md">
                  {modelRows.length} player{modelRows.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <WinnerPodium players={podiumPlayers} />

          <RoleTopThreeSection rows={selectedDisplayRows} />

          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {leaderCards.map((card) => {
              const player = leaders[card.key];
              const poolSize = leaders.poolSizes[card.key];
              return (
                <LeaderCard
                  key={card.key}
                  title={card.title}
                  subtitle={card.subtitle}
                  player={player}
                  categoryRank={player ? 1 : undefined}
                  poolSize={poolSize}
                  icon={card.icon}
                  tone={card.tone}
                />
              );
            })}
          </section>

          <RankingHistory weekly={weeklyHistory} monthly={monthlyHistory} />

          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Full Model Ranking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {modelRows.map((row) => {
                const TrendIcon = trendIcons[row.trend] || Minus;
                return (
                  <div
                    key={row.id}
                    className="flex flex-col gap-4 rounded-lg border border-border/30 bg-muted/20 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold">
                        {rankValue(row) <= 3 ? (
                          <Medal className="h-5 w-5 text-yellow-400" />
                        ) : (
                          <span className="text-muted-foreground">
                            {rankValue(row)}
                          </span>
                        )}
                      </div>
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/15 text-sm text-primary">
                          {getInitials(row.player_name || "Player")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {row.player_name || "Player"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn("rounded-md", roleTone[row.role_family])}
                          >
                            {roleLabels[row.role_family]}
                          </Badge>
                          {row.position && (
                            <Badge variant="secondary" className="rounded-md">
                              {row.position}
                            </Badge>
                          )}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-xs",
                              trendTone[row.trend],
                            )}
                          >
                            <TrendIcon className="h-3 w-3" />
                            {row.trend}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-right sm:min-w-[320px]">
                      <div>
                        <p className="text-xs text-muted-foreground">Score</p>
                        <p className="font-mono text-xl font-bold text-primary">
                          {formatScore(scoreValue(row))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Predicted</p>
                        <p className="font-mono text-xl font-bold">
                          {formatScore(predictedValue(row))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Grade</p>
                        <div className="mt-1 flex justify-end">
                          <GradeBadge grade={gradeValue(row)} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!isLoading && modelRows.length === 0 && (
                <div className="py-10 text-center text-muted-foreground">
                  <Trophy className="mx-auto mb-3 h-10 w-10 opacity-30" />
                  <p>No Ranking System output is available yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
