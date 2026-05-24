"use client";

import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  useGetCoachGroupQuery,
  useGetCoachSessionsQuery,
  useMarkCoachAttendanceMutation,
} from "@/lib/store/api/coachApi";
import { formatDate, formatTime12, getInitials } from "@/lib/utils";
import {
  Check,
  X,
  Clock,
  AlertCircle,
  Save,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

const statusConfig: Record<
  AttendanceStatus,
  { label: string; color: string; icon: ElementType }
> = {
  present: { label: "Present", color: "bg-emerald-500", icon: Check },
  absent: { label: "Absent", color: "bg-red-500", icon: X },
  late: { label: "Late", color: "bg-amber-500", icon: Clock },
  excused: { label: "Excused", color: "bg-gray-500", icon: AlertCircle },
};

export default function CoachMarkAttendancePage() {
  const {
    data: sessionsData,
    isLoading,
    isError,
    refetch,
  } = useGetCoachSessionsQuery({ limit: 100 });
  const sessions = useMemo(
    () =>
      [...(sessionsData?.data ?? [])].sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    [sessionsData?.data],
  );
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const selectedSession = selectedSessionId || sessions[0]?.id || "";
  const currentSession = sessions.find(
    (session) => session.id === selectedSession,
  );
  const { data: groupDetail, isFetching: loadingPlayers } =
    useGetCoachGroupQuery(currentSession?.groupId ?? "", {
      skip: !currentSession?.groupId,
    });
  const players = groupDetail?.players ?? [];
  const [attendance, setAttendance] = useState<
    Record<string, { status: AttendanceStatus; notes: string }>
  >({});
  const [saved, setSaved] = useState(false);
  const [markAttendance, { isLoading: isSaving, error: saveError }] =
    useMarkCoachAttendanceMutation();

  const handleStatusChange = (playerId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [playerId]: {
        status,
        notes: prev[playerId]?.notes || "",
      },
    }));
    setSaved(false);
  };

  const handleNotesChange = (playerId: string, notes: string) => {
    setAttendance((prev) => ({
      ...prev,
      [playerId]: {
        status: prev[playerId]?.status || "present",
        notes,
      },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedSession || players.length === 0) return;

    await markAttendance({
      sessionId: selectedSession,
      records: players.map((player) => ({
        playerId: player.id,
        status: attendance[player.id]?.status || "present",
        notes: attendance[player.id]?.notes || undefined,
      })),
    }).unwrap();

    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setAttendance(
      Object.fromEntries(
        players.map((player) => [
          player.id,
          { status, notes: attendance[player.id]?.notes || "" },
        ]),
      ),
    );
    setSaved(false);
  };

  const counts = players.reduce(
    (acc, player) => {
      const status = attendance[player.id]?.status || "present";
      acc[status] += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0, excused: 0 } as Record<
      AttendanceStatus,
      number
    >,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mark Attendance"
        description="Record session attendance from the backend schedule"
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Attendance", href: "/coach/attendance/history" },
          { label: "Mark" },
        ]}
      />

      {isError && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center justify-between gap-3 p-4 text-sm text-red-300">
            <span>Could not load coach sessions.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={selectedSession}
          onValueChange={(value) => {
            setSelectedSessionId(value);
            setAttendance({});
            setSaved(false);
          }}
          disabled={isLoading || sessions.length === 0}
        >
          <SelectTrigger className="w-full sm:w-[380px]">
            <SelectValue
              placeholder={isLoading ? "Loading sessions..." : "Select session"}
            />
          </SelectTrigger>
          <SelectContent>
            {sessions.map((session) => (
              <SelectItem key={session.id} value={session.id}>
                {formatDate(session.date)} - {session.groupName} -{" "}
                {formatTime12(session.startTime)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentSession && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {currentSession.type}
            </Badge>
            <Badge variant="secondary" className="capitalize">
              {currentSession.status}
            </Badge>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAll("present")}
            disabled={!players.length}
          >
            <Check className="mr-1 h-4 w-4 text-emerald-400" />
            All Present
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAll("absent")}
            disabled={!players.length}
          >
            <X className="mr-1 h-4 w-4 text-red-400" />
            All Absent
          </Button>
        </div>
      </div>

      {isLoading || loadingPlayers ? (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading attendance sheet...
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && sessions.length === 0 && (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            No sessions assigned to you yet.
          </CardContent>
        </Card>
      )}

      {players.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(Object.entries(counts) as [AttendanceStatus, number][]).map(
              ([status, count]) => {
                const config = statusConfig[status];
                return (
                  <Card key={status} className="border-border/50 bg-card">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.color}/20`}
                      >
                        <config.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{count}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {config.label}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              },
            )}
          </div>

          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Players ({players.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {players.map((player) => {
                const currentStatus =
                  attendance[player.id]?.status || "present";
                return (
                  <div
                    key={player.id}
                    className="flex flex-col gap-3 rounded-lg border border-border/30 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/20 text-sm text-primary">
                          {getInitials(player.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{player.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {player.position} - #{player.rankInGroup}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(
                        Object.entries(statusConfig) as [
                          AttendanceStatus,
                          (typeof statusConfig)[AttendanceStatus],
                        ][]
                      ).map(([status, config]) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(player.id, status)}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 transition-all ${
                            currentStatus === status
                              ? `${config.color} border-transparent text-white`
                              : "border-border/30 bg-muted/20 text-muted-foreground hover:border-border"
                          }`}
                          title={config.label}
                          type="button"
                        >
                          <config.icon className="h-4 w-4" />
                        </button>
                      ))}
                      <Input
                        placeholder="Notes..."
                        className="min-w-[160px] flex-1 sm:w-44"
                        value={attendance[player.id]?.notes || ""}
                        onChange={(event) =>
                          handleNotesChange(player.id, event.target.value)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {saveError && (
            <p className="text-sm text-red-400">
              Could not save attendance. Please try again.
            </p>
          )}

          <div className="sticky bottom-4 flex justify-end">
            <Button
              size="lg"
              onClick={handleSave}
              disabled={isSaving || !selectedSession || !players.length}
              className={saved ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Save Attendance
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
