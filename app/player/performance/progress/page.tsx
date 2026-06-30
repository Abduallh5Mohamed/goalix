"use client";

import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import {
  useGetPlayerMatchesQuery,
  useGetPlayerProgressQuery,
} from "@/lib/store/api/calendarApi";
import type { Match, MatchPlayerStats } from "@/lib/store/api/calendarApi";
import { formatDate, localDateTimeTimestamp } from "@/lib/utils";

const numberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const ratingPercent = (value: unknown) => {
  const rating = numberValue(value);
  return rating === null ? 0 : Math.max(0, Math.min(100, rating * 10));
};

const chartItem = (label: string, value: unknown) => {
  const numeric = numberValue(value);
  return numeric === null ? null : { label, value: ratingPercent(numeric) };
};

const formatRating = (value: unknown) => {
  const rating = numberValue(value);
  if (rating === null) return "N/A";
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
};

const matchTimestamp = (match: Match) => {
  const timestamp = localDateTimeTimestamp(match.match_date, match.match_time);
  if (timestamp) return timestamp;
  return Date.parse(`${match.match_date}T00:00:00`) || 0;
};

const formatMonth = (value: string) => {
  const key = value.slice(0, 7);
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return value || "Unknown month";
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
};

const addMonthlyRating = (
  byMonth: Map<string, { total: number; count: number }>,
  dateValue: string | null | undefined,
  ratingValue: unknown,
) => {
  const rating = numberValue(ratingValue);
  if (rating === null) return byMonth;
  const month = (dateValue ?? "").slice(0, 7);
  if (!month) return byMonth;
  const current = byMonth.get(month) ?? { total: 0, count: 0 };
  byMonth.set(month, {
    total: current.total + rating,
    count: current.count + 1,
  });
  return byMonth;
};

const mapToPoints = (byMonth: Map<string, { total: number; count: number }>) =>
  Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, point]) => ({
      label: formatMonth(month),
      value: ratingPercent(point.total / point.count),
    }));

const monthlyMatchRatingMap = (
  matches: Array<{ match: Match; stats: MatchPlayerStats }>,
  valueGetter: (stats: MatchPlayerStats) => unknown,
) =>
  matches.reduce(
    (byMonth, item) =>
      addMonthlyRating(byMonth, item.match.match_date, valueGetter(item.stats)),
    new Map<string, { total: number; count: number }>(),
  );

const matchNotes = (stats: MatchPlayerStats) =>
  [
    { label: "Strengths", value: stats.strengths },
    { label: "Weaknesses", value: stats.weaknesses },
    { label: "Improvement Plan", value: stats.improvement_plan },
    { label: "Coach Notes", value: stats.coach_notes },
  ].filter(
    (item): item is { label: string; value: string } =>
      typeof item.value === "string" && item.value.trim().length > 0,
  );

const matchBreakdown = (stats: MatchPlayerStats) =>
  [
    chartItem("Technical", stats.technical_rating),
    chartItem("Tactical", stats.tactical_rating),
    chartItem("Physical", stats.physical_rating),
    chartItem("Mentality", stats.mentality_rating),
    chartItem("Decision", stats.decision_making_rating),
    chartItem("Work Rate", stats.work_rate_rating),
    chartItem("Positioning", stats.positioning_rating),
  ].filter((item): item is { label: string; value: number } => item !== null);

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

export default function PlayerProgressPage() {
  const progressQuery = useGetPlayerProgressQuery();
  const matchesQuery = useGetPlayerMatchesQuery();
  const matchEvaluations = (matchesQuery.data?.data ?? [])
    .flatMap((match) =>
      (match.stats ?? []).map((stats) => ({
        match,
        stats,
      })),
    )
    .filter((item) => numberValue(item.stats.performance_rating) !== null)
    .sort((a, b) => matchTimestamp(a.match) - matchTimestamp(b.match));
  const latestMatchEval = matchEvaluations[matchEvaluations.length - 1];
  const isLoading = progressQuery.isLoading || matchesQuery.isLoading;

  const matchOverallMap = monthlyMatchRatingMap(
    matchEvaluations,
    (stats) => stats.performance_rating,
  );
  const overallMonths = Array.from(matchOverallMap.keys()).sort();
  const overallData = mapToPoints(matchOverallMap);
  const technicalData = mapToPoints(
    monthlyMatchRatingMap(matchEvaluations, (stats) => stats.technical_rating),
  );
  const tacticalData = mapToPoints(
    monthlyMatchRatingMap(matchEvaluations, (stats) => stats.tactical_rating),
  );
  const physicalData = mapToPoints(
    monthlyMatchRatingMap(matchEvaluations, (stats) => stats.physical_rating),
  );
  const mentalData = mapToPoints(
    monthlyMatchRatingMap(matchEvaluations, (stats) => stats.mentality_rating),
  );
  const breakdownData = latestMatchEval ? matchBreakdown(latestMatchEval.stats) : [];
  const hasPublishedEvaluations = matchEvaluations.length > 0;
  const feedbackItems = [
    ...matchEvaluations.map((item) => ({
      id: `match-${item.stats.id}`,
      type: "Match",
      title: item.match.opponent_name
        ? `vs ${item.match.opponent_name}`
        : "Match evaluation",
      date: item.match.match_date,
      timestamp: matchTimestamp(item.match),
      overall: item.stats.performance_rating,
      notes: matchNotes(item.stats),
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress Chart"
        description="Track your published match evaluations by month."
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Performance" },
          { label: "Progress Chart" },
        ]}
      />

      {isLoading ? (
        <Card className="border-white/10 bg-white/[0.045] shadow-none">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading progress...
          </CardContent>
        </Card>
      ) : progressQuery.isError || matchesQuery.isError ? (
        <Card className="border-red-400/30 bg-red-500/10 shadow-none">
          <CardContent className="p-5 text-sm text-red-100">
            Could not load progress data. Please refresh after the backend is restarted.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Latest Match Overall
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {formatRating(latestMatchEval?.stats.performance_rating)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Monthly Match Attendance
                </p>
                <p className="mt-2 text-3xl font-semibold text-lime-100">
                  {Math.round(progressQuery.data?.matchAttendancePercentage ?? 0)}%
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Monthly Avg Match
                </p>
                <p className="mt-2 text-3xl font-semibold text-amber-100">
                  {formatRating(progressQuery.data?.averageMatchRating)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Monthly Goals / Assists
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {progressQuery.data?.goals ?? 0}/{progressQuery.data?.assists ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {hasPublishedEvaluations ? (
            <>
              <Card className="border-white/10 bg-white/[0.045] shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Monthly Overall Score Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    labels={overallMonths.map(formatMonth)}
                    datasets={[
                      {
                        label: "Match Overall",
                        data: overallData.map((item) => item.value),
                        color: "#f59e0b",
                      },
                    ]}
                    height={300}
                  />
                </CardContent>
              </Card>

              {latestMatchEval && (
                <Card className="border-white/10 bg-white/[0.045] shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">
                      Latest Match Skill Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {breakdownData.length ? (
                      <BarChart
                        labels={breakdownData.map((item) => item.label)}
                        datasets={[
                          {
                            label: "Score",
                            data: breakdownData.map((item) => item.value),
                            color: "#7bea28",
                          },
                        ]}
                        height={250}
                      />
                    ) : (
                      <EmptyState text="This published evaluation has an overall score, but no skill breakdown fields yet." />
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                {[
                  ["Technical", technicalData, "#2d9ad5"],
                  ["Tactical", tacticalData, "#7bea28"],
                  ["Physical", physicalData, "#b6ff00"],
                  ["Mentality", mentalData, "#2ee8c9"],
                ].map(([label, data, color]) => {
                  const points = data as typeof technicalData;
                  return (
                    <Card
                      key={label as string}
                      className="border-white/10 bg-white/[0.045] shadow-none"
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">
                          {label as string}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <LineChart
                          labels={points.map((item) => item.label)}
                          datasets={[
                            {
                              label: label as string,
                              data: points.map((item) => item.value),
                              color: color as string,
                            },
                          ]}
                          height={200}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card className="border-white/10 bg-white/[0.045] shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Coach Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {feedbackItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-400">
                            {item.type} - {formatDate(item.date)}
                          </p>
                        </div>
                        <p className="text-xl font-bold text-cyan-200">
                          {formatRating(item.overall)}
                        </p>
                      </div>
                      {item.notes.length > 0 && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {item.notes.map((note) => (
                            <div
                              key={note.label}
                              className="rounded-md bg-[#06111f]/70 p-3"
                            >
                              <p className="text-[10px] font-semibold uppercase text-slate-500">
                                {note.label}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-300">
                                {note.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState text="No published match evaluations are available yet." />
          )}
        </>
      )}
    </div>
  );
}
