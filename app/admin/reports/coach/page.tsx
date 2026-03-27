"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/charts/BarChart";
import { mockCoaches } from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";
import { FileDown, Star } from "lucide-react";

export default function CoachReportPage() {
  const router = useRouter();
  const sortedCoaches = [...mockCoaches].sort((a, b) => b.performanceScore - a.performanceScore);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Coach Report"
        description="Coach performance analysis and comparisons."
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
          <CardTitle className="text-base">Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            labels={sortedCoaches.map((c) => c.fullName)}
            datasets={[
              {
                label: "Performance Score",
                data: sortedCoaches.map((c) => c.performanceScore),
                backgroundColor: sortedCoaches.map((_, i) =>
                  i === 0 ? "#3ddc84" : "#22d3ee"
                ),
              },
            ]}
            height={300}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {sortedCoaches.map((coach, idx) => (
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
                  {getInitials(coach.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{coach.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {coach.specialization} · {coach.branchName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={coach.status === "active" ? "success" : "secondary"}>
                  {coach.status}
                </Badge>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-amber-400" />
                  <span className="text-lg font-bold">{coach.performanceScore}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
