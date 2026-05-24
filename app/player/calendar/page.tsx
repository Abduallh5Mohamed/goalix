"use client";

import { CalendarDays, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useGetPlayerCalendarEventsQuery } from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

export default function PlayerCalendarPage() {
  const { data, isLoading } = useGetPlayerCalendarEventsQuery();
  const events = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Training, matches, and academy events for your group."
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
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
          {events.map((event) => (
            <Card key={event.id} className="border-border/50 bg-card">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{event.title}</h3>
                    <Badge variant="outline">
                      {event.event_type.replaceAll("_", " ")}
                    </Badge>
                    <Badge variant="secondary">{event.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(event.start_datetime)} ·{" "}
                    {formatTime12(event.start_datetime)}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                </div>
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
