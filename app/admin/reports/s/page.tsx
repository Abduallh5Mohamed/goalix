"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Download,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetBranchesQuery } from "@/lib/store/api/adminApi";
import {
  type ReportsOverview,
  useGetReportsOverviewQuery,
} from "@/lib/store/api/dashboardApi";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

function Metric({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="border-[#29435f] bg-[#07172a]/80">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-lime-300/10 text-lime-300">
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  );
}

function AttendanceTrend({
  points,
}: {
  points: ReportsOverview["attendanceTrend"];
}) {
  const chartPoints = points.map((point, index) => ({
    ...point,
    x: points.length <= 1 ? 260 : 48 + (index * 424) / (points.length - 1),
    y: 190 - (Math.max(0, Math.min(100, point.rate)) / 100) * 145,
  }));

  return (
    <div className="h-[270px]">
      <svg viewBox="0 0 520 235" className="h-full w-full">
        {[0, 25, 50, 75, 100].map((value) => {
          const y = 190 - (value / 100) * 145;
          return (
            <g key={value}>
              <line
                x1="44"
                x2="492"
                y1={y}
                y2={y}
                stroke="rgba(148,163,184,0.14)"
              />
              <text x="8" y={y + 4} fill="#718096" fontSize="11">
                {value}%
              </text>
            </g>
          );
        })}
        {chartPoints.length > 0 ? (
          <>
            <polyline
              points={chartPoints.map(({ x, y }) => `${x},${y}`).join(" ")}
              fill="none"
              stroke="#b6ff00"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {chartPoints.map((point) => (
              <g key={`${point.label}-${point.x}`}>
                <circle cx={point.x} cy={point.y} r="5" fill="#22d3ee" />
                <text
                  x={point.x}
                  y="218"
                  fill="#94a3b8"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {point.label}
                </text>
              </g>
            ))}
          </>
        ) : (
          <text x="270" y="122" fill="#94a3b8" fontSize="14" textAnchor="middle">
            No attendance records in this period
          </text>
        )}
      </svg>
    </div>
  );
}

export default function ReportsOverviewPage() {
  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 89);
    return date;
  }, [today]);
  const [branchId, setBranchId] = useState("all");
  const [dateFrom, setDateFrom] = useState(toDateInput(defaultFrom));
  const [dateTo, setDateTo] = useState(toDateInput(today));
  const { data: branches = [] } = useGetBranchesQuery();
  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetReportsOverviewQuery({
    branchId: branchId === "all" ? undefined : branchId,
    dateFrom,
    dateTo,
  });

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Goalix reports overview"],
      ["From", data.filters.dateFrom],
      ["To", data.filters.dateTo],
      [],
      ["Metric", "Value"],
      ["Total players", data.summary.totalPlayers],
      ["Active players", data.summary.activePlayers],
      ["New players", data.summary.newPlayers],
      ["Coaches", data.summary.totalCoaches],
      ["Sessions", data.summary.totalSessions],
      ["Attendance rate", `${data.summary.attendanceRate}%`],
      [],
      ["Group", "Branch", "Players", "Sessions", "Attendance rate"],
      ...data.groups.map((group) => [
        group.name,
        group.branchName,
        group.players,
        group.sessions,
        `${group.attendanceRate}%`,
      ]),
      [],
      ["Coach", "Specialization", "Sessions", "Attendance rate"],
      ...data.coaches.map((coach) => [
        coach.name,
        coach.specialization || "Coach",
        coach.sessions,
        `${coach.attendanceRate}%`,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `goalix-reports-${dateFrom}-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Academy Reports"
        description="Operational performance from live academy data."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh reports"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={exportCsv} disabled={!data}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      <section className="grid gap-3 border-y border-[#29435f]/80 py-4 md:grid-cols-[1fr_180px_180px]">
        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase text-slate-400">Branch</span>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="border-[#29435f] bg-[#07172a]">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase text-slate-400">From</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(event) => setDateFrom(event.target.value)}
            className="h-10 w-full rounded-lg border border-[#29435f] bg-[#07172a] px-3 text-sm text-white"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase text-slate-400">To</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={toDateInput(today)}
            onChange={(event) => setDateTo(event.target.value)}
            className="h-10 w-full rounded-lg border border-[#29435f] bg-[#07172a] px-3 text-sm text-white"
          />
        </label>
      </section>

      {isError && (
        <div className="border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          Reports could not be loaded. Check the selected dates and try again.
        </div>
      )}

      {isLoading || !data ? (
        <div className="grid min-h-[320px] place-items-center text-sm text-slate-400">
          Loading reports from the database...
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={Users}
              label="Active Players"
              value={formatNumber(data.summary.activePlayers)}
              helper={`${formatNumber(data.summary.newPlayers)} joined in selected period`}
            />
            <Metric
              icon={UserCheck}
              label="Coaches"
              value={formatNumber(data.summary.totalCoaches)}
              helper="Active academy coach profiles"
            />
            <Metric
              icon={CalendarDays}
              label="Sessions"
              value={formatNumber(data.summary.totalSessions)}
              helper={`${formatNumber(data.summary.completedSessions)} completed`}
            />
            <Metric
              icon={Activity}
              label="Attendance"
              value={`${data.summary.attendanceRate}%`}
              helper={`${formatNumber(data.attendance.total)} attendance marks`}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Card className="border-[#29435f] bg-[#07172a]/80">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base text-white">Attendance Trend</CardTitle>
                <TrendingUp className="h-5 w-5 text-lime-300" />
              </CardHeader>
              <CardContent>
                <AttendanceTrend points={data.attendanceTrend} />
              </CardContent>
            </Card>

            <Card className="border-[#29435f] bg-[#07172a]/80">
              <CardHeader>
                <CardTitle className="text-base text-white">Player Levels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.levelDistribution.map((item) => {
                  const max = Math.max(
                    ...data.levelDistribution.map((entry) => entry.count),
                    1,
                  );
                  return (
                    <div key={item.level}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-semibold text-slate-300">
                          Level {item.level}
                        </span>
                        <span className="text-white">{item.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-lime-300 to-cyan-400"
                          style={{ width: `${(item.count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {data.levelDistribution.length === 0 && (
                  <p className="py-10 text-center text-sm text-slate-400">
                    No active players in this branch.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card className="border-[#29435f] bg-[#07172a]/80">
              <CardHeader>
                <CardTitle className="text-base text-white">Group Performance</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="pb-3">Group</th>
                      <th className="pb-3">Players</th>
                      <th className="pb-3">Sessions</th>
                      <th className="pb-3 text-right">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {data.groups.map((group) => (
                      <tr key={group.id}>
                        <td className="py-3">
                          <p className="font-semibold text-white">{group.name}</p>
                          <p className="text-xs text-slate-500">{group.branchName}</p>
                        </td>
                        <td className="py-3 text-slate-300">{group.players}</td>
                        <td className="py-3 text-slate-300">{group.sessions}</td>
                        <td className="py-3 text-right font-bold text-lime-300">
                          {group.attendanceRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border-[#29435f] bg-[#07172a]/80">
              <CardHeader>
                <CardTitle className="text-base text-white">Coach Activity</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="pb-3">Coach</th>
                      <th className="pb-3">Sessions</th>
                      <th className="pb-3 text-right">Player attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {data.coaches.map((coach) => (
                      <tr key={coach.id}>
                        <td className="py-3">
                          <p className="font-semibold text-white">{coach.name}</p>
                          <p className="text-xs text-slate-500">
                            {coach.specialization || "Coach"}
                          </p>
                        </td>
                        <td className="py-3 text-slate-300">{coach.sessions}</td>
                        <td className="py-3 text-right font-bold text-cyan-300">
                          {coach.attendanceRate}%
                        </td>
                      </tr>
                    ))}
                    {data.coaches.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-10 text-center text-slate-400">
                          No coaches found for this branch.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
