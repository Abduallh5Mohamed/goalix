"use client";

import { Loader2, Medal, Trophy } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useGetPlayerProfileQuery,
  useGetPlayerRankingSystemInputsQuery,
  type RankingSystemInput,
} from "@/lib/store/api/calendarApi";
import {
  buildMonthlyRankingHistory,
  buildMonthlyRankingRows,
  buildWeeklyRankingHistory,
  isActualCompletedRankingRow,
  latestCompletedRankingWeekKey,
  latestRankingMonthKey,
  rankingDateKey,
  rankingMonthLabel,
  rankingWeekLabel,
  rankingWeeksInMonthLabel,
} from "@/lib/rankings/monthlyRanking";
import { getInitials } from "@/lib/utils";

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

const rankValue = (row: RankingSystemInput) =>
  row.final_api_response?.rank ?? row.rank;

const sortByModelRank = (rows: RankingSystemInput[]) =>
  [...rows].sort((a, b) => {
    const rankDiff = rankValue(a) - rankValue(b);
    if (rankDiff) return rankDiff;
    const scoreDiff = (scoreValue(b) ?? -1) - (scoreValue(a) ?? -1);
    if (scoreDiff) return scoreDiff;
    return String(a.player_name || "").localeCompare(String(b.player_name || ""));
  });

const scoreText = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
};

const medalColor = (rank: number) =>
  rank === 1
    ? "text-yellow-400"
    : rank === 2
      ? "text-gray-300"
      : rank === 3
        ? "text-amber-500"
        : "text-slate-400";

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

export default function PlayerRankingPage() {
  const profileQuery = useGetPlayerProfileQuery();
  const profile = profileQuery.data;
  const rankingsQuery = useGetPlayerRankingSystemInputsQuery({ limit: 200 });
  const rows = rankingsQuery.data?.data ?? [];
  const completedRows = rows.filter((row) => isActualCompletedRankingRow(row));
  const latestWeek = latestCompletedRankingWeekKey(rows);
  const groupRankings = sortByModelRank(
    completedRows.filter((row) => rankingDateKey(row.week_start) === latestWeek),
  );
  const myRanking = groupRankings.find((ranking) => ranking.player_id === profile?.id);
  const topRankings = groupRankings.slice(0, 3);
  const latestMonth = latestRankingMonthKey(rows);
  const monthlyRankings = buildMonthlyRankingRows(rows, latestMonth);
  const myMonthlyRanking = monthlyRankings.find((ranking) => ranking.playerId === profile?.id);
  const topMonthlyRankings = monthlyRankings.slice(0, 3);
  const weeklyHistory = buildWeeklyRankingHistory(rows)
    .map((period) => ({
      ...period,
      row: period.rows.find((ranking) => ranking.player_id === profile?.id),
    }))
    .filter((period) => period.row);
  const monthlyHistory = buildMonthlyRankingHistory(rows)
    .map((period) => ({
      ...period,
      row: period.rows.find((ranking) => ranking.playerId === profile?.id),
    }))
    .filter((period) => period.row);
  const latestMonthLabel = latestMonth ? rankingMonthLabel(latestMonth) : "-";
  const latestWeekLabel = latestWeek ? rankingWeekLabel(latestWeek) : "-";
  const isLoading = profileQuery.isLoading || rankingsQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Ranking"
        description={`Rankings in ${profile?.group_name || "your group"}`}
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Performance" },
          { label: "Ranking" },
        ]}
      />

      {isLoading ? (
        <Card className="border-white/10 bg-white/[0.045] shadow-none">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading rankings...
          </CardContent>
        </Card>
      ) : groupRankings.length ? (
        <>
          {myMonthlyRanking && (
            <Card className="border-emerald-300/30 bg-emerald-400/10 shadow-none">
              <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/20">
                    <Trophy className="h-8 w-8 text-emerald-200" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-300">Your Monthly Rank</p>
                    <p className="text-4xl font-bold text-emerald-100">
                      #{myMonthlyRanking.rank}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">
                      {scoreText(myMonthlyRanking.score)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {rankingWeeksInMonthLabel(myMonthlyRanking.weekStarts, myMonthlyRanking.month)}
                    </p>
                  </div>
                  <Badge variant="success" className="text-sm">
                    {latestMonthLabel}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {topMonthlyRankings.length > 0 && (
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Monthly Top 3
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                {topMonthlyRankings.map((ranking) => {
                  const isMe = ranking.playerId === profile?.id;
                  return (
                    <div
                      key={ranking.id}
                      className={`rounded-lg border p-4 text-center ${
                        isMe
                          ? "border-emerald-300/30 bg-emerald-400/10"
                          : "border-white/10 bg-white/[0.035]"
                      }`}
                    >
                      <Medal className={`mx-auto h-6 w-6 ${medalColor(ranking.rank)}`} />
                      <p className="mt-2 text-xl font-bold text-white">#{ranking.rank}</p>
                      <p className="mt-1 font-semibold text-white">
                        {ranking.playerName}
                        {isMe ? " (You)" : ""}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-emerald-200">
                        {scoreText(ranking.score)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {rankingWeeksInMonthLabel(ranking.weekStarts, ranking.month)}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {myRanking && (
            <Card className="border-cyan-300/30 bg-cyan-400/10 shadow-none">
              <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/20">
                    <Trophy className="h-8 w-8 text-cyan-200" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-300">Your Rank</p>
                    <p className="text-4xl font-bold text-cyan-100">
                      #{rankValue(myRanking)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">
                      {scoreText(scoreValue(myRanking))}
                    </p>
                    <p className="text-xs text-slate-400">Points</p>
                  </div>
                  <Badge variant="info" className="text-sm">
                    {latestWeekLabel}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {topRankings.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              {topRankings.map((ranking) => {
                const isMe = ranking.player_id === profile?.id;
                return (
                  <Card
                    key={ranking.id}
                    className={`border-white/10 bg-white/[0.045] shadow-none ${
                      isMe ? "ring-1 ring-cyan-300/40" : ""
                    }`}
                  >
                    <CardContent className="p-5 text-center">
                      <Avatar className="mx-auto mb-3 h-12 w-12 border border-white/10">
                        <AvatarFallback className="bg-cyan-400/10 text-cyan-100">
                          {getInitials(ranking.player_name || "Player")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="mb-2 flex items-center justify-center gap-2">
                        <Medal className={`h-5 w-5 ${medalColor(rankValue(ranking))}`} />
                        <span className="text-xl font-bold text-white">
                          #{rankValue(ranking)}
                        </span>
                      </div>
                      <p className="font-semibold text-white">
                        {ranking.player_name}
                        {isMe ? " (You)" : ""}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-cyan-200">
                        {scoreText(scoreValue(ranking))}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="border-white/10 bg-white/[0.045] shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                My Ranking History
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                  Weekly
                </p>
                {weeklyHistory.slice(0, 8).map((period) => {
                  const row = period.row;
                  if (!row) return null;
                  return (
                    <div key={period.key} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{period.label}</p>
                        <p className="text-xs text-slate-400">{period.rangeLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg font-bold text-cyan-200">
                          #{rankValue(row)}
                        </p>
                        <p className="text-xs text-slate-400">{scoreText(scoreValue(row))} pts</p>
                      </div>
                    </div>
                  );
                })}
                {!weeklyHistory.length && (
                  <EmptyState text="No weekly ranking history yet." />
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                  Monthly
                </p>
                {monthlyHistory.slice(0, 8).map((period) => {
                  const row = period.row;
                  if (!row) return null;
                  return (
                    <div key={period.key} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{period.label}</p>
                        <p className="text-xs text-slate-400">{period.weeksLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg font-bold text-emerald-200">
                          #{row.rank}
                        </p>
                        <p className="text-xs text-slate-400">{scoreText(row.score)} pts</p>
                      </div>
                    </div>
                  );
                })}
                {!monthlyHistory.length && (
                  <EmptyState text="No monthly ranking history yet." />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.045] shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Group Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {groupRankings.map((ranking) => {
                const isMe = ranking.player_id === profile?.id;
                return (
                  <div
                    key={ranking.id}
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      isMe
                        ? "border-cyan-300/30 bg-cyan-400/10"
                        : "border-white/10 bg-white/[0.035]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-lg font-bold">
                        {rankValue(ranking) <= 3 ? (
                          <Medal className={`h-5 w-5 ${medalColor(rankValue(ranking))}`} />
                        ) : (
                          <span className="text-slate-400">{rankValue(ranking)}</span>
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${isMe ? "text-cyan-100" : "text-white"}`}>
                          {ranking.player_name}
                          {isMe ? " (You)" : ""}
                        </p>
                        <p className="text-xs text-slate-400">
                          {[ranking.position, ranking.role_family, latestWeekLabel].filter(Boolean).join(" - ")}
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-cyan-200">
                      {scoreText(scoreValue(ranking))}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState text="No Ranking System output is available for your group yet." />
      )}
    </div>
  );
}
