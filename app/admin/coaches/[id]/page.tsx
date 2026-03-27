"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { LineChart } from "@/components/charts/LineChart";
import { mockCoaches, mockGroups, mockPlayers, mockEvaluations } from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";
import { Edit, Mail, Phone, MapPin, Calendar, Star, Users, ClipboardCheck } from "lucide-react";

export default function CoachProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const coach = mockCoaches.find((c) => c.id === id);
  const coachGroups = mockGroups.filter((g) => coach?.assignedGroups.includes(g.id));
  const coachPlayers = mockPlayers.filter((p) => coachGroups.some((g) => g.id === p.groupId));
  const coachEvals = mockEvaluations.filter((e) => e.coachId === id);

  if (!coach) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Coach not found.</p>
      </div>
    );
  }

  const levelDist = {
    A: coachPlayers.filter((p) => p.level === "A").length,
    B: coachPlayers.filter((p) => p.level === "B").length,
    C: coachPlayers.filter((p) => p.level === "C").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={coach.fullName}
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Coaches", href: "/admin/coaches" },
          { label: coach.fullName },
        ]}
        actions={
          <Button variant="outline" className="gap-1.5">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        }
      />

      {/* Profile Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/50 bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-accent/20 text-2xl font-bold text-accent">
                  {getInitials(coach.fullName)}
                </AvatarFallback>
              </Avatar>
              <h3 className="mt-4 text-lg font-bold">{coach.fullName}</h3>
              <p className="text-sm text-muted-foreground">{coach.specialization}</p>
              <Badge variant={coach.status === "active" ? "success" : "secondary"} className="mt-2">
                {coach.status}
              </Badge>

              <div className="mt-6 w-full space-y-3 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{coach.email}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{coach.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{coach.branchName}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {coach.joinDate}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatsCard
              label="Performance Score"
              value={coach.performanceScore}
              icon="UserCheck"
              change={5}
              changeLabel="vs last month"
            />
            <StatsCard
              label="Assigned Groups"
              value={coachGroups.length}
              icon="Layers"
            />
            <StatsCard
              label="Total Players"
              value={coachPlayers.length}
              icon="Users"
            />
          </div>

          <Tabs defaultValue="groups">
            <TabsList>
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="groups" className="mt-4 space-y-3">
              {coachGroups.map((group) => (
                <Card key={group.id} className="border-border/50 bg-card">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-xs text-muted-foreground">{group.schedule}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{group.playerCount}/{group.maxPlayers}</p>
                        <p className="text-[10px] text-muted-foreground">players</p>
                      </div>
                      <Badge variant={group.status === "active" ? "success" : "secondary"}>
                        {group.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {coachGroups.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No groups assigned.
                </p>
              )}
            </TabsContent>

            <TabsContent value="evaluations" className="mt-4 space-y-3">
              {coachEvals.map((ev) => (
                <Card key={ev.id} className="border-border/50 bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{ev.playerName}</p>
                        <p className="text-xs text-muted-foreground">{ev.date}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 text-amber-400" />
                        <span className="text-lg font-bold">{ev.overallScore}</span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {(["technicalScore", "tacticalScore", "physicalScore", "mentalScore"] as const).map((key) => (
                        <div key={key} className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {key.replace("Score", "")}
                          </p>
                          <p className="text-sm font-semibold">{ev[key]}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{ev.notes}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Card className="border-border/50 bg-card">
                  <CardHeader>
                    <CardTitle className="text-sm">Player Level Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DoughnutChart
                      labels={["Level A", "Level B", "Level C"]}
                      data={[levelDist.A, levelDist.B, levelDist.C]}
                      colors={["#3ddc84", "#f59e0b", "#ef4444"]}
                      height={200}
                    />
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-card">
                  <CardHeader>
                    <CardTitle className="text-sm">Performance Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LineChart
                      labels={["Oct", "Nov", "Dec", "Jan"]}
                      datasets={[
                        {
                          label: "Performance",
                          data: [82, 85, 89, coach.performanceScore],
                          borderColor: "#22d3ee",
                          backgroundColor: "rgba(34,211,238,0.1)",
                        },
                      ]}
                      height={200}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
