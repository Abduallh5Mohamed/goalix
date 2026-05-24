"use client";

import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateGroupMutation,
  useDeleteGroupMutation,
  useGetBirthYearsQuery,
  useGetBranchesQuery,
  useGetGroupsQuery,
  useGetPlayersQuery,
  useUpdateGroupMutation,
  type Group,
  type PlayerRow,
  type BirthYearGroup,
  type GroupAssignmentMode,
} from "@/lib/store/api/adminApi";
import { Edit2, Layers, Loader2, Plus, RefreshCw, Trash2, Users } from "lucide-react";

type PlayerPick = Pick<PlayerRow, "id" | "full_name" | "date_of_birth" | "player_code"> & { code: string };

export default function GroupsPage() {
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [birthYearSearch, setBirthYearSearch] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [fromPlayerCode, setFromPlayerCode] = useState("");
  const [toPlayerCode, setToPlayerCode] = useState("");
  const [selectedPlayerMap, setSelectedPlayerMap] = useState<Record<string, PlayerPick>>({});
  const [form, setForm] = useState({
    assignmentMode: "birth_year" as GroupAssignmentMode,
    birthYearIds: [] as string[],
    playerIds: [] as string[],
    name: "",
    description: "",
    maxPlayers: "25",
  });

  const { data: branches, isLoading: loadingBranches } = useGetBranchesQuery();
  const selectedBranch = selectedBranchId || branches?.[0]?.id || "";
  const { data: birthYears } = useGetBirthYearsQuery(selectedBranch, { skip: !selectedBranch });
  const {
    data: groups,
    isLoading: loadingGroups,
    isError,
    refetch,
  } = useGetGroupsQuery({ branchId: selectedBranch }, { skip: !selectedBranch });
  const { data: players, isFetching: loadingPlayers } = useGetPlayersQuery({
    branchId: selectedBranch,
    limit: 100,
    search: playerSearch.trim() || undefined,
  }, { skip: !selectedBranch });
  const [createGroup, { isLoading: isCreating, error: createError }] = useCreateGroupMutation();
  const [updateGroup, { isLoading: isUpdating, error: updateError }] = useUpdateGroupMutation();
  const [deleteGroup, { isLoading: isDeleting, error: deleteError }] = useDeleteGroupMutation();

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    setForm((current) => ({ ...current, birthYearIds: [], playerIds: [] }));
  };

  const birthYearOptions = useMemo(() => {
    return ((birthYears ?? []) as BirthYearGroup[]).flatMap((group) =>
      group.birthYears.map((range) => ({
        id: range.id,
        label: `${group.label} (${range.fromYear}-${range.toYear})`,
      })),
    );
  }, [birthYears]);

  const filteredBirthYearOptions = useMemo(() => {
    const term = birthYearSearch.trim().toLowerCase();
    if (!term) return birthYearOptions;
    return birthYearOptions.filter((birthYear) => birthYear.label.toLowerCase().includes(term));
  }, [birthYearOptions, birthYearSearch]);

  const playerOptions = useMemo(() => {
    return (players?.data ?? [])
      .map((player) => ({ ...player, code: player.player_code ?? player.id }))
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const term = playerSearch.trim().toLowerCase();
    if (!term) return playerOptions;
    return playerOptions.filter((player) => `${player.full_name} ${player.code} ${player.date_of_birth ?? ""}`.toLowerCase().includes(term));
  }, [playerOptions, playerSearch]);

  const rangePlayers = useMemo(() => {
    if (!fromPlayerCode.trim() || !toPlayerCode.trim()) return [];
    const from = fromPlayerCode.trim();
    const to = toPlayerCode.trim();
    const [start, end] = from.localeCompare(to, undefined, { numeric: true }) <= 0 ? [from, to] : [to, from];
    return playerOptions.filter((player) =>
      player.code.localeCompare(start, undefined, { numeric: true }) >= 0 &&
      player.code.localeCompare(end, undefined, { numeric: true }) <= 0,
    );
  }, [fromPlayerCode, toPlayerCode, playerOptions]);

  const selectedPlayers = useMemo(() => {
    return form.playerIds
      .map((id) => selectedPlayerMap[id] ?? playerOptions.find((player) => player.id === id))
      .filter((player): player is PlayerPick => Boolean(player));
  }, [form.playerIds, playerOptions, selectedPlayerMap]);

  const resetForm = () => {
    setForm({ assignmentMode: "birth_year", birthYearIds: [], playerIds: [], name: "", description: "", maxPlayers: "25" });
    setBirthYearSearch("");
    setPlayerSearch("");
    setFromPlayerCode("");
    setToPlayerCode("");
    setSelectedPlayerMap({});
    setEditingGroup(null);
  };

  const openEdit = useCallback((group: Group) => {
    const groupPlayers = Object.fromEntries((group.players ?? []).map((player) => [player.id, {
      id: player.id,
      full_name: player.fullName,
      date_of_birth: player.birthDate ?? null,
      player_code: player.playerCode ?? null,
      code: player.playerCode ?? player.id,
    }]));
    setEditingGroup(group);
    setForm({
      assignmentMode: group.assignment_mode ?? (group.birth_years?.length ? "birth_year" : "players"),
      birthYearIds: group.birth_years?.map((birthYear) => birthYear.id) ?? [],
      playerIds: group.players?.map((player) => player.id) ?? [],
      name: group.name,
      description: group.description ?? "",
      maxPlayers: String(group.max_players ?? 25),
    });
    setSelectedPlayerMap(groupPlayers);
    setOpen(true);
  }, []);

  const columns = useMemo<Column<Group>[]>(() => [
    {
      key: "name",
      header: "Group",
      accessor: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.birth_years?.length
              ? row.birth_years.map((birthYear) => `${birthYear.label} ${birthYear.fromYear}-${birthYear.toYear}`).join(", ")
              : "No birth years"}
          </p>
        </div>
      ),
      sortable: true,
      sortValue: (row) => row.name,
    },
    {
      key: "players",
      header: "Players",
      accessor: (row) => (
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{row.player_count ?? 0}/{row.max_players ?? 0}</span>
        </div>
      ),
      sortable: true,
      sortValue: (row) => row.player_count ?? 0,
    },
    {
      key: "coaches",
      header: "Coaches",
      accessor: (row) => row.coach_count ?? 0,
      sortable: true,
      sortValue: (row) => row.coach_count ?? 0,
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => (
        <Badge variant={row.is_active ? "success" : "secondary"}>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
      sortable: true,
      sortValue: (row) => (row.is_active ? "active" : "inactive"),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (row) => (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); openEdit(row); }}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); setDeleteTarget(row); setDeleteText(""); }}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      ),
    },
  ], [openEdit]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBranch || !form.name.trim()) return;
    if (form.assignmentMode === "birth_year" && !form.birthYearIds.length) return;
    if (form.assignmentMode === "players" && !form.playerIds.length) return;

    const payload = {
      assignmentMode: form.assignmentMode,
      birthYearIds: form.assignmentMode === "birth_year" ? form.birthYearIds : undefined,
      playerIds: form.assignmentMode === "players" && form.playerIds.length ? form.playerIds : undefined,
      playerCodeFrom: form.assignmentMode === "players" && fromPlayerCode.trim() ? fromPlayerCode.trim() : undefined,
      playerCodeTo: form.assignmentMode === "players" && toPlayerCode.trim() ? toPlayerCode.trim() : undefined,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      maxPlayers: Number(form.maxPlayers) || 25,
    };

    const createPayload = {
      branchId: selectedBranch,
      ...payload,
    };

    if (editingGroup) {
      await updateGroup({ id: editingGroup.id, body: payload }).unwrap();
    } else {
      await createGroup(createPayload).unwrap();
    }

    resetForm();
    setOpen(false);
  };

  const applyPlayerRange = () => {
    if (!fromPlayerCode.trim() || !toPlayerCode.trim()) return;
    setForm((current) => ({
      ...current,
      playerIds: [...new Set([...current.playerIds, ...rangePlayers.map((player) => player.id)])],
    }));
    setSelectedPlayerMap((current) => ({
      ...current,
      ...Object.fromEntries(rangePlayers.map((player) => [player.id, player])),
    }));
  };

  const togglePlayer = (player: PlayerPick, checked: boolean) => {
    setForm((current) => ({
      ...current,
      playerIds: checked
        ? [...new Set([...current.playerIds, player.id])]
        : current.playerIds.filter((id) => id !== player.id),
    }));
    setSelectedPlayerMap((current) => {
      if (checked) return { ...current, [player.id]: player };
      const next = { ...current };
      delete next[player.id];
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteText !== `clear ${deleteTarget.name}`) return;
    await deleteGroup(deleteTarget.id).unwrap();
    setDeleteTarget(null);
    setDeleteText("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Groups"
        description="Create groups under a branch and its birth years."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Academy" },
          { label: "Groups" },
        ]}
        actions={
          <div className="flex gap-2">
            {!loadingBranches && (
              <Select value={selectedBranch} onValueChange={handleBranchChange}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent>
                  {(branches ?? []).map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button className="gap-1.5" disabled={!selectedBranch} onClick={() => { resetForm(); setOpen(true); }}>
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </div>
        }
      />

      {!selectedBranch ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Layers className="h-10 w-10 opacity-30" />
          <p>Select a branch to view its groups.</p>
        </div>
      ) : loadingGroups ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <p className="text-muted-foreground">Failed to load groups.</p>
          <Button variant="outline" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : (
        <DataTable
          data={groups ?? []}
          columns={columns}
          searchable
          searchPlaceholder="Search groups..."
          searchKey={(row) => `${row.name} ${row.birth_years?.map((birthYear) => birthYear.label).join(" ") ?? ""}`}
          emptyTitle="No groups yet"
          emptyDescription="Create a group for one of this branch's birth years."
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Create Group"}</DialogTitle>
            <DialogDescription>Build the group from birth years or selected players.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label>Group basis</Label>
              <Select value={form.assignmentMode} onValueChange={(value) => {
                setForm((current) => ({ ...current, assignmentMode: value as GroupAssignmentMode, birthYearIds: [], playerIds: [] }));
                setSelectedPlayerMap({});
                setFromPlayerCode("");
                setToPlayerCode("");
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="birth_year">Birth date ranges</SelectItem>
                  <SelectItem value="players">Players by ID or search</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.assignmentMode === "birth_year" ? (
              <div className="space-y-2">
                <Label>Birth Years</Label>
                <Input value={birthYearSearch} onChange={(event) => setBirthYearSearch(event.target.value)} placeholder="Search birth years..." />
                <div className="grid max-h-56 gap-2 overflow-auto rounded-md border border-border p-3">
                {filteredBirthYearOptions.map((birthYear) => (
                  <label key={birthYear.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.birthYearIds.includes(birthYear.id)}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        birthYearIds: event.target.checked
                          ? [...current.birthYearIds, birthYear.id]
                          : current.birthYearIds.filter((id) => id !== birthYear.id),
                      }))}
                    />
                    {birthYear.label}
                  </label>
                ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Player ID range</Label>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Input value={fromPlayerCode} onChange={(event) => setFromPlayerCode(event.target.value)} placeholder="From player ID, e.g. PLY-U14-2026-0001" />
                  <Input value={toPlayerCode} onChange={(event) => setToPlayerCode(event.target.value)} placeholder="To player ID, e.g. PLY-U14-2026-0025" />
                  <Button type="button" variant="outline" onClick={applyPlayerRange} disabled={!fromPlayerCode.trim() || !toPlayerCode.trim()}>
                    Use range
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The full range is resolved securely on save inside the selected branch. {rangePlayers.length} matching players are visible in the current search result.
                </p>

                <Label>Players</Label>
                <Input value={playerSearch} onChange={(event) => setPlayerSearch(event.target.value)} placeholder="Search by player name or ID..." />
                {!!selectedPlayers.length && (
                  <div className="space-y-2 rounded-md border border-border p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{selectedPlayers.length} selected manually</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setForm((current) => ({ ...current, playerIds: [] })); setSelectedPlayerMap({}); }}>
                        Clear selected
                      </Button>
                    </div>
                    {selectedPlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2 text-sm">
                        <span>{player.full_name} <span className="text-muted-foreground">#{player.code}</span></span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePlayer(player, false)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid max-h-56 gap-2 overflow-auto rounded-md border border-border p-3">
                  {loadingPlayers && <p className="text-sm text-muted-foreground">Searching players...</p>}
                  {filteredPlayers.map((player) => (
                    <label key={player.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.playerIds.includes(player.id)}
                        onChange={(event) => togglePlayer(player, event.target.checked)}
                      />
                      {player.full_name} <span className="text-muted-foreground">#{player.code}</span>
                    </label>
                  ))}
                  {!loadingPlayers && !filteredPlayers.length && <p className="text-sm text-muted-foreground">No players found in this branch.</p>}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="U14 Elite"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Description</Label>
              <Input
                id="group-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Optional group notes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-max">Max Players</Label>
              <Input
                id="group-max"
                type="number"
                min={1}
                max={100}
                value={form.maxPlayers}
                onChange={(event) => setForm((current) => ({ ...current, maxPlayers: event.target.value }))}
              />
            </div>
            {form.assignmentMode === "birth_year" && !birthYearOptions.length && (
              <p className="text-sm text-amber-400">Create a birth year for this branch before creating groups.</p>
            )}
            {(createError || updateError) && <p className="text-sm text-red-400">Could not save this group.</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating || !form.name.trim() || (form.assignmentMode === "birth_year" ? !form.birthYearIds.length : (!form.playerIds.length && (!fromPlayerCode.trim() || !toPlayerCode.trim())))}
                className="gap-2"
              >
                {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingGroup ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>Type clear {deleteTarget?.name} to confirm deletion.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder={`clear ${deleteTarget?.name ?? ""}`} />
            {deleteError && <p className="text-sm text-red-400">Could not delete this group. It may have active relations.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={isDeleting || deleteText !== `clear ${deleteTarget?.name ?? ""}`} onClick={handleDelete}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
