"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { AreaChart } from "@/components/charts/AreaChart";
import { BarChart } from "@/components/charts/BarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetDashboardQuery, useGetRecentPlayersQuery } from "@/lib/store/api/dashboardApi";
import { getInitials, formatCurrency } from "@/lib/utils";
import {
  Bell,
  ClipboardCheck,
  CreditCard,
  TrendingUp,
  Users,
  UserPlus,
  Send,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import Link from "next/link";

const notifIcons: Record<string, React.ElementType> = {
  warning: AlertTriangle,
  alert: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const notifColors: Record<string, string> = {
  warning: "text-amber-400",
  alert: "text-red-400",
  success: "text-emerald-400",
  info: "text-blue-400",
};

const levelColors: Record<string, string> = {
  A: "text-emerald-400",
  B: "text-amber-400",
  C: "text-red-400",
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const { data, isLoading, isError } = useGetDashboardQuery();
  const { data: recentPlayers, isLoading: playersLoading } = useGetRecentPlayersQuery();

  if (isError) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-10 w-10 text-red-400" />
        <p className="text-lg font-semibold text-foreground">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground">Could not connect to the server. Please try again.</p>
        <Button onClick={() => router.refresh()} variant="outline" size="sm">Retry</Button>
      </div>
    );
  }

  const kpis = data
    ? [
      { label: "Total Players", value: data.kpis.totalPlayers, changeLabel: "registered players", icon: "Users" },
      { label: "Attendance Rate", value: `${data.kpis.avgAttendanceRate}%`, changeLabel: "last 30 days", icon: "ClipboardCheck" },
      { label: "Monthly Revenue", value: formatCurrency(data.kpis.monthlyRevenue), changeLabel: "this month (paid)", icon: "CreditCard" },
      { label: "Active Coaches", value: data.kpis.totalCoaches, changeLabel: "registered coaches", icon: "UserCheck" },
      { label: "Active Subscriptions", value: data.kpis.activeSubscriptions, changeLabel: "active plans", icon: "Layers" },
      { label: "Overdue Payments", value: data.kpis.overduePayments, changeLabel: "need follow-up", icon: "AlertTriangle" },
    ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's what's happening at GOLX Academy."
        actions={
          <div className="flex gap-2">
            <Link href="/admin/players">
              <Button size="sm" variant="outline" className="gap-1.5">
                <UserPlus className="h-4 w-4" />
                Add Player
              </Button>
            </Link>
            <Link href="/admin/notifications/compose">
              <Button size="sm" className="gap-1.5">
                <Send className="h-4 w-4" />
                Send Notification
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <StatsCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              changeLabel={kpi.changeLabel}
              icon={kpi.icon}
            />
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Attendance Trend */}
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Attendance Trend</CardTitle>
            <Badge variant="secondary" className="text-xs">Last 8 Weeks</Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full rounded-lg" />
            ) : (
              <AreaChart
                labels={(data?.attendanceTrend ?? []).map((d) => d.label)}
                datasets={[
                  {
                    label: "Attendance %",
                    data: (data?.attendanceTrend ?? []).map((d) => d.value),
                    borderColor: "#22d3ee",
                    backgroundColor: "rgba(34,211,238,0.1)",
                  },
                ]}
                height={260}
              />
            )}
          </CardContent>
        </Card>

        {/* Revenue Overview */}
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
            <Badge variant="secondary" className="text-xs">Last 6 Months</Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full rounded-lg" />
            ) : (
              <BarChart
                labels={(data?.revenueTrend ?? []).map((d) => d.label)}
                datasets={[
                  {
                    label: "Revenue (EGP)",
                    data: (data?.revenueTrend ?? []).map((d) => d.value),
                    backgroundColor: "#3ddc84",
                  },
                ]}
                height={260}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Recent Players */}
        <Card className="border-border/50 bg-card lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Players</CardTitle>
            <Link href="/admin/players">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {playersLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))
            ) : !recentPlayers?.length ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No players yet</p>
            ) : (
              recentPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                  onClick={() => router.push(`/admin/players/${player.id}`)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      {getInitials(player.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{player.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{player.position ?? "—"}</p>
                  </div>
                  {player.level && (
                    <span className={`text-xs font-bold ${levelColors[player.level] ?? "text-muted-foreground"}`}>
                      {player.level}
                    </span>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top Players */}
        <Card className="border-border/50 bg-card lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Top Players</CardTitle>
            <Link href="/admin/rankings/weekly">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))
            ) : !data?.topPlayers?.length ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No ranking data yet</p>
            ) : (
              data.topPlayers.map((player, idx) => (
                <div
                  key={player.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                  onClick={() => router.push(`/admin/players/${player.id}`)}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-accent/20 text-xs text-accent">
                      {getInitials(player.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{player.fullName}</p>
                    <p className="text-[10px] text-muted-foreground">{player.period}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {Number(player.totalScore).toFixed(0)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card className="border-border/50 bg-card lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Alerts</CardTitle>
            <Link href="/admin/notifications">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))
            ) : !data?.recentAlerts?.length ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No alerts</p>
            ) : (
              data.recentAlerts.map((alert) => {
                const Icon = notifIcons[alert.type] ?? Info;
                const color = notifColors[alert.type] ?? "text-blue-400";
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 rounded-lg p-2 ${!alert.isRead ? "bg-muted/30" : ""}`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{alert.title}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{alert.body}</p>
                    </div>
                    {!alert.isRead && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
