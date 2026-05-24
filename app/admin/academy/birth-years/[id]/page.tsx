"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetBirthYearByIdQuery } from "@/lib/store/api/adminApi";
import { ArrowLeft, Users } from "lucide-react";

export default function BirthYearDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { data, isLoading, isError } = useGetBirthYearByIdQuery(id, { skip: !id });

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !data) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="outline" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <p className="text-sm text-muted-foreground">Birth year details could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`${data.label} (${data.fromYear}-${data.toYear})`}
        description={`${data.branchName} branch overview`}
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Academy" },
          { label: "Birth Years", href: "/admin/academy/birth-years" },
          { label: data.label },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Coaches</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.coaches.length ? data.coaches.map((coach) => (
              <div key={coach.id} className="rounded-md border border-border p-3">
                <p className="font-medium">{coach.full_name}</p>
                <p className="text-xs text-muted-foreground">{coach.role ?? "Coach"} · {coach.email ?? coach.phone ?? ""}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No coaches assigned to this branch.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Groups</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.groups.length ? data.groups.map((group) => (
              <div key={group.id} className="rounded-md border border-border p-3">
                <p className="font-medium">{group.name}</p>
                <p className="text-xs text-muted-foreground">{group.description ?? "No description"}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">This birth year is not used in any group.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Players</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-semibold">
              <Users className="h-5 w-5 text-primary" />
              {data.players.length}
            </div>
            <p className="text-sm text-muted-foreground">Players born from {data.fromYear} to {data.toYear}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Players In This Birth Year</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.players.length ? data.players.map((player) => (
            <div key={player.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <div>
                <p className="font-medium">{player.full_name}</p>
                <p className="text-xs text-muted-foreground">#{player.player_code ?? player.id} · {player.date_of_birth ?? "No birth date"}</p>
              </div>
              {player.level && <Badge variant="secondary">{player.level}</Badge>}
            </div>
          )) : <p className="text-sm text-muted-foreground">No players found for this birth year range.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
