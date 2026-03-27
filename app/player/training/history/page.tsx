"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockSessions, mockPlayers } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { Calendar, Clock, Dumbbell } from "lucide-react";

export default function PlayerTrainingHistoryPage() {
  const player = mockPlayers.find((p) => p.id === "p1")!;
  const sessions = mockSessions
    .filter((s) => s.groupId === player.groupId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const typeColors: Record<string, string> = {
    training: "bg-primary/20 text-primary",
    match: "bg-red-500/20 text-red-400",
    assessment: "bg-amber-500/20 text-amber-400",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training History"
        description="Past sessions and activities"
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Training" },
          { label: "History" },
        ]}
      />

      <div className="space-y-3">
        {sessions.map((session) => (
          <Card key={session.id} className="border-border/50 bg-card">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{session.groupName}</h3>
                    <Badge
                      className={typeColors[session.type] || ""}
                      variant="secondary"
                    >
                      {session.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(session.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {session.startTime} - {session.endTime}
                    </span>
                  </div>
                  {session.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {session.notes}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
