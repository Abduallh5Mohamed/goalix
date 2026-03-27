"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mockGroups, mockPlayers } from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";
import { Users, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function CoachMyGroupsPage() {
  const myGroups = mockGroups.filter((g) =>
    ["g1", "g3"].includes(g.id)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Groups"
        description="Groups assigned to you"
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "My Groups" },
        ]}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        {myGroups.map((group) => {
          const groupPlayers = mockPlayers.filter(
            (p) => p.groupId === group.id
          );
          const avgScore =
            groupPlayers.length > 0
              ? Math.round(
                  groupPlayers.reduce(
                    (acc, p) => acc + p.performanceScore,
                    0
                  ) / groupPlayers.length
                )
              : 0;
          const avgAttendance =
            groupPlayers.length > 0
              ? Math.round(
                  groupPlayers.reduce(
                    (acc, p) => acc + p.attendanceRate,
                    0
                  ) / groupPlayers.length
                )
              : 0;

          return (
            <Link key={group.id} href={`/coach/my-groups/${group.id}`}>
              <Card className="border-border/50 bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{group.name}</h3>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {group.schedule}
                      </div>
                    </div>
                    <Badge
                      variant={
                        group.status === "active" ? "default" : "secondary"
                      }
                    >
                      {group.status}
                    </Badge>
                  </div>

                  {/* Stats Row */}
                  <div className="mb-4 grid grid-cols-3 gap-4 rounded-lg bg-muted/20 p-3">
                    <div className="text-center">
                      <p className="text-lg font-bold">{group.playerCount}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Players
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-primary">
                        {avgAttendance}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Attendance
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-accent">
                        {avgScore}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Avg Score
                      </p>
                    </div>
                  </div>

                  {/* Player Avatars */}
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {groupPlayers.slice(0, 6).map((player) => (
                        <Avatar
                          key={player.id}
                          className="h-8 w-8 border-2 border-card"
                        >
                          <AvatarFallback className="bg-primary/20 text-[10px] text-primary">
                            {getInitials(player.fullName)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {groupPlayers.length > 6 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] text-muted-foreground">
                          +{groupPlayers.length - 6}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
