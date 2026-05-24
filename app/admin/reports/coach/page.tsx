"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/charts/BarChart";
import { useGetCoachesQuery } from "@/lib/store/api/adminApi";
import { getInitials } from "@/lib/utils";
import { FileDown } from "lucide-react";

export default function CoachReportPage() {
  const router = useRouter();
  const { data: res, isLoading } = useGetCoachesQuery({ limit: 100 });
  const coaches = res?.data ?? [];

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Coach Report"
        description="Coach overview and comparison."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Reports" },
          { label: "Coach" },
        ]}
        actions={
          <Button variant="outline" className="gap-1.5">
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        }
      />
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Coaches ({coaches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {coaches.length > 0 ? (
            <BarChart
              labels={coaches.map((c) => c.full_name)}
              datasets={[
                {
                  label: "Rating",
                  data: coaches.map((c) => c.rating ?? 0),
                  backgroundColor: "#22d3ee",
                },
              ]}
              height={300}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No coaches found.</p>
          )}
        </CardContent>
      </Card>
      <div className="space-y-3">
        {coaches.map((coach, idx) => (
          <Card
            key={coach.id}
            className="border-border/50 bg-card cursor-pointer transition-all hover:border-primary/30"
            onClick={() => router.push(`/admin/coaches/${coach.id}`)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {idx + 1}
              </span>
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-accent/20 text-sm text-accent">
                  {getInitials(coach.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{coach.full_name}</p>
                <p className="text-xs text-muted-foreground">{coach.specialization ?? "Coach"}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
