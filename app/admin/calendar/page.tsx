"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MonthCalendar } from "@/components/shared/MonthCalendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useGetGroupsQuery } from "@/lib/store/api/adminApi";
import {
  type CalendarEvent,
  type Match,
  useCreateAdminCalendarEventMutation,
  useGetAdminCalendarEventsQuery,
  useGetAdminMatchesQuery,
  useHardDeleteAdminMatchMutation,
  useHardDeleteAdminTrainingEventMutation,
} from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

const eventTypes = [
  "training",
  "match",
  "fitness_test",
  "meeting",
  "rest_day",
  "tournament",
  "medical_check",
  "assessment_day",
] as const;

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

export default function AdminCalendarPage() {
  const { data, isLoading } = useGetAdminCalendarEventsQuery({ limit: 100 });
  const { data: matchesRes, isLoading: loadingMatches } =
    useGetAdminMatchesQuery({ limit: 100 });
  const { data: groups = [] } = useGetGroupsQuery({});
  const [open, setOpen] = useState(false);
  const [deleteTrainingRow, setDeleteTrainingRow] =
    useState<CalendarEvent | null>(null);
  const [deleteMatchRow, setDeleteMatchRow] = useState<Match | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [form, setForm] = useState({
    title: "",
    eventType: "meeting",
    startDatetime: "",
    endDatetime: "",
    location: "",
    status: "scheduled",
    groupId: "",
    notes: "",
  });
  const [createEvent, { isLoading: isCreating }] =
    useCreateAdminCalendarEventMutation();
  const [hardDeleteTraining, { isLoading: deletingTraining }] =
    useHardDeleteAdminTrainingEventMutation();
  const [hardDeleteMatch, { isLoading: deletingMatch }] =
    useHardDeleteAdminMatchMutation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createEvent({
      title: form.title,
      eventType: form.eventType,
      startDatetime: new Date(form.startDatetime).toISOString(),
      endDatetime: new Date(form.endDatetime).toISOString(),
      location: form.location,
      status: form.status,
      visibility: form.groupId ? "selected_groups" : "coaches_only",
      groupIds: form.groupId ? [form.groupId] : undefined,
      notes: form.notes,
    }).unwrap();
    setOpen(false);
    setForm({
      title: "",
      eventType: "meeting",
      startDatetime: "",
      endDatetime: "",
      location: "",
      status: "scheduled",
      groupId: "",
      notes: "",
    });
  };

  const handleHardDeleteTraining = async () => {
    if (!deleteTrainingRow) return;
    const expected = `delete training forever ${deleteTrainingRow.title}`;
    setDeleteError("");

    if (deleteConfirm.trim() !== expected) {
      setDeleteError(`Type "${expected}" to confirm permanent deletion.`);
      return;
    }

    try {
      await hardDeleteTraining(deleteTrainingRow.id).unwrap();
      setDeleteTrainingRow(null);
      setDeleteConfirm("");
    } catch (error) {
      setDeleteError(
        getApiMessage(error, "Could not permanently delete training."),
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
      const message = getApiMessage(
        error,
        "Could not permanently delete this match.",
      );
      setDeleteError(
        `${message}\nSolution: remove or detach any remaining linked records, then try Delete Forever again.`,
      );
    }
  };

  const events = useMemo(() => data?.data ?? [], [data?.data]);
  const matches = useMemo(() => matchesRes?.data ?? [], [matchesRes?.data]);
  const deleteExpected = `delete training forever ${deleteTrainingRow?.title ?? ""}`;
  const deleteMatchExpected = `delete match forever ${deleteMatchRow?.opponent_name ?? ""}`;
  const matchByEventId = useMemo(
    () =>
      new Map(
        matches
          .filter((match) => Boolean(match.event_id))
          .map((match) => [match.event_id as string, match]),
      ),
    [matches],
  );
  const calendarItems = useMemo(
    () => [
      ...events.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.start_datetime,
        type: event.event_type,
        status: event.status,
        subtitle: `${event.event_type.replaceAll("_", " ")}${event.location ? ` - ${event.location}` : ""}`,
      })),
      ...matches.map((match) => ({
        id: match.id,
        title: match.opponent_name,
        date: match.match_date,
        type: "match",
        status: match.status,
        subtitle: `${formatTime12(match.match_time)} - ${match.groups?.map((group) => group.name).join(", ") || match.team_name || "No group"}`,
      })),
    ],
    [events, matches],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Main Calendar"
        description="Academy-wide calendar events across groups."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Calendar" },
        ]}
        actions={
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Calendar Event</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.eventType}
                  onValueChange={(value) =>
                    setForm((p) => ({ ...p, eventType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Starts</Label>
                <Input
                  type="datetime-local"
                  value={form.startDatetime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, startDatetime: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Ends</Label>
                <Input
                  type="datetime-local"
                  value={form.endDatetime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, endDatetime: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Select
                  value={form.groupId}
                  onValueChange={(value) =>
                    setForm((p) => ({ ...p, groupId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Coaches only or select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, location: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isCreating} className="gap-2">
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTrainingRow)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTrainingRow(null);
            setDeleteConfirm("");
            setDeleteError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>Delete Training Forever</DialogTitle>
            <DialogDescription>
              This permanently removes the training event, targets, attendance,
              evaluations, notifications, and affected injury-risk outputs. Type{" "}
              <span className="font-semibold text-foreground">
                {deleteExpected}
              </span>{" "}
              to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-training-confirm">Confirmation</Label>
            <Input
              id="delete-training-confirm"
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
              onClick={() => {
                setDeleteTrainingRow(null);
                setDeleteConfirm("");
                setDeleteError("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                deletingTraining || deleteConfirm.trim() !== deleteExpected
              }
              onClick={handleHardDeleteTraining}
              className="gap-2"
            >
              {deletingTraining && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteMatchRow)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deletingMatch) {
            setDeleteMatchRow(null);
            setDeleteConfirm("");
            setDeleteError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>Delete Match Forever</DialogTitle>
            <DialogDescription>
              This permanently removes the match, calendar event, squad,
              tactics, attendance, incidents, goals, substitutions, and player
              stats. Type{" "}
              <span className="font-semibold text-foreground">
                {deleteMatchExpected}
              </span>{" "}
              to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="calendar-delete-match-confirm">Confirmation</Label>
            <Input
              id="calendar-delete-match-confirm"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder={deleteMatchExpected}
              autoComplete="off"
            />
          </div>
          {deleteError && (
            <p className="whitespace-pre-line rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletingMatch}
              onClick={() => {
                setDeleteMatchRow(null);
                setDeleteConfirm("");
                setDeleteError("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                deletingMatch ||
                deleteConfirm.trim() !== deleteMatchExpected
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

      <MonthCalendar title="Academy Calendar" items={calendarItems} />

      {isLoading || loadingMatches ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading events...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const linkedMatch =
              event.event_type === "match"
                ? matchByEventId.get(event.id)
                : undefined;

            return (
            <Card key={event.id} className="border-border/50 bg-card">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-md bg-primary/10 p-2 text-primary">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{event.title}</h3>
                      <Badge variant="outline">
                        {event.event_type.replaceAll("_", " ")}
                      </Badge>
                      <Badge
                        variant={
                          event.status === "cancelled"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(event.start_datetime)} ·{" "}
                      {formatTime12(event.start_datetime)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.groups?.length
                        ? event.groups.map((group) => group.name).join(", ")
                        : "Coaches only"}
                    </p>
                  </div>
                </div>
                {event.event_type === "training" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="gap-1.5 self-start sm:self-center"
                    onClick={() => {
                      setDeleteError("");
                      setDeleteConfirm("");
                      setDeleteTrainingRow(event);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete forever
                  </Button>
                )}
                {linkedMatch && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="gap-1.5 self-start sm:self-center"
                    onClick={() => {
                      setDeleteError("");
                      setDeleteConfirm("");
                      setDeleteMatchRow(linkedMatch);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete forever
                  </Button>
                )}
              </CardContent>
            </Card>
            );
          })}
          {!events.length && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No events yet.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
