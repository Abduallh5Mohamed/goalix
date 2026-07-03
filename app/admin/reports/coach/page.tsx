"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, Download, Users, Waypoints } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/charts/BarChart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetBranchesQuery } from "@/lib/store/api/adminApi";
import { useGetReportsOverviewQuery } from "@/lib/store/api/dashboardApi";

const toDate = (date: Date) => date.toISOString().slice(0, 10);
const roleLabel = (value: string | null) =>
  (value || "coach")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function CoachReportPage() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const from = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 89);
    return date;
  }, [today]);
  const [branchId, setBranchId] = useState("all");
  const [dateFrom, setDateFrom] = useState(toDate(from));
  const [dateTo, setDateTo] = useState(toDate(today));
  const { data: branches = [] } = useGetBranchesQuery();
  const { data, isLoading, isFetching, isError, refetch } =
    useGetReportsOverviewQuery({
      branchId: branchId === "all" ? undefined : branchId,
      dateFrom,
      dateTo,
    });
  const coaches = data?.coaches ?? [];
  const totalGroups = coaches.reduce((sum, coach) => sum + coach.groupCount, 0);
  const totalPlayers = coaches.reduce((sum, coach) => sum + coach.playerCount, 0);

  const exportCsv = () => {
    const rows = [
      ["Coach", "Role", "Branch", "Groups", "Players", "Sessions", "Attendance"],
      ...coaches.map((coach) => [
        coach.name,
        roleLabel(coach.role || coach.specialization),
        coach.branchName ?? "",
        coach.groupCount,
        coach.playerCount,
        coach.sessions,
        `${coach.attendanceRate}%`,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `coach-report-${dateFrom}-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coach Report"
        description="Coach workload, groups, players and attendance performance."
        actions={
          <div className="flex gap-2">
            <RefreshButton
              size="icon"
              onRefresh={refetch}
              isRefreshing={isFetching}
              title="Refresh report"
            />
            <Button onClick={exportCsv} disabled={!coaches.length}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      <section className="grid gap-3 border-y border-[#29435f]/80 py-4 sm:grid-cols-3">
        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase text-slate-400">Branch</span>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="border-[#29435f] bg-[#07172a]">
              <SelectValue />
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
            max={toDate(today)}
            onChange={(event) => setDateTo(event.target.value)}
            className="h-10 w-full rounded-lg border border-[#29435f] bg-[#07172a] px-3 text-sm text-white"
          />
        </label>
      </section>

      {isError && (
        <div className="border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          Could not load coach performance.
        </div>
      )}

      {isLoading ? (
        <div className="grid min-h-72 place-items-center text-sm text-slate-400">
          Loading coach report from the database...
        </div>
      ) : data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [Users, "Coaches", coaches.length, "In selected branch"],
              [Waypoints, "Assigned Groups", totalGroups, "Current group assignments"],
              [Users, "Managed Players", totalPlayers, "Unique active assignments"],
              [CalendarCheck2, "Sessions", data.summary.totalSessions, `${data.summary.completedSessions} completed`],
            ].map(([Icon, label, value, helper]) => {
              const MetricIcon = Icon as typeof Users;
              return (
                <Card key={String(label)} className="border-[#29435f] bg-[#07172a]/80">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-400">{String(label)}</p>
                        <p className="mt-2 text-3xl font-bold text-white">{String(value)}</p>
                      </div>
                      <MetricIcon className="h-6 w-6 text-cyan-300" />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{String(helper)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <Card className="border-[#29435f] bg-[#07172a]/80">
            <CardHeader>
              <CardTitle className="text-base text-white">Coach Workload</CardTitle>
            </CardHeader>
            <CardContent>
              {coaches.length ? (
                <BarChart
                  labels={coaches.map((coach) => coach.name)}
                  datasets={[
                    {
                      label: "Sessions",
                      data: coaches.map((coach) => coach.sessions),
                      backgroundColor: "#22d3ee",
                    },
                    {
                      label: "Managed players",
                      data: coaches.map((coach) => coach.playerCount),
                      backgroundColor: "#b6ff00",
                    },
                  ]}
                  height={280}
                />
              ) : (
                <p className="py-12 text-center text-sm text-slate-400">
                  No coaches found for this branch.
                </p>
              )}
            </CardContent>
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
            {coaches.map((coach) => (
              <Card
                key={coach.id}
                className="cursor-pointer border-[#29435f] bg-[#07172a]/80 transition hover:border-lime-300/50"
                onClick={() => router.push(`/admin/coaches/${coach.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-white">{coach.name}</h2>
                      <p className="mt-1 text-sm text-cyan-300">
                        {roleLabel(coach.role || coach.specialization)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {coach.branchName || "No primary branch"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-lime-300">
                        {coach.attendanceRate}%
                      </p>
                      <p className="text-xs text-slate-500">player attendance</p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-4 text-center">
                    <div>
                      <p className="text-xl font-bold text-white">{coach.groupCount}</p>
                      <p className="text-xs text-slate-500">Groups</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white">{coach.playerCount}</p>
                      <p className="text-xs text-slate-500">Players</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white">{coach.sessions}</p>
                      <p className="text-xs text-slate-500">Sessions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
