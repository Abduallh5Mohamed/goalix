"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FinishedMatchDetails } from "@/components/shared/FinishedMatchDetails";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  useGetAdminMatchQuery,
  useGetAdminMatchesQuery,
} from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

export default function AdminMatchArchivePage() {
  const { data: matchesRes, isLoading } = useGetAdminMatchesQuery({
    limit: 100,
  });
  const [selectedId, setSelectedId] = useState("");
  const matches = useMemo(() => matchesRes?.data ?? [], [matchesRes?.data]);
  const finishedMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          match.status === "finished" || match.match_status === "finished",
      ),
    [matches],
  );
  const activeId = finishedMatches.some((match) => match.id === selectedId)
    ? selectedId
    : finishedMatches[0]?.id || "";
  const { data: match, isLoading: loadingMatch } = useGetAdminMatchQuery(
    activeId,
    { skip: !activeId },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finished Matches"
        description="Review played matches with saved tactics, squad, attendance, incidents, and player stats."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Matches", href: "/admin/matches" },
          { label: "Archive" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Card className="border-border/50 bg-card">
          <CardContent className="space-y-2 p-4">
            {finishedMatches.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`w-full rounded-md border p-3 text-left transition-colors ${
                  activeId === item.id
                    ? "border-primary bg-primary/10"
                    : "border-border/50 bg-muted/10 hover:bg-muted/30"
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.opponent_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.match_date)} ·{" "}
                      {formatTime12(item.match_time)}
                    </p>
                  </div>
                  <Badge variant="success">finished</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.location || "To be confirmed"}
                </p>
              </button>
            ))}
            {isLoading && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading finished matches...
              </p>
            )}
            {!finishedMatches.length && !isLoading && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No finished matches yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardContent className="p-4">
            <FinishedMatchDetails
              match={match}
              isLoading={loadingMatch}
              hasMatches={Boolean(finishedMatches.length)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
