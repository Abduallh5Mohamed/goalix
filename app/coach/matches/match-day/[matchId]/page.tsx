"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarClock,
  Check,
  Clock,
  Loader2,
  PauseCircle,
  Play,
  Plus,
  Radio,
  RotateCcw,
  ShieldAlert,
  Square,
  X,
} from "lucide-react";
import { QrAttendanceScanner } from "@/components/attendance/QrAttendanceScanner";
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
  useDeleteMatchGoalMutation,
  useDeleteMatchIncidentMutation,
  useGetCoachMatchQuery,
  useRecordMatchGoalMutation,
  useRecordMatchIncidentMutation,
  useRecordMatchSubstitutionMutation,
  useDeleteMatchSubstitutionMutation,
  useUpdateMatchLiveStatusMutation,
  useUpsertMatchAttendanceMutation,
} from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12, localDateTimeTimestamp } from "@/lib/utils";

let clockSnapshot = 0;
const subscribeMatchClock = (onStoreChange: () => void) => {
  clockSnapshot = Date.now();
  onStoreChange();
  const intervalId = window.setInterval(() => {
    clockSnapshot = Date.now();
    onStoreChange();
  }, 1000);
  return () => window.clearInterval(intervalId);
};
const getMatchClockSnapshot = () => clockSnapshot;
const getServerMatchClockSnapshot = () => 0;

const getApiMessage = (error: unknown, fallback: string) => {
  const apiError = error as {
    data?: {
      message?: string;
      errors?: Array<{ message?: string }>;
      error?: { message?: string; details?: Array<{ message?: string }> };
    };
  };
  return (
    apiError.data?.error?.details?.[0]?.message ??
    apiError.data?.errors?.[0]?.message ??
    apiError.data?.error?.message ??
    apiError.data?.message ??
    fallback
  );
};

const matchStartTimestamp = (match?: {
  match_date: string;
  match_time: string;
}) =>
  match ? localDateTimeTimestamp(match.match_date, match.match_time) : 0;

export default function CoachMatchDayPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const matchId = String(params.matchId || "");
  const { data: match, isLoading, refetch } = useGetCoachMatchQuery(matchId, {
    skip: !matchId,
    pollingInterval: 15000,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });
  const [upsertAttendance, { isLoading: savingAttendance }] =
    useUpsertMatchAttendanceMutation();
  const [updateLiveStatus, { isLoading: updatingLiveStatus }] =
    useUpdateMatchLiveStatusMutation();
  const autoStartAttemptRef = useRef("");
  const [recordIncident, { isLoading: recordingIncident }] =
    useRecordMatchIncidentMutation();
  const [deleteIncident, { isLoading: deletingIncident }] =
    useDeleteMatchIncidentMutation();
  const [recordGoal, { isLoading: recordingGoal }] =
    useRecordMatchGoalMutation();
  const [deleteGoal, { isLoading: deletingGoal }] =
    useDeleteMatchGoalMutation();
  const [recordSubstitution, { isLoading: recordingSubstitution }] =
    useRecordMatchSubstitutionMutation();
  const [deleteSubstitution, { isLoading: deletingSubstitution }] =
    useDeleteMatchSubstitutionMutation();
  const nowMs = useSyncExternalStore(
    subscribeMatchClock,
    getMatchClockSnapshot,
    getServerMatchClockSnapshot,
  );
  const [firstHalfStoppage, setFirstHalfStoppage] = useState<string | null>(
    null,
  );
  const [secondHalfStoppage, setSecondHalfStoppage] = useState<string | null>(
    null,
  );
  const [pageError, setPageError] = useState("");
  const [injuryDialog, setInjuryDialog] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);
  const [substitutionDialog, setSubstitutionDialog] = useState<{
    outPlayerId: string;
    outPlayerName: string;
  } | null>(null);
  const [substitutionInPlayerId, setSubstitutionInPlayerId] = useState("");
  const [substitutionReason, setSubstitutionReason] = useState("");
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({
    team: "our" as "our" | "opponent",
    scorerPlayerId: "",
    assistPlayerId: "none",
    notes: "",
  });
  const [injuryBodyPart, setInjuryBodyPart] = useState("");
  const [injuryNotes, setInjuryNotes] = useState("");

  const configured = Boolean(match?.tactics && match.squad?.length);
  const startMs = matchStartTimestamp(match);
  const matchDayOpenMinutes = Number(
    match?.academy_settings?.matchDayOpenMinutesBeforeKickoff ?? 5,
  );
  const safeMatchDayOpenMinutes = Number.isFinite(matchDayOpenMinutes)
    ? Math.max(0, Math.min(240, Math.round(matchDayOpenMinutes)))
    : 5;
  const unlockMs = startMs - safeMatchDayOpenMinutes * 60 * 1000;
  const kickOffReached = Boolean(startMs && nowMs >= startMs);
  const matchDayOpen = Boolean(
    match && configured && match.status !== "cancelled" && nowMs >= unlockMs,
  );
  const activeFirstHalfStoppage =
    firstHalfStoppage ?? String(match?.first_half_stoppage_minutes ?? 0);
  const activeSecondHalfStoppage =
    secondHalfStoppage ?? String(match?.second_half_stoppage_minutes ?? 0);
  const firstHalfLimit = 45 + Number(activeFirstHalfStoppage || 0);
  const secondHalfLimit = 45 + Number(activeSecondHalfStoppage || 0);
  const liveMinute = useMemo(() => {
    if (!match) return 0;
    if (match.match_status === "first_half") {
      const halfStart = match.first_half_started_at || match.started_at;
      if (!halfStart) return 0;
      return Math.min(
        firstHalfLimit,
        Math.max(0, Math.floor((nowMs - Date.parse(halfStart)) / 60000)),
      );
    }
    if (match.match_status === "second_half") {
      const halfStart = match.second_half_started_at;
      if (!halfStart) return firstHalfLimit;
      return (
        firstHalfLimit +
        Math.min(
          secondHalfLimit,
          Math.max(0, Math.floor((nowMs - Date.parse(halfStart)) / 60000)),
        )
      );
    }
    if (match.match_status === "finished") {
      return firstHalfLimit + secondHalfLimit;
    }
    return 0;
  }, [firstHalfLimit, match, nowMs, secondHalfLimit]);

  const squadPlayers = useMemo(() => match?.squad ?? [], [match?.squad]);
  const starters = useMemo(
    () => squadPlayers.filter((item) => item.squad_role === "starter"),
    [squadPlayers],
  );
  const substitutions = useMemo(
    () => match?.substitutions ?? [],
    [match?.substitutions],
  );
  const attendanceByPlayer = useMemo(
    () =>
      new Map(
        (match?.attendance ?? []).map((record) => [record.player_id, record]),
      ),
    [match?.attendance],
  );
  const substitutedOutIds = useMemo(
    () => new Set(substitutions.map((item) => item.out_player_id)),
    [substitutions],
  );
  const substitutedInIds = useMemo(
    () => new Set(substitutions.map((item) => item.in_player_id)),
    [substitutions],
  );
  const injuredPlayerIds = useMemo(
    () =>
      new Set(
        (match?.incidents ?? [])
          .filter((incident) => incident.incident_type === "injury")
          .map((incident) => incident.player_id),
      ),
    [match?.incidents],
  );
  const redCardedPlayerIds = useMemo(
    () =>
      new Set(
        (match?.incidents ?? [])
          .filter((incident) => incident.incident_type === "red_card")
          .map((incident) => incident.player_id),
      ),
    [match?.incidents],
  );
  const doubleYellowPlayerIds = useMemo(() => {
    const yellowCounts = new Map<string, number>();
    (match?.incidents ?? [])
      .filter((incident) => incident.incident_type === "yellow_card")
      .forEach((incident) => {
        yellowCounts.set(
          incident.player_id,
          (yellowCounts.get(incident.player_id) ?? 0) + 1,
        );
      });
    return new Set(
      [...yellowCounts.entries()]
        .filter(([, count]) => count >= 2)
        .map(([playerId]) => playerId),
    );
  }, [match?.incidents]);
  const currentPlayingIds = useMemo(() => {
    const ids = new Set(
      starters
        .filter(
          (player) =>
            !redCardedPlayerIds.has(player.player_id) &&
            !doubleYellowPlayerIds.has(player.player_id),
        )
        .map((player) => player.player_id),
    );
    substitutions.forEach((substitution) => {
      ids.delete(substitution.out_player_id);
      if (
        !redCardedPlayerIds.has(substitution.in_player_id) &&
        !doubleYellowPlayerIds.has(substitution.in_player_id)
      ) {
        ids.add(substitution.in_player_id);
      }
    });
    return ids;
  }, [
    doubleYellowPlayerIds,
    redCardedPlayerIds,
    starters,
    substitutions,
  ]);
  const liveMinutesByPlayer = useMemo(() => {
    const endMinute = Math.max(0, liveMinute);
    const states = new Map<
      string,
      { activeSince: number | null; minutes: number; stopped: boolean }
    >();

    squadPlayers.forEach((player) => {
      const attendance = attendanceByPlayer.get(player.player_id);
      const unavailable = ["absent", "injured"].includes(
        attendance?.status ?? "",
      );
      states.set(player.player_id, {
        activeSince:
          player.squad_role === "starter" && !unavailable ? 0 : null,
        minutes: 0,
        stopped: unavailable,
      });
    });

    const stopPlayer = (playerId: string, minute: number) => {
      const state = states.get(playerId);
      if (!state || state.activeSince === null) return;
      const safeMinute = Math.min(Math.max(minute, 0), endMinute);
      state.minutes += Math.max(0, safeMinute - state.activeSince);
      state.activeSince = null;
    };

    const startPlayer = (playerId: string, minute: number) => {
      const state = states.get(playerId);
      if (!state || state.stopped || state.activeSince !== null) return;
      state.activeSince = Math.min(Math.max(minute, 0), endMinute);
    };

    const yellowCounts = new Map<string, number>();
    const events = [
      ...substitutions.map((substitution) => ({
        type: "substitution" as const,
        minute: Number(substitution.minute || 0),
        substitution,
      })),
      ...(match?.incidents ?? []).map((incident) => ({
        type: "incident" as const,
        minute: Number(incident.minute || 0),
        incident,
      })),
    ].sort((a, b) => a.minute - b.minute || (a.type === "incident" ? -1 : 1));

    events.forEach((event) => {
      if (event.type === "substitution") {
        stopPlayer(event.substitution.out_player_id, event.minute);
        startPlayer(event.substitution.in_player_id, event.minute);
        return;
      }

      if (event.incident.incident_type === "yellow_card") {
        const previous = yellowCounts.get(event.incident.player_id) ?? 0;
        yellowCounts.set(event.incident.player_id, previous + 1);
        if (previous + 1 >= 2) {
          stopPlayer(event.incident.player_id, event.minute);
          const state = states.get(event.incident.player_id);
          if (state) state.stopped = true;
        }
        return;
      }

      if (event.incident.incident_type === "red_card") {
        stopPlayer(event.incident.player_id, event.minute);
        const state = states.get(event.incident.player_id);
        if (state) state.stopped = true;
      }
    });

    states.forEach((state) => {
      if (state.activeSince !== null) {
        state.minutes += Math.max(0, endMinute - state.activeSince);
      }
    });

    return new Map(
      [...states.entries()].map(([playerId, state]) => [
        playerId,
        Math.max(0, Math.round(state.minutes)),
      ]),
    );
  }, [attendanceByPlayer, liveMinute, match?.incidents, squadPlayers, substitutions]);
  const currentPlayingPlayers = squadPlayers.filter((player) =>
    currentPlayingIds.has(player.player_id),
  );
  const benchPlayers = squadPlayers.filter(
    (player) => !currentPlayingIds.has(player.player_id),
  );
  const goalPlayers = currentPlayingPlayers.length
    ? currentPlayingPlayers
    : squadPlayers;
  const substitutionOptions = squadPlayers.filter((player) => {
    const attendance = attendanceByPlayer.get(player.player_id);
    return (
      !currentPlayingIds.has(player.player_id) &&
      !injuredPlayerIds.has(player.player_id) &&
      !redCardedPlayerIds.has(player.player_id) &&
      !doubleYellowPlayerIds.has(player.player_id) &&
      attendance &&
      !["absent", "injured"].includes(attendance.status)
    );
  });
  const attendanceComplete = Boolean(
    squadPlayers.length &&
      squadPlayers.every((player) => attendanceByPlayer.has(player.player_id)),
  );
  const unavailableCurrentPlayers = squadPlayers.filter((player) => {
    const attendance = attendanceByPlayer.get(player.player_id);
    return (
      currentPlayingIds.has(player.player_id) &&
      ["absent", "injured"].includes(attendance?.status ?? "")
    );
  });
  const canStartMatch = Boolean(
    match &&
      match.match_status === "scheduled" &&
      kickOffReached &&
      attendanceComplete &&
      unavailableCurrentPlayers.length === 0,
  );
  const autoStartKey = `${matchId}:${match?.attendance
    ?.map((record) => `${record.player_id}:${record.status}`)
    .sort()
    .join("|")}`;
  const scoreLine = `${match?.our_score ?? 0} - ${match?.opponent_score ?? 0}`;
  const canRecordGoal = Boolean(
    match &&
      ["first_half", "second_half"].includes(match.match_status) &&
      (goalForm.team === "opponent" || goalForm.scorerPlayerId),
  );
  const canRecordIncident = Boolean(
    match && ["first_half", "second_half"].includes(match.match_status),
  );
  const liveVisual = useMemo(() => {
    if (!match) {
      return {
        label: "Waiting",
        detail: "No match loaded",
        icon: PauseCircle,
        dotClass: "bg-muted-foreground",
      };
    }
    if (match.match_status === "finished") {
      return {
        label: "Finished",
        detail: "Final whistle",
        icon: Square,
        dotClass: "bg-emerald-400",
      };
    }
    if (match.match_status === "scheduled") {
      return {
        label: "Ready",
        detail: "Waiting for start",
        icon: Clock,
        dotClass: "bg-amber-400",
      };
    }
    if (
      match.match_status === "first_half" &&
      liveMinute >= firstHalfLimit
    ) {
      return {
        label: "Half-time",
        detail: "Waiting for second half",
        icon: PauseCircle,
        dotClass: "bg-amber-400",
      };
    }
    const inStoppage =
      (match.match_status === "first_half" &&
        liveMinute >= 45 &&
        firstHalfLimit > 45) ||
      (match.match_status === "second_half" &&
        liveMinute >= firstHalfLimit + 45 &&
        secondHalfLimit > 45);
    return {
      label: inStoppage ? "Extra time" : "Live",
      detail:
        match.match_status === "first_half" ? "First half running" : "Second half running",
      icon: inStoppage ? Clock : Radio,
      dotClass: inStoppage ? "bg-amber-400" : "bg-red-500",
    };
  }, [firstHalfLimit, liveMinute, match, secondHalfLimit]);
  const LiveIcon = liveVisual.icon;

  const saveAttendance = async (
    playerId: string,
    status: "present" | "absent",
  ) => {
    setPageError("");
    try {
      await upsertAttendance({
        matchId,
        records: [{ playerId, status }],
      }).unwrap();
    } catch (error) {
      setPageError(getApiMessage(error, "Could not save attendance."));
    }
  };

  const changeLiveStatus = async (
    matchStatus: "first_half" | "second_half" | "finished",
  ) => {
    setPageError("");
    try {
      await updateLiveStatus({
        matchId,
        body: {
          matchStatus,
          firstHalfStoppageMinutes: Number(activeFirstHalfStoppage || 0),
          secondHalfStoppageMinutes: Number(activeSecondHalfStoppage || 0),
        },
      }).unwrap();
      return true;
    } catch (error) {
      setPageError(getApiMessage(error, "Could not update match status."));
      return false;
    }
  };

  useEffect(() => {
    if (!canStartMatch || updatingLiveStatus) return;
    if (autoStartAttemptRef.current === autoStartKey) return;

    autoStartAttemptRef.current = autoStartKey;
    updateLiveStatus({
      matchId,
      body: {
        matchStatus: "first_half",
        firstHalfStoppageMinutes: Number(activeFirstHalfStoppage || 0),
        secondHalfStoppageMinutes: Number(activeSecondHalfStoppage || 0),
      },
    })
      .unwrap()
      .catch((error) => {
        setPageError(getApiMessage(error, "Could not auto-start match."));
      });
  }, [
    activeFirstHalfStoppage,
    activeSecondHalfStoppage,
    autoStartKey,
    canStartMatch,
    matchId,
    updateLiveStatus,
    updatingLiveStatus,
  ]);

  const saveIncident = async (
    playerId: string,
    incidentType: "yellow_card" | "red_card" | "injury",
    bodyPart?: string,
    notes?: string,
  ) => {
    setPageError("");
    try {
      await recordIncident({
        matchId,
        body: { playerId, incidentType, bodyPart, notes, minute: liveMinute },
      }).unwrap();
    } catch (error) {
      setPageError(getApiMessage(error, "Could not record incident."));
    }
  };

  const undoIncident = async (incidentId: string) => {
    setPageError("");
    try {
      await deleteIncident({ matchId, incidentId }).unwrap();
    } catch (error) {
      setPageError(getApiMessage(error, "Could not remove incident."));
    }
  };

  const saveGoal = async () => {
    if (!canRecordGoal) return;
    setPageError("");
    try {
      await recordGoal({
        matchId,
        body: {
          team: goalForm.team,
          scorerPlayerId:
            goalForm.team === "our" ? goalForm.scorerPlayerId : undefined,
          assistPlayerId:
            goalForm.team === "our" && goalForm.assistPlayerId !== "none"
              ? goalForm.assistPlayerId
              : undefined,
          minute: liveMinute,
          notes: goalForm.notes.trim() || undefined,
        },
      }).unwrap();
      setGoalForm({
        team: "our",
        scorerPlayerId: "",
        assistPlayerId: "none",
        notes: "",
      });
    } catch (error) {
      setPageError(getApiMessage(error, "Could not record goal."));
    }
  };

  const undoGoal = async (goalId: string) => {
    setPageError("");
    try {
      await deleteGoal({ matchId, goalId }).unwrap();
    } catch (error) {
      setPageError(getApiMessage(error, "Could not remove goal."));
    }
  };

  const openSubstitutionDialog = (playerId: string, playerName: string) => {
    setSubstitutionDialog({ outPlayerId: playerId, outPlayerName: playerName });
    setSubstitutionInPlayerId("");
    setSubstitutionReason("");
  };

  const submitSubstitution = async () => {
    if (!substitutionDialog || !substitutionInPlayerId) return;
    setPageError("");
    try {
      await recordSubstitution({
        matchId,
        body: {
          outPlayerId: substitutionDialog.outPlayerId,
          inPlayerId: substitutionInPlayerId,
          minute: liveMinute,
          reason: substitutionReason.trim() || undefined,
        },
      }).unwrap();
      setSubstitutionDialog(null);
      setSubstitutionInPlayerId("");
      setSubstitutionReason("");
    } catch (error) {
      setPageError(getApiMessage(error, "Could not record substitution."));
    }
  };

  const undoSubstitution = async (substitutionId: string) => {
    setPageError("");
    try {
      await deleteSubstitution({ matchId, substitutionId }).unwrap();
    } catch (error) {
      setPageError(getApiMessage(error, "Could not remove substitution."));
    }
  };

  const confirmFinishMatch = async () => {
    const finished = await changeLiveStatus("finished");
    if (finished) {
      setFinishDialogOpen(false);
      router.push(`/coach/matches/evaluation/${matchId}`);
    }
  };

  const submitInjury = async () => {
    if (!injuryDialog || !injuryBodyPart.trim()) return;
    await saveIncident(
      injuryDialog.playerId,
      "injury",
      injuryBodyPart.trim(),
      injuryNotes.trim() || undefined,
    );
    setInjuryDialog(null);
    setInjuryBodyPart("");
    setInjuryNotes("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Match Day Operations"
        description="Handle attendance, substitutions, live status, goals, stoppage time, and incidents."
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Matches", href: "/coach/matches" },
          { label: "Match Day" },
        ]}
      />

      {isLoading && (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading match...
          </CardContent>
        </Card>
      )}

      {match && !configured && (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
            <div>
              <p className="font-medium">Save tactics first</p>
              <p className="text-sm text-muted-foreground">
                The match-day page opens only after the match has saved tactics
                and a selected squad.
              </p>
            </div>
            <Button asChild>
              <Link href={`/coach/matches/configuration?matchId=${match.id}`}>
                Open Configuration
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {match && configured && !matchDayOpen && (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
            <div>
              <p className="font-medium">Match day is locked</p>
              <p className="text-sm text-muted-foreground">
                Operations open {safeMatchDayOpenMinutes} minutes before
                kick-off so attendance can be marked before the match starts.
              </p>
            </div>
            <Badge variant="secondary">
              {formatDate(match.match_date)} - {formatTime12(match.match_time)}
            </Badge>
          </CardContent>
        </Card>
      )}

      {match && matchDayOpen && (
        <div className="space-y-6">
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">Match Data</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Opponent</p>
                <p className="font-medium">{match.opponent_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kick-off</p>
                <p className="font-medium">
                  {formatDate(match.match_date)} -{" "}
                  {formatTime12(match.match_time)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Coach</p>
                <p className="font-medium">
                  {match.tactics?.coach_name || "Assigned coach"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Formation</p>
                <p className="font-medium">{match.tactics?.formation}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Card className="border-border/50 bg-card">
              <CardHeader>
                <CardTitle className="text-base">Squad Attendance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...(match.squad ?? [])].map((player) => {
                  const attendance = attendanceByPlayer.get(player.player_id);
                  const stats = match.stats?.find(
                    (record) => record.player_id === player.player_id,
                  );
                  const playerIncidents =
                    match.incidents?.filter(
                      (incident) => incident.player_id === player.player_id,
                    ) ?? [];
                  const lastYellow = playerIncidents.find(
                    (incident) => incident.incident_type === "yellow_card",
                  );
                  const lastRed = playerIncidents.find(
                    (incident) => incident.incident_type === "red_card",
                  );
                  const lastInjury = playerIncidents.find(
                    (incident) => incident.incident_type === "injury",
                  );
                  const canSubPlayer =
                    currentPlayingIds.has(player.player_id) ||
                    (injuredPlayerIds.has(player.player_id) &&
                      !substitutedOutIds.has(player.player_id));
                  return (
                    <div
                      key={player.player_id}
                      className="grid gap-4 rounded-md border border-border/40 bg-muted/10 p-4 text-base lg:grid-cols-[minmax(260px,1fr)_auto_auto_auto_auto_auto_auto] lg:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold">
                            {player.player_name}
                          </p>
                          <Badge variant="outline">{player.squad_role}</Badge>
                          {player.position && (
                            <Badge variant="secondary">{player.position}</Badge>
                          )}
                          {currentPlayingIds.has(player.player_id) && (
                            <Badge variant="success">playing</Badge>
                          )}
                          {substitutedOutIds.has(player.player_id) && (
                            <Badge variant="secondary">subbed off</Badge>
                          )}
                          {substitutedInIds.has(player.player_id) && (
                            <Badge variant="outline">subbed in</Badge>
                          )}
                          {(redCardedPlayerIds.has(player.player_id) ||
                            doubleYellowPlayerIds.has(player.player_id)) && (
                            <Badge variant="destructive">sent off</Badge>
                          )}
                          {injuredPlayerIds.has(player.player_id) && (
                            <Badge variant="warning">injured</Badge>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {player.player_instruction || "No instruction"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">
                            {liveMinutesByPlayer.get(player.player_id) ??
                              stats?.minutes_played ??
                              0}{" "}
                            min
                          </Badge>
                          <Badge variant="secondary">
                            Week {stats?.weekly_minutes_played ?? 0} min
                            {stats?.weekly_matches_played
                              ? ` / ${stats.weekly_matches_played} match${stats.weekly_matches_played === 1 ? "" : "es"}`
                              : ""}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {attendance?.status ?? "not marked"}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          attendance?.status === "present"
                            ? "default"
                            : "outline"
                        }
                        className="gap-2"
                        disabled={
                          savingAttendance || match.match_status === "finished"
                        }
                        onClick={() =>
                          saveAttendance(player.player_id, "present")
                        }
                      >
                        <Check className="h-4 w-4" />
                        Present
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          attendance?.status === "absent"
                            ? "destructive"
                            : "outline"
                        }
                        className="gap-2"
                        disabled={
                          savingAttendance || match.match_status === "finished"
                        }
                        onClick={() =>
                          saveAttendance(player.player_id, "absent")
                        }
                      >
                        <X className="h-4 w-4" />
                        Absent
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={
                          recordingSubstitution ||
                          !canSubPlayer ||
                          redCardedPlayerIds.has(player.player_id) ||
                          doubleYellowPlayerIds.has(player.player_id) ||
                          match.match_status === "finished"
                        }
                        onClick={() =>
                          openSubstitutionDialog(
                            player.player_id,
                            player.player_name ?? "Player",
                          )
                        }
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                        Sub
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          recordingIncident || !canRecordIncident
                        }
                        onClick={() =>
                          saveIncident(player.player_id, "yellow_card")
                        }
                      >
                        Yellow{" "}
                        {stats?.yellow_cards ? `(${stats.yellow_cards})` : ""}
                      </Button>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            recordingIncident || !canRecordIncident
                          }
                          onClick={() =>
                            saveIncident(player.player_id, "red_card")
                          }
                        >
                          Red {stats?.red_cards ? `(${stats.red_cards})` : ""}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          disabled={
                            recordingIncident || !canRecordIncident
                          }
                          onClick={() =>
                            setInjuryDialog({
                              playerId: player.player_id,
                              playerName: player.player_name ?? "Player",
                            })
                          }
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Injury
                        </Button>
                      </div>
                      {(lastYellow || lastRed || lastInjury) && (
                        <div className="flex flex-wrap gap-2 lg:col-span-7">
                          {lastYellow && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="gap-2"
                              disabled={
                                deletingIncident ||
                                match.match_status === "finished"
                              }
                              onClick={() => undoIncident(lastYellow.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                              Undo yellow
                            </Button>
                          )}
                          {lastRed && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="gap-2"
                              disabled={
                                deletingIncident ||
                                match.match_status === "finished"
                              }
                              onClick={() => undoIncident(lastRed.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                              Undo red
                            </Button>
                          )}
                          {lastInjury && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="gap-2"
                              disabled={
                                deletingIncident ||
                                match.match_status === "finished"
                              }
                              onClick={() => undoIncident(lastInjury.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                              Undo injury
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <QrAttendanceScanner
                mode="match"
                id={matchId}
                disabled={savingAttendance || match.match_status === "finished"}
                onScanSuccess={() => {
                  void refetch();
                }}
              />

              <Card className="border-border/50 bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Live Match</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border border-border/40 bg-muted/10 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-background/70">
                          <span
                            className={`absolute h-3 w-3 rounded-full ${liveVisual.dotClass} animate-ping opacity-75`}
                          />
                          <span
                            className={`relative h-3 w-3 rounded-full ${liveVisual.dotClass}`}
                          />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Match status
                          </p>
                          <p className="flex items-center gap-2 font-medium">
                            <LiveIcon className="h-4 w-4" />
                            {liveVisual.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {liveVisual.detail}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Minute {liveMinute}</Badge>
                    </div>
                  </div>
                  {match.match_status === "scheduled" &&
                    (!attendanceComplete ||
                      unavailableCurrentPlayers.length > 0 ||
                      !kickOffReached) && (
                      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                        <div className="flex items-start gap-2">
                          <ShieldAlert className="mt-0.5 h-4 w-4" />
                          <div>
                            {attendanceComplete &&
                              unavailableCurrentPlayers.length === 0 &&
                              !kickOffReached && (
                                <p>
                                  Match will auto-start at kick-off after the
                                  attendance is ready.
                                </p>
                              )}
                            {!attendanceComplete && (
                              <p>
                                Mark attendance for every squad player before
                                kick-off so the match can auto-start.
                              </p>
                            )}
                            {unavailableCurrentPlayers.length > 0 && (
                              <p className="mt-1">
                                Replace absent or injured players:{" "}
                                {unavailableCurrentPlayers
                                  .map((player) => player.player_name)
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>1st half stoppage</Label>
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        value={activeFirstHalfStoppage}
                        onChange={(event) =>
                          setFirstHalfStoppage(event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>2nd half stoppage</Label>
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        value={activeSecondHalfStoppage}
                        onChange={(event) =>
                          setSecondHalfStoppage(event.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Button
                      type="button"
                      className="gap-2"
                      disabled={
                        updatingLiveStatus ||
                        match.match_status !== "scheduled" ||
                        !canStartMatch
                      }
                      onClick={() => changeLiveStatus("first_half")}
                    >
                      <Play className="h-4 w-4" />
                      Start Match
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={
                        updatingLiveStatus ||
                        match.match_status !== "first_half"
                      }
                      onClick={() => changeLiveStatus("second_half")}
                    >
                      <Clock className="h-4 w-4" />
                      Start 2nd Half
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={
                        updatingLiveStatus ||
                        !["first_half", "second_half"].includes(
                          match.match_status,
                        )
                      }
                      onClick={() => setFinishDialogOpen(true)}
                    >
                      <Square className="h-4 w-4" />
                      Finish Match
                    </Button>
                  </div>
                  {substitutions.length > 0 && (
                    <div className="space-y-2 rounded-md border border-border/40 bg-muted/10 p-3">
                      <p className="text-sm font-medium">Substitutions</p>
                      {substitutions.map((substitution) => (
                        <div
                          key={substitution.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span>
                            {substitution.in_player_name} for{" "}
                            {substitution.out_player_name}
                            <span className="text-muted-foreground">
                              {" "}
                              ({substitution.minute} min)
                            </span>
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="gap-2"
                            disabled={
                              deletingSubstitution ||
                              match.match_status === "finished"
                            }
                            onClick={() => undoSubstitution(substitution.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                            Undo
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {pageError && (
                    <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {pageError}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Score & Goals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border border-border/40 bg-muted/10 p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      GOLX vs {match.opponent_name}
                    </p>
                    <p className="mt-1 text-4xl font-semibold">{scoreLine}</p>
                  </div>

                  <div className="grid gap-3">
                    <div className="space-y-2">
                      <Label>Goal for</Label>
                      <Select
                        value={goalForm.team}
                        onValueChange={(value) =>
                          setGoalForm((prev) => ({
                            ...prev,
                            team: value as "our" | "opponent",
                            scorerPlayerId:
                              value === "opponent" ? "" : prev.scorerPlayerId,
                            assistPlayerId:
                              value === "opponent" ? "none" : prev.assistPlayerId,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="our">GOLX</SelectItem>
                          <SelectItem value="opponent">
                            {match.opponent_name}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {goalForm.team === "our" && (
                      <>
                        <div className="space-y-2">
                          <Label>Scorer</Label>
                          <Select
                            value={goalForm.scorerPlayerId}
                            onValueChange={(value) =>
                              setGoalForm((prev) => ({
                                ...prev,
                                scorerPlayerId: value,
                                assistPlayerId:
                                  prev.assistPlayerId === value
                                    ? "none"
                                    : prev.assistPlayerId,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select scorer" />
                            </SelectTrigger>
                            <SelectContent>
                              {goalPlayers.map((player) => (
                                <SelectItem
                                  key={player.player_id}
                                  value={player.player_id}
                                >
                                  {player.player_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Assist</Label>
                          <Select
                            value={goalForm.assistPlayerId}
                            onValueChange={(value) =>
                              setGoalForm((prev) => ({
                                ...prev,
                                assistPlayerId: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="No assist" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No assist</SelectItem>
                              {goalPlayers
                                .filter(
                                  (player) =>
                                    player.player_id !== goalForm.scorerPlayerId,
                                )
                                .map((player) => (
                                  <SelectItem
                                    key={player.player_id}
                                    value={player.player_id}
                                  >
                                    {player.player_name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label>Goal note</Label>
                      <Textarea
                        value={goalForm.notes}
                        onChange={(event) =>
                          setGoalForm((prev) => ({
                            ...prev,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="Optional note"
                      />
                    </div>

                    <Button
                      type="button"
                      className="gap-2"
                      disabled={!canRecordGoal || recordingGoal}
                      onClick={saveGoal}
                    >
                      {recordingGoal ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add Goal
                    </Button>
                    {!["first_half", "second_half"].includes(
                      match.match_status,
                    ) && (
                      <p className="text-xs text-muted-foreground">
                        Start the match before recording goals.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    {match.goal_events?.map((goal) => (
                      <div
                        key={goal.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/10 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {goal.team === "our"
                              ? goal.scorer_player_name || "GOLX goal"
                              : `${match.opponent_name} goal`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Minute {goal.minute}
                            {goal.assist_player_name
                              ? ` · assist ${goal.assist_player_name}`
                              : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="gap-2"
                          disabled={
                            deletingGoal || match.match_status === "finished"
                          }
                          onClick={() => undoGoal(goal.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Undo
                        </Button>
                      </div>
                    ))}
                    {!match.goal_events?.length && (
                      <p className="text-sm text-muted-foreground">
                        No goals recorded yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Lineup Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Current on field
                    </p>
                    <div className="space-y-2">
                      {currentPlayingPlayers.map((player) => (
                        <div
                          key={player.player_id}
                          className="flex items-center justify-between rounded-md bg-muted/10 px-3 py-2 text-sm"
                        >
                          <span>{player.player_name}</span>
                          <Badge variant="outline">
                            {player.position || "position"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Bench / subbed off
                    </p>
                    <div className="space-y-2">
                      {benchPlayers.length ? (
                        benchPlayers.map((player) => (
                          <div
                            key={player.player_id}
                            className="flex items-center justify-between rounded-md bg-muted/10 px-3 py-2 text-sm"
                          >
                            <span>{player.player_name}</span>
                            <Badge variant="outline">
                              {substitutedOutIds.has(player.player_id)
                                ? "subbed off"
                                : player.squad_role}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No substitutes selected.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !match && (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            Match not found or not available.
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(substitutionDialog)}
        onOpenChange={(value) => {
          if (!value) {
            setSubstitutionDialog(null);
            setSubstitutionInPlayerId("");
            setSubstitutionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Substitution</DialogTitle>
            <DialogDescription>
              Choose the available player who will replace{" "}
              {substitutionDialog?.outPlayerName}. This change is saved and the
              on-field lineup updates immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Player coming on</Label>
              <Select
                value={substitutionInPlayerId}
                onValueChange={setSubstitutionInPlayerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select replacement" />
                </SelectTrigger>
                <SelectContent>
                  {substitutionOptions.map((player) => (
                    <SelectItem key={player.player_id} value={player.player_id}>
                      {player.player_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!substitutionOptions.length && (
                <p className="text-xs text-muted-foreground">
                  Mark a substitute present before using them.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={substitutionReason}
                onChange={(event) => setSubstitutionReason(event.target.value)}
                placeholder="Tactical, injury, absent starter replacement..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubstitutionDialog(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!substitutionInPlayerId || recordingSubstitution}
              onClick={submitSubstitution}
              className="gap-2"
            >
              {recordingSubstitution && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Save Substitution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={finishDialogOpen} onOpenChange={setFinishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finish match permanently?</DialogTitle>
            <DialogDescription>
              This will lock the match as finished, save the final score,
              attendance, goals, substitutions, cards, injuries, and stats. You
              cannot start or postpone it again after this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFinishDialogOpen(false)}
            >
              Keep Match Open
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-2"
              disabled={updatingLiveStatus}
              onClick={confirmFinishMatch}
            >
              {updatingLiveStatus && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Finish Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(injuryDialog)}
        onOpenChange={(value) => {
          if (!value) {
            setInjuryDialog(null);
            setInjuryBodyPart("");
            setInjuryNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Injury</DialogTitle>
            <DialogDescription>
              Save the injured body part for {injuryDialog?.playerName}. The
              injury date is recorded automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Body part</Label>
              <Input
                value={injuryBodyPart}
                onChange={(event) => setInjuryBodyPart(event.target.value)}
                placeholder="Hamstring, ankle, shoulder..."
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={injuryNotes}
                onChange={(event) => setInjuryNotes(event.target.value)}
                placeholder="Optional medical note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInjuryDialog(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!injuryBodyPart.trim() || recordingIncident}
              onClick={submitInjury}
            >
              {recordingIncident && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Injury
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
