"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetCoachesQuery,
  useGetGroupsQuery,
  useGetBranchesQuery,
  useGetBirthYearsQuery,
  useGetCoachAccessRolesQuery,
  useGetCoachAccessQuery,
  useUpsertCoachAccessMutation,
  useRemoveCoachAccessMutation,
  type CoachAccessType,
  type CoachAssignmentRoleDefinition,
  type CoachAssignmentRole,
  type CoachRow,
} from "@/lib/store/api/adminApi";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import { Cake, Check, Pencil, Search, Save, ShieldCheck, Trash2, Users, X } from "lucide-react";

const ASSIGNABLE_ROLE_VALUES = new Set<CoachAssignmentRole>([
  "head_coach",
  "assistant_coach",
]);

const fallbackRoleOptions: Array<CoachAssignmentRoleDefinition> = [
  { value: "head_coach", label: "Head coach", description: "", permissions: [] },
  { value: "assistant_coach", label: "Assistant coach", description: "", permissions: [] },
];

const roleLabel = (
  value?: string | null,
  options: CoachAssignmentRoleDefinition[] = fallbackRoleOptions
) => options.find((option) => option.value === value)?.label ?? value ?? "Coach";

const getCoachLabel = (coach: CoachRow, options: CoachAssignmentRoleDefinition[]) =>
  `${coach.full_name}${coach.specialization ? ` - ${roleLabel(coach.specialization, options)}` : ""}`;

export default function AssignCoachPage() {
  const [selectedCoach, setSelectedCoach] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [role, setRole] = useState<CoachAssignmentRole>("assistant_coach");
  const [groupsEnabled, setGroupsEnabled] = useState(false);
  const [birthYearsEnabled, setBirthYearsEnabled] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [birthYearSearch, setBirthYearSearch] = useState("");
  const [assignedSearch, setAssignedSearch] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedBirthYearIds, setSelectedBirthYearIds] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState(false);
  const [allBirthYears, setAllBirthYears] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: coachesRes, isLoading: loadingCoaches } = useGetCoachesQuery({ limit: 100 });
  const { data: branches, isLoading: loadingBranches } = useGetBranchesQuery();
  const { data: backendRoleOptions = [] } = useGetCoachAccessRolesQuery();
  const { data: groups = [], isFetching: loadingGroups } = useGetGroupsQuery(
    selectedBranch ? { branchId: selectedBranch } : {},
    { skip: !selectedBranch }
  );
  const { data: birthYearGroups = [], isFetching: loadingBirthYears } = useGetBirthYearsQuery(
    selectedBranch,
    { skip: !selectedBranch }
  );
  const { data: accessRules = [], isFetching: loadingAccess } = useGetCoachAccessQuery(
    { coachId: selectedCoach, branchId: selectedBranch },
    { skip: !selectedCoach || !selectedBranch }
  );
  const [upsertAccess, { isLoading: saving }] = useUpsertCoachAccessMutation();
  const [removeAccess, { isLoading: removing }] = useRemoveCoachAccessMutation();

  const coaches = useMemo(() => coachesRes?.data ?? [], [coachesRes?.data]);
  const roleOptions = useMemo(() => {
    const options = backendRoleOptions.length ? backendRoleOptions : fallbackRoleOptions;
    const filtered = options.filter((option) => ASSIGNABLE_ROLE_VALUES.has(option.value));
    return filtered.length ? filtered : fallbackRoleOptions;
  }, [backendRoleOptions]);
  const selectedCoachRow = coaches.find((coach) => coach.id === selectedCoach);
  const selectedBranchRow = branches?.find((branch) => branch.id === selectedBranch);
  const activeAccess = accessRules[0] ?? null;
  const selectedRoleDefinition = roleOptions.find((option) => option.value === role);

  const birthYears = useMemo(
    () =>
      birthYearGroups.flatMap((group) =>
        group.birthYears.map((birthYear) => ({
          ...birthYear,
          label: group.label || `${birthYear.fromYear}-${birthYear.toYear}`,
          normalizedLabel: group.normalizedLabel,
        }))
      ),
    [birthYearGroups]
  );

  const assignedRows = useMemo(() => {
    const rows = coaches.flatMap((coach) =>
      (coach.branches ?? []).map((branch) => ({
        coach,
        branch,
        search: `${coach.full_name} ${branch.role ?? ""} ${branch.name}`.toLowerCase(),
      }))
    );
    const q = assignedSearch.trim().toLowerCase();
    return q ? rows.filter((row) => row.search.includes(q)) : rows;
  }, [assignedSearch, coaches]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((group) =>
      [group.name, group.branch_name, group.birth_year_label, String(group.birth_year ?? "")]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [groups, groupSearch]);

  const filteredBirthYears = useMemo(() => {
    const q = birthYearSearch.trim().toLowerCase();
    if (!q) return birthYears;
    return birthYears.filter((birthYear) =>
      [birthYear.label, birthYear.normalizedLabel, birthYear.fromYear, birthYear.toYear]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [birthYears, birthYearSearch]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedCoach || !selectedBranch || loadingAccess) return;

    if (!activeAccess) {
      setRole("assistant_coach");
      setGroupsEnabled(false);
      setBirthYearsEnabled(false);
      setSelectedGroupIds([]);
      setSelectedBirthYearIds([]);
      setAllGroups(false);
      setAllBirthYears(false);
      return;
    }

    const hasGroupAccess = activeAccess.accessType === "groups" || activeAccess.accessType === "both";
    const hasBirthYearAccess = activeAccess.accessType === "birth_years" || activeAccess.accessType === "both";
    setRole(ASSIGNABLE_ROLE_VALUES.has(activeAccess.role) ? activeAccess.role : "assistant_coach");
    setGroupsEnabled(hasGroupAccess);
    setBirthYearsEnabled(hasBirthYearAccess);
    setSelectedGroupIds(activeAccess.groupIds);
    setSelectedBirthYearIds(activeAccess.birthYearIds);
    setAllGroups(activeAccess.allGroups);
    setAllBirthYears(activeAccess.allBirthYears);
  }, [activeAccess, loadingAccess, selectedBranch, selectedCoach]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetAccessSelection = () => {
    setGroupsEnabled(false);
    setBirthYearsEnabled(false);
    setSelectedGroupIds([]);
    setSelectedBirthYearIds([]);
    setAllGroups(false);
    setAllBirthYears(false);
    setGroupSearch("");
    setBirthYearSearch("");
    setFormError("");
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleBirthYear = (id: string) => {
    setSelectedBirthYearIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
    resetAccessSelection();
  };

  const groupSelectionValid = groupsEnabled && (allGroups || selectedGroupIds.length > 0);
  const birthYearSelectionValid = birthYearsEnabled && (allBirthYears || selectedBirthYearIds.length > 0);
  const canSave = Boolean(selectedCoach && selectedBranch && (groupSelectionValid || birthYearSelectionValid));
  const nextAccessType: CoachAccessType = groupSelectionValid && birthYearSelectionValid
    ? "both"
    : groupSelectionValid
      ? "groups"
      : "birth_years";

  const handleSave = async () => {
    if (!canSave) {
      setFormError("Select at least one group or birth year access option.");
      return;
    }
    setFormError("");
    try {
      await upsertAccess({
        coachId: selectedCoach,
        branchId: selectedBranch,
        accessType: nextAccessType,
        role,
        allGroups: groupsEnabled && allGroups,
        allBirthYears: birthYearsEnabled && allBirthYears,
        groupIds: groupsEnabled && !allGroups ? selectedGroupIds : [],
        birthYearIds: birthYearsEnabled && !allBirthYears ? selectedBirthYearIds : [],
      }).unwrap();
    } catch {
      setFormError("Could not save coach access. Please review the selected branch and access list.");
    }
  };

  const handleRemove = async (coachId = selectedCoach, branchId = selectedBranch) => {
    if (!coachId || !branchId) return;
    setFormError("");
    try {
      await removeAccess({ coachId, branchId }).unwrap();
      if (coachId === selectedCoach && branchId === selectedBranch) resetAccessSelection();
    } catch {
      setFormError("Could not remove coach access for this branch.");
    }
  };

  const handleEditAssigned = (coachId: string, branchId: string) => {
    setSelectedCoach(coachId);
    setSelectedBranch(branchId);
    setFormError("");
  };

  if (loadingCoaches || loadingBranches) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Assign Coach"
        description="Assign coach access by branch, groups, birth years, or both."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Coaches", href: "/admin/coaches" },
          { label: "Assign Coach" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Coach Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Select Coach</label>
                <Select value={selectedCoach} onValueChange={(value) => { setSelectedCoach(value); setFormError(""); }}>
                  <SelectTrigger><SelectValue placeholder="Choose a coach..." /></SelectTrigger>
                  <SelectContent>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {getCoachLabel(coach, roleOptions)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Select Branch</label>
                <Select value={selectedBranch} onValueChange={handleBranchChange}>
                  <SelectTrigger><SelectValue placeholder="Choose a branch..." /></SelectTrigger>
                  <SelectContent>
                    {(branches ?? []).map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Assignment Role</label>
              <Select value={role} onValueChange={(value) => setRole(value as CoachAssignmentRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRoleDefinition && (
              <div className="rounded-lg border border-border/60 bg-background/30 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{selectedRoleDefinition.label} permissions</p>
                    {selectedRoleDefinition.description && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedRoleDefinition.description}
                      </p>
                    )}
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {selectedRoleDefinition.permissions.map((permission) => (
                        <div
                          key={permission.key}
                          className={cn(
                            "flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs",
                            permission.granted
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-border/50 text-muted-foreground"
                          )}
                        >
                          {permission.granted ? (
                            <Check className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span>{permission.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Enforced by the backend for this branch and its selected groups or birth years.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setGroupsEnabled((value) => !value)}
                className={cn(
                  "flex min-h-20 items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-4 text-left transition-colors",
                  groupsEnabled && "border-primary bg-primary/10"
                )}
              >
                <Users className="h-5 w-5 text-primary" />
                <span>
                  <span className="block text-sm font-semibold">Groups Access</span>
                  <span className="text-xs text-muted-foreground">Choose all or selected groups.</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBirthYearsEnabled((value) => !value)}
                className={cn(
                  "flex min-h-20 items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-4 text-left transition-colors",
                  birthYearsEnabled && "border-primary bg-primary/10"
                )}
              >
                <Cake className="h-5 w-5 text-primary" />
                <span>
                  <span className="block text-sm font-semibold">Birthdays Access</span>
                  <span className="text-xs text-muted-foreground">Choose all or selected birth years.</span>
                </span>
              </button>
            </div>

            {selectedBranch && groupsEnabled && (
              <div className="space-y-3 rounded-lg border border-border/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Groups in {selectedBranchRow?.name ?? "branch"}</p>
                    <p className="text-xs text-muted-foreground">{allGroups ? "All groups selected" : `${selectedGroupIds.length} selected`}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={allGroups} onChange={(event) => setAllGroups(event.target.checked)} className="h-4 w-4 accent-primary" />
                    All groups
                  </label>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={groupSearch} onChange={(event) => setGroupSearch(event.target.value)} placeholder="Search groups..." className="pl-9" />
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {loadingGroups ? (
                    <p className="py-4 text-sm text-muted-foreground">Loading groups...</p>
                  ) : filteredGroups.length ? (
                    filteredGroups.map((group) => (
                      <label
                        key={group.id}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/50 p-3 text-sm",
                          !allGroups && selectedGroupIds.includes(group.id) && "border-primary bg-primary/10",
                          allGroups && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <span>
                          <span className="block font-medium">{group.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {group.birth_years?.length
                              ? group.birth_years.map((item) => item.label).join(", ")
                              : group.birth_year_label ?? "No birth year"}
                          </span>
                        </span>
                        <input type="checkbox" checked={allGroups || selectedGroupIds.includes(group.id)} onChange={() => toggleGroup(group.id)} disabled={allGroups} className="h-4 w-4 accent-primary" />
                      </label>
                    ))
                  ) : (
                    <p className="py-4 text-sm text-muted-foreground">No groups found for this branch.</p>
                  )}
                </div>
              </div>
            )}

            {selectedBranch && birthYearsEnabled && (
              <div className="space-y-3 rounded-lg border border-border/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Birthdays in {selectedBranchRow?.name ?? "branch"}</p>
                    <p className="text-xs text-muted-foreground">{allBirthYears ? "All birthdays selected" : `${selectedBirthYearIds.length} selected`}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={allBirthYears} onChange={(event) => setAllBirthYears(event.target.checked)} className="h-4 w-4 accent-primary" />
                    All birthdays
                  </label>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={birthYearSearch} onChange={(event) => setBirthYearSearch(event.target.value)} placeholder="Search birthdays..." className="pl-9" />
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {loadingBirthYears ? (
                    <p className="py-4 text-sm text-muted-foreground">Loading birthdays...</p>
                  ) : filteredBirthYears.length ? (
                    filteredBirthYears.map((birthYear) => (
                      <label
                        key={birthYear.id}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/50 p-3 text-sm",
                          !allBirthYears && selectedBirthYearIds.includes(birthYear.id) && "border-primary bg-primary/10",
                          allBirthYears && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <span>
                          <span className="block font-medium">{birthYear.label}</span>
                          <span className="text-xs text-muted-foreground">{birthYear.fromYear} to {birthYear.toYear}</span>
                        </span>
                        <input type="checkbox" checked={allBirthYears || selectedBirthYearIds.includes(birthYear.id)} onChange={() => toggleBirthYear(birthYear.id)} disabled={allBirthYears} className="h-4 w-4 accent-primary" />
                      </label>
                    ))
                  ) : (
                    <p className="py-4 text-sm text-muted-foreground">No birthdays found for this branch.</p>
                  )}
                </div>
              </div>
            )}

            {formError && <p className="text-sm text-red-400">{formError}</p>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1 gap-1.5" disabled={!canSave || saving || removing} onClick={handleSave}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : activeAccess ? "Update Assignment" : "Assign Coach"}
              </Button>
              <Button variant="outline" className="gap-1.5" disabled={!activeAccess || saving || removing} onClick={() => handleRemove()}>
                <Trash2 className="h-4 w-4" />
                {removing ? "Removing..." : "Unassign"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">Assigned Coaches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={assignedSearch} onChange={(event) => setAssignedSearch(event.target.value)} placeholder="Search assigned coaches..." className="pl-9" />
              </div>

              <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                {assignedRows.map(({ coach, branch }) => (
                  <div key={`${coach.id}-${branch.id}`} className="rounded-lg border border-border/50 p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-accent/20 text-xs text-accent">
                          {getInitials(coach.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{coach.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {branch.name} - {roleLabel(branch.role, roleOptions)}
                        </p>
                      </div>
                      <Badge variant="success">Assigned</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleEditAssigned(coach.id, branch.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Update
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1.5" disabled={removing} onClick={() => handleRemove(coach.id, branch.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Unassign
                      </Button>
                    </div>
                  </div>
                ))}
                {!assignedRows.length && <p className="py-8 text-center text-sm text-muted-foreground">No assigned coaches found.</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">All Coaches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {coaches.map((coach) => {
                const isSelected = coach.id === selectedCoach;
                const assigned = Boolean(coach.branches?.length);
                return (
                  <button
                    key={coach.id}
                    type="button"
                    onClick={() => { setSelectedCoach(coach.id); setFormError(""); }}
                    className={cn(
                      "w-full rounded-lg border border-border/50 p-3 text-left transition-colors hover:border-primary/70",
                      isSelected && "border-primary bg-primary/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-accent/20 text-xs text-accent">
                          {getInitials(coach.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{coach.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          Profile: {roleLabel(coach.specialization, roleOptions)}
                        </p>
                      </div>
                      <Badge variant={assigned ? "success" : "secondary"}>{assigned ? "Assigned" : "Unassigned"}</Badge>
                    </div>
                  </button>
                );
              })}
              {selectedCoachRow && selectedBranch && (
                <div className="rounded-lg border border-border/50 p-3">
                  <p className="text-sm font-semibold">{selectedCoachRow.full_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {loadingAccess
                      ? "Loading current access..."
                      : activeAccess
                        ? `${activeAccess.assignedGroups.length} runtime group entries in ${selectedBranchRow?.name ?? "this branch"}.`
                        : `No access assigned in ${selectedBranchRow?.name ?? "this branch"}.`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
