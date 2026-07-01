"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInitials } from "@/lib/utils";
import { AlertTriangle, KeyRound, Loader2, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, UserCheck, UserX } from "lucide-react";
import {
  useCreateCoachMutation,
  useGetCoachesQuery,
  useGetBranchesQuery,
  useHardDeleteCoachMutation,
  useRegenerateCoachMfaBackupCodesMutation,
  useRegisterUserMutation,
  useSetupCoachMfaMutation,
  useUpdateCoachMutation,
  useVerifyCoachMfaMutation,
  type Setup2FAResponse,
  type CoachRole,
  type CoachRow,
} from "@/lib/store/api/adminApi";

type CoachForm = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  branchId: string;
  role: CoachRole | "";
  bio: string;
};

type CoachEditForm = {
  email: string;
  phone: string;
  branchId: string;
  role: CoachRole | "";
  specialization: string;
  bio: string;
  isActive: "active" | "inactive";
};

const emptyCoachForm: CoachForm = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
  phone: "",
  branchId: "",
  role: "",
  bio: "",
};

const emptyCoachEditForm: CoachEditForm = {
  email: "",
  phone: "",
  branchId: "",
  role: "",
  specialization: "",
  bio: "",
  isActive: "active",
};

const coachRoles: { value: CoachRole; label: string }[] = [
  { value: "head_coach", label: "Head Coach" },
  { value: "assistant_coach", label: "Assistant Coach" },
  { value: "goalkeeping_coach", label: "Goalkeeping Coach" },
  { value: "fitness_coach", label: "Fitness Coach" },
  { value: "technical_coach", label: "Technical Coach" },
  { value: "tactical_coach", label: "Tactical Coach" },
  { value: "goalkeeping_assistant", label: "Goalkeeping Assistant" },
  { value: "performance_analyst", label: "Performance Analyst" },
  { value: "team_manager", label: "Team Manager" },
  { value: "physiotherapist", label: "Physiotherapist" },
  { value: "rehabilitation_coach", label: "Rehabilitation Coach" },
  { value: "scout", label: "Scout" },
  { value: "academy_director", label: "Academy Director" },
  { value: "youth_coach", label: "Youth Coach" },
  { value: "conditioning_coach", label: "Conditioning Coach" },
];

type ApiErrorDetails = {
  data?: {
    error?: {
      message?: string;
      details?: { message?: string }[];
    };
  };
};

const strongPasswordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;
function getApiErrorMessage(err: unknown, fallback: string) {
  const apiError = err as ApiErrorDetails;
  const detailMessages = apiError.data?.error?.details
    ?.map((detail) => detail.message)
    .filter(Boolean);

  return detailMessages?.length
    ? detailMessages.join(". ")
    : apiError.data?.error?.message ?? fallback;
}

const baseColumns: Column<CoachRow>[] = [
  {
    key: "name",
    header: "Coach",
    accessor: (row) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-accent/20 text-sm text-accent">
            {getInitials(row.full_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{row.full_name}</p>
          <p className="text-xs text-muted-foreground">{row.username ?? "No username"}</p>
        </div>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.full_name,
  },
  {
    key: "branch",
    header: "Branch",
    accessor: (row) => row.branch_name ?? <span className="text-muted-foreground">Not assigned</span>,
    sortable: true,
    sortValue: (row) => row.branch_name ?? "",
  },
  {
    key: "specialization",
    header: "Specialization",
    accessor: (row) => row.specialization ?? <span className="text-muted-foreground">None</span>,
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
];

export default function CoachesPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CoachForm>(emptyCoachForm);
  const [editingCoach, setEditingCoach] = useState<CoachRow | null>(null);
  const [editForm, setEditForm] = useState<CoachEditForm>(emptyCoachEditForm);
  const [editError, setEditError] = useState("");
  const [deleteCoachRow, setDeleteCoachRow] = useState<CoachRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [mfaCoach, setMfaCoach] = useState<CoachRow | null>(null);
  const [mfaSetup, setMfaSetup] = useState<Setup2FAResponse | null>(null);
  const [mfaDeviceName, setMfaDeviceName] = useState("Coach phone");
  const [mfaToken, setMfaToken] = useState("");
  const [mfaBackupCodes, setMfaBackupCodes] = useState<string[]>([]);
  const [mfaError, setMfaError] = useState("");
  const [mfaMessage, setMfaMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [registerUser, { isLoading: isRegistering }] = useRegisterUserMutation();
  const [createCoach, { isLoading: isCreatingCoach }] = useCreateCoachMutation();
  const [updateCoach, { isLoading: isUpdatingCoach }] = useUpdateCoachMutation();
  const [hardDeleteCoach, { isLoading: isDeletingCoach }] = useHardDeleteCoachMutation();
  const [setupCoachMfa, { isLoading: isSettingUpMfa }] = useSetupCoachMfaMutation();
  const [verifyCoachMfa, { isLoading: isVerifyingMfa }] = useVerifyCoachMfaMutation();
  const [regenerateCoachMfaBackupCodes, { isLoading: isRegeneratingCoachBackupCodes }] =
    useRegenerateCoachMfaBackupCodesMutation();
  const { data, isLoading, isError, refetch } = useGetCoachesQuery({ limit: 50 });
  const { data: branches } = useGetBranchesQuery();
  const isSaving = isRegistering || isCreatingCoach;

  const updateForm = (field: keyof CoachForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openEditCoach = (coach: CoachRow) => {
    setEditError("");
    setEditingCoach(coach);
    setEditForm({
      email: coach.email ?? "",
      phone: coach.phone ?? "",
      branchId: coach.branch_id ?? "",
      role: coach.role ?? "",
      specialization: coach.specialization ?? "",
      bio: coach.bio ?? "",
      isActive: coach.is_active === false ? "inactive" : "active",
    });
  };

  const handleUpdateCoach = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCoach) return;
    setEditError("");

    if (!editForm.email.trim() || !editForm.phone.trim() || !editForm.branchId || !editForm.role) {
      setEditError("Email, phone, branch, and role are required.");
      return;
    }

    try {
      await updateCoach({
        id: editingCoach.id,
        body: {
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          branchId: editForm.branchId,
          role: editForm.role as CoachRole,
          specialization: editForm.specialization.trim() || (editForm.role as CoachRole),
          bio: editForm.bio.trim() || null,
          isActive: editForm.isActive === "active",
        },
      }).unwrap();
      setEditingCoach(null);
    } catch (err) {
      setEditError(getApiErrorMessage(err, "Could not update coach."));
    }
  };

  const handleHardDeleteCoach = async () => {
    if (!deleteCoachRow) return;
    const expected = `delete coach forever ${deleteCoachRow.full_name}`;
    setDeleteError("");

    if (deleteConfirm.trim() !== expected) {
      setDeleteError(`Type "${expected}" to confirm permanent deletion.`);
      return;
    }

    try {
      await hardDeleteCoach(deleteCoachRow.id).unwrap();
      setDeleteCoachRow(null);
      setDeleteConfirm("");
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, "Could not permanently delete coach."));
    }
  };

  const handleToggleCoachStatus = async (coach: CoachRow) => {
    setActionError("");
    try {
      await updateCoach({
        id: coach.id,
        body: { isActive: coach.is_active === false },
      }).unwrap();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Could not update coach status."));
    }
  };

  const openCoachMfa = (coach: CoachRow) => {
    setMfaCoach(coach);
    setMfaSetup(null);
    setMfaToken("");
    setMfaBackupCodes([]);
    setMfaError("");
    setMfaMessage("");
    setMfaDeviceName(`${coach.full_name} phone`);
  };

  const handleSetupCoachMfa = async (resetExisting = false) => {
    if (!mfaCoach) return;
    setMfaError("");
    setMfaMessage("");
    setMfaBackupCodes([]);
    try {
      const result = await setupCoachMfa({
        coachId: mfaCoach.id,
        deviceName: mfaDeviceName.trim() || `${mfaCoach.full_name} phone`,
        resetExisting,
      }).unwrap();
      setMfaSetup(result);
      setMfaMessage(resetExisting ? "Coach MFA was reset. Scan the new QR code." : "Scan this QR code with the coach authenticator app.");
    } catch (err) {
      setMfaError(getApiErrorMessage(err, "Could not start coach MFA setup."));
    }
  };

  const handleVerifyCoachMfa = async () => {
    if (!mfaCoach || !mfaSetup?.deviceId) return;
    setMfaError("");
    setMfaMessage("");
    if (!/^\d{6}$/.test(mfaToken.trim())) {
      setMfaError("Enter the 6-digit code from the coach phone.");
      return;
    }
    try {
      const result = await verifyCoachMfa({
        coachId: mfaCoach.id,
        deviceId: mfaSetup.deviceId,
        token: mfaToken.trim(),
      }).unwrap();
      setMfaBackupCodes(result.backupCodes || []);
      setMfaMessage("Coach MFA is active now.");
      setMfaToken("");
      void refetch();
    } catch (err) {
      setMfaError(getApiErrorMessage(err, "Invalid MFA code."));
    }
  };

  const handleRegenerateCoachBackupCodes = async () => {
    if (!mfaCoach) return;
    setMfaError("");
    setMfaMessage("");
    try {
      const result = await regenerateCoachMfaBackupCodes({ coachId: mfaCoach.id }).unwrap();
      setMfaBackupCodes(result.backupCodes || []);
      setMfaMessage("New coach backup codes generated. Old coach backup codes are no longer valid.");
    } catch (err) {
      setMfaError(getApiErrorMessage(err, "Could not generate coach backup codes."));
    }
  };

  const handleCreateCoach = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const required = [form.firstName, form.lastName, form.username, form.email, form.password, form.phone, form.branchId, form.role];
    if (required.some((value) => !String(value).trim())) {
      setFormError("All fields are required except bio.");
      return;
    }

    if (!strongPasswordPattern.test(form.password)) {
      setFormError("Password must be at least 8 characters and include uppercase, number, and special character.");
      return;
    }

    try {
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;
      const user = await registerUser({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "coach",
        phone: form.phone.trim(),
        fullName,
      }).unwrap();

      await createCoach({
        userId: user.id,
        branchId: form.branchId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role as CoachRole,
        fullName,
        bio: form.bio.trim() || null,
      }).unwrap();

      setForm(emptyCoachForm);
      setOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Could not create coach account."));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Failed to load coaches.</p>
        <Button variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const coaches = data?.data ?? [];
  const deleteExpected = `delete coach forever ${deleteCoachRow?.full_name ?? ""}`;
  const columns: Column<CoachRow>[] = [
    ...baseColumns,
    {
      key: "actions",
      header: "Actions",
      className: "w-[220px]",
      accessor: (row) => (
        <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
          <Button
            type="button"
            size="sm"
            variant={row.is_active === false ? "default" : "outline"}
            className="gap-1.5"
            disabled={isUpdatingCoach}
            onClick={() => handleToggleCoachStatus(row)}
          >
            {row.is_active === false ? (
              <UserCheck className="h-3.5 w-3.5" />
            ) : (
              <UserX className="h-3.5 w-3.5" />
            )}
            {row.is_active === false ? "Activate" : "Deactivate"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => openCoachMfa(row)}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {row.totp_enabled ? "2FA On" : "Setup MFA"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => openEditCoach(row)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="gap-1.5"
            onClick={() => {
              setDeleteError("");
              setDeleteConfirm("");
              setDeleteCoachRow(row);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete forever
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Coaches (${data?.pagination?.total ?? coaches.length})`}
        description="Manage coach accounts, assignments, and performance."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Coaches" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => router.push("/admin/coaches/assign")}>
              Assign Coach
            </Button>
            <Button className="gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Coach
            </Button>
          </div>
        }
      />

      <DataTable
        data={coaches}
        columns={columns}
        searchable
        searchPlaceholder="Search coaches..."
        searchKey={(row) => `${row.full_name} ${row.username ?? ""} ${row.specialization ?? ""}`}
        onRowClick={(row) => router.push(`/admin/coaches/${row.id}`)}
      />
      {actionError && <p className="text-sm text-red-400">{actionError}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Coach</DialogTitle>
            <DialogDescription>Create the coach login account and activate the profile.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCoach} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coach-first-name">First name</Label>
                <Input
                  id="coach-first-name"
                  value={form.firstName}
                  onChange={(event) => updateForm("firstName", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach-last-name">Last name</Label>
                <Input
                  id="coach-last-name"
                  value={form.lastName}
                  onChange={(event) => updateForm("lastName", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach-username">Username</Label>
                <Input
                  id="coach-username"
                  value={form.username}
                  onChange={(event) => updateForm("username", event.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach-email">Email</Label>
                <Input
                  id="coach-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach-password">Password</Label>
                <Input
                  id="coach-password"
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(event) => updateForm("password", event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach-phone">Phone</Label>
                <Input
                  id="coach-phone"
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={form.branchId} onValueChange={(value) => updateForm("branchId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose branch..." />
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
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(value) => updateForm("role", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {coachRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="coach-bio">Bio</Label>
                <Input
                  id="coach-bio"
                  value={form.bio}
                  onChange={(event) => updateForm("bio", event.target.value)}
                />
              </div>
            </div>

            {formError && <p className="text-sm text-red-400">{formError}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Coach
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingCoach)} onOpenChange={(nextOpen) => !nextOpen && setEditingCoach(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Coach</DialogTitle>
            <DialogDescription>Update coach information. Name and join date are locked.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCoach} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-coach-name">Name</Label>
                <Input id="edit-coach-name" value={editingCoach?.full_name ?? ""} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-coach-joined">Joined</Label>
                <Input
                  id="edit-coach-joined"
                  value={editingCoach?.created_at ? new Date(editingCoach.created_at).toLocaleDateString() : ""}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-coach-email">Email</Label>
                <Input
                  id="edit-coach-email"
                  type="email"
                  value={editForm.email}
                  onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-coach-phone">Phone</Label>
                <Input
                  id="edit-coach-phone"
                  value={editForm.phone}
                  onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={editForm.branchId} onValueChange={(value) => setEditForm((current) => ({ ...current, branchId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose branch..." />
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
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm((current) => ({ ...current, role: value as CoachRole }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {coachRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.isActive} onValueChange={(value) => setEditForm((current) => ({ ...current, isActive: value as CoachEditForm["isActive"] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-coach-specialization">Specialization</Label>
                <Input
                  id="edit-coach-specialization"
                  value={editForm.specialization}
                  onChange={(event) => setEditForm((current) => ({ ...current, specialization: event.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-coach-bio">Bio</Label>
                <Input
                  id="edit-coach-bio"
                  value={editForm.bio}
                  onChange={(event) => setEditForm((current) => ({ ...current, bio: event.target.value }))}
                />
              </div>
            </div>

            {editError && <p className="text-sm text-red-400">{editError}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingCoach(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingCoach} className="gap-2">
                {isUpdatingCoach && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(mfaCoach)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setMfaCoach(null);
            setMfaSetup(null);
            setMfaToken("");
            setMfaBackupCodes([]);
            setMfaError("");
            setMfaMessage("");
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Coach MFA</DialogTitle>
            <DialogDescription>
              Add an authenticator device for {mfaCoach?.full_name ?? "this coach"}. The code must come from the coach device, not the admin device.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-lg border border-border/70 bg-card/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="coach-mfa-device-name">Device name</Label>
                  <Input
                    id="coach-mfa-device-name"
                    value={mfaDeviceName}
                    onChange={(event) => setMfaDeviceName(event.target.value)}
                    placeholder="Coach phone"
                  />
                </div>
                <Button
                  type="button"
                  className="gap-2"
                  disabled={isSettingUpMfa}
                  onClick={() => handleSetupCoachMfa(false)}
                >
                  {isSettingUpMfa ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {mfaCoach?.totp_enabled ? "Add Device" : "Start Setup"}
                </Button>
                {mfaCoach?.totp_enabled && (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isSettingUpMfa}
                    onClick={() => handleSetupCoachMfa(true)}
                  >
                    Reset MFA
                  </Button>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                The authenticator entry will show as Goalix Academy Coach on the coach phone.
              </p>
            </div>

            {mfaSetup && (
              <div className="grid gap-5 rounded-lg border border-border/70 bg-card/40 p-4 sm:grid-cols-[220px_1fr]">
                <div className="flex justify-center rounded-lg bg-white p-3">
                  <Image
                    src={mfaSetup.qrCode}
                    alt="Coach MFA QR code"
                    width={192}
                    height={192}
                    unoptimized
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Issuer</Label>
                    <Input value={mfaSetup.issuer ?? "Goalix Academy Coach"} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>Manual secret</Label>
                    <Input value={mfaSetup.secret} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coach-mfa-token">6-digit coach code</Label>
                    <Input
                      id="coach-mfa-token"
                      value={mfaToken}
                      onChange={(event) => setMfaToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                    />
                  </div>
                  <Button
                    type="button"
                    className="gap-2"
                    disabled={isVerifyingMfa || mfaToken.length !== 6}
                    onClick={handleVerifyCoachMfa}
                  >
                    {isVerifyingMfa && <Loader2 className="h-4 w-4 animate-spin" />}
                    Verify Coach Device
                  </Button>
                </div>
              </div>
            )}

            {mfaCoach?.totp_enabled && (
              <div className="rounded-lg border border-border/70 bg-card/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">Coach backup codes</p>
                    <p className="text-sm text-muted-foreground">
                      Generate replacement backup codes for this coach. Old coach codes will stop working.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    disabled={isRegeneratingCoachBackupCodes}
                    onClick={handleRegenerateCoachBackupCodes}
                  >
                    {isRegeneratingCoachBackupCodes ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    Generate Codes
                  </Button>
                </div>
              </div>
            )}

            {mfaBackupCodes.length > 0 && (
              <div className="rounded-lg border border-lime-400/30 bg-lime-400/10 p-4">
                <p className="font-medium text-lime-200">Backup codes</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {mfaBackupCodes.map((code) => (
                    <code key={code} className="rounded-md bg-background/70 px-3 py-2 text-sm text-foreground">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {mfaMessage && <p className="text-sm text-lime-300">{mfaMessage}</p>}
            {mfaError && <p className="text-sm text-red-400">{mfaError}</p>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteCoachRow)} onOpenChange={(nextOpen) => !nextOpen && setDeleteCoachRow(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>Delete Coach Forever</DialogTitle>
            <DialogDescription>
              This permanently removes the coach profile, assignments, access rules, and linked coach login account. Type <span className="font-semibold text-foreground">{deleteExpected}</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-coach-confirm">Confirmation</Label>
            <Input
              id="delete-coach-confirm"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder={deleteExpected}
            />
          </div>
          {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteCoachRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingCoach || deleteConfirm.trim() !== deleteExpected}
              onClick={handleHardDeleteCoach}
              className="gap-2"
            >
              {isDeletingCoach && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Forever
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
