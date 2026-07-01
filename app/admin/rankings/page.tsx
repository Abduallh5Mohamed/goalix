"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Goal,
  Medal,
  RefreshCw,
  Shield,
  Trophy,
  User,
  Users,
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
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  useGetAdminRankingSystemInputsQuery,
  useGetGroupsQuery,
} from "@/lib/store/api/adminApi";
import type { RankingSystemInput } from "@/lib/store/api/calendarApi";
import {
  buildMonthlyRankingHistory,
  buildMonthlyRankingRows,
  buildWeeklyRankingHistory,
  isActualCompletedRankingRow,
  latestCompletedRankingWeekKey,
  latestRankingMonthKey,
  numberValue,
  rankingDateKey,
  rankingMonthKey,
  rankingWeekLabel,
  rankingWeeksInMonthLabel,
  rankingMonthRange,
  rankingWeeklyScore,
  sortWeeklyRankingRows,
  type MonthlyRankingPeriod,
  type MonthlyRankingRow,
  type WeeklyRankingPeriod,
} from "@/lib/rankings/monthlyRanking";
import { formatDate, getInitials } from "@/lib/utils";

type RoleKey = Exclude<RankingSystemInput["role_family"], "unknown">;

const roleCards: Array<{
  role: RoleKey;
  title: string;
  description: string;
  icon: typeof Goal;
  className: string;
}> = [
  {
    role: "attack",
    title: "Best Attack",
    description: "Top attacking role score",
    icon: Goal,
    className: "border-rose-400/35 bg-rose-500/10 text-rose-100",
  },
  {
    role: "midfield",
    title: "Best Midfield",
    description: "Top midfield role score",
    icon: Medal,
    className: "border-cyan-400/35 bg-cyan-500/10 text-cyan-100",
  },
  {
    role: "defense",
    title: "Best Defense",
    description: "Top defensive role score",
    icon: Shield,
    className: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
  },
  {
    role: "goalkeeper",
    title: "Best Goalkeeper",
    description: "Top goalkeeper score",
    icon: User,
    className: "border-amber-400/35 bg-amber-500/10 text-amber-100",
  },
];

const roleLabel: Record<RankingSystemInput["role_family"], string> = {
  attack: "Attack",
  midfield: "Midfield",
  defense: "Defense",
  goalkeeper: "Goalkeeper",
  unknown: "Unknown",
};

const rankValue = (row: RankingSystemInput) =>
  row.final_api_response?.rank ?? row.rank;

const scoreText = (value: unknown) => {
  const numeric = numberValue(value);
  if (numeric === null) return "-";
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
};

const monthlyRoleLeader = (rows: MonthlyRankingRow[], role: RoleKey) =>
  rows.find((row) => row.roleFamily === role);

const weeklyRoleLeader = (rows: RankingSystemInput[], role: RoleKey) =>
  rows.find((row) => row.role_family === role);

function PlayerAvatar({ name }: { name: string }) {
  return (
    <Avatar className="h-10 w-10 border border-white/10">
      <AvatarFallback className="bg-primary/15 text-sm text-primary">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function MonthlyRoleCard({
  config,
  row,
}: {
  config: (typeof roleCards)[number];
  row?: MonthlyRankingRow;
}) {
  const Icon = config.icon;

  return (
    <Card className={`border ${config.className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">{config.title}</p>
            <p className="mt-1 text-xs text-current/75">{config.description}</p>
          </div>
          <span className="rounded-md bg-black/15 p-2">
            <Icon className="h-5 w-5" />
          </span>
        </div>
        {row ? (
          <div className="mt-4 flex items-center gap-3">
            <PlayerAvatar name={row.playerName} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{row.playerName}</p>
              <p className="text-xs text-current/75">
                #{row.rank} monthly - {scoreText(row.score)} pts - {rankingWeeksInMonthLabel(row.weekStarts, row.month)}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-md border border-current/20 p-3 text-sm text-current/75">
            No player data yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function WeeklyRoleCard({
  config,
  row,
}: {
  config: (typeof roleCards)[number];
  row?: RankingSystemInput;
}) {
  const Icon = config.icon;

  return (
    <div className="rounded-lg border border-border/40 bg-muted/15 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{config.title}</p>
          <p className="text-xs text-muted-foreground">Latest weekly run</p>
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      {row ? (
        <div className="mt-4 flex items-center gap-3">
          <PlayerAvatar name={row.player_name || "Player"} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{row.player_name || "Player"}</p>
            <p className="text-xs text-muted-foreground">
              #{rankValue(row)} weekly - {scoreText(rankingWeeklyScore(row))} pts
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No weekly player yet.</p>
      )}
    </div>
  );
}

function WeeklyFullRankingList({ rows }: { rows: RankingSystemInput[] }) {
  return (
    <div className="max-h-[420px] overflow-y-auto pr-1">
      <div className="min-w-[560px] space-y-1">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[56px_1fr_96px_96px] items-center gap-3 rounded-md border border-border/25 bg-background/35 px-3 py-2 text-sm"
          >
            <span className="font-mono font-bold text-primary">#{rankValue(row)}</span>
            <div className="min-w-0">
              <p className="truncate font-medium">{row.player_name || "Player"}</p>
              <p className="text-xs text-muted-foreground">
                {[row.position, roleLabel[row.role_family]].filter(Boolean).join(" - ")}
              </p>
            </div>
            <span className="text-right font-mono font-semibold">
              {scoreText(rankingWeeklyScore(row))}
            </span>
            <span className="text-right text-xs text-muted-foreground">
              {row.final_api_response?.trend ?? row.trend}
            </span>
          </div>
        ))}
      </div>
      {!rows.length && (
        <p className="rounded-md border border-dashed border-border/40 p-4 text-center text-sm text-muted-foreground">
          No players in this weekly ranking.
        </p>
      )}
    </div>
  );
}

function MonthlyFullRankingList({ rows }: { rows: MonthlyRankingRow[] }) {
  return (
    <div className="max-h-[420px] overflow-y-auto pr-1">
      <div className="min-w-[620px] space-y-1">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[56px_1fr_96px_120px] items-center gap-3 rounded-md border border-border/25 bg-background/35 px-3 py-2 text-sm"
          >
            <span className="font-mono font-bold text-primary">#{row.rank}</span>
            <div className="min-w-0">
              <p className="truncate font-medium">{row.playerName}</p>
              <p className="text-xs text-muted-foreground">
                {[row.position, roleLabel[row.roleFamily]].filter(Boolean).join(" - ")}
              </p>
            </div>
            <span className="text-right font-mono font-semibold">
              {scoreText(row.score)}
            </span>
            <span className="text-right text-xs text-muted-foreground">
              {rankingWeeksInMonthLabel(row.weekStarts, row.month)}
            </span>
          </div>
        ))}
      </div>
      {!rows.length && (
        <p className="rounded-md border border-dashed border-border/40 p-4 text-center text-sm text-muted-foreground">
          No players in this monthly ranking.
        </p>
      )}
    </div>
  );
}

function MonthlyDetailedHistory({
  month,
  weeks,
}: {
  month: MonthlyRankingPeriod;
  weeks: WeeklyRankingPeriod[];
}) {
  return (
    <section className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-black">{month.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(month.start)} to {formatDate(month.end)} - {month.weeksLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{month.rows.length} monthly players</Badge>
          <Badge variant="info">{weeks.length} completed week{weeks.length === 1 ? "" : "s"}</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        <div className="rounded-lg border border-border/30 bg-muted/15 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Full Monthly Ranking</p>
              <p className="text-xs text-muted-foreground">
                Final average for {month.label}
              </p>
            </div>
            <Badge variant="success">{month.rows.length} players</Badge>
          </div>
          <MonthlyFullRankingList rows={month.rows} />
        </div>

        <div className="space-y-3">
          {weeks.map((week) => (
            <div key={week.key} className="rounded-lg border border-border/30 bg-muted/15 p-3">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{week.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(week.start)} to {formatDate(week.end)}
                  </p>
                </div>
                <Badge variant="outline">{week.rows.length} players</Badge>
              </div>
              <WeeklyFullRankingList rows={week.rows} />
            </div>
          ))}
          {!weeks.length && (
            <p className="rounded-lg border border-dashed border-border/40 p-6 text-center text-sm text-muted-foreground">
              No completed weekly runs in this month yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default function AdminRankingsOverviewPage() {
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [rankingLimit, setRankingLimit] = useState(100);
  const queryArgs =
    selectedGroup !== "all"
      ? { groupId: selectedGroup, limit: rankingLimit }
      : { limit: rankingLimit };
  const { data, isLoading, isError, refetch } =
    useGetAdminRankingSystemInputsQuery(queryArgs);
  const { data: groups = [] } = useGetGroupsQuery({});

  const rows = useMemo(() => data?.data ?? [], [data?.data]);
  const completedRows = useMemo(
    () => rows.filter((row) => isActualCompletedRankingRow(row)),
    [rows],
  );
  const latestWeek = latestCompletedRankingWeekKey(rows);
  const weeklyRows = useMemo(
    () =>
      sortWeeklyRankingRows(
        completedRows.filter((row) => rankingDateKey(row.week_start) === latestWeek),
      ),
    [completedRows, latestWeek],
  );
  const latestMonth = useMemo(() => latestRankingMonthKey(rows), [rows]);
  const monthRange = useMemo(() => rankingMonthRange(latestMonth), [latestMonth]);
  const monthlyRows = useMemo(
    () => buildMonthlyRankingRows(rows, latestMonth),
    [rows, latestMonth],
  );
  const monthlyWeekStarts = useMemo(
    () => [...new Set(monthlyRows.flatMap((row) => row.weekStarts))].sort(),
    [monthlyRows],
  );
  const monthlyWeeksLabel = monthlyWeekStarts.length
    ? rankingWeeksInMonthLabel(monthlyWeekStarts, latestMonth)
    : "No completed weeks";
  const monthlyTop = monthlyRows.slice(0, 10);
  const weeklyTop = weeklyRows.slice(0, 5);
  const weeklyHistory = useMemo(() => buildWeeklyRankingHistory(rows), [rows]);
  const monthlyHistory = useMemo(() => buildMonthlyRankingHistory(rows), [rows]);
  const detailedHistory = useMemo(
    () =>
      monthlyHistory.map((month) => ({
        month,
        weeks: weeklyHistory.filter((week) => rankingMonthKey(week.key) === month.key),
      })),
    [monthlyHistory, weeklyHistory],
  );
  const pagination = data?.pagination;
  const hasMoreRankingRows =
    Boolean(pagination?.total) && rows.length < Number(pagination?.total ?? 0);
  const handleGroupChange = (value: string) => {
    setSelectedGroup(value);
    setRankingLimit(100);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Ranking Overview"
        description="Completed weekly model runs and month-bounded ranking totals. Every month starts a fresh monthly ranking."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Rankings" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedGroup} onValueChange={handleGroupChange}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filter by group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="flex items-center justify-between gap-3 p-4 text-sm text-destructive">
            Could not load ranking output.
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/50 bg-card lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Monthly Ranking Window
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground">Month</p>
                  <p className="mt-2 text-2xl font-black">{monthRange.label}</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground">Period</p>
                  <p className="mt-2 font-semibold">
                    {monthRange.start ? `${formatDate(monthRange.start)} to ${formatDate(monthRange.end)}` : "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground">Weeks counted</p>
                  <p className="mt-2 text-sm font-semibold">{monthlyWeeksLabel}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4 text-yellow-300" />
                  Monthly #1
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyRows[0] ? (
                  <div className="flex items-center gap-3">
                    <PlayerAvatar name={monthlyRows[0].playerName} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{monthlyRows[0].playerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {scoreText(monthlyRows[0].score)} pts across {rankingWeeksInMonthLabel(monthlyRows[0].weekStarts, monthlyRows[0].month)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No monthly ranking yet.</p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {roleCards.map((config) => (
              <MonthlyRoleCard
                key={config.role}
                config={config}
                row={monthlyRoleLeader(monthlyRows, config.role)}
              />
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span>Latest Weekly Run</span>
                  <Badge variant="info">{latestWeek ? rankingWeekLabel(latestWeek) : "No week"}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {roleCards.map((config) => (
                    <WeeklyRoleCard
                      key={config.role}
                      config={config}
                      row={weeklyRoleLeader(weeklyRows, config.role)}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  {weeklyTop.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-muted/15 p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background font-mono font-bold">
                          #{rankValue(row)}
                        </span>
                        <PlayerAvatar name={row.player_name || "Player"} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.player_name || "Player"}</p>
                          <p className="text-xs text-muted-foreground">
                            {[row.position, roleLabel[row.role_family]].filter(Boolean).join(" - ")}
                          </p>
                        </div>
                      </div>
                      <p className="font-mono text-lg font-bold text-primary">
                        {scoreText(rankingWeeklyScore(row))}
                      </p>
                    </div>
                  ))}
                  {!weeklyTop.length && (
                    <p className="rounded-lg border border-dashed border-border/40 p-6 text-center text-sm text-muted-foreground">
                      No weekly ranking rows yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span>Monthly Leaderboard</span>
                  <Badge variant="outline">{monthlyRows.length} players</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {monthlyTop.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-muted/15 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background font-mono font-bold">
                        #{row.rank}
                      </span>
                      <PlayerAvatar name={row.playerName} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.playerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {[row.position, roleLabel[row.roleFamily], rankingWeeksInMonthLabel(row.weekStarts, row.month)].filter(Boolean).join(" - ")}
                        </p>
                      </div>
                    </div>
                    <p className="font-mono text-lg font-bold text-primary">
                      {scoreText(row.score)}
                    </p>
                  </div>
                ))}
                {!monthlyTop.length && (
                  <p className="rounded-lg border border-dashed border-border/40 p-6 text-center text-sm text-muted-foreground">
                    No monthly ranking rows yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Detailed Ranking History</h2>
                <p className="text-sm text-muted-foreground">
                  Every month includes its full monthly leaderboard and the full player ranking for each completed week inside that month.
                </p>
              </div>
              <Badge variant="outline" className="w-fit">
                {detailedHistory.length} month{detailedHistory.length === 1 ? "" : "s"}
              </Badge>
            </div>

            {detailedHistory.map(({ month, weeks }) => (
              <MonthlyDetailedHistory key={month.key} month={month} weeks={weeks} />
            ))}

            {!detailedHistory.length && (
              <Card className="border-border/50 bg-card">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No detailed ranking history is available yet.
                </CardContent>
              </Card>
            )}

            {hasMoreRankingRows && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() =>
                    setRankingLimit((value) =>
                      Math.min(value + 100, pagination?.total ?? value + 100),
                    )
                  }
                  disabled={isLoading}
                >
                  Load more ranking history ({rows.length}/{pagination?.total})
                </Button>
              </div>
            )}
          </section>

          <Card className="border-border/50 bg-card">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">How the cycle works</p>
                  <p className="text-sm text-muted-foreground">
                    The weekly model ranks players from that week&apos;s training, match, attendance, and daily AI inputs. The monthly table averages only completed weekly scores inside the same calendar month. When a new month starts, the monthly table starts fresh and previous months remain saved as separate history.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" asChild>
                  <Link href="/admin/rankings/weekly">Weekly page</Link>
                </Button>
                <Button asChild>
                  <Link href="/admin/rankings/monthly">Monthly page</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
