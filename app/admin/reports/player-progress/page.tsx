"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Download,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const levelVariant = (level: string | null) => {
  if (level === "A") return "success" as const;
  if (level === "B" || level === "C") return "warning" as const;
  return "destructive" as const;
};

export default function PlayerProgressReportPage() {
  const today = useMemo(() => new Date(), []);
  const from = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 89);
    return date;
  }, [today]);
  const [branchId, setBranchId] = useState("all");
  const [level, setLevel] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(toDate(from));
  const [dateTo, setDateTo] = useState(toDate(today));
  const { data: branches = [] } = useGetBranchesQuery();
  const { data, isLoading, isFetching, isError, refetch } =
    useGetReportsOverviewQuery({
      branchId: branchId === "all" ? undefined : branchId,
      dateFrom,
      dateTo,
    });

  const players = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.players ?? []).filter((player) => {
      const matchesLevel = level === "all" || player.level === level;
      const matchesSearch =
        !query ||
        [
          player.fullName,
          player.playerCode,
          player.position,
          player.groupName,
          player.branchName,
        ].some((value) => value?.toLowerCase().includes(query));
      return matchesLevel && matchesSearch;
    });
  }, [data?.players, level, search]);

  const positionCount = new Set(
    (data?.players ?? []).map((player) => player.position).filter(Boolean),
  ).size;
  const completeProfiles = (data?.players ?? []).filter(
    (player) => player.profileStatus === "complete",
  ).length;
  const measuredPlayers = (data?.players ?? []).filter(
    (player) => player.measuredAt,
  ).length;

  const exportCsv = () => {
    const rows = [
      [
        "Player",
        "Code",
        "Main Position",
        "Level",
        "Branch",
        "Group",
        "Profile",
        "Attendance",
        "Height cm",
        "Weight kg",
        "Measured at",
      ],
      ...players.map((player) => [
        player.fullName,
        player.playerCode ?? "",
        player.position ?? "",
        player.level ?? "",
        player.branchName ?? "",
        player.groupName ?? "",
        player.profileStatus ?? "",
        `${player.attendanceRate}%`,
        player.heightCm ?? "",
        player.weightKg ?? "",
        player.measuredAt ?? "",
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `player-progress-${dateFrom}-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Player Progress Report"
        description="Player profiles, main positions, measurements and attendance."
        actions={
          <div className="flex gap-2">
            <RefreshButton
              size="icon"
              onRefresh={refetch}
              isRefreshing={isFetching}
              title="Refresh report"
            />
            <Button onClick={exportCsv} disabled={!players.length}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      <section className="grid gap-3 border-y border-[#29435f]/80 py-4 md:grid-cols-2 xl:grid-cols-[1.2fr_180px_180px_180px]">
        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase text-slate-400">Search</span>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Player, code, position or group"
              className="h-10 w-full rounded-lg border border-[#29435f] bg-[#07172a] pl-9 pr-3 text-sm text-white outline-none focus:border-lime-300/70"
            />
          </div>
        </label>
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
          <span className="text-xs font-bold uppercase text-slate-400">Level</span>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="border-[#29435f] bg-[#07172a]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {["A", "B", "C", "D", "F"].map((item) => (
                <SelectItem key={item} value={item}>
                  Level {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase text-slate-400">From</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 w-full rounded-lg border border-[#29435f] bg-[#07172a] px-2 text-xs text-white"
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
              className="h-10 w-full rounded-lg border border-[#29435f] bg-[#07172a] px-2 text-xs text-white"
            />
          </label>
        </div>
      </section>

      {isError && (
        <div className="border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          Could not load player progress. Refresh the report and try again.
        </div>
      )}

      {isLoading ? (
        <div className="grid min-h-72 place-items-center text-sm text-slate-400">
          Loading player progress from the database...
        </div>
      ) : data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [Users, "Active Players", data.summary.activePlayers, `${players.length} shown`],
              [ShieldCheck, "Main Positions", positionCount, "Distinct assigned positions"],
              [UserCheck, "Complete Profiles", completeProfiles, `${data.players.length - completeProfiles} incomplete`],
              [Activity, "Measured Players", measuredPlayers, "Players with physical measurements"],
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
                      <MetricIcon className="h-6 w-6 text-lime-300" />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{String(helper)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <Card className="border-[#29435f] bg-[#07172a]/80">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base text-white">
                Players ({players.length})
              </CardTitle>
              <span className="text-xs text-slate-500">
                Main Position comes from the completed custom profile
              </span>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="pb-3">Player</th>
                    <th className="pb-3">Main Position</th>
                    <th className="pb-3">Level</th>
                    <th className="pb-3">Branch / Group</th>
                    <th className="pb-3">Latest Measurement</th>
                    <th className="pb-3">Attendance</th>
                    <th className="pb-3 text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {players.map((player) => (
                    <tr key={player.id}>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-white">{player.fullName}</p>
                        <p className="text-xs text-slate-500">
                          {player.playerCode || "No player code"}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex rounded-md border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 font-bold text-cyan-200">
                          {player.position || "Not completed"}
                        </span>
                        {player.preferredFoot && (
                          <p className="mt-1 text-xs capitalize text-slate-500">
                            {player.preferredFoot} foot
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={levelVariant(player.level)}>
                          {player.level || "-"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-slate-300">{player.branchName || "No branch"}</p>
                        <p className="text-xs text-slate-500">
                          {player.groupName || "No active group"}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        {player.measuredAt ? (
                          <>
                            <p className="text-slate-300">
                              {player.heightCm ?? "-"} cm / {player.weightKg ?? "-"} kg
                            </p>
                            <p className="text-xs text-slate-500">{player.measuredAt}</p>
                          </>
                        ) : (
                          <span className="text-slate-500">No measurements</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-bold text-lime-300">
                          {player.attendanceRate}%
                        </p>
                        <p className="text-xs text-slate-500">
                          {player.attendanceAttended}/{player.attendanceTotal} attended
                        </p>
                      </td>
                      <td className="py-3 text-right">
                        <Badge
                          variant={
                            player.profileStatus === "complete" ? "success" : "outline"
                          }
                        >
                          {player.profileStatus || "incomplete"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!players.length && (
                <p className="py-12 text-center text-sm text-slate-400">
                  No players match the selected filters.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
