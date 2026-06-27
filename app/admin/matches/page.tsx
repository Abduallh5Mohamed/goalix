"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Eye,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MonthCalendar } from "@/components/shared/MonthCalendar";
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
import { useGetCoachesQuery } from "@/lib/store/api/adminApi";
import {
  useCreateAdminMatchMutation,
  useGetAdminMatchQuery,
  useGetAdminMatchesQuery,
  useHardDeleteAdminMatchMutation,
  usePostponeAdminMatchMutation,
  useUpdateAdminMatchStatusMutation,
  type Match,
} from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

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

const isFinishedMatch = (match: Match) =>
  match.status === "finished" ||
  match.status === "completed" ||
  match.match_status === "finished";

const matchFriendlyLabel = (matchType: Match["match_type"]) =>
  matchType === "friendly" ? "Friendly" : "Not friendly";

const inputDateValue = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const selectedKickoff = (date: string, time: string) => {
  if (!date || !time) return null;
  const kickoff = new Date(`${date}T${time}:00`);
  return Number.isFinite(kickoff.getTime()) ? kickoff : null;
};

const validateFutureKickoff = (date: string, time: string) => {
  const kickoff = selectedKickoff(date, time);
  if (!kickoff) return "Choose a valid match date and time.";
  if (kickoff <= new Date()) {
    return "Choose a future match date and time. Past matches cannot be created here.";
  }
  return "";
};

export default function AdminMatchesPage() {
  const { data: matchesRes, isLoading, refetch: refetchMatches } = useGetAdminMatchesQuery(
    {
      limit: 100,
    },
    {
      pollingInterval: 15000,
      skipPollingIfUnfocused: true,
      refetchOnFocus: true,
      refetchOnMountOrArgChange: true,
    },
  );
  const { data: coachesRes } = useGetCoachesQuery({ limit: 100 });
  const coaches = useMemo(() => coachesRes?.data ?? [], [coachesRes?.data]);
  const [open, setOpen] = useState(false);
  const [deleteMatchRow, setDeleteMatchRow] = useState<Match | null>(null);
  const [postponeMatchRow, setPostponeMatchRow] = useState<Match | null>(null);
  const [selectedFinishedMatchId, setSelectedFinishedMatchId] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [postponeError, setPostponeError] = useState("");
  const [postponeForm, setPostponeForm] = useState({
    matchDate: "",
    matchTime: "",
    location: "",
    reason: "",
  });
  const [form, setForm] = useState({
    coachId: "",
    opponentName: "",
    matchType: "official",
    matchDate: "",
    matchTime: "",
    location: "",
    venueType: "home",
    refereeName: "",
    organizerNotes: "",
  });
  const selectedCoachId =
    form.coachId || (coaches.length === 1 ? coaches[0].id : "");
  const [formError, setFormError] = useState("");
  const [createMatch, { isLoading: creating }] = useCreateAdminMatchMutation();
  const [updateStatus] = useUpdateAdminMatchStatusMutation();
  const [postponeAdminMatch, { isLoading: postponingMatch }] =
    usePostponeAdminMatchMutation();
  const [hardDeleteMatch, { isLoading: deletingMatch }] =
    useHardDeleteAdminMatchMutation();
  const submitMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const payload: Record<string, unknown> = {
      coachId: selectedCoachId,
      opponentName: form.opponentName.trim(),
      matchType: form.matchType,
      matchDate: form.matchDate,
      matchTime: form.matchTime,
      location: form.location.trim(),
      venueType: form.venueType,
      status: "scheduled",
    };

    if (!selectedCoachId) {
      setFormError("Select the coach who will manage this match.");
      return;
    }
    const kickoffError = validateFutureKickoff(form.matchDate, form.matchTime);
    if (kickoffError) {
      setFormError(kickoffError);
      return;
    }

    if (form.refereeName.trim()) payload.refereeName = form.refereeName.trim();
    if (form.organizerNotes.trim())
      payload.organizerNotes = form.organizerNotes.trim();

    try {
      await createMatch(payload).unwrap();
      setOpen(false);
      setForm({
        coachId: "",
        opponentName: "",
        matchType: "official",
        matchDate: "",
        matchTime: "",
        location: "",
        venueType: "home",
        refereeName: "",
        organizerNotes: "",
      });
    } catch (error) {
      setFormError(
        getApiMessage(
          error,
          "Could not create match. Please check the fields and try again.",
        ),
      );
    }
  };

  const handleHardDeleteMatch = async () => {
    if (!deleteMatchRow) return;
    const expected = `delete match forever ${deleteMatchRow.opponent_name}`;
    setDeleteError("");

    if (deleteConfirm.trim() !== expected) {
      setDeleteError(`Type "${expected}" to confirm permanent deletion.`);
      return;
    }

    try {
      await hardDeleteMatch(deleteMatchRow.id).unwrap();
      setDeleteMatchRow(null);
      setDeleteConfirm("");
    } catch (error) {
      setDeleteError(
        getApiMessage(error, "Could not permanently delete match."),
      );
    }
  };

  const openPostponeDialog = (match: Match) => {
    setPostponeError("");
    setPostponeMatchRow(match);
    setPostponeForm({
      matchDate: String(match.match_date).slice(0, 10),
      matchTime: String(match.match_time).slice(0, 5),
      location: match.location || "",
      reason: "",
    });
  };

  const handlePostponeMatch = async () => {
    if (!postponeMatchRow) return;
    setPostponeError("");
    if (!postponeForm.matchDate || !postponeForm.matchTime) {
      setPostponeError("Choose the new date and time.");
      return;
    }
    const kickoffError = validateFutureKickoff(
      postponeForm.matchDate,
      postponeForm.matchTime,
    );
    if (kickoffError) {
      setPostponeError(kickoffError);
      return;
    }
    try {
      await postponeAdminMatch({
        id: postponeMatchRow.id,
        body: {
          matchDate: postponeForm.matchDate,
          matchTime: postponeForm.matchTime,
          location: postponeForm.location.trim() || null,
          reason: postponeForm.reason.trim() || undefined,
        },
      }).unwrap();
      setPostponeMatchRow(null);
      setPostponeForm({
        matchDate: "",
        matchTime: "",
        location: "",
        reason: "",
      });
    } catch (error) {
      setPostponeError(getApiMessage(error, "Could not postpone match."));
    }
  };

  const matches = useMemo(() => matchesRes?.data ?? [], [matchesRes?.data]);
  const finishedMatches = useMemo(
    () => matches.filter((match) => isFinishedMatch(match)),
    [matches],
  );
  const activeFinishedMatchId = finishedMatches.some(
    (match) => match.id === selectedFinishedMatchId,
  )
    ? selectedFinishedMatchId
    : "";
  const {
    data: selectedFinishedMatch,
    isLoading: loadingFinishedMatch,
    isError: selectedFinishedMatchError,
  } =
    useGetAdminMatchQuery(activeFinishedMatchId, {
      skip: !activeFinishedMatchId,
    });
  useEffect(() => {
    if (!selectedFinishedMatchError) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedFinishedMatchId("");
    refetchMatches();
  }, [refetchMatches, selectedFinishedMatchError]);

  useEffect(() => {
    if (
      selectedFinishedMatchId &&
      !finishedMatches.some((match) => match.id === selectedFinishedMatchId)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFinishedMatchId("");
    }
  }, [finishedMatches, selectedFinishedMatchId]);
  const todayInput = inputDateValue();
  const calendarItems = useMemo(
    () =>
      matches.map((match) => ({
        id: match.id,
        title: match.opponent_name,
        date: match.match_date,
        type: "match",
        status: match.status,
        subtitle: `${formatTime12(match.match_time)} - ${match.groups?.map((group) => group.name).join(", ") || match.team_name || "No group"}`,
      })),
    [matches],
  );
  const deleteExpected = `delete match forever ${deleteMatchRow?.opponent_name ?? ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matches Management"
        description="Create, schedule, update, and control official match information."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Matches" },
        ]}
        actions={
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Match
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Match</DialogTitle>
            <DialogDescription>
              Add the match details now. Target groups or birthdays can be
              configured later from match configuration.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitMatch}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Coach</Label>
                <Select
                  value={selectedCoachId}
                  onValueChange={(value) =>
                    setForm((p) => ({
                      ...p,
                      coachId: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select coach for this match" />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Opponent</Label>
                <Input
                  value={form.opponentName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, opponentName: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Friendly?</Label>
                <Select
                  value={form.matchType}
                  onValueChange={(value) =>
                    setForm((p) => ({ ...p, matchType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="official">
                      Not Friendly (Official)
                    </SelectItem>
                    <SelectItem value="training_match">
                      Training Match
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Venue Type</Label>
                <Select
                  value={form.venueType}
                  onValueChange={(value) =>
                    setForm((p) => ({ ...p, venueType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="away">Away</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  min={todayInput}
                  value={form.matchDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, matchDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={form.matchTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, matchTime: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Location / Stadium</Label>
                <Input
                  value={form.location}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, location: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Referee</Label>
                <Input
                  value={form.refereeName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, refereeName: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Organizer Notes</Label>
              <Textarea
                value={form.organizerNotes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, organizerNotes: e.target.value }))
                }
              />
            </div>
            {formError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  creating ||
                  !selectedCoachId ||
                  !form.opponentName.trim() ||
                  !form.matchDate ||
                  !form.matchTime ||
                  !form.location.trim()
                }
                className="gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Match
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteMatchRow)}
        onOpenChange={(nextOpen) => !nextOpen && setDeleteMatchRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>Delete Match Forever</DialogTitle>
            <DialogDescription>
              This permanently removes the match, calendar event, squads,
              tactics, attendance, and match stats. Type{" "}
              <span className="font-semibold text-foreground">
                {deleteExpected}
              </span>{" "}
              to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-match-confirm">Confirmation</Label>
            <Input
              id="delete-match-confirm"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder={deleteExpected}
            />
          </div>
          {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteMatchRow(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                deletingMatch || deleteConfirm.trim() !== deleteExpected
              }
              onClick={handleHardDeleteMatch}
              className="gap-2"
            >
              {deletingMatch && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(postponeMatchRow)}
        onOpenChange={(nextOpen) => !nextOpen && setPostponeMatchRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Postpone Match</DialogTitle>
            <DialogDescription>
              Choose the new kick-off. The match, calendar, coach view, player
              view, and notifications will all use this new time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>New date</Label>
              <Input
                type="date"
                min={todayInput}
                value={postponeForm.matchDate}
                onChange={(event) =>
                  setPostponeForm((prev) => ({
                    ...prev,
                    matchDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>New time</Label>
              <Input
                type="time"
                value={postponeForm.matchTime}
                onChange={(event) =>
                  setPostponeForm((prev) => ({
                    ...prev,
                    matchTime: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Location</Label>
              <Input
                value={postponeForm.location}
                onChange={(event) =>
                  setPostponeForm((prev) => ({
                    ...prev,
                    location: event.target.value,
                  }))
                }
                placeholder="Leave empty if not confirmed"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Reason</Label>
              <Textarea
                value={postponeForm.reason}
                onChange={(event) =>
                  setPostponeForm((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }))
                }
                placeholder="Weather, opponent request, pitch availability..."
              />
            </div>
          </div>
          {postponeError && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {postponeError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPostponeMatchRow(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={postponingMatch}
              onClick={handlePostponeMatch}
            >
              {postponingMatch && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Postponement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MonthCalendar title="Matches Calendar" items={calendarItems} />

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Finished Matches Archive</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
            <div className="space-y-2">
              {finishedMatches.map((match) => (
                <button
                  key={match.id}
                  type="button"
                  className={`w-full rounded-md border p-3 text-left transition-colors ${
                    activeFinishedMatchId === match.id
                      ? "border-primary bg-primary/10"
                      : "border-border/50 bg-muted/10 hover:bg-muted/30"
                  }`}
                  onClick={() => setSelectedFinishedMatchId(match.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{match.opponent_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(match.match_date)} ·{" "}
                        {formatTime12(match.match_time)}
                      </p>
                    </div>
                    <Badge variant="success">finished</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {match.location || "To be confirmed"}
                  </p>
                </button>
              ))}
              {!finishedMatches.length && !isLoading && (
                <p className="rounded-md border border-border/50 px-3 py-8 text-center text-sm text-muted-foreground">
                  No finished matches yet.
                </p>
              )}
              {isLoading && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading finished matches...
                </p>
              )}
            </div>

            <div className="rounded-md border border-border/50 p-4">
              {loadingFinishedMatch && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading match details...
                </p>
              )}
              {selectedFinishedMatch && !loadingFinishedMatch && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold">
                          {selectedFinishedMatch.opponent_name}
                        </h3>
                        <Badge variant="outline">
                          {matchFriendlyLabel(selectedFinishedMatch.match_type)}
                        </Badge>
                        <Badge variant="success">played</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(selectedFinishedMatch.match_date)} ·{" "}
                        {formatTime12(selectedFinishedMatch.match_time)} ·{" "}
                        {selectedFinishedMatch.location || "To be confirmed"}
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/20 px-4 py-2 text-center">
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="text-2xl font-semibold">
                        {selectedFinishedMatch.our_score ?? "-"} :{" "}
                        {selectedFinishedMatch.opponent_score ?? "-"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-md bg-muted/10 p-3">
                      <p className="text-xs text-muted-foreground">Groups</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedFinishedMatch.groups
                          ?.map((group) => group.name)
                          .join(", ") ||
                          selectedFinishedMatch.team_name ||
                          "No group"}
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/10 p-3">
                      <p className="text-xs text-muted-foreground">Venue</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedFinishedMatch.venue_type}
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/10 p-3">
                      <p className="text-xs text-muted-foreground">Referee</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedFinishedMatch.referee_name || "Not recorded"}
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/10 p-3">
                      <p className="text-xs text-muted-foreground">
                        Finished at
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedFinishedMatch.finished_at
                          ? `${formatDate(selectedFinishedMatch.finished_at)} · ${formatTime12(selectedFinishedMatch.finished_at)}`
                          : "Auto finished"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-md border border-border/40 p-4">
                      <p className="font-medium">Plan & Tactics</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Formation
                          </p>
                          <p className="font-medium">
                            {selectedFinishedMatch.tactics?.formation ||
                              "Not saved"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Coach</p>
                          <p className="font-medium">
                            {selectedFinishedMatch.tactics?.coach_name ||
                              "Not recorded"}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                        {selectedFinishedMatch.tactics?.tactical_notes ||
                          selectedFinishedMatch.match_notes ||
                          "No tactical notes recorded."}
                      </p>
                    </div>

                    <div className="rounded-md border border-border/40 p-4">
                      <p className="font-medium">Match Notes</p>
                      <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                        <p className="whitespace-pre-wrap">
                          {selectedFinishedMatch.organizer_notes ||
                            "No organizer notes."}
                        </p>
                        <p className="whitespace-pre-wrap">
                          {selectedFinishedMatch.match_notes ||
                            "No post-match notes."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-md border border-border/40 p-4">
                      <p className="font-medium">Squad & Instructions</p>
                      <div className="mt-3 space-y-2">
                        {selectedFinishedMatch.squad?.map((player) => (
                          <div
                            key={player.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/10 px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="font-medium">
                                {player.player_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {player.player_instruction || "No instruction"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">
                                {player.squad_role}
                              </Badge>
                              {player.position && (
                                <Badge variant="secondary">
                                  {player.position}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                        {!selectedFinishedMatch.squad?.length && (
                          <p className="text-sm text-muted-foreground">
                            No squad saved.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-md border border-border/40 p-4">
                      <p className="font-medium">Attendance</p>
                      <div className="mt-3 space-y-2">
                        {selectedFinishedMatch.attendance?.map((record) => (
                          <div
                            key={record.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/10 px-3 py-2 text-sm"
                          >
                            <span className="font-medium">
                              {record.player_name}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{record.status}</Badge>
                              {record.notes && (
                                <span className="text-xs text-muted-foreground">
                                  {record.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {!selectedFinishedMatch.attendance?.length && (
                          <p className="text-sm text-muted-foreground">
                            No attendance recorded.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-md border border-border/40">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b border-border/40 text-left text-xs uppercase text-muted-foreground">
                          <th className="px-3 py-3 font-medium">Player</th>
                          <th className="px-3 py-3 font-medium">Min</th>
                          <th className="px-3 py-3 font-medium">G</th>
                          <th className="px-3 py-3 font-medium">A</th>
                          <th className="px-3 py-3 font-medium">Cards</th>
                          <th className="px-3 py-3 font-medium">Rating</th>
                          <th className="px-3 py-3 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFinishedMatch.stats?.map((stat) => (
                          <tr
                            key={stat.id}
                            className="border-b border-border/30 last:border-0"
                          >
                            <td className="px-3 py-3 font-medium">
                              {stat.player_name}
                            </td>
                            <td className="px-3 py-3">
                              {stat.minutes_played}
                            </td>
                            <td className="px-3 py-3">{stat.goals}</td>
                            <td className="px-3 py-3">{stat.assists}</td>
                            <td className="px-3 py-3">
                              {stat.yellow_cards}Y / {stat.red_cards}R
                            </td>
                            <td className="px-3 py-3">
                              {stat.performance_rating ?? "-"}
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">
                              {stat.coach_notes || stat.injuries || "-"}
                            </td>
                          </tr>
                        ))}
                        {!selectedFinishedMatch.stats?.length && (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-3 py-6 text-center text-muted-foreground"
                            >
                              No player stats recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-md border border-border/40 p-4">
                    <p className="font-medium">Incidents</p>
                    <div className="mt-3 space-y-2">
                      {selectedFinishedMatch.incidents?.map((incident) => (
                        <div
                          key={incident.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/10 px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">
                              {incident.player_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {incident.incident_type.replace("_", " ")}
                              {incident.body_part
                                ? ` · ${incident.body_part}`
                                : ""}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {incident.notes || "No notes"}
                          </p>
                        </div>
                      ))}
                      {!selectedFinishedMatch.incidents?.length && (
                        <p className="text-sm text-muted-foreground">
                          No incidents recorded.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {!selectedFinishedMatch &&
                !loadingFinishedMatch &&
                Boolean(finishedMatches.length) && (
                  <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    Select a finished match to view its saved details.
                  </p>
                )}
              {!finishedMatches.length && !isLoading && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Finished matches will appear here after the match ends or
                  three hours pass from kick-off.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Matches Calendar Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Time</th>
                  <th className="px-3 py-3 font-medium">Match</th>
                  <th className="px-3 py-3 font-medium">Groups</th>
                  <th className="px-3 py-3 font-medium">Location</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr
                    key={match.id}
                    className="border-b border-border/30 last:border-0"
                  >
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatDate(match.match_date)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatTime12(match.match_time)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground">
                        {match.opponent_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {matchFriendlyLabel(match.match_type)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {match.groups?.map((g) => g.name).join(", ") ||
                        match.team_name ||
                        "No group"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {match.location || "No location"}
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant={
                          match.status === "cancelled"
                            ? "destructive"
                            : isFinishedMatch(match)
                              ? "success"
                              : "secondary"
                        }
                      >
                        {isFinishedMatch(match) ? "finished" : match.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => {
                          setDeleteError("");
                          setDeleteConfirm("");
                          setDeleteMatchRow(match);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete forever
                      </Button>
                    </td>
                  </tr>
                ))}
                {!matches.length && !isLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No matches scheduled.
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      Loading matches...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">All Matches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && (
              <p className="text-sm text-muted-foreground">
                Loading matches...
              </p>
            )}
            {matches.map((match) => (
              <div
                key={match.id}
                className="flex flex-col gap-3 rounded-md border border-border/50 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">
                    <CalendarClock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{match.opponent_name}</h3>
                      <Badge variant="outline">
                        {matchFriendlyLabel(match.match_type)}
                      </Badge>
                      <Badge
                        variant={
                          match.status === "cancelled"
                            ? "destructive"
                            : isFinishedMatch(match)
                              ? "success"
                              : "secondary"
                        }
                      >
                        {isFinishedMatch(match) ? "finished" : match.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(match.match_date)} ·{" "}
                      {formatTime12(match.match_time)} · {match.location}
                    </p>
                    {match.status === "postponed" && (
                      <p className="mt-1 text-xs font-medium text-amber-200">
                        Postponed to {formatDate(match.match_date)} at{" "}
                        {formatTime12(match.match_time)}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {match.groups?.map((g) => g.name).join(", ") ||
                        match.team_name}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isFinishedMatch(match) ? (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                      Finished match. Postpone and cancel are locked.
                    </div>
                  ) : match.status === "cancelled" ? (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                      Cancelled match. Only permanent deletion is available.
                    </div>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPostponeDialog(match)}
                      >
                        Postpone to new date
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatus({ id: match.id, status: "finished" })
                        }
                      >
                        Finish now
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          updateStatus({ id: match.id, status: "cancelled" })
                        }
                      >
                        Cancel match
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={() => {
                      setDeleteError("");
                      setDeleteConfirm("");
                      setDeleteMatchRow(match);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete forever
                  </Button>
                </div>
              </div>
            ))}
            {!matches.length && !isLoading && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No matches scheduled.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
