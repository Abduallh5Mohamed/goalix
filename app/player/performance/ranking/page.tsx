"use client";

import { Loader2, Medal, Trophy } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGetPlayerProfileQuery } from "@/lib/store/api/calendarApi";
import {
  useGetWeeklyRankingsQuery,
  type RankingRow,
} from "@/lib/store/api/adminApi";
import { getInitials } from "@/lib/utils";

const scoreText = (value: string | number | null | undefined) => {
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
  const rankingsQuery = useGetWeeklyRankingsQuery(
    { groupId: profile?.group_id ?? undefined, limit: 100 },
    { skip: !profile?.group_id },
  );
  const groupRankings = (rankingsQuery.data?.data ?? [])
    .slice()
    .sort((a, b) => a.rank - b.rank);
  const myRanking = groupRankings.find((ranking) => ranking.player_id === profile?.id);
  const topRankings = groupRankings.slice(0, 3);
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
                      #{myRanking.rank}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">
                      {scoreText(myRanking.total_score)}
                    </p>
                    <p className="text-xs text-slate-400">Points</p>
                  </div>
                  <Badge variant="info" className="text-sm">
                    {myRanking.period}
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
                          {getInitials(ranking.player_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="mb-2 flex items-center justify-center gap-2">
                        <Medal className={`h-5 w-5 ${medalColor(ranking.rank)}`} />
                        <span className="text-xl font-bold text-white">
                          #{ranking.rank}
                        </span>
                      </div>
                      <p className="font-semibold text-white">
                        {ranking.player_name}
                        {isMe ? " (You)" : ""}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-cyan-200">
                        {scoreText(ranking.total_score)}
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
                Group Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {groupRankings.map((ranking: RankingRow) => {
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
                        {ranking.rank <= 3 ? (
                          <Medal className={`h-5 w-5 ${medalColor(ranking.rank)}`} />
                        ) : (
                          <span className="text-slate-400">{ranking.rank}</span>
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${isMe ? "text-cyan-100" : "text-white"}`}>
                          {ranking.player_name}
                          {isMe ? " (You)" : ""}
                        </p>
                        <p className="text-xs text-slate-400">
                          {ranking.group_name}
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-cyan-200">
                      {scoreText(ranking.total_score)}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState text="No backend ranking snapshot is available for your group yet." />
      )}
    </div>
  );
}
