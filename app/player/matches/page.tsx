"use client";

import { CalendarClock, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useGetPlayerMatchesQuery } from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

export default function PlayerMatchesPage() {
  const { data, isLoading } = useGetPlayerMatchesQuery();
  const matches = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matches"
        description="Upcoming matches, squad status, and post-match stats."
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Matches" },
        ]}
      />
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading matches...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const mySquad = match.squad?.[0];
            const myStats = match.stats?.[0];
            return (
              <Card key={match.id} className="border-border/50 bg-card">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-primary/10 p-2 text-primary">
                        <CalendarClock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {match.opponent_name}
                          </h3>
                          <Badge variant="outline">{match.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatDate(match.match_date)} ·{" "}
                          {formatTime12(match.match_time)} · {match.location}
                        </p>
                      </div>
                    </div>
                    <Badge variant={mySquad ? "success" : "secondary"}>
                      {mySquad ? mySquad.squad_role : "Not selected yet"}
                    </Badge>
                  </div>
                  {myStats && (
                    <div className="mt-4 grid grid-cols-3 gap-3 rounded-md bg-muted/20 p-3 text-center text-sm">
                      <div>
                        <p className="font-semibold">
                          {myStats.minutes_played}
                        </p>
                        <p className="text-xs text-muted-foreground">Minutes</p>
                      </div>
                      <div>
                        <p className="font-semibold">{myStats.goals}</p>
                        <p className="text-xs text-muted-foreground">Goals</p>
                      </div>
                      <div>
                        <p className="font-semibold">{myStats.assists}</p>
                        <p className="text-xs text-muted-foreground">Assists</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {!matches.length && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No matches yet.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
