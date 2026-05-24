"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CalendarDays, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MonthCalendar } from "@/components/shared/MonthCalendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
  useCreateAdminCalendarEventMutation,
  useGetAdminCalendarEventsQuery,
  useGetAdminMatchesQuery,
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

export default function AdminCalendarPage() {
  const { data, isLoading } = useGetAdminCalendarEventsQuery({ limit: 100 });
  const { data: matchesRes, isLoading: loadingMatches } =
    useGetAdminMatchesQuery({ limit: 100 });
  const { data: groups = [] } = useGetGroupsQuery({});
  const [open, setOpen] = useState(false);
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

  const events = useMemo(() => data?.data ?? [], [data?.data]);
  const matches = useMemo(() => matchesRes?.data ?? [], [matchesRes?.data]);
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
          {events.map((event) => (
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
              </CardContent>
            </Card>
          ))}
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
