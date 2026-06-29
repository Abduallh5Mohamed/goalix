"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  useCreateBirthYearMutation,
  useDeleteBirthYearMutation,
  useGetBirthYearsQuery,
  useGetBranchesQuery,
  useLazyGetBirthYearByIdQuery,
  useUpdateBirthYearMutation,
  type BirthYearRange,
} from "@/lib/store/api/adminApi";
import { Calendar, Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BirthYearsPage() {
  const router = useRouter();
  const { data: branches, isLoading: loadingBranches } = useGetBranchesQuery();
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const selectedBranch = selectedBranchId || branches?.[0]?.id || "";
  const [open, setOpen] = useState(false);
  const [editingRange, setEditingRange] = useState<(BirthYearRange & { groupLabel?: string }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<(BirthYearRange & { groupLabel?: string }) | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [deletePlayerCount, setDeletePlayerCount] = useState(0);
  const [transferBirthYearId, setTransferBirthYearId] = useState("");
  const [deleteFlowError, setDeleteFlowError] = useState("");
  const [form, setForm] = useState({ fromYear: "", toYear: "", label: "" });
  const { data: birthYearGroups, isLoading: loadingBirthYears } = useGetBirthYearsQuery(selectedBranch, {
    skip: !selectedBranch,
  });
  const [createBirthYear, { isLoading: isCreating, error }] = useCreateBirthYearMutation();
  const [updateBirthYear, { isLoading: isUpdating, error: updateError }] = useUpdateBirthYearMutation();
  const [deleteBirthYear, { isLoading: isDeleting, error: deleteError }] = useDeleteBirthYearMutation();
  const [loadBirthYearDetail, { isFetching: loadingDeleteDetail }] = useLazyGetBirthYearByIdQuery();

  const openCreate = () => {
    setEditingRange(null);
    setForm({ fromYear: "", toYear: "", label: "" });
    setOpen(true);
  };

  const openEdit = (range: BirthYearRange & { groupLabel?: string }) => {
    setEditingRange(range);
    setForm({ fromYear: String(range.fromYear), toYear: String(range.toYear), label: range.groupLabel ?? "" });
    setOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBranch || !form.fromYear || !form.toYear) return;

    const payload = {
      fromYear: Number(form.fromYear),
      toYear: Number(form.toYear),
      label: form.label.trim() || undefined,
    };

    if (editingRange) {
      await updateBirthYear({ id: editingRange.id, body: payload }).unwrap();
    } else {
      await createBirthYear({ branchId: selectedBranch, ...payload }).unwrap();
    }

    setForm({ fromYear: "", toYear: "", label: "" });
    setEditingRange(null);
    setOpen(false);
  };

  const deleteName = deleteTarget?.groupLabel ?? deleteTarget?.label ?? "";
  const transferOptions = (birthYearGroups ?? [])
    .flatMap((group) => group.birthYears.map((range) => ({
      id: range.id,
      label: `${group.label} (${range.fromYear}-${range.toYear})`,
    })))
    .filter((range) => range.id !== deleteTarget?.id);

  const openDelete = async (range: BirthYearRange & { groupLabel?: string }) => {
    setDeleteTarget(range);
    setDeleteText("");
    setTransferBirthYearId("");
    setDeletePlayerCount(0);
    setDeleteFlowError("");

    try {
      const detail = await loadBirthYearDetail(range.id).unwrap();
      setDeletePlayerCount(detail.players.length);
    } catch {
      setDeleteFlowError("Could not inspect this birth year before deletion.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteText !== `clear ${deleteName}`) return;
    setDeleteFlowError("");
    if (deletePlayerCount > 0 && !transferBirthYearId) {
      setDeleteFlowError("Select a target birth year before deleting.");
      return;
    }
    await deleteBirthYear({
      id: deleteTarget.id,
      transferBirthYearId: deletePlayerCount > 0 ? transferBirthYearId : undefined,
    }).unwrap();
    setDeleteTarget(null);
    setDeleteText("");
    setTransferBirthYearId("");
    setDeletePlayerCount(0);
  };

  const creatorMeta = (range: BirthYearRange) => {
    if (range.createdByRole === "coach") {
      return {
        label: `Created by Coach${range.createdByName ? `: ${range.createdByName}` : ""}`,
        className: "border-cyan-400/50 bg-cyan-400/15 text-cyan-100",
      };
    }
    return {
      label: `Created by Admin${range.createdByName ? `: ${range.createdByName}` : ""}`,
      className: "border-lime-400/50 bg-lime-400/15 text-lime-100",
    };
  };

  if (loadingBranches) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Birth Years"
        description="Create age categories with year ranges. Multiple ranges can share the same label."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Academy" },
          { label: "Birth Years" },
        ]}
        actions={
          <Button className="gap-1.5" disabled={!selectedBranch} onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Birth Year Range
          </Button>
        }
      />

      <div className="max-w-xs">
        <Select value={selectedBranch} onValueChange={setSelectedBranchId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a branch..." />
          </SelectTrigger>
          <SelectContent>
            {(branches ?? []).map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedBranch ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Create or select a branch first.</p>
      ) : loadingBirthYears ? (
        <LoadingSkeleton />
      ) : !birthYearGroups || birthYearGroups.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No birth years yet</CardTitle>
            <CardDescription>Add the first birth year range for this branch.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {birthYearGroups.map((group) => (
            <Card key={group.normalizedLabel}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <Calendar className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{group.label}</CardTitle>
                    <CardDescription className="text-xs">
                      {group.birthYears.length} range{group.birthYears.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.birthYears.map((range) => (
                    (() => {
                      const creator = creatorMeta(range);
                      return (
                        <div
                          key={range.id}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
                          onClick={() => router.push(`/admin/academy/birth-years/${range.id}`)}
                        >
                          <div className="min-w-0 space-y-1.5">
                            <p className="text-sm font-medium">
                              {range.fromYear === range.toYear
                                ? range.fromYear
                                : `${range.fromYear} - ${range.toYear}`}
                            </p>
                            <Badge
                              variant="outline"
                              className={`max-w-full truncate px-2 py-0.5 text-[11px] font-semibold ${creator.className}`}
                            >
                              {creator.label}
                            </Badge>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button type="button" variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); openEdit({ ...range, groupLabel: group.label }); }}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); openDelete({ ...range, groupLabel: group.label }); }}>
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                      );
                    })()
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRange ? "Edit Birth Year Range" : "Add Birth Year Range"}</DialogTitle>
            <DialogDescription>
              Create a year range for this branch. You can use the same label for multiple ranges.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="birth-year-label">Label (optional)</Label>
              <Input
                id="birth-year-label"
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                placeholder="e.g., Juniors, U12, etc."
              />
              <p className="text-xs text-muted-foreground">
                If not provided, will be auto-generated from the year range
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from-year">From Year</Label>
                <Input
                  id="from-year"
                  type="number"
                  min={2000}
                  max={2030}
                  value={form.fromYear}
                  onChange={(event) => setForm((current) => ({ ...current, fromYear: event.target.value }))}
                  placeholder="2010"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-year">To Year</Label>
                <Input
                  id="to-year"
                  type="number"
                  min={2000}
                  max={2030}
                  value={form.toYear}
                  onChange={(event) => setForm((current) => ({ ...current, toYear: event.target.value }))}
                  placeholder="2011"
                  required
                />
              </div>
            </div>
            {(error || updateError) && <p className="text-sm text-red-400">Could not save this birth year range.</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating || !form.fromYear || !form.toYear} className="gap-2">
                {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingRange ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Birth Year</DialogTitle>
            <DialogDescription>
              {deletePlayerCount > 0
                ? `${deletePlayerCount} player${deletePlayerCount === 1 ? "" : "s"} must be moved before deleting. The target range will expand automatically if needed.`
                : `Type clear ${deleteName} to confirm deletion.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {loadingDeleteDetail && <p className="text-sm text-muted-foreground">Checking assigned players...</p>}
            {deletePlayerCount > 0 && (
              <div className="space-y-2">
                <Label>Transfer players to</Label>
                <Select value={transferBirthYearId} onValueChange={setTransferBirthYearId}>
                  <SelectTrigger><SelectValue placeholder="Choose target birth year..." /></SelectTrigger>
                  <SelectContent>
                    {transferOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The selected birth year will automatically expand from the youngest moved player year to the oldest moved player year.
                </p>
              </div>
            )}
            <Input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder={`clear ${deleteName}`} />
            {(deleteError || deleteFlowError) && <p className="text-sm text-red-400">{deleteFlowError || "Could not delete this birth year. It may have active relations."}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={isDeleting || loadingDeleteDetail || deleteText !== `clear ${deleteName}` || (deletePlayerCount > 0 && !transferBirthYearId)} onClick={handleDelete}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
