"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, LockKeyhole, Save } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetCoachMatchQuery,
  useUpsertMatchStatsMutation,
} from "@/lib/store/api/calendarApi";
import type { MatchPlayerStats } from "@/lib/store/api/calendarApi";
import { formatDate } from "@/lib/utils";

type RatingOption = {
  label: "Poor" | "Good" | "Very Good" | "Excellent";
  range: string;
  value: number;
  min: number;
  max: number;
};

type OptionField = {
  key: string;
  label: string;
  options: RatingOption[];
};

const rating10Options: RatingOption[] = [
  { label: "Poor", range: "0-3.9", value: 2, min: 0, max: 3.9 },
  { label: "Good", range: "4-6.4", value: 5, min: 4, max: 6.4 },
  { label: "Very Good", range: "6.5-8.4", value: 7.5, min: 6.5, max: 8.4 },
  { label: "Excellent", range: "8.5-10", value: 9.5, min: 8.5, max: 10 },
];

const percentageOptions: RatingOption[] = [
  { label: "Poor", range: "0-49", value: 25, min: 0, max: 49 },
  { label: "Good", range: "50-69", value: 60, min: 50, max: 69 },
  { label: "Very Good", range: "70-84", value: 77, min: 70, max: 84 },
  { label: "Excellent", range: "85-100", value: 92, min: 85, max: 100 },
];

const chanceOptions: RatingOption[] = [
  { label: "Poor", range: "0", value: 0, min: 0, max: 0 },
  { label: "Good", range: "1", value: 1, min: 1, max: 1 },
  { label: "Very Good", range: "2", value: 2, min: 2, max: 2 },
  { label: "Excellent", range: "3+", value: 4, min: 3, max: 100 },
];

const defensiveCountOptions: RatingOption[] = [
  { label: "Poor", range: "0-1", value: 1, min: 0, max: 1 },
  { label: "Good", range: "2-3", value: 3, min: 2, max: 3 },
  { label: "Very Good", range: "4-5", value: 5, min: 4, max: 5 },
  { label: "Excellent", range: "6+", value: 7, min: 6, max: 100 },
];

const duelsOptions: RatingOption[] = [
  { label: "Poor", range: "0-39", value: 25, min: 0, max: 39 },
  { label: "Good", range: "40-59", value: 50, min: 40, max: 59 },
  { label: "Very Good", range: "60-79", value: 70, min: 60, max: 79 },
  { label: "Excellent", range: "80-100", value: 90, min: 80, max: 100 },
];

const possessionLossOptions: RatingOption[] = [
  { label: "Poor", range: "11+", value: 12, min: 11, max: 100 },
  { label: "Good", range: "7-10", value: 8, min: 7, max: 10 },
  { label: "Very Good", range: "4-6", value: 5, min: 4, max: 6 },
  { label: "Excellent", range: "0-3", value: 2, min: 0, max: 3 },
];

const optionFields: OptionField[] = [
  { key: "passAccuracyPercentage", label: "Pass Accuracy %", options: percentageOptions },
  { key: "keyPasses", label: "Key Passes", options: chanceOptions },
  { key: "shotsOnTarget", label: "Shots on Target", options: chanceOptions },
  { key: "defensiveTackles", label: "Defensive Tackles", options: defensiveCountOptions },
  { key: "interceptions", label: "Interceptions", options: defensiveCountOptions },
  { key: "duelsWon", label: "Duels", options: duelsOptions },
  { key: "possessionLosses", label: "Possession Losses", options: possessionLossOptions },
  { key: "technicalRating", label: "Technical /10", options: rating10Options },
  { key: "tacticalRating", label: "Tactical /10", options: rating10Options },
  { key: "physicalRating", label: "Physical /10", options: rating10Options },
  { key: "mentalityRating", label: "Mentality /10", options: rating10Options },
  { key: "decisionMakingRating", label: "Decision Making /10", options: rating10Options },
  { key: "workRateRating", label: "Work Rate /10", options: rating10Options },
  { key: "positioningRating", label: "Positioning /10", options: rating10Options },
];

const textFields = [
  ["strengths", "Strengths"],
  ["weaknesses", "Weaknesses"],
  ["improvementPlan", "Improvement Plan"],
  ["coachNotes", "Coach Notes"],
] as const;

const camelToSnake = (value: string) =>
  value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const toNumber = (value: string) =>
  value === "" || Number.isNaN(Number(value)) ? undefined : Number(value);

const rawStatValue = (
  stat: MatchPlayerStats | undefined,
  key: string,
  drafts: Record<string, string>,
) => {
  if (drafts[key] !== undefined) return drafts[key];
  const snake = camelToSnake(key);
  const value = (stat as unknown as Record<string, string | number | null>)?.[
    snake
  ];
  return value === null || value === undefined ? "" : String(value);
};

const optionValue = (value: string, field: OptionField) => {
  if (value === "") return "";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "";
  const exact = field.options.find((option) => option.value === numeric);
  if (exact) return String(exact.value);
  const ranged = field.options.find(
    (option) => numeric >= option.min && numeric <= option.max,
  );
  return ranged ? String(ranged.value) : "";
};

const optionStatValue = (
  stat: MatchPlayerStats | undefined,
  field: OptionField,
  drafts: Record<string, string>,
) => {
  if (drafts[field.key] !== undefined) return drafts[field.key];
  return optionValue(rawStatValue(stat, field.key, drafts), field);
};

export default function MatchEvaluationPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const { data: match, isLoading } = useGetCoachMatchQuery(matchId);
  const [saveStats, { isLoading: saving }] = useUpsertMatchStatsMutation();
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [pageError, setPageError] = useState("");
  const [lockedAfterSave, setLockedAfterSave] = useState(false);

  const statsByPlayer = useMemo(
    () => new Map((match?.stats ?? []).map((stat) => [stat.player_id, stat])),
    [match?.stats],
  );
  const evaluationPlayers = useMemo(() => {
    const attendance = new Map(
      (match?.attendance ?? []).map((record) => [record.player_id, record]),
    );
    return (match?.squad ?? []).filter((player) => {
      const status = attendance.get(player.player_id)?.status;
      const stats = statsByPlayer.get(player.player_id);
      return (
        ["present", "late"].includes(status ?? "") ||
        Number(stats?.minutes_played || 0) > 0
      );
    });
  }, [match?.attendance, match?.squad, statsByPlayer]);

  const matchFinished = Boolean(
    match &&
      (match.match_status === "finished" ||
        match.status === "completed" ||
        match.status === "finished"),
  );
  const evaluationsLocked = Boolean(
    match?.evaluations_finalized_at || lockedAfterSave,
  );

  const updateDraft = (playerId: string, key: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [playerId]: { ...(prev[playerId] ?? {}), [key]: value },
    }));
  };

  const handleSave = async () => {
    if (!match || evaluationsLocked || !matchFinished) return;
    setPageError("");
    try {
      await saveStats({
        matchId,
        finalize: true,
        records: evaluationPlayers.map((player) => {
          const stat = statsByPlayer.get(player.player_id);
          const draft = drafts[player.player_id] ?? {};
          return {
            playerId: player.player_id,
            minutesPlayed: stat?.minutes_played ?? 0,
            goals: stat?.goals ?? 0,
            assists: stat?.assists ?? 0,
            tackles: stat?.tackles ?? 0,
            yellowCards: stat?.yellow_cards ?? 0,
            redCards: stat?.red_cards ?? 0,
            passesCompleted: stat?.passes_completed ?? 0,
            shotsTotal: stat?.shots_total ?? 0,
            duelsLost: stat?.duels_lost ?? 0,
            performanceRating: toNumber(
              rawStatValue(stat, "performanceRating", draft),
            ),
            ...Object.fromEntries(
              optionFields.map((field) => [
                field.key,
                toNumber(optionStatValue(stat, field, draft)),
              ]),
            ),
            ...Object.fromEntries(
              textFields.map(([key]) => [
                key,
                draft[key] ?? rawStatValue(stat, key, draft),
              ]),
            ),
          };
        }),
      }).unwrap();
      setLockedAfterSave(true);
      setDrafts({});
    } catch {
      setPageError("Could not save match evaluations.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Match Evaluations"
        description="Post-match player ratings and performance details."
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Matches", href: "/coach/matches" },
          { label: "Evaluation" },
        ]}
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading match...
        </div>
      )}

      {match && (
        <>
          <Card className="border-border/50 bg-card">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(match.match_date)}
                </p>
                <h2 className="text-xl font-semibold">
                  GOLX {match.our_score ?? 0} - {match.opponent_score ?? 0}{" "}
                  {match.opponent_name}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={match.match_status === "finished" ? "success" : "warning"}
                >
                  {match.match_status}
                </Badge>
                <Badge variant={evaluationsLocked ? "success" : "secondary"}>
                  {evaluationsLocked ? "locked" : "editable"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {pageError && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {pageError}
            </p>
          )}

          {evaluationsLocked && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Match evaluations are saved and locked.
            </div>
          )}

          {!matchFinished && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              <LockKeyhole className="h-4 w-4" />
              Finish the match before saving final evaluations.
            </div>
          )}

          <div className="space-y-4">
            {evaluationPlayers.map((player) => {
              const stat = statsByPlayer.get(player.player_id);
              const draft = drafts[player.player_id] ?? {};
              return (
                <Card
                  key={player.player_id}
                  className="border-border/50 bg-card"
                >
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
                      <span>{player.player_name}</span>
                      <span className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {stat?.minutes_played ?? 0} min
                        </Badge>
                        <Badge variant="secondary">
                          G/A {stat?.goals ?? 0}/{stat?.assists ?? 0}
                        </Badge>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                      <div className="space-y-1">
                        <Label>Overall /10</Label>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          step={0.5}
                          disabled={evaluationsLocked}
                          value={rawStatValue(stat, "performanceRating", draft)}
                          onChange={(event) =>
                            updateDraft(
                              player.player_id,
                              "performanceRating",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                      {optionFields.map((field) => (
                        <div key={field.key} className="space-y-1">
                          <Label>{field.label}</Label>
                          <Select
                            disabled={evaluationsLocked}
                            value={optionStatValue(stat, field, draft)}
                            onValueChange={(value) =>
                              updateDraft(player.player_id, field.key, value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((option) => (
                                <SelectItem
                                  key={`${field.key}-${option.label}`}
                                  value={String(option.value)}
                                >
                                  {option.label} ({option.range})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {textFields.map(([key, label]) => (
                        <div key={key} className="space-y-1">
                          <Label>{label}</Label>
                          <Textarea
                            disabled={evaluationsLocked}
                            value={rawStatValue(stat, key, draft)}
                            onChange={(event) =>
                              updateDraft(
                                player.player_id,
                                key,
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {!evaluationPlayers.length && (
            <Card className="border-border/50 bg-card">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No attended players are available for this match evaluation.
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            {evaluationsLocked ? (
              <Button type="button" variant="outline" className="gap-2" disabled>
                <LockKeyhole className="h-4 w-4" />
                Evaluations Locked
              </Button>
            ) : (
              <Button
                type="button"
                className="gap-2"
                disabled={saving || !evaluationPlayers.length || !matchFinished}
                onClick={handleSave}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Match Evaluations
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
