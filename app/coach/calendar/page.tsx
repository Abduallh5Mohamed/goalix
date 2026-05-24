"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarDays, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MonthCalendar } from "@/components/shared/MonthCalendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGetCoachCalendarEventsQuery } from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

export default function CoachCalendarPage() {
  const { data, isLoading } = useGetCoachCalendarEventsQuery();
  const events = useMemo(() => data?.data ?? [], [data?.data]);
  const calendarItems = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.start_datetime,
        type: event.event_type,
        status: event.status,
        subtitle: `${event.event_type.replaceAll("_", " ")}${event.location ? ` - ${event.location}` : ""}`,
      })),
    [events],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Calendar"
        description="Events for your assigned groups only."
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Calendar" },
        ]}
      />

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading calendar...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <MonthCalendar title="My Calendar" items={calendarItems} />
          {events.map((event) => (
            <Card key={event.id} className="border-border/50 bg-card">
              <CardContent className="flex flex-wrap items-start gap-3 p-4">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
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
                    {formatDate(event.start_datetime)} -{" "}
                    {formatTime12(event.start_datetime)}
                    {event.location ? ` - ${event.location}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.groups?.map((group) => group.name).join(", ")}
                  </p>
                </div>
                {event.event_type === "training" && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/coach/training/${event.id}`}>
                      Open Training
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {!events.length && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No calendar events yet.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
