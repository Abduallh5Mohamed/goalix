"use client";

import { useState } from "react";
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
import { mockGroups, mockPlayers, mockSessions } from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";
import {
  Check,
  X,
  Clock,
  AlertCircle,
  Save,
  CheckCircle2,
} from "lucide-react";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

const statusConfig: Record<
  AttendanceStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  present: { label: "Present", color: "bg-emerald-500", icon: Check },
  absent: { label: "Absent", color: "bg-red-500", icon: X },
  late: { label: "Late", color: "bg-amber-500", icon: Clock },
  excused: { label: "Excused", color: "bg-gray-500", icon: AlertCircle },
};

export default function CoachMarkAttendancePage() {
  const myGroups = mockGroups.filter((g) => ["g1", "g3"].includes(g.id));
  const [selectedGroup, setSelectedGroup] = useState(myGroups[0]?.id || "");
  const [saved, setSaved] = useState(false);
  const players = mockPlayers.filter((p) => p.groupId === selectedGroup);
  const [attendance, setAttendance] = useState<
    Record<string, { status: AttendanceStatus; notes: string }>
  >(() =>
    Object.fromEntries(
      players.map((p) => [p.id, { status: "present" as AttendanceStatus, notes: "" }])
    )
  );

  const handleStatusChange = (playerId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], status, notes: prev[playerId]?.notes || "" },
    }));
    setSaved(false);
  };

  const handleNotesChange = (playerId: string, notes: string) => {
    setAttendance((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], notes },
    }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const newAttendance: Record<string, { status: AttendanceStatus; notes: string }> = {};
    players.forEach((p) => {
      newAttendance[p.id] = { status, notes: attendance[p.id]?.notes || "" };
    });
    setAttendance(newAttendance);
    setSaved(false);
  };

  const counts = {
    present: Object.values(attendance).filter((a) => a.status === "present")
      .length,
    absent: Object.values(attendance).filter((a) => a.status === "absent")
      .length,
    late: Object.values(attendance).filter((a) => a.status === "late").length,
    excused: Object.values(attendance).filter((a) => a.status === "excused")
      .length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mark Attendance"
        description="Record today's session attendance"
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Attendance", href: "/coach/attendance/history" },
          { label: "Mark" },
        ]}
      />

      {/* Group Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={selectedGroup} onValueChange={(v) => {
          setSelectedGroup(v);
          const newPlayers = mockPlayers.filter((p) => p.groupId === v);
          setAttendance(
            Object.fromEntries(
              newPlayers.map((p) => [p.id, { status: "present" as AttendanceStatus, notes: "" }])
            )
          );
        }}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select group" />
          </SelectTrigger>
          <SelectContent>
            {myGroups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAll("present")}
          >
            <Check className="mr-1 h-4 w-4 text-emerald-400" />
            All Present
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAll("absent")}
          >
            <X className="mr-1 h-4 w-4 text-red-400" />
            All Absent
          </Button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-4 gap-3">
        {(Object.entries(counts) as [AttendanceStatus, number][]).map(
          ([status, count]) => {
            const config = statusConfig[status];
            return (
              <Card key={status} className="border-border/50 bg-card">
                <CardContent className="flex items-center gap-3 p-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.color}/20`}
                  >
                    <config.icon
                      className={`h-4 w-4`}
                      style={{
                        color:
                          status === "present"
                            ? "#3ddc84"
                            : status === "absent"
                            ? "#ef4444"
                            : status === "late"
                            ? "#f59e0b"
                            : "#6b7280",
                      }}
                    />
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
          }
        )}
      </div>

      {/* Player List */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Players ({players.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {players.map((player) => {
            const currentStatus = attendance[player.id]?.status || "present";
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
                      {player.position} · #{player.rankInGroup}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
                    >
                      <config.icon className="h-4 w-4" />
                    </button>
                  ))}
                  <Input
                    placeholder="Notes..."
                    className="ml-2 hidden w-40 sm:block"
                    value={attendance[player.id]?.notes || ""}
                    onChange={(e) =>
                      handleNotesChange(player.id, e.target.value)
                    }
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="sticky bottom-4 flex justify-end">
        <Button
          size="lg"
          onClick={handleSave}
          className={saved ? "bg-emerald-600 hover:bg-emerald-700" : ""}
        >
          {saved ? (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Save Attendance
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
