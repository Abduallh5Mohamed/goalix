"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  Check,
  Clock,
  Loader2,
  LockKeyhole,
  Save,
  Search,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useExtendCoachTrainingEventMutation,
  useGetCoachTrainingEventQuery,
  useUpsertTrainingAttendanceMutation,
  useUpsertTrainingEvaluationsMutation,
} from "@/lib/store/api/calendarApi";
import type { TrainingParticipant } from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

let trainingDetailClockSnapshot = 0;
const subscribeTrainingDetailClock = (onStoreChange: () => void) => {
  trainingDetailClockSnapshot = Date.now();
  onStoreChange();
  const intervalId = window.setInterval(() => {
    trainingDetailClockSnapshot = Date.now();
    onStoreChange();
  }, 1000);
  return () => window.clearInterval(intervalId);
};
const getTrainingDetailClockSnapshot = () => trainingDetailClockSnapshot;
const getServerTrainingDetailClockSnapshot = () => 0;

const ratingFields = [
  ["overallRating", "Overall"],
  ["ballControlRating", "Ball Control"],
  ["passingAccuracyRating", "Passing Accuracy"],
  ["shootingRating", "Shooting"],
  ["dribblingRating", "Dribbling"],
  ["receivingUnderPressureRating", "Receiving Under Pressure"],
  ["speedRating", "Speed"],
  ["enduranceRating", "Endurance"],
  ["fatigueRating", "Fatigue"],
  ["strengthRating", "Strength"],
  ["agilityRating", "Agility"],
] as const;

const goalkeeperRatingFields = [
  ["ballControlRating", "Handling"],
  ["passingAccuracyRating", "Distribution"],
  ["shootingRating", "Shot Stopping"],
  ["dribblingRating", "1v1 / Sweeper"],
  ["receivingUnderPressureRating", "Crosses / High Balls"],
  ["speedRating", "Reactions"],
  ["enduranceRating", "Concentration"],
  ["fatigueRating", "Fatigue"],
  ["strengthRating", "Command of Area"],
  ["agilityRating", "Footwork / Agility"],
] as const;

type RatingOption = {
  label: "Poor" | "Good" | "Very Good" | "Excellent";
  range: string;
  value: number;
  min: number;
  max: number;
};

const rating10Options: RatingOption[] = [
  { label: "Poor", range: "0-3.9", value: 2, min: 0, max: 3.9 },
  { label: "Good", range: "4-6.4", value: 5, min: 4, max: 6.4 },
  { label: "Very Good", range: "6.5-8.4", value: 7.5, min: 6.5, max: 8.4 },
  { label: "Excellent", range: "8.5-10", value: 9.5, min: 8.5, max: 10 },
];

const optionValue = (value: string) => {
  if (value === "") return "";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "";
  const exact = rating10Options.find((option) => option.value === numeric);
  if (exact) return String(exact.value);
  const ranged = rating10Options.find(
    (option) => numeric >= option.min && numeric <= option.max,
  );
  return ranged ? String(ranged.value) : "";
};

const nowTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
};

const toNumberOrUndefined = (value: string) =>
  value === "" ? undefined : Number(value);

const evaluationVisibility = (player: TrainingParticipant) =>
  player.evaluation?.visibility ?? "private";

const visibilityLabel = (visibility: string | null | undefined) =>
  visibility === "player_and_parent" ? "Published" : "Not published";

const isGoalkeeperPosition = (position?: string | null) => {
  const normalized = String(position ?? "").trim().toLowerCase();
  return normalized === "gk" || normalized.includes("goalkeeper");
};

const customProfileValue = (
  player: Pick<TrainingParticipant, "customProfile">,
  key: string,
  label: string,
) => {
  const field = player.customProfile.find(
    (item) =>
      item.key.toLowerCase() === key.toLowerCase() ||
      item.label.toLowerCase() === label.toLowerCase(),
  );
  const value = field?.value;
  return value === null || value === undefined ? "" : String(value);
};

const playerMainPosition = (
  player: Pick<TrainingParticipant, "position" | "customProfile">,
) => customProfileValue(player, "main_position", "Main Position") || player.position || "";

const WARNING_BEFORE_END_MS = 5 * 60 * 1000;
const FINAL_AUTOSAVE_BEFORE_END_MS = 10 * 1000;
const MAX_EXTENSION_MINUTES = 60;

export default function CoachTrainingEventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const { data: event, isLoading } = useGetCoachTrainingEventQuery(eventId);
  const nowMs = useSyncExternalStore(
    subscribeTrainingDetailClock,
    getTrainingDetailClockSnapshot,
    getServerTrainingDetailClockSnapshot,
  );
  const [upsertAttendance, { isLoading: savingAttendance }] =
    useUpsertTrainingAttendanceMutation();
  const [upsertEvaluations, { isLoading: savingEvaluation }] =
    useUpsertTrainingEvaluationsMutation();
  const [extendTraining, { isLoading: extendingTraining }] =
    useExtendCoachTrainingEventMutation();
  const warningAutoSaveKeyRef = useRef("");
  const finalAutoSaveAtRef = useRef(0);
  const [arrivalTimes, setArrivalTimes] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [evaluationMode, setEvaluationMode] = useState<"all" | "search">("all");
  const [evaluationSearch, setEvaluationSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [pageError, setPageError] = useState("");
  const [warningDismissedEndKey, setWarningDismissedEndKey] = useState("");
  const [extensionMinutes, setExtensionMinutes] = useState("10");
  const [autoSaving, setAutoSaving] = useState(false);
  const trainingStartMs = event ? Date.parse(event.start_datetime) : 0;
  const trainingEndMs = event ? Date.parse(event.end_datetime) : 0;
  const trainingOpen = Boolean(
    event &&
      event.status === "scheduled" &&
      nowMs >= trainingStartMs &&
      nowMs < trainingEndMs,
  );
  const trainingClosed = Boolean(
    event &&
      (event.status === "completed" ||
        event.status === "finished" ||
        nowMs >= trainingEndMs),
  );
  const trainingEndKey = event?.end_datetime ?? "";
  const minutesUntilClose = Math.max(
    0,
    Math.ceil((trainingEndMs - nowMs) / 60000),
  );
  const warningWindowOpen = Boolean(
    trainingOpen &&
      trainingEndMs - nowMs <= WARNING_BEFORE_END_MS &&
      trainingEndMs > nowMs,
  );
  const showClosingWarning = Boolean(
    warningWindowOpen && warningDismissedEndKey !== trainingEndKey,
  );

  const participants = useMemo(
    () => event?.participants ?? [],
    [event?.participants],
  );
  const attendedPlayers = useMemo(
    () =>
      participants.filter((player) =>
        ["present", "late"].includes(player.attendance?.status ?? ""),
      ),
    [participants],
  );
  const filteredEvaluationPlayers = useMemo(() => {
    const query = evaluationSearch.trim().toLowerCase();
    if (!query) return attendedPlayers;
    return attendedPlayers.filter((player) =>
      `${player.full_name} ${playerMainPosition(player)} ${player.position ?? ""} ${player.group_name ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [attendedPlayers, evaluationSearch]);
  const visibleEvaluationPlayers =
    evaluationMode === "all"
      ? attendedPlayers
      : selectedPlayerId
        ? attendedPlayers.filter((player) => player.id === selectedPlayerId)
        : [];

  const saveAttendance = async (
    player: TrainingParticipant,
    status: "present" | "late" | "absent" | "injured",
  ) => {
    if (!trainingOpen) {
      setPageError("Training is only open during its scheduled time.");
      return;
    }
    setPageError("");
    try {
      await upsertAttendance({
        eventId,
        records: [
          {
            playerId: player.id,
            status,
            arrivalTime:
              status === "present" || status === "late"
                ? arrivalTimes[player.id] || nowTime()
                : undefined,
          },
        ],
      }).unwrap();
    } catch {
      setPageError("Could not save attendance.");
    }
  };

  const fieldValue = (player: TrainingParticipant, field: string) => {
    if (drafts[player.id]?.[field] !== undefined) return drafts[player.id][field];
    const snake = field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    return String(
      (player.evaluation as unknown as Record<string, string | number | null>)?.[
        snake
      ] ?? "",
    );
  };

  const saveDraftedTrainingData = useCallback(async () => {
    const attendanceRecords = participants
      .filter((player) => {
        const status = player.attendance?.status;
        return (
          (status === "present" || status === "late") &&
          Boolean(arrivalTimes[player.id])
        );
      })
      .map((player) => ({
        playerId: player.id,
        status: player.attendance?.status,
        arrivalTime: arrivalTimes[player.id],
      }));

    if (attendanceRecords.length) {
      await upsertAttendance({
        eventId,
        records: attendanceRecords,
      }).unwrap();
    }

    if (attendedPlayers.length) {
      await upsertEvaluations({
        eventId,
        records: attendedPlayers.map((player) => {
          const draft = drafts[player.id] ?? {};
          const getValue = (field: string) => {
            if (draft[field] !== undefined) return draft[field];
            const snake = field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
            return String(
              (player.evaluation as unknown as Record<
                string,
                string | number | null
              >)?.[snake] ?? "",
            );
          };

          return {
            playerId: player.id,
            ...Object.fromEntries(
              ratingFields.map(([key]) => [
                key,
                toNumberOrUndefined(getValue(key)),
              ]),
            ),
            strengths: draft.strengths ?? player.evaluation?.strengths ?? "",
            weaknesses: draft.weaknesses ?? player.evaluation?.weaknesses ?? "",
            coachNotes: draft.coachNotes ?? player.evaluation?.coach_notes ?? "",
            improvementPlan:
              draft.improvementPlan ?? player.evaluation?.improvement_plan ?? "",
            developmentNotes:
              draft.developmentNotes ??
              player.evaluation?.development_notes ??
              "",
            visibility:
              draft.visibility ??
              player.evaluation?.visibility ??
              "private",
          };
        }),
      }).unwrap();
    }
  }, [
    arrivalTimes,
    attendedPlayers,
    drafts,
    eventId,
    participants,
    upsertAttendance,
    upsertEvaluations,
  ]);

  const saveEvaluation = async (player: TrainingParticipant) => {
    if (!trainingOpen) {
      setPageError("Training is only open during its scheduled time.");
      return;
    }
    const draft = drafts[player.id] ?? {};
    setPageError("");
    try {
      await upsertEvaluations({
        eventId,
        records: [
          {
            playerId: player.id,
            ...Object.fromEntries(
              ratingFields.map(([key]) => [
                key,
                toNumberOrUndefined(
                  draft[key] ?? fieldValue(player, key),
                ),
              ]),
            ),
            strengths: draft.strengths ?? player.evaluation?.strengths ?? "",
            weaknesses: draft.weaknesses ?? player.evaluation?.weaknesses ?? "",
            coachNotes: draft.coachNotes ?? player.evaluation?.coach_notes ?? "",
            improvementPlan:
              draft.improvementPlan ?? player.evaluation?.improvement_plan ?? "",
            developmentNotes:
              draft.developmentNotes ?? player.evaluation?.development_notes ?? "",
            visibility:
              draft.visibility ??
              player.evaluation?.visibility ??
              "private",
          },
        ],
      }).unwrap();
      setDrafts((prev) => ({ ...prev, [player.id]: {} }));
    } catch {
      setPageError("Could not save evaluation.");
    }
  };

  useEffect(() => {
    if (!warningWindowOpen || !trainingEndKey) return;
    if (warningAutoSaveKeyRef.current === trainingEndKey) return;

    warningAutoSaveKeyRef.current = trainingEndKey;
    saveDraftedTrainingData().catch(() => {
      setPageError("Could not auto-save training data.");
    });
  }, [saveDraftedTrainingData, trainingEndKey, warningWindowOpen]);

  useEffect(() => {
    if (!trainingOpen || !trainingEndKey) return;
    const timeLeft = trainingEndMs - nowMs;
    if (timeLeft > FINAL_AUTOSAVE_BEFORE_END_MS) return;
    if (nowMs - finalAutoSaveAtRef.current < 3000) return;

    finalAutoSaveAtRef.current = nowMs;
    saveDraftedTrainingData().catch(() => {
      setPageError("Could not auto-save training data before closing.");
    });
  }, [
    nowMs,
    saveDraftedTrainingData,
    trainingEndKey,
    trainingEndMs,
    trainingOpen,
  ]);

  const acknowledgeClosingWarning = async () => {
    if (!trainingEndKey) return;
    setAutoSaving(true);
    setPageError("");
    try {
      await saveDraftedTrainingData();
      setWarningDismissedEndKey(trainingEndKey);
    } catch {
      setPageError("Could not auto-save training data.");
    } finally {
      setAutoSaving(false);
    }
  };

  const extendTrainingTime = async () => {
    const minutes = Math.min(
      MAX_EXTENSION_MINUTES,
      Math.max(1, Number(extensionMinutes) || 1),
    );
    setAutoSaving(true);
    setPageError("");
    try {
      await saveDraftedTrainingData();
      await extendTraining({ id: eventId, minutes }).unwrap();
      setExtensionMinutes("10");
      setWarningDismissedEndKey("");
      warningAutoSaveKeyRef.current = "";
      finalAutoSaveAtRef.current = 0;
    } catch {
      setPageError("Could not extend training time.");
    } finally {
      setAutoSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={event?.title ?? "Training"}
        description="Attendance, player details, and training evaluation."
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Calendar", href: "/coach/calendar" },
          { label: "Training" },
        ]}
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading training...
        </div>
      )}

      {event && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <InfoTile label="Date" value={formatDate(event.start_datetime)} />
            <InfoTile
              label="Time"
              value={`${formatTime12(event.start_datetime)} - ${formatTime12(
                event.end_datetime,
              )}`}
            />
            <InfoTile
              label="Focus"
              value={event.training?.training_focus?.replaceAll("_", " ") ?? "-"}
            />
            <InfoTile
              label="Players"
              value={`${participants.length} targeted`}
            />
          </div>

          {!trainingOpen && (
            <div className="flex items-start gap-3 rounded-md border border-border/50 bg-muted/10 p-4 text-sm text-muted-foreground">
              <LockKeyhole className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="font-medium text-foreground">
                  {trainingClosed ? "Training is closed" : "Training is not open yet"}
                </p>
                <p className="mt-1">
                  Open window: {formatTime12(event.start_datetime)} -{" "}
                  {formatTime12(event.end_datetime)}
                </p>
              </div>
            </div>
          )}

          {pageError && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {pageError}
            </p>
          )}

          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {participants.map((player) => (
                <div
                  key={player.id}
                  className="grid gap-3 rounded-md border border-border/50 p-3 lg:grid-cols-[1fr_140px_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{player.full_name}</p>
                      <Badge variant="outline">
                        {player.attendance?.status ?? "not marked"}
                      </Badge>
                      {player.group_name && (
                        <Badge variant="secondary">{player.group_name}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {player.username ?? "no username"} -{" "}
                      {player.phone ?? player.account_phone ?? "no phone"} -{" "}
                      Guardian {player.guardian_phone ?? "-"}
                    </p>
                  </div>
                  <Input
                    type="time"
                    disabled={!trainingOpen}
                    value={
                      arrivalTimes[player.id] ??
                      player.attendance?.arrival_time?.slice(0, 5) ??
                      ""
                    }
                    onChange={(event) =>
                      setArrivalTimes((prev) => ({
                        ...prev,
                        [player.id]: event.target.value,
                      }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingAttendance || !trainingOpen}
                      onClick={() => saveAttendance(player, "present")}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingAttendance || !trainingOpen}
                      onClick={() => saveAttendance(player, "late")}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingAttendance || !trainingOpen}
                      onClick={() => saveAttendance(player, "absent")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Evaluation View</p>
                  <p className="text-xs text-muted-foreground">
                    {attendedPlayers.length} attended player
                    {attendedPlayers.length === 1 ? "" : "s"} ready for review.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={evaluationMode === "all" ? "default" : "outline"}
                    onClick={() => {
                      setEvaluationMode("all");
                      setSelectedPlayerId("");
                    }}
                  >
                    All players
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={evaluationMode === "search" ? "default" : "outline"}
                    onClick={() => setEvaluationMode("search")}
                  >
                    Search player
                  </Button>
                </div>
              </div>

              {evaluationMode === "search" && (
                <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        value={evaluationSearch}
                        onChange={(event) =>
                          setEvaluationSearch(event.target.value)
                        }
                        placeholder="Search attended players"
                      />
                    </div>
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {filteredEvaluationPlayers.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                            selectedPlayerId === player.id
                              ? "border-primary bg-primary/10"
                              : "border-border/50 hover:bg-muted/30"
                          }`}
                          onClick={() => setSelectedPlayerId(player.id)}
                        >
                          <span className="font-medium">{player.full_name}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {player.position ?? "No position"} -{" "}
                            {player.group_name ?? "No group"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {!selectedPlayerId && (
                    <div className="flex min-h-40 items-center justify-center rounded-md border border-border/50 text-sm text-muted-foreground">
                      Select a player to open his evaluation section.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {visibleEvaluationPlayers.map((player) => {
              const mainPosition = playerMainPosition(player);
              const activeRatingFields = isGoalkeeperPosition(mainPosition)
                ? goalkeeperRatingFields
                : ratingFields.slice(1);

              return (
              <Card key={player.id} className="border-border/50 bg-card">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
                    <span className="flex flex-wrap items-center gap-2">
                      {player.full_name}
                      {isGoalkeeperPosition(mainPosition) && (
                        <Badge variant="secondary">GK</Badge>
                      )}
                    </span>
                    <span className="flex flex-wrap gap-2">
                      <Badge variant="info">
                        {player.totals.attendance.present +
                          player.totals.attendance.late}{" "}
                        attended
                      </Badge>
                      <Badge variant="warning">
                        {player.totals.attendance.absent} absent
                      </Badge>
                      <Badge variant="outline">
                        {player.totals.matches.minutes_played} match min
                      </Badge>
                      <Badge
                        variant={
                          (
                            drafts[player.id]?.visibility ??
                            evaluationVisibility(player)
                          ) === "player_and_parent"
                            ? "success"
                            : "secondary"
                        }
                      >
                        {visibilityLabel(
                          drafts[player.id]?.visibility ??
                            evaluationVisibility(player),
                        )}
                      </Badge>
                      <Badge variant="destructive">
                        {player.totals.injuries} injuries
                      </Badge>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <InfoTile
                      label="Matches"
                      value={String(player.totals.matches.matches_played)}
                    />
                    <InfoTile
                      label="Goals / Assists"
                      value={`${player.totals.matches.goals} / ${player.totals.matches.assists}`}
                    />
                    <InfoTile
                      label="Pass Accuracy"
                      value={
                        player.totals.matches.pass_accuracy_percentage
                          ? `${player.totals.matches.pass_accuracy_percentage}%`
                          : "-"
                      }
                    />
                    <InfoTile
                      label="Match Rating"
                      value={String(player.totals.matches.average_rating ?? "-")}
                    />
                  </div>

                  {player.customProfile.length > 0 && (
                    <div className="grid gap-2 md:grid-cols-3">
                      {player.customProfile.slice(0, 9).map((field) => (
                        <div
                          key={`${player.id}-${field.key}`}
                          className="rounded-md border border-border/40 px-3 py-2 text-sm"
                        >
                          <p className="text-xs text-muted-foreground">
                            {field.label}
                          </p>
                          <p className="font-medium">{String(field.value ?? "-")}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="space-y-1">
                      <Label>Overall /10</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        disabled={!trainingOpen}
                        value={fieldValue(player, "overallRating")}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [player.id]: {
                              ...(prev[player.id] ?? {}),
                              overallRating: event.target.value,
                            },
                          }))
                        }
                        />
                      </div>
                    {activeRatingFields.map(([key, label]) => (
                      <div key={key} className="space-y-1">
                        <Label>{label} /10</Label>
                        <Select
                          disabled={!trainingOpen}
                          value={
                            drafts[player.id]?.[key] !== undefined
                              ? drafts[player.id][key]
                              : optionValue(fieldValue(player, key))
                          }
                          onValueChange={(value) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [player.id]: {
                                ...(prev[player.id] ?? {}),
                                [key]: value,
                              },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                          <SelectContent>
                            {rating10Options.map((option) => (
                              <SelectItem
                                key={`${key}-${option.label}`}
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
                    {[
                      ["strengths", "Strengths"],
                      ["weaknesses", "Weaknesses"],
                      ["developmentNotes", "Development Notes"],
                      ["improvementPlan", "Improvement Plan"],
                    ].map(([key, label]) => (
                      <div key={key} className="space-y-1">
                        <Label>{label}</Label>
                        <Textarea
                          disabled={!trainingOpen}
                          value={
                            drafts[player.id]?.[key] ??
                            String(
                              (player.evaluation as unknown as Record<
                                string,
                                string | null
                              >)?.[
                                key === "coachNotes"
                                  ? "coach_notes"
                                  : key.replace(/[A-Z]/g, (letter) =>
                                      `_${letter.toLowerCase()}`,
                                    )
                              ] ?? "",
                            )
                          }
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [player.id]: {
                                ...(prev[player.id] ?? {}),
                                [key]: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {player.monthlyProgress.slice(-6).map((point) => (
                        <Badge key={point.month} variant="outline">
                          <Activity className="mr-1 h-3 w-3" />
                          {point.month}: {point.average_rating ?? "-"}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="w-44 space-y-1">
                        <Label>Player visibility</Label>
                        <Select
                          disabled={!trainingOpen}
                          value={
                            drafts[player.id]?.visibility ??
                            evaluationVisibility(player)
                          }
                          onValueChange={(value) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [player.id]: {
                                ...(prev[player.id] ?? {}),
                                visibility: value,
                              },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="private">Not published</SelectItem>
                            <SelectItem value="player_and_parent">
                              Publish
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        className="gap-2"
                        disabled={savingEvaluation || !trainingOpen}
                        onClick={() => saveEvaluation(player)}
                      >
                        <Save className="h-4 w-4" />
                        Save Evaluation
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </>
      )}

      <Dialog
        open={showClosingWarning}
        onOpenChange={(open) => {
          if (!open && trainingEndKey) {
            setWarningDismissedEndKey(trainingEndKey);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Training closes soon</DialogTitle>
            <DialogDescription>
              This training closes in {minutesUntilClose} minute
              {minutesUntilClose === 1 ? "" : "s"}. Current attendance times and
              player evaluations are being auto-saved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-border/50 bg-muted/10 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">Current window</p>
              <p className="mt-1 font-medium">
                {event
                  ? `${formatTime12(event.start_datetime)} - ${formatTime12(
                      event.end_datetime,
                    )}`
                  : "-"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Extend by minutes</Label>
              <Input
                type="number"
                min={1}
                max={MAX_EXTENSION_MINUTES}
                value={extensionMinutes}
                onChange={(changeEvent) =>
                  setExtensionMinutes(changeEvent.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum total extension is one hour.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={autoSaving || extendingTraining}
              onClick={acknowledgeClosingWarning}
            >
              {autoSaving && !extendingTraining && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              OK
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={autoSaving || extendingTraining}
              onClick={extendTrainingTime}
            >
              {extendingTraining && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Extend Time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 bg-muted/10 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium capitalize">{value}</p>
    </div>
  );
}
