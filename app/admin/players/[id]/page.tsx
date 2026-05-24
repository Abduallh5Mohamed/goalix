"use client";

import { use } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart } from "@/components/charts/LineChart";
import {
  useGetPlayerByIdQuery,
  useGetPlayerMeasurementsQuery,
} from "@/lib/store/api/adminApi";
import { getInitials, formatDate } from "@/lib/utils";
import { Edit, MapPin, Calendar, Activity, Shield } from "lucide-react";

const CURRENT_TIME = Date.now();

export default function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: player, isLoading, error } = useGetPlayerByIdQuery(id);
  const { data: measurementsRes } = useGetPlayerMeasurementsQuery({ playerId: id });
  const measurements = measurementsRes?.data ?? [];

  if (isLoading) return <LoadingSkeleton />;
  if (error || !player) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Player not found.</p>
      </div>
    );
  }

  const age = player.date_of_birth
    ? Math.floor((CURRENT_TIME - new Date(player.date_of_birth).getTime()) / 31557600000)
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={player.full_name}
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Players", href: "/admin/players" },
          { label: player.full_name },
        ]}
        actions={
          <Button variant="outline" className="gap-1.5">
            <Edit className="h-4 w-4" />
            Edit Player
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="border-border/50 bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary/20 text-2xl font-bold text-primary">
                  {getInitials(player.full_name)}
                </AvatarFallback>
              </Avatar>
              <h3 className="mt-4 text-lg font-bold">{player.full_name}</h3>
              <p className="text-sm text-muted-foreground">{player.position ?? "\u2014"}</p>
              {player.level && (
                <Badge variant="secondary" className="mt-2">Level: {player.level}</Badge>
              )}
              <div className="mt-6 w-full space-y-3 text-left text-sm">
                {age !== null && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Age</div>
                    <span className="text-foreground font-medium">{age} years</span>
                  </div>
                )}
                {player.preferred_foot && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Foot</div>
                    <span className="text-foreground font-medium capitalize">{player.preferred_foot}</span>
                  </div>
                )}
                {player.guardian_name && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-2"><Shield className="h-4 w-4" /> Guardian</div>
                    <span className="text-foreground font-medium text-xs">{player.guardian_name}</span>
                  </div>
                )}
                {player.guardian_phone && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Phone</div>
                    <span className="text-foreground font-medium text-xs">{player.guardian_phone}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Card className="border-border/50 bg-card p-4">
              <p className="text-sm text-muted-foreground">Level</p>
              <p className="mt-1 text-2xl font-bold">{player.level ?? "\u2014"}</p>
            </Card>
            <Card className="border-border/50 bg-card p-4">
              <p className="text-sm text-muted-foreground">Position</p>
              <p className="mt-1 text-2xl font-bold">{player.position ?? "\u2014"}</p>
            </Card>
            <Card className="border-border/50 bg-card p-4">
              <p className="text-sm text-muted-foreground">Joined</p>
              <p className="mt-1 text-2xl font-bold">{formatDate(player.created_at)}</p>
            </Card>
          </div>
          <Tabs defaultValue="measurements">
            <TabsList>
              <TabsTrigger value="measurements">Measurements</TabsTrigger>
              <TabsTrigger value="info">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="measurements" className="mt-4">
              {measurements.length > 0 ? (
                <div className="space-y-4">
                  <LineChart
                    labels={measurements.map((m) => formatDate(m.measured_at))}
                    datasets={[
                      { label: "Height (cm)", data: measurements.map((m) => Number(m.height_cm) || 0), borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,0.1)" },
                      { label: "Weight (kg)", data: measurements.map((m) => Number(m.weight_kg) || 0), borderColor: "#3ddc84", backgroundColor: "rgba(61,220,132,0.1)" },
                    ]}
                    height={280}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {measurements.map((m) => (
                      <Card key={m.id} className="border-border/50 bg-card">
                        <CardContent className="p-3 text-sm">
                          <p className="text-xs text-muted-foreground">{formatDate(m.measured_at)}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div><p className="text-[10px] text-muted-foreground">Height</p><p className="font-semibold">{m.height_cm ?? "\u2014"} cm</p></div>
                            <div><p className="text-[10px] text-muted-foreground">Weight</p><p className="font-semibold">{m.weight_kg ?? "\u2014"} kg</p></div>
                          </div>
                          {m.notes && <p className="mt-1 text-xs text-muted-foreground">{m.notes}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No measurements yet.</p>
              )}
            </TabsContent>
            <TabsContent value="info" className="mt-4">
              <Card className="border-border/50 bg-card">
                <CardHeader><CardTitle className="text-base">Player Information</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Full Name</span><span className="font-medium">{player.full_name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Date of Birth</span><span className="font-medium">{player.date_of_birth ? formatDate(player.date_of_birth) : "\u2014"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Position</span><span className="font-medium">{player.position ?? "\u2014"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Level</span><span className="font-medium">{player.level ?? "\u2014"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Preferred Foot</span><span className="font-medium capitalize">{player.preferred_foot ?? "\u2014"}</span></div>
                  {player.notes && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Notes</span><span className="font-medium max-w-[60%] text-right">{player.notes}</span></div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
