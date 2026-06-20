"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  useDeleteCoachGroupMutation,
  useGetCoachBirthdaysQuery,
  useGetCoachGroupQuery,
  useUpdateCoachGroupMutation,
} from "@/lib/store/api/coachApi";
import { useGetCoachPlayersScopedQuery } from "@/lib/store/api/calendarApi";
import { getInitials } from "@/lib/utils";
import { TREND_CONFIG } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  Pencil,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";

const trendIcons: Record<string, React.ElementType> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

function customProfileValue(
  player: { customProfile?: Array<{ key?: string; label?: string; value?: unknown }>; position?: string | null },
  keys: string[],
) {
  const wanted = keys.map((key) => key.toLowerCase());
  const field = player.customProfile?.find((item) => {
    const key = String(item.key || "").toLowerCase();
    const label = String(item.label || "").toLowerCase();
    return wanted.includes(key) || wanted.includes(label);
  });
  return typeof field?.value === "string" && field.value.trim()
    ? field.value.trim()
    : "";
}

function scopedPlayerMainPosition(player: {
  customProfile?: Array<{ key?: string; label?: string; value?: unknown }>;
  position?: string | null;
}) {
  return (
    customProfileValue(player, ["main_position", "main position"]) ||
    player.position ||
    "No main position"
  );
}

export default function CoachGroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const { data, isLoading, isError } = useGetCoachGroupQuery({ groupId }, { skip: !groupId });
  const { data: birthdays = [] } = useGetCoachBirthdaysQuery();
  const { data: playersRes } = useGetCoachPlayersScopedQuery({ limit: 500 });
  const [updateGroup, { isLoading: updatingGroup }] =
    useUpdateCoachGroupMutation();
  const [deleteGroup, { isLoading: deletingGroup }] =
    useDeleteCoachGroupMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editError, setEditError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    birthYearId: "",
    maxPlayers: "100",
    playerIds: [] as string[],
  });
  const group = data?.group;
  const players = data?.players ?? [];
  const groupBranchId = group?.branchId ?? "";

  const birthYearOptions = useMemo(
    () =>
      birthdays
        .filter((birthday) => birthday.branchId === groupBranchId)
        .map((birthday) => ({
          id: birthday.id,
          label: `${birthday.label} (${birthday.fromYear}-${birthday.toYear})`,
          fromYear: birthday.fromYear,
          toYear: birthday.toYear,
        })),
    [birthdays, groupBranchId],
  );
  const selectedBirthYear = birthYearOptions.find(
    (item) => item.id === editForm.birthYearId,
  );
  const availablePlayers = useMemo(() => {
    return (playersRes?.data ?? [])
      .filter((player) => {
        if (groupBranchId && player.branch_id !== groupBranchId) return false;
        if (selectedBirthYear && player.date_of_birth) {
          const year = new Date(player.date_of_birth).getFullYear();
          if (
            Number.isFinite(year) &&
            (year < selectedBirthYear.fromYear ||
              year > selectedBirthYear.toYear)
          )
            return false;
        }
        return player.profile_status === "complete";
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [groupBranchId, playersRes?.data, selectedBirthYear]);

  const openEditDialog = () => {
    if (!group) return;
    setEditError("");
    setEditForm({
      name: group.name,
      birthYearId: group.birthYears[0]?.id ?? "",
      maxPlayers: String(group.maxPlayers || 100),
      playerIds: players.map((player) => player.id),
    });
    setEditOpen(true);
  };

  const togglePlayer = (playerId: string, checked: boolean) => {
    setEditForm((prev) => ({
      ...prev,
      playerIds: checked
        ? [...new Set([...prev.playerIds, playerId])]
        : prev.playerIds.filter((id) => id !== playerId),
    }));
  };

  const saveGroup = async () => {
    setEditError("");
    if (!editForm.name.trim() || !editForm.birthYearId) {
      setEditError("Group name and birth year are required.");
      return;
    }
    try {
      await updateGroup({
        groupId,
        body: {
          name: editForm.name.trim(),
          birthYearIds: [editForm.birthYearId],
          maxPlayers: Number(editForm.maxPlayers || 100),
          playerIds: editForm.playerIds,
        },
      }).unwrap();
      setEditOpen(false);
    } catch {
      setEditError("Could not update this group.");
    }
  };

  const confirmDeleteGroup = async () => {
    setDeleteError("");
    try {
      await deleteGroup(groupId).unwrap();
      router.push("/coach/my-groups");
    } catch {
      setDeleteError("Could not delete this group.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading group...
      </div>
    );
  }

  if (!group || isError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Group not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={group.name}
        description={group.schedule}
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "My Groups", href: "/coach/my-groups" },
          { label: group.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href="/coach/training">
              <Button size="sm">
                <ClipboardCheck className="mr-1 h-4 w-4" />
                Training Attendance
              </Button>
            </Link>
            <Link href="/coach/evaluations/new">
              <Button size="sm" variant="outline">
                <Star className="mr-1 h-4 w-4" />
                Evaluate
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={openEditDialog}>
              <Pencil className="mr-1 h-4 w-4" />
              Edit Group
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete Group
            </Button>
          </div>
        }
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update the group details and choose which players should belong
              to it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Group name</Label>
              <Input
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Birth year</Label>
              <Select
                value={editForm.birthYearId}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, birthYearId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select birth year" />
                </SelectTrigger>
                <SelectContent>
                  {birthYearOptions.map((birthday) => (
                    <SelectItem key={birthday.id} value={birthday.id}>
                      {birthday.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max players</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={editForm.maxPlayers}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    maxPlayers: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Players</Label>
                <Badge variant="secondary">
                  {editForm.playerIds.length} selected
                </Badge>
              </div>
              <div className="grid max-h-64 gap-2 overflow-auto rounded-md border border-border/60 p-3">
                {availablePlayers.map((player) => (
                  <label
                    key={player.id}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/30"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.playerIds.includes(player.id)}
                        onChange={(event) =>
                          togglePlayer(player.id, event.target.checked)
                        }
                      />
                      <span>{player.full_name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {scopedPlayerMainPosition(player)}
                    </span>
                  </label>
                ))}
                {!availablePlayers.length && (
                  <p className="text-sm text-muted-foreground">
                    No complete players available for this birth year.
                  </p>
                )}
              </div>
            </div>
          </div>
          {editError && <p className="text-sm text-red-400">{editError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button className="gap-2" disabled={updatingGroup} onClick={saveGroup}>
              {updatingGroup && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group?</DialogTitle>
            <DialogDescription>
              This removes the group from your groups and removes its current
              player assignments.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              disabled={deletingGroup}
              onClick={confirmDeleteGroup}
            >
              {deletingGroup && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{players.length}</p>
            <p className="text-xs text-muted-foreground">Total Players</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {players.length > 0
                ? Math.round(
                    players.reduce((a, p) => a + p.attendanceRate, 0) /
                      players.length
                  )
                : 0}
              %
            </p>
            <p className="text-xs text-muted-foreground">Avg Attendance</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-accent">
              {players.length > 0
                ? (
                    players.reduce((a, p) => a + p.performanceScore, 0) /
                    players.length
                  ).toFixed(1)
                : 0}
            </p>
            <p className="text-xs text-muted-foreground">Avg Performance</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">
              {players.filter((p) => p.level === "A").length}
            </p>
            <p className="text-xs text-muted-foreground">Level A Players</p>
          </CardContent>
        </Card>
      </div>

      {/* Player Roster */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Player Roster
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {players.map((player) => {
              const TrendIcon = trendIcons[player.trend] || Minus;
              const trendConfig = TREND_CONFIG[player.trend];
              const mainPosition = player.mainPosition || player.position;

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                      #{player.rankInGroup}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/20 text-sm text-primary">
                        {getInitials(player.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{player.fullName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{mainPosition}</span>
                        <span>-</span>
                        <span>Age {player.age}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Level */}
                    <Badge variant="outline">{player.level}</Badge>

                    {/* Attendance */}
                    <div className="hidden w-32 items-center gap-2 md:flex">
                      <Progress
                        value={player.attendanceRate}
                        className="h-2"
                      />
                      <span className="text-xs text-muted-foreground">
                        {player.attendanceRate}%
                      </span>
                    </div>

                    {/* Performance */}
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {player.performanceScore}
                      </p>
                      <div
                        className="flex items-center gap-1 text-xs"
                        style={{ color: trendConfig?.color }}
                      >
                        <TrendIcon className="h-3 w-3" />
                        <span>{trendConfig?.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
