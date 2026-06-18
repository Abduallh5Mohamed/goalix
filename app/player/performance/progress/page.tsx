"use client";

import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import {
  useGetPlayerEvaluationsQuery,
  useGetPlayerProgressQuery,
} from "@/lib/store/api/calendarApi";
import type { PlayerEvaluationRecord } from "@/lib/store/api/calendarApi";
import { formatDate } from "@/lib/utils";

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

const formatRating = (value: unknown) => {
  const rating = numberValue(value);
  if (rating === null) return "N/A";
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
};

const evaluationTimestamp = (evaluation: PlayerEvaluationRecord) => {
  const timestamp = Date.parse(evaluation.start_datetime ?? "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const chartPoint = (
  evaluation: PlayerEvaluationRecord,
  key: keyof PlayerEvaluationRecord,
) => ({
  label: formatDate(evaluation.start_datetime ?? "").split(",")[0],
  value: ratingPercent(evaluation[key]),
});

const evaluationNotes = (evaluation: PlayerEvaluationRecord) =>
  [
    { label: "Strengths", value: evaluation.strengths },
    { label: "Weaknesses", value: evaluation.weaknesses },
    { label: "Improvement Plan", value: evaluation.improvement_plan },
    { label: "Coach Notes", value: evaluation.coach_notes },
    { label: "Development Notes", value: evaluation.development_notes },
  ].filter(
    (item): item is { label: string; value: string } =>
      typeof item.value === "string" && item.value.trim().length > 0,
  );

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

export default function PlayerProgressPage() {
  const evaluationsQuery = useGetPlayerEvaluationsQuery();
  const progressQuery = useGetPlayerProgressQuery();
  const evaluations = (evaluationsQuery.data?.data ?? [])
    .slice()
    .sort((a, b) => evaluationTimestamp(a) - evaluationTimestamp(b));
  const latestEval = evaluations[evaluations.length - 1];
  const isLoading = evaluationsQuery.isLoading || progressQuery.isLoading;

  const overallData = evaluations.map((evaluation) =>
    chartPoint(evaluation, "overall_rating"),
  );
  const technicalData = evaluations.map((evaluation) =>
    chartPoint(evaluation, "technical_rating"),
  );
  const tacticalData = evaluations.map((evaluation) =>
    chartPoint(evaluation, "tactical_rating"),
  );
  const physicalData = evaluations.map((evaluation) =>
    chartPoint(evaluation, "physical_rating"),
  );
  const mentalData = evaluations.map((evaluation) =>
    chartPoint(evaluation, "mentality_rating"),
  );
  const breakdownData = latestEval
    ? [
        { label: "Technical", value: ratingPercent(latestEval.technical_rating) },
        { label: "Tactical", value: ratingPercent(latestEval.tactical_rating) },
        { label: "Physical", value: ratingPercent(latestEval.physical_rating) },
        { label: "Mentality", value: ratingPercent(latestEval.mentality_rating) },
        { label: "Teamwork", value: ratingPercent(latestEval.teamwork_rating) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress Chart"
        description="Track your backend training evaluations over time."
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
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Training Attendance
                </p>
                <p className="mt-2 text-3xl font-semibold text-lime-100">
                  {Math.round(progressQuery.data?.trainingAttendancePercentage ?? 0)}%
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Avg Training
                </p>
                <p className="mt-2 text-3xl font-semibold text-cyan-100">
                  {formatRating(progressQuery.data?.averageTrainingRating)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Avg Match
                </p>
                <p className="mt-2 text-3xl font-semibold text-amber-100">
                  {formatRating(progressQuery.data?.averageMatchRating)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Goals / Assists
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {progressQuery.data?.goals ?? 0}/{progressQuery.data?.assists ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {evaluations.length ? (
            <>
              <Card className="border-white/10 bg-white/[0.045] shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Overall Score Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    labels={overallData.map((item) => item.label)}
                    datasets={[
                      {
                        label: "Overall Score",
                        data: overallData.map((item) => item.value),
                        color: "#22d3ee",
                      },
                    ]}
                    height={300}
                  />
                </CardContent>
              </Card>

              {latestEval && (
                <Card className="border-white/10 bg-white/[0.045] shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">
                      Latest Skill Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      labels={breakdownData.map((item) => item.label)}
                      datasets={[
                        {
                          label: "Score",
                          data: breakdownData.map((item) => item.value),
                          color: "#3ddc84",
                        },
                      ]}
                      height={250}
                    />
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                {[
                  ["Technical", technicalData, "#22d3ee"],
                  ["Tactical", tacticalData, "#3ddc84"],
                  ["Physical", physicalData, "#f59e0b"],
                  ["Mentality", mentalData, "#a855f7"],
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
                  {evaluations
                    .slice()
                    .reverse()
                    .map((evaluation) => {
                      const notes = evaluationNotes(evaluation);

                      return (
                        <div
                          key={evaluation.id}
                          className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-white">
                                {evaluation.title || "Training evaluation"}
                              </p>
                              <p className="text-xs text-slate-400">
                                {formatDate(evaluation.start_datetime ?? "")}
                              </p>
                            </div>
                            <p className="text-xl font-bold text-cyan-200">
                              {formatRating(evaluation.overall_rating)}
                            </p>
                          </div>
                          {notes.length > 0 && (
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {notes.map((note) => (
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
                      );
                    })}
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState text="No backend evaluations have been published for you yet." />
          )}
        </>
      )}
    </div>
  );
}
