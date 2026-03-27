"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  mockPlayers,
  mockParents,
  mockSubscriptions,
  mockNotifications,
  mockEvaluations,
  mockSessions,
  mockRankings,
} from "@/lib/mock-data";
import { TREND_CONFIG, PAYMENT_STATUS_CONFIG } from "@/lib/constants";
import { getInitials, formatDate, formatCurrency } from "@/lib/utils";
import {
  Trophy,
  CreditCard,
  Calendar,
  Bell,
  ChevronRight,
  TrendingUp,
  Activity,
  Star,
} from "lucide-react";
import Link from "next/link";

export default function ParentHomePage() {
  // Parent: Hassan Ibrahim (pa1) -> Child: Youssef Ali (p1)
  const parent = mockParents.find((p) => p.id === "pa1")!;
  const child = mockPlayers.find((p) => p.id === "p1")!;
  const subscription = mockSubscriptions.find((s) => s.playerId === "p1");
  const ranking = mockRankings.find((r) => r.playerId === "p1");
  const latestEval = mockEvaluations
    .filter((e) => e.playerId === "p1")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const nextSession = mockSessions.find((s) => s.groupId === child.groupId);
  const parentNotifs = mockNotifications.filter(
    (n) => n.targetRole === "parent" || n.targetRole === "admin"
  ).slice(0, 3);

  const stats = [
    {
      label: "Performance",
      value: child.performanceScore,
      icon: "Star" as const,
      change: 3,
      changeLabel: "vs last month",
    },
    {
      label: "Attendance",
      value: `${child.attendanceRate}%`,
      icon: "ClipboardCheck" as const,
      change: 2,
      changeLabel: "vs last month",
    },
    {
      label: "Rank",
      value: `#${child.rankInGroup}`,
      icon: "Trophy" as const,
      change: ranking ? ranking.previousRank - ranking.rank : 0,
      changeLabel: "vs last week",
    },
    {
      label: "Payment Status",
      value: subscription?.status === "paid" ? "Paid" : subscription?.status || "N/A",
      icon: "CreditCard" as const,
      change: 0,
      changeLabel: subscription ? formatCurrency(subscription.amount) : "",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${parent.fullName}`}
        description="Monitor your child's progress"
        breadcrumbs={[{ label: "Home" }]}
      />

      {/* Child Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 ring-4 ring-primary/30">
            <span className="text-3xl font-bold text-primary">
              {child.fullName.charAt(0)}
            </span>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold">{child.fullName}</h2>
            <p className="text-muted-foreground">
              {child.groupName} · {child.position} · Age {child.age}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge className="bg-primary/20 text-primary">
                Level {child.level}
              </Badge>
              <Badge
                variant="outline"
                style={{ color: TREND_CONFIG[child.trend]?.color }}
              >
                {TREND_CONFIG[child.trend]?.icon}{" "}
                {TREND_CONFIG[child.trend]?.label}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                #{child.rankInGroup}
              </p>
              <p className="text-[10px] text-muted-foreground">Rank</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">
                {child.performanceScore}
              </p>
              <p className="text-[10px] text-muted-foreground">Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">
                {child.attendanceRate}%
              </p>
              <p className="text-[10px] text-muted-foreground">Attendance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatsCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Latest Evaluation */}
          {latestEval && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">
                  Latest Evaluation
                </CardTitle>
                <Link href="/parent/child/performance">
                  <Button variant="ghost" size="sm">
                    Details <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Coach {latestEval.coachName} · {formatDate(latestEval.date)}
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {latestEval.overallScore}
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Technical", value: latestEval.technicalScore, emoji: "⚽" },
                    { label: "Tactical", value: latestEval.tacticalScore, emoji: "🧠" },
                    { label: "Physical", value: latestEval.physicalScore, emoji: "💪" },
                    { label: "Mental", value: latestEval.mentalScore, emoji: "🎯" },
                  ].map((c) => (
                    <div key={c.label} className="rounded-lg bg-muted/20 p-3 text-center">
                      <p className="text-lg">{c.emoji}</p>
                      <p className="text-lg font-bold">{c.value}</p>
                      <p className="text-[10px] text-muted-foreground">{c.label}</p>
                    </div>
                  ))}
                </div>
                {latestEval.notes && (
                  <p className="mt-3 rounded-lg bg-muted/20 p-3 text-sm text-muted-foreground italic">
                    &quot;{latestEval.notes}&quot;
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          {subscription && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">
                  Payment Status
                </CardTitle>
                <Link href="/parent/payments">
                  <Button variant="ghost" size="sm">
                    View All <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg bg-muted/20 p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {subscription.plan} subscription
                    </p>
                    <p className="text-xl font-bold">
                      {formatCurrency(subscription.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(subscription.startDate)} –{" "}
                      {formatDate(subscription.endDate)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      PAYMENT_STATUS_CONFIG[subscription.status as keyof typeof PAYMENT_STATUS_CONFIG]?.variant || "secondary"
                    }
                    className="text-sm"
                  >
                    {PAYMENT_STATUS_CONFIG[subscription.status as keyof typeof PAYMENT_STATUS_CONFIG]?.label || subscription.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Next Session */}
          {nextSession && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Calendar className="h-4 w-4 text-primary" />
                  Next Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{nextSession.groupName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(nextSession.date)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {nextSession.startTime} - {nextSession.endTime}
                </p>
                <Badge className="mt-2" variant="secondary">
                  {nextSession.type}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Quick Links */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Link href="/parent/child/performance">
                <Button
                  variant="outline"
                  className="h-16 w-full flex-col gap-1"
                >
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-[10px]">Performance</span>
                </Button>
              </Link>
              <Link href="/parent/child/attendance">
                <Button
                  variant="outline"
                  className="h-16 w-full flex-col gap-1"
                >
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span className="text-[10px]">Attendance</span>
                </Button>
              </Link>
              <Link href="/parent/payments/pay">
                <Button
                  variant="outline"
                  className="h-16 w-full flex-col gap-1"
                >
                  <CreditCard className="h-4 w-4 text-amber-400" />
                  <span className="text-[10px]">Pay Now</span>
                </Button>
              </Link>
              <Link href="/parent/notifications">
                <Button
                  variant="outline"
                  className="h-16 w-full flex-col gap-1"
                >
                  <Bell className="h-4 w-4 text-purple-400" />
                  <span className="text-[10px]">Notifications</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Notifications Preview */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">
                Notifications
              </CardTitle>
              <Link href="/parent/notifications">
                <Button variant="ghost" size="sm">
                  All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {parentNotifs.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-lg p-3 text-sm ${
                    n.read ? "bg-muted/10" : "bg-muted/30 border-l-2 border-primary"
                  }`}
                >
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
