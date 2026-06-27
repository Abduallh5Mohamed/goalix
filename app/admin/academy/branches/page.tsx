"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { Edit2, Plus, MapPin, RefreshCw, Loader2, Trash2 } from "lucide-react";
import {
  useCreateBranchMutation,
  useDeleteBranchMutation,
  useGetBranchesQuery,
  useUpdateBranchMutation,
  type Branch,
} from "@/lib/store/api/adminApi";

type ApiErrorDetail = {
  reason?: string;
  blockers?: Array<{ key?: string; label?: string; count?: number }>;
  solution?: string;
};

type ApiMutationError = {
  data?: {
    error?: {
      message?: string;
      details?: ApiErrorDetail[];
    };
  };
};

function getApiError(error: unknown) {
  const apiError = error as ApiMutationError | undefined;
  const detail = apiError?.data?.error?.details?.[0];

  return {
    message: apiError?.data?.error?.message ?? "The request could not be completed.",
    solution:
      detail?.solution ??
      "Review the linked records, remove the dependency that blocks this action, then try again.",
    blockers: detail?.blockers ?? [],
  };
}

const baseColumns: Column<Branch>[] = [
  {
    key: "name",
    header: "Branch Name",
    accessor: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <MapPin className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.address ?? row.city ?? "—"}</p>
        </div>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.name,
  },
  {
    key: "city",
    header: "City",
    accessor: (row) => row.city ?? "—",
    sortable: true,
    sortValue: (row) => row.city ?? "",
  },
  {
    key: "capacity",
    header: "Capacity",
    accessor: (row) => (
      <span>{row.capacity != null ? row.capacity : "—"}</span>
    ),
    sortable: true,
    sortValue: (row) => row.capacity ?? 0,
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
];

export default function BranchesPage() {
  const router = useRouter();
  const { data: branches, isLoading, isError, refetch } = useGetBranchesQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    capacity: "",
  });
  const [createBranch, { isLoading: isCreating, error: createError }] =
    useCreateBranchMutation();
  const [updateBranch, { isLoading: isUpdating, error: updateError }] = useUpdateBranchMutation();
  const [deleteBranch, { isLoading: isDeleting, error: deleteError }] = useDeleteBranchMutation();

  const columns = useMemo<Column<Branch>[]>(() => [
    ...baseColumns,
    {
      key: "actions",
      header: "Actions",
      accessor: (row) => (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={(event) => {
            event.stopPropagation();
            setEditingBranch(row);
            setForm({
              name: row.name,
              address: row.address ?? "",
              city: row.city ?? "",
              capacity: row.capacity != null ? String(row.capacity) : "",
            });
            setCreateOpen(true);
          }}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={(event) => {
            event.stopPropagation();
            setDeleteTarget(row);
            setDeleteText("");
          }}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      ),
    },
  ], []);

  const handleDialogChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      setEditingBranch(null);
      setForm({ name: "", address: "", city: "", capacity: "" });
    }
  };

  const handleCreateBranch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const capacityValue = form.capacity.trim()
      ? Number(form.capacity)
      : undefined;
    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      capacity:
        Number.isFinite(capacityValue) && capacityValue && capacityValue > 0
          ? capacityValue
          : undefined,
    };

    if (!payload.name) return;

    try {
      if (editingBranch) {
        await updateBranch({ id: editingBranch.id, body: payload }).unwrap();
      } else {
        await createBranch(payload).unwrap();
      }
      handleDialogChange(false);
    } catch {
      // Error handled via createError
    }
  };

  const canSubmit = form.name.trim().length > 0 && !isCreating;
  const deleteName = deleteTarget?.name ?? "";
  const deleteApiError = deleteError ? getApiError(deleteError) : null;
  const handleDelete = async () => {
    if (!deleteTarget || deleteText !== `clear ${deleteName}`) return;

    try {
      await deleteBranch(deleteTarget.id).unwrap();
      setDeleteTarget(null);
      setDeleteText("");
    } catch {
      // The dialog renders the API error with the recovery action below.
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Failed to load branches.</p>
        <Button variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Branches (${branches?.length ?? 0})`}
        description="Manage all academy branches and their details."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Academy" },
          { label: "Branches" },
        ]}
        actions={
          <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Branch
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit Branch" : "Add Branch"}</DialogTitle>
            <DialogDescription>
              Create a new academy branch.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateBranch}>
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch Name</Label>
              <Input
                id="branch-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Cairo - Main"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-address">Address</Label>
              <Input
                id="branch-address"
                value={form.address}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, address: event.target.value }))
                }
                placeholder="Street, city"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-city">City</Label>
              <Input
                id="branch-city"
                value={form.city}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, city: event.target.value }))
                }
                placeholder="Cairo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-capacity">Capacity (optional)</Label>
              <Input
                id="branch-capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, capacity: event.target.value }))
                }
                placeholder="120"
              />
            </div>
            {(createError || updateError) && (
              <p className="text-sm text-red-400">
                Could not create the branch. Please check the fields and try again.
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.name.trim().length === 0 || isCreating || isUpdating} className="gap-2">
                {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingBranch ? "Save Branch" : "Create Branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DataTable
        data={branches ?? []}
        columns={columns}
        searchable
        searchPlaceholder="Search branches..."
        searchKey={(row) => `${row.name} ${row.address ?? ""} ${row.city ?? ""}`}
        onRowClick={(row) => router.push(`/admin/academy/branches/${row.id}`)}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Branch</DialogTitle>
            <DialogDescription>Type clear {deleteName} to confirm deletion.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder={`clear ${deleteName}`} />
            {deleteApiError && (
              <div className="space-y-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm">
                <div>
                  <p className="font-semibold text-red-300">Error</p>
                  <p className="text-red-100">{deleteApiError.message}</p>
                </div>
                {deleteApiError.blockers.length > 0 && (
                  <div>
                    <p className="font-semibold text-red-300">Blocking data</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-red-100">
                      {deleteApiError.blockers.map((blocker) => (
                        <li key={blocker.key ?? blocker.label}>
                          {blocker.count ?? 0} {blocker.label ?? "related records"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-red-300">Solution</p>
                  <p className="text-red-100">{deleteApiError.solution}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={isDeleting || deleteText !== `clear ${deleteName}`} onClick={handleDelete}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
