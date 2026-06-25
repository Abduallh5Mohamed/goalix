"use client";

import {
  AlertCircle,
  Bell,
  CalendarCheck2,
  Check,
  CreditCard,
  DollarSign,
  Loader2,
  Medal,
  RefreshCw,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type ChartPoint,
  type WeeklyMatchDay,
  useGetDashboardQuery,
} from "@/lib/store/api/dashboardApi";
import { useCurrentUser } from "@/lib/auth/auth-context";

type IconType = React.ComponentType<{ className?: string }>;

const formatNumber = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-US").format(Number(value || 0));

const formatCurrency = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatVenue = (value: string | null | undefined) =>
  value ? value.replace(/_/g, " ") : "Match";

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`goalix-dashboard-panel rounded-[18px] border border-[#2a4460]/80 bg-[#07172a]/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_44px_rgba(0,0,0,0.25)] backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "lime",
}: {
  icon: IconType;
  label: string;
  value: string;
  helper: string;
  tone?: "lime" | "cyan" | "amber" | "red";
}) {
  const toneClass = {
    lime: "text-lime-300 bg-lime-300/10",
    cyan: "text-cyan-300 bg-cyan-300/10",
    amber: "text-amber-300 bg-amber-300/10",
    red: "text-red-300 bg-red-300/10",
  }[tone];

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-300">{label}</p>
          <p className="mt-3 font-display text-4xl font-bold leading-none text-white">
            {value}
          </p>
        </div>
        <span className={`rounded-2xl p-3 ${toneClass}`}>
          <Icon className="h-6 w-6" />
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-400">{helper}</p>
    </Panel>
  );
}

function TrendChart({
  title,
  points,
  valueSuffix = "",
  valuePrefix = "",
  color = "#b6ff00",
}: {
  title: string;
  points: ChartPoint[];
  valueSuffix?: string;
  valuePrefix?: string;
  color?: string;
}) {
  const values = points.map((point) => Number(point.value || 0));
  const max = Math.max(...values, 1);
  const chartPoints = points.map((point, index) => {
    const x = points.length <= 1 ? 260 : 42 + (index * 430) / (points.length - 1);
    const y = 188 - (Number(point.value || 0) / max) * 142;
    return { ...point, x, y };
  });
  const polyline = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <Badge variant="outline">Live data</Badge>
      </div>
      <div className="h-[260px]">
        <svg viewBox="0 0 520 235" className="h-full w-full">
          {[0, 1, 2, 3].map((line) => (
            <line
              key={line}
              x1="36"
              x2="492"
              y1={46 + line * 44}
              y2={46 + line * 44}
              stroke="rgba(255,255,255,0.08)"
            />
          ))}
          {chartPoints.length > 0 && (
            <>
              <polyline
                points={polyline}
                fill="none"
                stroke={color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {chartPoints.map((point) => (
                <g key={point.label}>
                  <circle cx={point.x} cy={point.y} r="5" fill={color} />
                  <text
                    x={point.x}
                    y="220"
                    fill="#8fa0b7"
                    fontSize="12"
                    textAnchor="middle"
                  >
                    {point.label}
                  </text>
                </g>
              ))}
              <rect
                x="392"
                y="18"
                width="112"
                height="30"
                rx="9"
                fill="rgba(255,255,255,0.08)"
              />
              <text x="405" y="38" fill="#edf7ff" fontSize="13" fontWeight="800">
                Latest: {valuePrefix}
                {formatNumber(values[values.length - 1] || 0)}
                {valueSuffix}
              </text>
            </>
          )}
          {chartPoints.length === 0 && (
            <text x="260" y="118" fill="#8fa0b7" fontSize="14" textAnchor="middle">
              No trend data yet
            </text>
          )}
        </svg>
      </div>
    </Panel>
  );
}

function WeeklyMatches({ days }: { days: WeeklyMatchDay[] }) {
  return (
    <Panel className="p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">This Week Matches</h2>
          <p className="mt-1 text-sm text-slate-400">
            Matches scheduled across the current week.
          </p>
        </div>
        <Badge variant="outline">Current week</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day) => {
          const hasPlayedMatch = day.matches.some((match) => match.played);

          return (
            <div
              key={day.date}
              className="min-h-[190px] rounded-2xl border border-[#2a4460] bg-white/[0.03] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold uppercase text-white">
                    {day.dayLabel}
                  </p>
                  <p className="text-xs text-slate-400">{day.dateLabel}</p>
                </div>
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                    hasPlayedMatch
                      ? "border-lime-300 bg-lime-300 text-[#06111f]"
                      : "border-transparent bg-transparent"
                  }`}
                  aria-label={hasPlayedMatch ? "Played match" : "No played match"}
                >
                  {hasPlayedMatch && <Check className="h-4 w-4" />}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {day.matches.map((match) => (
                  <div
                    key={match.id}
                    className="rounded-xl border border-white/10 bg-[#06111f]/60 p-2"
                  >
                    <p className="truncate text-sm font-semibold text-white">
                      vs {match.opponentName}
                    </p>
                    <p className="mt-1 text-xs capitalize text-slate-400">
                      {match.matchTime || "--:--"} | {formatVenue(match.venueType)}
                    </p>
                    {match.played &&
                      match.ourScore !== null &&
                      match.opponentScore !== null && (
                        <p className="mt-2 text-xs font-bold text-lime-300">
                          {match.ourScore} - {match.opponentScore}
                        </p>
                      )}
                  </div>
                ))}

                {day.matches.length === 0 && (
                  <div className="h-9" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export default function AdminDashboardPage() {
  const { user } = useCurrentUser();
  const { data, isLoading, isFetching, isError, refetch } = useGetDashboardQuery();

  const kpis = data?.kpis;
  const attendanceTrend = data?.attendanceTrend ?? [];
  const revenueTrend = data?.revenueTrend ?? [];
  const topPlayers = data?.topPlayers ?? [];
  const recentAlerts = data?.recentAlerts ?? [];
  const weeklyMatches = data?.weeklyMatches ?? [];

  if (isLoading) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <div className="flex items-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-lime-300" />
          Loading academy dashboard from database...
        </div>
      </div>
    );
  }

  if (isError || !data || !kpis) {
    return (
      <Panel className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 h-5 w-5 text-red-300" />
            <div>
              <h1 className="text-xl font-semibold text-white">
                Dashboard data could not load
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Check the backend session and the admin dashboard API.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-lime-300">
            Admin dashboard
          </p>
          <h1 className="font-display text-5xl font-bold leading-none tracking-normal text-white md:text-6xl">
            Welcome back, {user?.fullName || "Admin"}
          </h1>
          <p className="mt-2 text-lg text-slate-300">
            Live academy overview from your database.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          icon={Users}
          label="Active Players"
          value={formatNumber(kpis.totalPlayers)}
          helper="Current player profiles"
          tone="lime"
        />
        <KpiCard
          icon={UserCheck}
          label="Coaches"
          value={formatNumber(kpis.totalCoaches)}
          helper="Active coach profiles"
          tone="cyan"
        />
        <KpiCard
          icon={CreditCard}
          label="Subscriptions"
          value={formatNumber(kpis.activeSubscriptions)}
          helper="Active payment plans"
          tone="lime"
        />
        <KpiCard
          icon={AlertCircle}
          label="Overdue"
          value={formatNumber(kpis.overduePayments)}
          helper="Invoices needing action"
          tone={kpis.overduePayments > 0 ? "red" : "lime"}
        />
        <KpiCard
          icon={DollarSign}
          label="Monthly Revenue"
          value={formatCurrency(kpis.monthlyRevenue)}
          helper="Paid invoices this month"
          tone="amber"
        />
        <KpiCard
          icon={CalendarCheck2}
          label="Attendance"
          value={`${formatNumber(kpis.avgAttendanceRate)}%`}
          helper="Last 30 days"
          tone="cyan"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendChart
          title="Attendance Trend"
          points={attendanceTrend}
          valueSuffix="%"
          color="#b6ff00"
        />
        <TrendChart
          title="Revenue Trend"
          points={revenueTrend}
          valuePrefix="EGP "
          color="#00d8ff"
        />
      </div>

      <WeeklyMatches days={weeklyMatches} />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Top Players</h2>
            <Medal className="h-5 w-5 text-lime-300" />
          </div>
          <div className="space-y-3">
            {topPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-4 rounded-2xl border border-[#2a4460] bg-white/[0.03] p-4"
              >
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300/10 font-display text-xl font-bold text-lime-300">
                  {Number(player.rank) > 0 ? `#${player.rank}` : "-"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">
                    {player.fullName}
                  </p>
                  <p className="text-sm text-slate-400">{player.period}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-white">
                    {formatNumber(player.totalScore)}
                  </p>
                  <p className="text-xs text-slate-400">Score</p>
                </div>
              </div>
            ))}
            {topPlayers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#2a4460] p-6 text-center text-sm text-slate-400">
                No ranking snapshots yet.
              </div>
            )}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Recent Alerts</h2>
            <Bell className="h-5 w-5 text-cyan-300" />
          </div>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-2xl border border-[#2a4460] bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{alert.title}</p>
                  <Badge variant={alert.isRead ? "secondary" : "info"}>
                    {alert.isRead ? "Read" : "New"}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                  {alert.body}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{alert.type}</span>
                  <span>{formatDateTime(alert.createdAt)}</span>
                </div>
              </div>
            ))}
            {recentAlerts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#2a4460] p-6 text-center text-sm text-slate-400">
                No recent alerts.
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
