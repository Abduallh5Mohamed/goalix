"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { AreaChart } from "@/components/charts/AreaChart";
import { BarChart } from "@/components/charts/BarChart";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  mockAdminKPIs,
  mockAttendanceChartData,
  mockRevenueChartData,
  mockActivityFeed,
  mockNotifications,
  mockPlayers,
  mockSubscriptions,
} from "@/lib/mock-data";
import { getInitials, formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Activity,
  Bell,
  ClipboardCheck,
  CreditCard,
  TrendingUp,
  Users,
  UserPlus,
  Send,
  FileText,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const activityIcons: Record<string, React.ElementType> = {
  attendance: ClipboardCheck,
  evaluation: TrendingUp,
  payment: CreditCard,
  player: Users,
  notification: Bell,
};

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

export default function AdminDashboardPage() {
  const router = useRouter();
  const overduePayments = mockSubscriptions.filter((s) => s.status === "overdue");
  const topPlayers = [...mockPlayers]
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 5);
  const recentNotifs = mockNotifications
    .filter((n) => n.targetRole === "admin")
    .slice(0, 5);

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {mockAdminKPIs.map((kpi) => (
          <StatsCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            change={kpi.change}
            changeLabel={kpi.changeLabel}
            icon={kpi.icon}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Attendance Trend</CardTitle>
            <Badge variant="secondary" className="text-xs">Last 8 Weeks</Badge>
          </CardHeader>
          <CardContent>
            <AreaChart
              labels={mockAttendanceChartData.map((d) => d.label)}
              datasets={[
                {
                  label: "Attendance %",
                  data: mockAttendanceChartData.map((d) => d.value),
                  borderColor: "#22d3ee",
                  backgroundColor: "rgba(34,211,238,0.1)",
                },
              ]}
              height={260}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
            <Badge variant="secondary" className="text-xs">Last 6 Months</Badge>
          </CardHeader>
          <CardContent>
            <BarChart
              labels={mockRevenueChartData.map((d) => d.label)}
              datasets={[
                {
                  label: "Revenue (EGP)",
                  data: mockRevenueChartData.map((d) => d.value),
                  backgroundColor: "#3ddc84",
                },
              ]}
              height={260}
            />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity Feed */}
        <Card className="border-border/50 bg-card lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Activity Feed</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {mockActivityFeed.slice(0, 6).map((item) => {
              const Icon = activityIcons[item.type] || Activity;
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-relaxed">
                      {item.message}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatDateTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
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
            {topPlayers.map((player, idx) => (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50 cursor-pointer"
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
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {player.fullName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {player.groupName}
                  </p>
                </div>
                <Badge
                  variant={
                    player.level === "A" ? "success" : player.level === "B" ? "warning" : "destructive"
                  }
                  className="text-[10px]"
                >
                  {player.level}
                </Badge>
                <span className="text-sm font-semibold text-foreground">
                  {player.performanceScore}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notifications + Overdue */}
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
            {recentNotifs.map((notif) => {
              const Icon = notifIcons[notif.type] || Info;
              const color = notifColors[notif.type] || "text-blue-400";
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 rounded-lg p-2 ${
                    !notif.read ? "bg-muted/30" : ""
                  }`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {notif.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
