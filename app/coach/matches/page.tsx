"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { Loader2, Send } from "lucide-react";
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
  type Match,
  useCreateFriendlyRequestMutation,
  useAcceptCoachAdminMatchRequestMutation,
  useGetCoachAdminMatchRequestsQuery,
  useGetCoachGroupsScopedQuery,
  useGetCoachMatchQuery,
  useGetCoachMatchesQuery,
  useGetCoachFriendlyRequestsQuery,
} from "@/lib/store/api/calendarApi";
import { useGetCoachBirthdaysQuery } from "@/lib/store/api/coachApi";
import { formatDate, formatTime12, localDateTimeTimestamp } from "@/lib/utils";

let clockSnapshot = 0;
const subscribeMatchClock = (onStoreChange: () => void) => {
  clockSnapshot = Date.now();
  onStoreChange();
  const intervalId = window.setInterval(() => {
    clockSnapshot = Date.now();
    onStoreChange();
  }, 30000);
  return () => window.clearInterval(intervalId);
};
const getMatchClockSnapshot = () => clockSnapshot;
const getServerMatchClockSnapshot = () => 0;

const matchStartTimestamp = (match?: {
  match_date: string;
  match_time: string;
}) =>
  match ? localDateTimeTimestamp(match.match_date, match.match_time) : 0;

const MATCH_AUTO_FINISH_HOURS = 3;
const closedMatchStatuses = new Set(["cancelled", "finished", "completed"]);

const matchAutoFinishTimestamp = (match?: {
  match_date: string;
  match_time: string;
}) => {
  const start = matchStartTimestamp(match);
  return start ? start + MATCH_AUTO_FINISH_HOURS * 60 * 60 * 1000 : 0;
};

const isClosedMatch = (
  match: { status: string; match_status: string; match_date: string; match_time: string },
  nowMs: number,
) =>
  closedMatchStatuses.has(match.status) ||
  closedMatchStatuses.has(match.match_status) ||
  (match.match_status === "scheduled" && matchAutoFinishTimestamp(match) <= nowMs);

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

export default function CoachMatchesPage() {
  const {
    data: matchesRes,
    isLoading,
    isError: matchesError,
    refetch: refetchMatches,
  } = useGetCoachMatchesQuery();
  const { data: requestsRes } = useGetCoachFriendlyRequestsQuery();
  const { data: adminRequestsRes } = useGetCoachAdminMatchRequestsQuery();
  const nowMs = useSyncExternalStore(
    subscribeMatchClock,
    getMatchClockSnapshot,
    getServerMatchClockSnapshot,
  );
  const acceptedRequestMatches: Match[] = useMemo(
    () => [
      ...(adminRequestsRes?.data ?? [])
        .filter(
          (request) =>
            request.status === "accepted" && request.created_match_id,
        )
        .map((request) => {
          const closed =
            matchAutoFinishTimestamp({
              match_date: request.match_date,
              match_time: request.match_time,
            }) <= nowMs;
          return {
          id: request.created_match_id!,
          event_id: null,
          team_id: request.selected_group_id,
          age_group_id: null,
          opponent_name: request.opponent_name,
          match_type: request.match_type,
          match_date: request.match_date,
          match_time: request.match_time,
          location: request.location,
          venue_type: request.venue_type,
          referee_name: request.referee_name,
          status: closed ? ("completed" as const) : ("scheduled" as const),
          match_status: closed ? "finished" : "scheduled",
          organizer_notes: request.organizer_notes,
          match_notes: null,
          our_score: null,
          opponent_score: null,
          groups: request.selected_group_id
            ? [
                {
                  id: request.selected_group_id,
                  name: request.selected_group_name ?? "Selected group",
                },
              ]
            : [],
          birth_years: request.selected_birth_year_id
            ? [
                {
                  id: request.selected_birth_year_id,
                  label:
                    request.selected_birth_year_name ?? "Selected birthday",
                  fromYear: 0,
                  toYear: 9999,
                },
              ]
            : [],
          };
        }),
      ...(requestsRes?.data ?? [])
        .filter(
          (request) =>
            request.status === "approved" && request.converted_match_id,
        )
        .map((request) => {
          const closed =
            matchAutoFinishTimestamp({
              match_date: request.preferred_date,
              match_time: request.preferred_time,
            }) <= nowMs;
          return {
            id: request.converted_match_id!,
            event_id: null,
            team_id: request.team_id,
            age_group_id: null,
            opponent_name: request.suggested_opponent_name || "Friendly match",
            match_type: "friendly" as const,
            match_date: request.preferred_date,
            match_time: request.preferred_time,
            location: null,
            venue_type: "neutral" as const,
            referee_name: null,
            status: closed ? ("completed" as const) : ("scheduled" as const),
            match_status: closed ? "finished" : "scheduled",
            organizer_notes: request.reason,
            match_notes: request.notes,
            our_score: null,
            opponent_score: null,
            groups: request.team_id
              ? [
                  {
                    id: request.team_id,
                    name: request.team_name ?? "Selected group",
                  },
                ]
              : [],
            birth_years: request.birth_year_id
              ? [
                  {
                    id: request.birth_year_id,
                    label: request.birth_year_name ?? "Selected birthday",
                    fromYear: 0,
                    toYear: 9999,
                  },
                ]
              : [],
          };
        }),
    ],
    [adminRequestsRes?.data, nowMs, requestsRes?.data],
  );
  const matches = useMemo(
    () => [
      ...(matchesRes?.data ?? []),
      ...acceptedRequestMatches.filter(
        (item) =>
          !(matchesRes?.data ?? []).some((match) => match.id === item.id),
      ),
    ],
    [acceptedRequestMatches, matchesRes?.data],
  );
  const activeMatches = useMemo(
    () =>
      matches.filter(
        (item) => !isClosedMatch(item, nowMs),
      ),
    [matches, nowMs],
  );
  const [selectedId, setSelectedId] = useState<string>("");
  const activeId = activeMatches.some((item) => item.id === selectedId)
    ? selectedId
    : activeMatches[0]?.id || "";
  const { data: match } = useGetCoachMatchQuery(activeId, { skip: !activeId });
  const { data: groups = [] } = useGetCoachGroupsScopedQuery();
  const { data: birthdays = [] } = useGetCoachBirthdaysQuery();
  const [request, setRequest] = useState({
    preferredDate: "",
    preferredTime: "",
    opponentLevel: "medium",
    suggestedOpponentName: "",
    reason: "",
    notes: "",
  });
  const [adminRequestTargets, setAdminRequestTargets] = useState<
    Record<string, { mode: "group" | "birthday"; value: string }>
  >({});
  const [adminRequestError, setAdminRequestError] = useState("");
  const [friendlyRequestError, setFriendlyRequestError] = useState("");
  const [createRequest, { isLoading: requesting }] =
    useCreateFriendlyRequestMutation();
  const [acceptAdminRequest, { isLoading: acceptingAdminRequest }] =
    useAcceptCoachAdminMatchRequestMutation();

  const configurationReady = Boolean(match?.tactics && match.squad?.length);
  const matchStartMs = matchStartTimestamp(match);
  const matchDayUnlockMs = matchStartMs - 5 * 60 * 1000;
  const matchClosed = match ? isClosedMatch(match, nowMs) : false;
  const matchDayOpen = Boolean(
    match &&
    match.status !== "cancelled" &&
    !matchClosed &&
    configurationReady &&
    nowMs >= matchDayUnlockMs,
  );

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFriendlyRequestError("");
    const payload = {
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
      opponentLevel: request.opponentLevel,
      suggestedOpponentName: request.suggestedOpponentName,
      reason: request.reason,
      notes: request.notes,
    };
    try {
      await createRequest(payload).unwrap();
      setRequest({
        preferredDate: "",
        preferredTime: "",
        opponentLevel: "medium",
        suggestedOpponentName: "",
        reason: "",
        notes: "",
      });
    } catch (error) {
      setFriendlyRequestError(
        getApiMessage(error, "Could not submit request."),
      );
    }
  };

  const acceptRequest = async (requestId: string) => {
    const target = adminRequestTargets[requestId];
    if (!target?.value) return;
    setAdminRequestError("");
    try {
      await acceptAdminRequest({
        id: requestId,
        ...(target.mode === "group"
          ? { groupId: target.value }
          : { birthYearId: target.value }),
      }).unwrap();
      setAdminRequestTargets((prev) => ({
        ...prev,
        [requestId]: { mode: "group", value: "" },
      }));
    } catch (error) {
      setAdminRequestError(
        getApiMessage(error, "Could not accept match request."),
      );
    }
  };

  const adminRequests = adminRequestsRes?.data ?? [];

  const selectMatch = (id: string) => {
    setSelectedId(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matches"
        description="View admin-scheduled matches and manage squad, tactics, attendance, and evaluations."
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Matches" },
        ]}
        actions={
          <Button variant="outline" onClick={() => refetchMatches()}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Upcoming Matches</CardTitle>
          </CardHeader>
            <CardContent className="space-y-2">
            {matchesError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                Could not load backend matches. Make sure the backend is running and your coach session is valid.
              </div>
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            )}
            {activeMatches.map((item) => (
              <button
                key={item.id}
                className={`w-full rounded-md border p-3 text-left transition-colors ${activeId === item.id ? "border-primary bg-primary/10" : "border-border/50 bg-muted/10 hover:bg-muted/30"}`}
                onClick={() => selectMatch(item.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{item.opponent_name}</p>
                  <Badge variant="outline">{item.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(item.match_date)} ·{" "}
                  {formatTime12(item.match_time)}
                </p>
              </button>
            ))}
            {!activeMatches.length && !isLoading && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No backend matches are assigned to this coach yet. Admin-created matches must target one of this coach&apos;s assigned groups or birth years.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">Match Details</CardTitle>
            </CardHeader>
            <CardContent>
              {match ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold">
                        {match.opponent_name}
                      </h2>
                      <Badge>
                        {match.match_type === "friendly"
                          ? "Friendly"
                          : "Not friendly"}
                      </Badge>
                      <Badge variant="secondary">{match.venue_type}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(match.match_date)} ·{" "}
                      {formatTime12(match.match_time)} · {match.location}
                    </p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-md border border-border/50 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">Saved Configuration</p>
                        <Badge
                          variant={configurationReady ? "success" : "warning"}
                        >
                          {configurationReady ? "configured" : "not configured"}
                        </Badge>
                      </div>
                      {configurationReady ? (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Formation
                              </p>
                              <p className="font-medium">
                                {match.tactics?.formation}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Squad
                              </p>
                              <p className="font-medium">
                                {match.squad?.length ?? 0} players
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Tactical notes
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm">
                              {match.tactics?.tactical_notes || "No notes."}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Open configuration to choose the target, lineup,
                          substitutes, positions, and tactical notes.
                        </p>
                      )}
                    </div>

                    <div className="rounded-md border border-border/50 p-4">
                      <p className="mb-3 font-medium">Squad Preview</p>
                      {match.squad?.length ? (
                        <div className="space-y-2">
                          {match.squad.slice(0, 8).map((item) => (
                            <div
                              key={item.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/15 px-3 py-2 text-sm"
                            >
                              <span className="font-medium">
                                {item.player_name}
                              </span>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  {item.squad_role}
                                </Badge>
                                {item.position && (
                                  <Badge variant="secondary">
                                    {item.position}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          {(match.squad?.length ?? 0) > 8 && (
                            <p className="text-xs text-muted-foreground">
                              +{(match.squad?.length ?? 0) - 8} more players
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No squad saved yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border border-border/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">Match Day Operations</p>
                        <p className="text-xs text-muted-foreground">
                          Operations open 5 minutes before kick-off after
                          configuration is saved.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {matchClosed ? (
                          <Badge variant="success">Match finished</Badge>
                        ) : (
                          <Button asChild variant="outline">
                            <Link
                              href={`/coach/matches/configuration?matchId=${match.id}`}
                            >
                              Edit Configuration
                            </Link>
                          </Button>
                        )}
                        {matchDayOpen ? (
                          <Button asChild>
                            <Link href={`/coach/matches/match-day/${match.id}`}>
                              Open Match Day
                            </Link>
                          </Button>
                        ) : (
                          <Badge variant="secondary">
                            {configurationReady
                              ? "Waiting for match window"
                              : "Configure first"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Select a match to manage technical details.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">Admin Match Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {adminRequestError && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {adminRequestError}
                </p>
              )}
              {adminRequests.map((item) => {
                const target = adminRequestTargets[item.id] ?? {
                  mode: "group",
                  value: "",
                };
                return (
                  <div
                    key={item.id}
                    className="rounded-md border border-border/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.opponent_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(item.match_date)} ·{" "}
                          {formatTime12(item.match_time)} · expires{" "}
                          {formatDate(item.expires_at)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          item.status === "accepted"
                            ? "success"
                            : item.status === "expired"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                    {item.status === "pending" && (
                      <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr_auto]">
                        <Select
                          value={target.mode}
                          onValueChange={(mode) =>
                            setAdminRequestTargets((prev) => ({
                              ...prev,
                              [item.id]: {
                                mode: mode as "group" | "birthday",
                                value: "",
                              },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="group">Group</SelectItem>
                            <SelectItem value="birthday">Birthday</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={target.value}
                          onValueChange={(value) =>
                            setAdminRequestTargets((prev) => ({
                              ...prev,
                              [item.id]: { ...target, value },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                target.mode === "group"
                                  ? "Select group"
                                  : "Select birthday"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {target.mode === "group"
                              ? groups.map((group) => (
                                  <SelectItem
                                    key={group.group_id}
                                    value={group.group_id}
                                  >
                                    {group.group_name}
                                  </SelectItem>
                                ))
                              : birthdays.map((birthday) => (
                                  <SelectItem
                                    key={birthday.id}
                                    value={birthday.id}
                                  >
                                    {birthday.label}
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          disabled={!target.value || acceptingAdminRequest}
                          onClick={() => acceptRequest(item.id)}
                        >
                          Accept
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {!adminRequests.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No admin match requests.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">
                Request Friendly Match
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={submitRequest}
              >
                <div className="space-y-2">
                  <Label>Opponent Level</Label>
                  <Select
                    value={request.opponentLevel}
                    onValueChange={(value) =>
                      setRequest((p) => ({ ...p, opponentLevel: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weak">Weak</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="strong">Strong</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Preferred Date</Label>
                  <Input
                    type="date"
                    value={request.preferredDate}
                    onChange={(e) =>
                      setRequest((p) => ({
                        ...p,
                        preferredDate: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Time</Label>
                  <Input
                    type="time"
                    value={request.preferredTime}
                    onChange={(e) =>
                      setRequest((p) => ({
                        ...p,
                        preferredTime: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Suggested Opponent</Label>
                  <Input
                    value={request.suggestedOpponentName}
                    onChange={(e) =>
                      setRequest((p) => ({
                        ...p,
                        suggestedOpponentName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Reason</Label>
                  <Textarea
                    value={request.reason}
                    onChange={(e) =>
                      setRequest((p) => ({ ...p, reason: e.target.value }))
                    }
                    required
                  />
                </div>
                {friendlyRequestError && (
                  <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                    {friendlyRequestError}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={requesting}
                  className="gap-2 sm:col-span-2"
                >
                  {requesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit Request
                </Button>
              </form>
              <div className="mt-4 space-y-2">
                {requestsRes?.data.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md bg-muted/20 p-2 text-sm"
                  >
                    <span>
                      {item.suggested_opponent_name || item.opponent_level}
                    </span>
                    <Badge
                      variant={
                        item.status === "approved"
                          ? "success"
                          : item.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
