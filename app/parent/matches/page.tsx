"use client";

import { CalendarClock, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { useGetParentChildMatchesQuery } from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

export default function ParentMatchesPage() {
  const { user } = useCurrentUser();
  const childId = user?.linkedPlayerId || "";
  const { data, isLoading } = useGetParentChildMatchesQuery(childId, {
    skip: !childId,
  });
  const matches = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Child Matches"
        description="Upcoming matches, squad selection, and post-match stats."
        breadcrumbs={[
          { label: "Home", href: "/parent/home" },
          { label: "Matches" },
        ]}
      />
      {!childId ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No linked child found for this parent account.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading matches...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const squad = match.squad?.[0];
            const stats = match.stats?.[0];
            return (
              <Card key={match.id} className="border-border/50 bg-card">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-primary/10 p-2 text-primary">
                        <CalendarClock className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{match.opponent_name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatDate(match.match_date)} ·{" "}
                          {formatTime12(match.match_time)} · {match.location}
                        </p>
                      </div>
                    </div>
                    <Badge variant={squad ? "success" : "secondary"}>
                      {squad ? squad.squad_role : "Not selected yet"}
                    </Badge>
                  </div>
                  {stats && (
                    <div className="mt-4 grid grid-cols-3 gap-3 rounded-md bg-muted/20 p-3 text-center text-sm">
                      <div>
                        <p className="font-semibold">{stats.minutes_played}</p>
                        <p className="text-xs text-muted-foreground">Minutes</p>
                      </div>
                      <div>
                        <p className="font-semibold">{stats.goals}</p>
                        <p className="text-xs text-muted-foreground">Goals</p>
                      </div>
                      <div>
                        <p className="font-semibold">{stats.assists}</p>
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
