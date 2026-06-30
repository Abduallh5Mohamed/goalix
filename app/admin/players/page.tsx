"use client";

import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
import { getInitials, formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  Loader2,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  useCreatePlayerMutation,
  useGetBranchesQuery,
  useHardDeletePlayerMutation,
  useGetPlayersQuery,
  useUpdatePlayerMutation,
  type PlayerRow,
} from "@/lib/store/api/adminApi";

type ApiErrorDetails = {
  data?: {
    error?: {
      message?: string;
      details?: { message?: string }[];
    };
  };
};

function getApiErrorMessage(err: unknown, fallback: string) {
  const apiError = err as ApiErrorDetails;
  const details = apiError.data?.error?.details
    ?.map((item) => item.message)
    .filter(Boolean);
  return details?.length
    ? details.join(". ")
    : (apiError.data?.error?.message ?? fallback);
}

function calculateAge(birthDate: string) {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()))
    age -= 1;
  return age >= 0 ? String(age) : "";
}

const GUARDIAN_RELATIONS = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "paternal_uncle", label: "Paternal Uncle" },
  { value: "maternal_uncle", label: "Maternal Uncle" },
  { value: "paternal_aunt", label: "Paternal Aunt" },
  { value: "maternal_aunt", label: "Maternal Aunt" },
  { value: "grandfather", label: "Grandfather" },
  { value: "grandmother", label: "Grandmother" },
  { value: "older_brother", label: "Older Brother" },
  { value: "older_sister", label: "Older Sister" },
  { value: "legal_guardian", label: "Legal Guardian" },
  { value: "other", label: "Other" },
];

export default function PlayersPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const emptyCreateForm = () => ({
    fullName: "",
    birthDate: "",
    heightCm: "",
    weightKg: "",
    preferredFoot: "",
    dateJoined: new Date().toISOString().slice(0, 10),
    username: "",
    password: "",
    gender: "",
    nationality: "",
    phone: "",
    guardianName: "",
    guardianPhone: "",
    guardianRelation: "",
    address: "",
    branchId: "",
  });
  const [form, setForm] = useState(emptyCreateForm);
  const [formError, setFormError] = useState("");
  const [deletePlayerRow, setDeletePlayerRow] = useState<PlayerRow | null>(
    null,
  );
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const { data, isLoading, isError, refetch } = useGetPlayersQuery({
    limit: 50,
  });
  const { data: branches = [] } = useGetBranchesQuery();
  const [createPlayer, { isLoading: isCreating }] = useCreatePlayerMutation();
  const [updatePlayer, { isLoading: isUpdating }] = useUpdatePlayerMutation();
  const [hardDeletePlayer, { isLoading: isHardDeleting }] =
    useHardDeletePlayerMutation();

  const openDelete = useCallback((player: PlayerRow) => {
    setDeletePlayerRow(player);
    setDeleteConfirm("");
    setDeleteError("");
  }, []);

  const columns = useMemo<Column<PlayerRow>[]>(
    () => [
      {
        key: "name",
        header: "Player",
        accessor: (row) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/20 text-sm text-primary">
                {getInitials(row.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{row.full_name}</p>
                <Badge variant={row.profile_status === "complete" ? "success" : "warning"}>
                  {row.profile_status === "complete" ? "Complete profile" : "Complete profile required"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {row.position ?? "-"} -{" "}
                {row.date_of_birth
                  ? `Born ${formatDate(row.date_of_birth)}`
                  : "No DOB"}{" "}
                - Joined {formatDate(row.date_joined ?? row.created_at)}
              </p>
            </div>
          </div>
        ),
        sortable: true,
        sortValue: (row) => row.full_name,
      },
      {
        key: "level",
        header: "Level",
        accessor: (row) => (
          <Badge
            variant={
              row.level === "A"
                ? "success"
                : row.level === "B" || row.level === "C"
                  ? "warning"
                  : "destructive"
            }
          >
            {row.level ? `Level ${row.level}` : "N/A"}
          </Badge>
        ),
        sortable: true,
        sortValue: (row) => row.level ?? "",
      },
      {
        key: "trend",
        header: "Trend",
        accessor: (row) => (
          <div className="flex items-center gap-1.5">
            {row.level === "A" ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            ) : row.level === "D" || row.level === "F" ? (
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {row.level === "A"
                ? "Improving"
                : row.level === "D" || row.level === "F"
                  ? "Declining"
                  : "Stable"}
            </span>
          </div>
        ),
        sortable: true,
        sortValue: (row) => row.level ?? "",
      },
      {
        key: "joined",
        header: "Joined",
        accessor: (row) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.date_joined ?? row.created_at)}
          </span>
        ),
        sortable: true,
        sortValue: (row) => row.date_joined ?? row.created_at,
      },
      {
        key: "status",
        header: "Status",
        accessor: (row) => (
          <Badge variant={row.is_active === false ? "secondary" : "success"}>
            {row.is_active === false ? "Inactive" : "Active"}
          </Badge>
        ),
        sortable: true,
        sortValue: (row) => (row.is_active === false ? "inactive" : "active"),
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        accessor: (row) => (
          <div
            className="flex flex-wrap justify-end gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => router.push(`/admin/players/${row.id}`)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={isUpdating}
              onClick={() =>
                updatePlayer({
                  id: row.id,
                  body: { isActive: row.is_active === false },
                })
              }
            >
              {row.is_active === false ? (
                <UserCheck className="h-3.5 w-3.5" />
              ) : (
                <UserX className="h-3.5 w-3.5" />
              )}
              {row.is_active === false ? "Activate" : "Set inactive"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => openDelete(row)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete forever
            </Button>
          </div>
        ),
      },
    ],
    [isUpdating, openDelete, router, updatePlayer],
  );

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreatePlayer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const requiredValues = [
      form.fullName.trim(),
      form.birthDate,
      form.heightCm,
      form.weightKg,
      form.preferredFoot,
      form.dateJoined,
      form.username.trim(),
      form.password,
      form.gender,
      form.nationality.trim(),
      form.phone.trim(),
      form.address.trim(),
      form.branchId,
      form.guardianName.trim(),
      form.guardianPhone.trim(),
      form.guardianRelation,
    ];
    if (requiredValues.some((value) => !value)) {
      setFormError("Fill all required player basics.");
      return;
    }
    if (Number(form.heightCm) <= 0 || Number(form.weightKg) <= 0) {
      setFormError("Height and weight must be valid positive numbers.");
      return;
    }

    try {
      await createPlayer({
        fullName: form.fullName.trim(),
        birthDate: form.birthDate,
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        preferredFoot: form.preferredFoot as "left" | "right",
        dateJoined: form.dateJoined,
        username: form.username.trim(),
        password: form.password,
        gender: form.gender as "male" | "female" | "other",
        nationality: form.nationality.trim(),
        phone: form.phone.trim(),
        guardianName: form.guardianName.trim() || undefined,
        guardianPhone: form.guardianPhone.trim() || undefined,
        guardianRelation: form.guardianRelation.trim() || undefined,
        address: form.address.trim(),
        branchId: form.branchId,
      }).unwrap();
      setForm(emptyCreateForm());
      setOpen(false);
    } catch (err) {
      setFormError(
        getApiErrorMessage(
          err,
          "Could not create player. Please check the entered data.",
        ),
      );
    }
  };

  const handleDeletePlayer = async () => {
    if (!deletePlayerRow) return;
    const expected = `delete forever ${deletePlayerRow.full_name}`;
    setDeleteError("");
    if (deleteConfirm.trim() !== expected) {
      setDeleteError(`Type "${expected}" to confirm deletion.`);
      return;
    }

    try {
      await hardDeletePlayer(deletePlayerRow.id).unwrap();
      setDeletePlayerRow(null);
      setDeleteConfirm("");
    } catch (err) {
      setDeleteError(
        getApiErrorMessage(err, "Could not permanently delete player."),
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Failed to load players.</p>
        <Button variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const players = data?.data ?? [];
  const deleteExpected = `delete forever ${deletePlayerRow?.full_name ?? ""}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Players (${data?.pagination?.total ?? players.length})`}
        description="View and manage all registered players."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Players" },
        ]}
        actions={
          <Button className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Player
          </Button>
        }
      />

      <DataTable
        data={players}
        columns={columns}
        searchable
        searchPlaceholder="Search players..."
        searchKey={(row) => `${row.full_name} ${row.position ?? ""}`}
        onRowClick={(row) => router.push(`/admin/players/${row.id}`)}
      />

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
            <DialogDescription>
              Create the required player basics. Matching groups are assigned
              automatically from birth year.
            </DialogDescription>
          </DialogHeader>
          <form
            className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
            onSubmit={handleCreatePlayer}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="player-full-name">Name</Label>
                <Input
                  id="player-full-name"
                  value={form.fullName}
                  onChange={(event) =>
                    updateForm("fullName", event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-birth-date">Birth date</Label>
                <Input
                  id="player-birth-date"
                  type="date"
                  value={form.birthDate}
                  onChange={(event) =>
                    updateForm("birthDate", event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-age">Age</Label>
                <Input
                  id="player-age"
                  value={calculateAge(form.birthDate)}
                  readOnly
                  placeholder="Auto calculated"
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(value) => updateForm("gender", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose gender..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-height">Height (cm)</Label>
                <Input
                  id="player-height"
                  type="number"
                  min={1}
                  max={250}
                  value={form.heightCm}
                  onChange={(event) =>
                    updateForm("heightCm", event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-weight">Weight (kg)</Label>
                <Input
                  id="player-weight"
                  type="number"
                  min={1}
                  max={200}
                  value={form.weightKg}
                  onChange={(event) =>
                    updateForm("weightKg", event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Preferred Foot</Label>
                <Select
                  value={form.preferredFoot}
                  onValueChange={(value) => updateForm("preferredFoot", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose foot..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-date-joined">Date Joined Academy</Label>
                <Input
                  id="player-date-joined"
                  type="date"
                  value={form.dateJoined}
                  onChange={(event) =>
                    updateForm("dateJoined", event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-nationality">Nationality</Label>
                <Input
                  id="player-nationality"
                  value={form.nationality}
                  onChange={(event) =>
                    updateForm("nationality", event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-phone">Phone Number</Label>
                <Input
                  id="player-phone"
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-guardian-name">Guardian Name</Label>
                <Input
                  id="player-guardian-name"
                  value={form.guardianName}
                  onChange={(event) =>
                    updateForm("guardianName", event.target.value)
                  }
                  placeholder="Parent or guardian name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-guardian-phone">Guardian Phone</Label>
                <Input
                  id="player-guardian-phone"
                  value={form.guardianPhone}
                  onChange={(event) =>
                    updateForm("guardianPhone", event.target.value)
                  }
                  placeholder="Parent or guardian phone"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-guardian-relation">
                  Guardian Relation
                </Label>
                <Select
                  value={form.guardianRelation}
                  onValueChange={(value) =>
                    updateForm("guardianRelation", value)
                  }
                >
                  <SelectTrigger id="player-guardian-relation">
                    <SelectValue placeholder="Choose relation" />
                  </SelectTrigger>
                  <SelectContent>
                    {GUARDIAN_RELATIONS.map((relation) => (
                      <SelectItem key={relation.value} value={relation.value}>
                        {relation.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-username">Username</Label>
                <Input
                  id="player-username"
                  value={form.username}
                  onChange={(event) =>
                    updateForm("username", event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-password">Password</Label>
                <Input
                  id="player-password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    updateForm("password", event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={form.branchId}
                  onValueChange={(value) => updateForm("branchId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="player-address">Address</Label>
                <Input
                  id="player-address"
                  value={form.address}
                  onChange={(event) =>
                    updateForm("address", event.target.value)
                  }
                  required
                />
              </div>
            </div>
            {formError && <p className="text-sm text-red-400">{formError}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={
                  isCreating ||
                  !form.fullName.trim() ||
                  !form.birthDate ||
                  !form.branchId
                }
                className="gap-2"
              >
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Player
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletePlayerRow)}
        onOpenChange={(nextOpen) => !nextOpen && setDeletePlayerRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>Delete Player Forever</DialogTitle>
            <DialogDescription>
              This permanently removes the player profile and linked player
              login account. Type{" "}
              <span className="font-semibold text-foreground">
                {deleteExpected}
              </span>{" "}
              to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-player-confirm">Confirmation</Label>
            <Input
              id="delete-player-confirm"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder={deleteExpected}
            />
          </div>
          {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletePlayerRow(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                isHardDeleting || deleteConfirm.trim() !== deleteExpected
              }
              onClick={handleDeletePlayer}
              className="gap-2"
            >
              {isHardDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
