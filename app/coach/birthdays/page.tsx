"use client";

import { useMemo } from "react";
import { Cake, Loader2, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetCoachBirthdaysQuery } from "@/lib/store/api/coachApi";
import { useGetCoachPlayersScopedQuery } from "@/lib/store/api/calendarApi";
import { formatDate, getInitials } from "@/lib/utils";

const getBirthYear = (value: string | null) => {
  if (!value) return null;
  const year = new Date(value).getFullYear();
  return Number.isInteger(year) ? year : null;
};

export default function CoachBirthdaysPage() {
  const { data: birthdays = [], isLoading: loadingBirthdays } = useGetCoachBirthdaysQuery();
  const { data: playersRes, isLoading: loadingPlayers } = useGetCoachPlayersScopedQuery({ limit: 500 });
  const players = useMemo(() => playersRes?.data ?? [], [playersRes?.data]);

  const birthdaysWithPlayers = useMemo(() => {
    return birthdays.map((birthday) => {
      const scopedPlayers = players.filter((player) => {
        const year = getBirthYear(player.date_of_birth);
        return (
          player.branch_id === birthday.branchId &&
          year !== null &&
          year >= birthday.fromYear &&
          year <= birthday.toYear
        );
      });
      return { ...birthday, players: scopedPlayers };
    });
  }, [birthdays, players]);

  const isLoading = loadingBirthdays || loadingPlayers;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Birthdays"
        description="View your assigned birth years and the players inside each birthday range."
        breadcrumbs={[{ label: "Home", href: "/coach/home" }, { label: "Birthdays" }]}
      />

      {isLoading ? (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading birthdays...
          </CardContent>
        </Card>
      ) : birthdaysWithPlayers.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {birthdaysWithPlayers.map((birthday) => (
            <Card key={birthday.id} className="border-border/50 bg-card">
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Cake className="h-4 w-4 text-primary" />
                    {birthday.label}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {birthday.branchName} - {birthday.fromYear} to {birthday.toYear}
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {birthday.players.length} players
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {birthday.players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/20 text-xs text-primary">
                          {getInitials(player.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{player.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {player.date_of_birth ? formatDate(player.date_of_birth) : "No birth date"} - {player.position || "No position"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={player.profile_status === "complete" ? "success" : "warning"}>
                      {player.profile_status}
                    </Badge>
                  </div>
                ))}
                {!birthday.players.length && (
                  <p className="rounded-lg border border-border/40 p-5 text-center text-sm text-muted-foreground">
                    No players in this birthday yet.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No birthdays assigned yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
