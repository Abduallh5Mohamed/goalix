"use client";

import { use } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetCoachByIdQuery,
  useGetCoachGroupsQuery,
} from "@/lib/store/api/adminApi";
import { getInitials } from "@/lib/utils";
import { Edit, Calendar } from "lucide-react";

export default function CoachProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: coach, isLoading, error } = useGetCoachByIdQuery(id);
  const { data: groups } = useGetCoachGroupsQuery(id);

  if (isLoading) return <LoadingSkeleton />;
  if (error || !coach) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Coach not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={coach.full_name}
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Coaches", href: "/admin/coaches" },
          { label: coach.full_name },
        ]}
        actions={
          <Button variant="outline" className="gap-1.5">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/50 bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-accent/20 text-2xl font-bold text-accent">
                  {getInitials(coach.full_name)}
                </AvatarFallback>
              </Avatar>
              <h3 className="mt-4 text-lg font-bold">{coach.full_name}</h3>
              <p className="text-sm text-muted-foreground">{coach.specialization ?? "Coach"}</p>
              <div className="mt-6 w-full space-y-3 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date(coach.created_at).toLocaleDateString()}</span>
                </div>
                {coach.bio && (
                  <p className="text-xs text-muted-foreground mt-2">{coach.bio}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatsCard label="Specialization" value={coach.specialization ?? "\u2014"} icon="UserCheck" />
            <StatsCard label="Assigned Groups" value={groups?.length ?? 0} icon="Layers" />
          </div>
          <Tabs defaultValue="groups">
            <TabsList>
              <TabsTrigger value="groups">Groups</TabsTrigger>
            </TabsList>
            <TabsContent value="groups" className="mt-4 space-y-3">
              {groups && groups.length > 0 ? (
                groups.map((g) => (
                  <Card key={g.id} className="border-border/50 bg-card">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">Group {g.group_id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">Role: {g.role}</p>
                      </div>
                      <Badge variant="secondary">{g.role}</Badge>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No groups assigned.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
