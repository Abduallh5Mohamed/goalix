"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Cake, Loader2, Plus, Trash2, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useCoachPermissions } from "@/lib/hooks/useCoachPermissions";
import {
  type CoachBirthday,
  useCreateCoachBirthYearMutation,
  useDeleteCoachBirthYearMutation,
  useGetCoachBirthdaysQuery,
  useGetCoachManageBranchesQuery,
} from "@/lib/store/api/coachApi";
import { useGetCoachPlayersScopedQuery } from "@/lib/store/api/calendarApi";
import { formatDate, getInitials } from "@/lib/utils";

const getBirthYear = (value: string | null) => {
  if (!value) return null;
  const year = new Date(value).getFullYear();
  return Number.isInteger(year) ? year : null;
};

function playerMainPosition(player: {
  position?: string | null;
  customProfile?: Array<{ key?: string; label?: string; value?: unknown }>;
}) {
  const field = player.customProfile?.find((item) => {
    const key = String(item.key || "").toLowerCase();
    const label = String(item.label || "").toLowerCase();
    return key === "main_position" || label === "main position";
  });
  if (typeof field?.value === "string" && field.value.trim()) {
    return field.value.trim();
  }
  return player.position || "No main position";
}

const getApiErrorMessage = (error: unknown, fallback = "Something went wrong.") => {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as { data?: { message?: unknown } }).data?.message === "string"
  ) {
    return (error as { data: { message: string } }).data.message;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as { data?: { error?: { message?: unknown } } }).data?.error?.message === "string"
  ) {
    return (error as { data: { error: { message: string } } }).data.error.message;
  }
  return fallback;
};

const creatorMeta = (birthday: CoachBirthday) => {
  if (birthday.createdByRole === "coach") {
    return {
      label: `Created by Coach${birthday.createdByName ? `: ${birthday.createdByName}` : ""}`,
      className: "border-cyan-400/50 bg-cyan-400/15 text-cyan-100",
    };
  }
  return {
    label: `Created by Admin${birthday.createdByName ? `: ${birthday.createdByName}` : ""}`,
    className: "border-lime-400/50 bg-lime-400/15 text-lime-100",
  };
};

export default function CoachBirthdaysPage() {
  const { can, isLoading: loadingPermissions } = useCoachPermissions();
  const canManageGroups = can("can_manage_groups");
  const { data: birthdays = [], isLoading: loadingBirthdays } = useGetCoachBirthdaysQuery();
  const { data: manageBranches = [], isLoading: loadingBranches } = useGetCoachManageBranchesQuery();
  const { data: playersRes, isLoading: loadingPlayers } = useGetCoachPlayersScopedQuery({ limit: 200 });
  const [createCoachBirthYear, { isLoading: isCreating }] = useCreateCoachBirthYearMutation();
  const [deleteCoachBirthYear, { isLoading: isDeleting }] = useDeleteCoachBirthYearMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({
    branchId: "",
    fromYear: "",
    toYear: "",
    label: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<CoachBirthday | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const players = useMemo(() => playersRes?.data ?? [], [playersRes?.data]);

  const branchOptions = useMemo(() => {
    const branchesById = new Map<string, { id: string; name: string }>();
    manageBranches.forEach((branch) => branchesById.set(branch.id, branch));
    birthdays.forEach((birthday) => {
      branchesById.set(birthday.branchId, {
        id: birthday.branchId,
        name: birthday.branchName,
      });
    });
    return [...branchesById.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [birthdays, manageBranches]);

  const birthdaysWithPlayers = useMemo(() => {
    return birthdays.map((birthday) => {
      const scopedPlayers = players.filter((player) => {
        const year = getBirthYear(player.date_of_birth);
        return (
          player.branch_id === birthday.branchId &&
          year !== null &&
          year >= birthday.fromYear &&
          year <= birthday.toYear
        );
      });
      return { ...birthday, players: scopedPlayers };
    });
  }, [birthdays, players]);

  const isLoading = loadingBirthdays || loadingPlayers;

  const resetCreateForm = () => {
    setForm({ branchId: "", fromYear: "", toYear: "", label: "" });
    setCreateError("");
  };

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) resetCreateForm();
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    const fromYear = Number(form.fromYear);
    const toYear = Number(form.toYear);
    if (!form.branchId || !Number.isFinite(fromYear) || !Number.isFinite(toYear)) return;

    try {
      await createCoachBirthYear({
        branchId: form.branchId,
        fromYear,
        toYear,
        label: form.label.trim() || undefined,
      }).unwrap();
      handleCreateOpenChange(false);
    } catch (error) {
      setCreateError(
        getApiErrorMessage(
          error,
          "Could not create the birth year. Please check the values.",
        ),
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError("");
    try {
      await deleteCoachBirthYear(deleteTarget.id).unwrap();
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(getApiErrorMessage(error, "Could not delete this birth year."));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Birthdays"
        description="View your assigned birth years and the players inside each birthday range."
        breadcrumbs={[{ label: "Home", href: "/coach/home" }, { label: "Birthdays" }]}
        actions={
          canManageGroups ? (
            <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Birth Year
            </Button>
          ) : undefined
        }
      />

      {deleteError && (
        <Card className="border-red-500/40 bg-red-500/10">
          <CardContent className="p-4 text-sm text-red-200">{deleteError}</CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading birthdays...
          </CardContent>
        </Card>
      ) : birthdaysWithPlayers.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {birthdaysWithPlayers.map((birthday) => (
            (() => {
              const creator = creatorMeta(birthday);
              return (
                <Card key={birthday.id} className="border-border/50 bg-card">
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Cake className="h-4 w-4 text-primary" />
                        {birthday.label}
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {birthday.branchName} - {birthday.fromYear} to {birthday.toYear}
                      </p>
                      <Badge
                        variant="outline"
                        className={`mt-2 max-w-full truncate px-2 py-0.5 text-[11px] font-semibold ${creator.className}`}
                      >
                        {creator.label}
                      </Badge>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {birthday.players.length} players
                      </Badge>
                      {birthday.canDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteError("");
                            setDeleteTarget(birthday);
                          }}
                          aria-label={`Delete ${birthday.label}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {birthday.players.map((player) => (
                      <div key={player.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/20 text-xs text-primary">
                              {getInitials(player.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{player.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {player.date_of_birth ? formatDate(player.date_of_birth) : "No birth date"} - {playerMainPosition(player)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={player.profile_status === "complete" ? "success" : "warning"}>
                          {player.profile_status}
                        </Badge>
                      </div>
                    ))}
                    {!birthday.players.length && (
                      <p className="rounded-lg border border-border/40 p-5 text-center text-sm text-muted-foreground">
                        No players in this birthday yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })()
          ))}
        </div>
      ) : (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No birthdays assigned yet.
            {canManageGroups ? " Add the first birth year from the button above." : ""}
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Birth Year</DialogTitle>
            <DialogDescription>
              Create a birth year in one of the branches you can manage.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select
                value={form.branchId}
                onValueChange={(branchId) => setForm((current) => ({ ...current, branchId }))}
                disabled={loadingBranches || loadingPermissions}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingBranches ? "Loading branches..." : "Select branch"} />
                </SelectTrigger>
                <SelectContent>
                  {branchOptions.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!loadingBranches && !branchOptions.length && (
                <p className="text-xs text-muted-foreground">
                  No manageable branches assigned to this account.
                </p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="birth-year-from">From year</Label>
                <Input
                  id="birth-year-from"
                  type="number"
                  min={2000}
                  max={2030}
                  value={form.fromYear}
                  onChange={(event) => setForm((current) => ({ ...current, fromYear: event.target.value }))}
                  placeholder="2013"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth-year-to">To year</Label>
                <Input
                  id="birth-year-to"
                  type="number"
                  min={2000}
                  max={2030}
                  value={form.toYear}
                  onChange={(event) => setForm((current) => ({ ...current, toYear: event.target.value }))}
                  placeholder="2013"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth-year-label">Label (optional)</Label>
              <Input
                id="birth-year-label"
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                placeholder="U12"
              />
            </div>
            {createError && <p className="text-sm text-red-400">{createError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleCreateOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={
                  isCreating ||
                  !form.branchId ||
                  !form.fromYear ||
                  !form.toYear ||
                  !branchOptions.length
                }
              >
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                {isCreating ? "Adding..." : "Add Birth Year"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete birth year"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.label} (${deleteTarget.fromYear}-${deleteTarget.toYear})? You can only delete birth years you created.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </div>
  );
}
