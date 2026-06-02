"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { CalendarDays, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetCoachCalendarEventsQuery } from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

let trainingClockSnapshot = 0;
const subscribeTrainingClock = (onStoreChange: () => void) => {
  trainingClockSnapshot = Date.now();
  onStoreChange();
  const intervalId = window.setInterval(() => {
    trainingClockSnapshot = Date.now();
    onStoreChange();
  }, 1000);
  return () => window.clearInterval(intervalId);
};
const getTrainingClockSnapshot = () => trainingClockSnapshot;
const getServerTrainingClockSnapshot = () => 0;

export default function CoachTrainingListPage() {
  const { data, isLoading, isError, refetch } = useGetCoachCalendarEventsQuery();
  const nowMs = useSyncExternalStore(
    subscribeTrainingClock,
    getTrainingClockSnapshot,
    getServerTrainingClockSnapshot,
  );
  const trainings = useMemo(
    () =>
      (data?.data ?? [])
        .filter((event) => event.event_type === "training")
        .sort(
          (a, b) =>
            new Date(b.start_datetime).getTime() -
            new Date(a.start_datetime).getTime(),
        ),
    [data?.data],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training"
        description="All scheduled and completed training sessions."
        breadcrumbs={[{ label: "Home", href: "/coach/home" }, { label: "Training" }]}
      />

      <div className="flex justify-end">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
          <Button asChild className="gap-2">
            <Link href="/coach/training/create">
              <Plus className="h-4 w-4" />
              Create Training
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Training Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading trainings...
            </div>
          )}

          {isError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Could not load backend training data. Make sure the backend is running and your coach session is valid.
            </div>
          )}

          {trainings.map((event) => {
            const startMs = Date.parse(event.start_datetime);
            const endMs = Date.parse(event.end_datetime);
            const isOpen =
              event.status === "scheduled" && nowMs >= startMs && nowMs < endMs;
            const isCompleted =
              event.status === "completed" ||
              event.status === "finished" ||
              nowMs >= endMs;
            const isCancelled = event.status === "cancelled";
            const isUpcoming = event.status === "scheduled" && nowMs < startMs;
            const focus = event.training?.training_focus?.replaceAll("_", " ");
            const targetText = [
              event.groups?.length
                ? `${event.groups.length} group${event.groups.length === 1 ? "" : "s"}`
                : "",
              event.birth_years?.length
                ? `${event.birth_years.length} birth year${event.birth_years.length === 1 ? "" : "s"}`
                : "",
              event.players?.length
                ? `${event.players.length} player${event.players.length === 1 ? "" : "s"}`
                : "",
            ]
              .filter(Boolean)
              .join(" - ");

            return (
              <div
                key={event.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border/50 p-4"
              >
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{event.title}</h3>
                    <Badge
                      variant={
                        isCancelled
                          ? "destructive"
                          : isCompleted
                            ? "success"
                            : isOpen
                              ? "info"
                              : "secondary"
                      }
                    >
                      {isCompleted ? "completed" : isOpen ? "open" : event.status}
                    </Badge>
                    {focus && <Badge variant="outline">{focus}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(event.start_datetime)} -{" "}
                    {formatTime12(event.start_datetime)}
                    {event.location ? ` - ${event.location}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {targetText || "No target snapshot"}
                  </p>
                </div>
                {isUpcoming ? (
                  <Button size="sm" variant="outline" disabled>
                    Opens {formatTime12(event.start_datetime)}
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="sm"
                    variant={isOpen ? "default" : "outline"}
                  >
                    <Link href={`/coach/training/${event.id}`}>
                      {isOpen ? "Open Training" : "View Details"}
                    </Link>
                  </Button>
                )}
              </div>
            );
          })}

          {!trainings.length && !isLoading && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No backend training sessions are visible for this coach yet. Create a training event and target one of this coach&apos;s assigned groups, birth years, or players.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
