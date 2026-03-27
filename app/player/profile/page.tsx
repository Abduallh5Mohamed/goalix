"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockPlayers, mockEvaluations, mockRankings } from "@/lib/mock-data";
import { TREND_CONFIG, PLAYER_LEVELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  User,
  Calendar,
  MapPin,
  Trophy,
  Heart,
  Footprints,
} from "lucide-react";

export default function PlayerProfilePage() {
  const player = mockPlayers.find((p) => p.id === "p1")!;
  const evaluations = mockEvaluations.filter((e) => e.playerId === "p1");
  const ranking = mockRankings.find((r) => r.playerId === "p1");

  const infoItems = [
    { label: "Full Name", value: player.fullName, icon: User },
    { label: "Date of Birth", value: formatDate(player.dateOfBirth), icon: Calendar },
    { label: "Branch", value: player.branchName, icon: MapPin },
    { label: "Group", value: player.groupName, icon: User },
    { label: "Position", value: player.position, icon: Footprints },
    { label: "Preferred Foot", value: player.preferredFoot, icon: Footprints },
    { label: "Joined", value: formatDate(player.joinDate), icon: Calendar },
    { label: "Parent", value: player.parentName, icon: Heart },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Your player profile overview"
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Profile" },
          { label: "Overview" },
        ]}
      />

      {/* Player Hero */}
      <Card className="overflow-hidden border-border/50 bg-gradient-to-r from-primary/10 via-card to-accent/10">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/20 ring-4 ring-primary/30">
              <span className="text-4xl font-bold text-primary">
                {player.fullName.charAt(0)}
              </span>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold">{player.fullName}</h2>
              <p className="text-muted-foreground">
                {player.position} · {player.groupName}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Badge className="bg-primary/20 text-primary">
                  Level {player.level}
                </Badge>
                <Badge
                  variant="outline"
                  style={{ color: TREND_CONFIG[player.trend]?.color }}
                >
                  {TREND_CONFIG[player.trend]?.icon}{" "}
                  {TREND_CONFIG[player.trend]?.label}
                </Badge>
                <Badge variant="outline">Age {player.age}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">
                  #{player.rankInGroup}
                </p>
                <p className="text-[10px] text-muted-foreground">Rank</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">
                  {player.performanceScore}
                </p>
                <p className="text-[10px] text-muted-foreground">Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">
                  {player.attendanceRate}%
                </p>
                <p className="text-[10px] text-muted-foreground">Attendance</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Info */}
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {infoItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg bg-muted/20 p-3"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
                <p className="text-sm font-medium capitalize">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Physical Info */}
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Physical Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/20 p-4 text-center">
                <p className="text-3xl font-bold text-primary">
                  {player.height}
                </p>
                <p className="text-xs text-muted-foreground">Height (cm)</p>
              </div>
              <div className="rounded-lg bg-muted/20 p-4 text-center">
                <p className="text-3xl font-bold text-accent">
                  {player.weight}
                </p>
                <p className="text-xs text-muted-foreground">Weight (kg)</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Injury Risk
                  </span>
                  <span
                    className={`font-medium capitalize ${
                      player.injuryRisk === "low"
                        ? "text-emerald-400"
                        : player.injuryRisk === "medium"
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {player.injuryRisk}
                  </span>
                </div>
                <Progress
                  value={
                    player.injuryRisk === "low"
                      ? 25
                      : player.injuryRisk === "medium"
                      ? 55
                      : 85
                  }
                  className="h-2"
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">Performance</span>
                  <span className="font-medium">
                    {player.performanceScore}/100
                  </span>
                </div>
                <Progress value={player.performanceScore} className="h-2" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">Attendance Rate</span>
                  <span className="font-medium">
                    {player.attendanceRate}%
                  </span>
                </div>
                <Progress value={player.attendanceRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
