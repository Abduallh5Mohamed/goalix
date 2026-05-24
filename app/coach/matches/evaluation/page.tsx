"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetCoachMatchesQuery } from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

export default function CoachMatchEvaluationsPage() {
  const { data: matchesRes, isLoading } = useGetCoachMatchesQuery();
  const finishedMatches = useMemo(
    () =>
      (matchesRes?.data ?? [])
        .filter(
          (match) =>
            match.match_status === "finished" ||
            match.status === "completed" ||
            match.status === "finished",
        )
        .sort(
          (a, b) =>
            new Date(b.match_date).getTime() -
            new Date(a.match_date).getTime(),
        ),
    [matchesRes?.data],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Match Evaluations"
        description="Open finished matches to complete or review locked player evaluations."
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Matches", href: "/coach/matches" },
          { label: "Match Evaluations" },
        ]}
      />

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Finished Matches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading matches...
            </div>
          )}

          {finishedMatches.map((match) => {
            const locked = Boolean(match.evaluations_finalized_at);
            return (
              <div
                key={match.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border/50 p-4"
              >
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{match.opponent_name}</h3>
                    <Badge variant={locked ? "success" : "warning"}>
                      {locked ? "locked" : "pending"}
                    </Badge>
                    <Badge variant="outline">
                      {match.our_score ?? 0} - {match.opponent_score ?? 0}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(match.match_date)} -{" "}
                    {formatTime12(match.match_time)}
                    {match.location ? ` - ${match.location}` : ""}
                  </p>
                </div>
                <Button asChild size="sm" variant={locked ? "outline" : "default"}>
                  <Link href={`/coach/matches/evaluation/${match.id}`}>
                    {locked ? "View Evaluation" : "Open Evaluation"}
                  </Link>
                </Button>
              </div>
            );
          })}

          {!finishedMatches.length && !isLoading && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No finished matches are ready for evaluation yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
