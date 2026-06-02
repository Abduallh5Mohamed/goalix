"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  CircleGauge,
  ClipboardList,
  Loader2,
  RefreshCw,
  Save,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  injuryRiskPositionGroups,
  type InjuryRiskPositionGroup,
} from "@/lib/football/injury-risk-position-groups";
import {
  type InjuryRiskPrediction,
  type InjuryRiskPainDiscomfortRecord,
  useGetInjuryRiskPredictionsQuery,
  useGetInjuryRiskPainDiscomfortQuery,
  useRunInjuryRiskPredictionsMutation,
  useUpsertInjuryRiskPainDiscomfortMutation,
} from "@/lib/store/api/calendarApi";
import { cn } from "@/lib/utils";

const modelInputs = [
  {
    label: "Age",
    detail: "Player age in years.",
  },
  {
    label: "Position",
    detail: "Derived from Football information / Main Position.",
  },
  {
    label: "Attendance Rate",
    detail: "Monthly attendance percentage from training sessions and matches.",
  },
  {
    label: "Training Sessions / Week",
    detail: "Attended training sessions in the current week.",
  },
  {
    label: "Match Minutes Last Week",
    detail: "Total played match minutes from the last 7 days.",
  },
  {
    label: "Fatigue Rating",
    detail: "Fatigue from the latest played match or attended training.",
  },
  {
    label: "Previous Injury",
    detail: "Match injuries plus training injury marks from the last three months.",
  },
  {
    label: "Pain or Discomfort",
    detail: "Weekly coach-entered binary flag (0 or 1).",
  },
];

const positionDescriptions: Record<InjuryRiskPositionGroup, string> = {
  Defender: "Defensive line and goalkeeper positions.",
  Midfielder: "Central, defensive, and wide midfield roles.",
  Forward: "Striker, center forward, and winger roles.",
};

const sourceRules = [
  {
    input: "Attendance Rate",
    source:
      "Use injury_risk_monthly_attendance for the current month. It combines attended training sessions and matches divided by total targeted training sessions and squad/attendance matches.",
  },
  {
    input: "Training Sessions / Week",
    source:
      "Count current-week event_attendance rows marked present or late for training events.",
  },
  {
    input: "Match Minutes Last Week",
    source:
      "Sum match_player_stats.minutes_played from finished matches in the rolling last 7 days.",
  },
  {
    input: "Fatigue Rating",
    source:
      "Use the fatigue rating from the latest activity the player actually did: a played match with minutes above 0 or an attended training session.",
  },
  {
    input: "Previous Injury",
    source:
      "Count match_player_incidents where incident_type is injury plus event_attendance rows marked injured, only inside the last three months.",
  },
  {
    input: "Pain or Discomfort",
    source:
      "Use the current-week coach submission from injury_risk_weekly_pain_discomfort. Missing values are treated as 0 in the model input view.",
  },
];

type PainValue = 0 | 1;

const emptyPainRows: InjuryRiskPainDiscomfortRecord[] = [];

const isPainValue = (value: unknown): value is PainValue =>
  value === 0 || value === 1;

const formatDateOnly = (value: string | null | undefined) => {
  if (!value) return "--";
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(
      new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    );
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
};

const riskBadgeVariant = (
  prediction: InjuryRiskPrediction | null,
): "destructive" | "warning" | "success" | "outline" => {
  if (prediction?.risk_level === "High") return "destructive";
  if (prediction?.risk_level === "Medium") return "warning";
  if (prediction?.risk_level === "Low") return "success";
  return "outline";
};

export default function CoachInjuryRiskAIPage() {
  const {
    data: painRows = emptyPainRows,
    isLoading: loadingPainRows,
    isFetching: fetchingPainRows,
    isError: painRowsError,
    refetch,
  } = useGetInjuryRiskPainDiscomfortQuery();
  const [savePainRows, { isLoading: savingPainRows, error: saveError }] =
    useUpsertInjuryRiskPainDiscomfortMutation();
  const {
    data: predictionRows = [],
    isLoading: loadingPredictions,
    isFetching: fetchingPredictions,
  } = useGetInjuryRiskPredictionsQuery();
  const [
    runPredictions,
    { isLoading: runningPredictions, error: predictionRunError },
  ] = useRunInjuryRiskPredictionsMutation();
  const [drafts, setDrafts] = useState<Record<string, PainValue | undefined>>(
    {},
  );
  const [saved, setSaved] = useState(false);

  const weekLabel = useMemo(() => {
    const firstRow = painRows[0];
    if (!firstRow) return "Current week";
    return `${formatDateOnly(firstRow.week_start)} - ${formatDateOnly(
      firstRow.week_end,
    )}`;
  }, [painRows]);

  const draftKey = (row: InjuryRiskPainDiscomfortRecord) =>
    `${row.week_start}:${row.player_id}`;
  const selectedValueFor = (row: InjuryRiskPainDiscomfortRecord) => {
    const draft = drafts[draftKey(row)];
    if (isPainValue(draft)) return draft;
    return isPainValue(row.pain_or_discomfort)
      ? row.pain_or_discomfort
      : undefined;
  };

  const selectedCount = painRows.filter((row) =>
    isPainValue(selectedValueFor(row)),
  ).length;
  const canSave =
    painRows.length > 0 &&
    selectedCount === painRows.length &&
    !savingPainRows &&
    !runningPredictions;

  const updateDraft = (
    row: InjuryRiskPainDiscomfortRecord,
    value: PainValue,
  ) => {
    setSaved(false);
    setDrafts((current) => ({ ...current, [draftKey(row)]: value }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    try {
      await savePainRows({
        records: painRows.map((row) => ({
          playerId: row.player_id,
          painOrDiscomfort: selectedValueFor(row) as PainValue,
        })),
      }).unwrap();
      await runPredictions().unwrap();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaved(false);
    }
  };

  const handleRunModel = async () => {
    try {
      await runPredictions().unwrap();
    } catch {
      setSaved(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Injury Risk AI"
        description="Model input readiness for player injury risk classification."
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Injury Risk AI" },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-[#253f5a] bg-[#06111f]/86 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg border border-lime-300/30 bg-lime-300/10 text-lime-300">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Model Inputs</h2>
              <p className="text-sm text-slate-400">
                These are the fields the future model will classify from.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {modelInputs.map((input) => (
              <div
                key={input.label}
                className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-cyan-300/10 text-cyan-200">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-100">{input.label}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">{input.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#253f5a] bg-[#06111f]/86 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg border border-amber-300/30 bg-amber-300/10 text-amber-200">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Current Scope</h2>
              <p className="text-sm text-slate-400">Local model is connected.</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <Activity className="mt-0.5 h-4 w-4 text-lime-300" />
              <span>Predictions are saved per player ID.</span>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <CircleGauge className="mt-0.5 h-4 w-4 text-cyan-200" />
              <span>Position is normalized into three model categories.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Weekly Pain or Discomfort
            </h2>
            <p className="mt-1 text-sm text-slate-400">{weekLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {saved && (
              <Badge variant="success" className="h-8 gap-1.5 px-3">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={fetchingPainRows || savingPainRows}
              className="border-[#253f5a] text-slate-100 hover:bg-white/10"
            >
              <RefreshCw
                className={cn("h-4 w-4", fetchingPainRows && "animate-spin")}
              />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!canSave}
              className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
            >
              {savingPainRows || runningPredictions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save + Run Model
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRunModel}
              disabled={runningPredictions || savingPainRows}
              className="bg-lime-300 text-slate-950 hover:bg-lime-200"
            >
              {runningPredictions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BrainCircuit className="h-4 w-4" />
              )}
              Run Model
            </Button>
          </div>
        </div>

        {(painRowsError || saveError || predictionRunError) && (
          <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertTriangle className="h-4 w-4" />
            <span>Unable to complete the injury risk operation.</span>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-[#253f5a] bg-[#06111f]/86">
          {loadingPainRows ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-14 rounded-lg bg-white/[0.06]"
                />
              ))}
            </div>
          ) : painRows.length ? (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[#253f5a] bg-white/[0.035] text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Player</th>
                  <th className="px-4 py-3 font-semibold">Position</th>
                  <th className="px-4 py-3 font-semibold">Pain or Discomfort</th>
                  <th className="px-4 py-3 font-semibold">Current Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#253f5a]">
                {painRows.map((row) => {
                  const selectedValue = selectedValueFor(row);
                  return (
                    <tr key={row.player_id}>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-100">
                          {row.player_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.updated_at
                            ? `Updated ${formatDateOnly(row.updated_at)}`
                            : "Not submitted"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {row.position || "--"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="inline-flex rounded-lg border border-[#253f5a] bg-white/[0.025] p-1">
                          {([0, 1] as const).map((value) => (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={selectedValue === value}
                              onClick={() => updateDraft(row, value)}
                              className={cn(
                                "h-9 w-12 rounded-md text-sm font-semibold text-slate-300 transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70",
                                selectedValue === value &&
                                  value === 0 &&
                                  "bg-emerald-400/[0.16] text-emerald-100 ring-1 ring-emerald-300/40",
                                selectedValue === value &&
                                  value === 1 &&
                                  "bg-amber-400/[0.16] text-amber-100 ring-1 ring-amber-300/40",
                              )}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {isPainValue(selectedValue) ? (
                          <Badge
                            variant={selectedValue === 1 ? "warning" : "success"}
                            className="min-w-12 justify-center"
                          >
                            {selectedValue}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400">
                            Pending
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-slate-400">
              No players available.
            </div>
          )}
        </div>

        {painRows.length > 0 && (
          <div className="text-xs text-slate-500">
            {selectedCount}/{painRows.length} selected
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Model Output</h2>
            <p className="mt-1 text-sm text-slate-400">
              {fetchingPredictions ? "Refreshing results" : "Latest saved predictions"}
            </p>
          </div>
          {predictionRows.length > 0 && (
            <Badge variant="secondary" className="w-fit">
              {predictionRows.filter((row) => row.prediction).length}/
              {predictionRows.length} predicted
            </Badge>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-[#253f5a] bg-[#06111f]/86">
          {loadingPredictions ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-16 rounded-lg bg-white/[0.06]"
                />
              ))}
            </div>
          ) : predictionRows.length ? (
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-[#253f5a] bg-white/[0.035] text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Player</th>
                  <th className="px-4 py-3 font-semibold">Input</th>
                  <th className="px-4 py-3 font-semibold">Risk</th>
                  <th className="px-4 py-3 font-semibold">Recommendation</th>
                  <th className="px-4 py-3 font-semibold">Run</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#253f5a]">
                {predictionRows.map((row) => (
                  <tr key={row.player_id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-100">
                        {row.player_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.input?.position || row.position || "--"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs leading-5 text-slate-400">
                      {row.input ? (
                        <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">
                          <span>Age {row.input.age ?? "--"}</span>
                          <span>Position {row.input.position}</span>
                          <span>Attendance {(row.input.attendance_rate * 100).toFixed(0)}%</span>
                          <span>Sessions {row.input.training_sessions_per_week}</span>
                          <span>Minutes {row.input.match_minutes_last_week}</span>
                          <span>Fatigue {row.input.fatigue_rating}/10</span>
                          <span>Injury {row.input.previous_injury}</span>
                          <span>Pain {row.input.pain_or_discomfort}</span>
                        </div>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {row.error ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : row.prediction ? (
                        <div className="space-y-2">
                          <Badge
                            variant={riskBadgeVariant(row.prediction)}
                            className="min-w-20 justify-center"
                          >
                            {row.prediction.risk_level}
                          </Badge>
                          <div className="text-xs text-slate-400">
                            {row.prediction.risk_percentage}%
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-slate-400">
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      {row.error ||
                        row.prediction?.recommendation ||
                        "--"}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">
                      {row.created_at ? formatDateOnly(row.created_at) : "--"}
                      {row.model_version && (
                        <div className="mt-1">{row.model_version}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-slate-400">
              No model output yet.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Position Mapping</h2>
          <p className="mt-1 text-sm text-slate-400">
            Football information / Main Position is grouped into these buckets for this model input only.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#253f5a] bg-[#06111f]/86">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-[#253f5a] bg-white/[0.035] text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Model Category</th>
                <th className="px-4 py-3 font-semibold">Match Configuration Positions</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#253f5a]">
              {(Object.entries(injuryRiskPositionGroups) as Array<
                [InjuryRiskPositionGroup, string[]]
              >).map(([group, positions]) => (
                <tr key={group} className="align-top">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100">{group}</span>
                      <Badge variant="secondary">{positions.length}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {positions.map((position) => (
                        <Badge key={position} variant="outline" className="rounded-full">
                          {position}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-400">
                    {positionDescriptions[group]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Input Source Rules</h2>
          <p className="mt-1 text-sm text-slate-400">
            These rules prepare the database inputs before any model is connected.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#253f5a] bg-[#06111f]/86">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-[#253f5a] bg-white/[0.035] text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Input</th>
                <th className="px-4 py-3 font-semibold">Prepared Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#253f5a]">
              {sourceRules.map((rule) => (
                <tr key={rule.input}>
                  <td className="px-4 py-4 font-semibold text-slate-100">{rule.input}</td>
                  <td className="px-4 py-4 text-slate-400">{rule.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
