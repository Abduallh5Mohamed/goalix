"use client";

import { useState } from "react";
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
import { AlertTriangle, Loader2, Pencil, Plus, RefreshCw, Star, Trash2 } from "lucide-react";
import {
  useCreateCoachMutation,
  useGetCoachesQuery,
  useGetBranchesQuery,
  useHardDeleteCoachMutation,
  useRegisterUserMutation,
  useUpdateCoachMutation,
  type CoachRole,
  type CoachRow,
} from "@/lib/store/api/adminApi";
import { getApiBaseUrl } from "@/lib/api/baseUrl";

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
  image: string;
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
  image: "",
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
const API_BASE = getApiBaseUrl();

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
  {
    key: "rating",
    header: "Rating",
    accessor: (row) => (
      <div className="flex items-center gap-1.5">
        <Star className="h-3.5 w-3.5 text-amber-400" />
        <span className="font-semibold">{row.rating ?? "-"}</span>
        {row.rating != null && <span className="text-xs text-muted-foreground">/5</span>}
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.rating ?? 0,
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [registerUser, { isLoading: isRegistering }] = useRegisterUserMutation();
  const [createCoach, { isLoading: isCreatingCoach }] = useCreateCoachMutation();
  const [updateCoach, { isLoading: isUpdatingCoach }] = useUpdateCoachMutation();
  const [hardDeleteCoach, { isLoading: isDeletingCoach }] = useHardDeleteCoachMutation();
  const { data, isLoading, isError, refetch } = useGetCoachesQuery({ limit: 50 });
  const { data: branches } = useGetBranchesQuery();
  const isSaving = isRegistering || isCreatingCoach || isUploadingImage;

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
      image: coach.image ?? coach.photo_url ?? "",
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
          image: editForm.image.trim() || null,
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
      let uploadedImage: { image: string } | null = null;
      if (imageFile) {
        setIsUploadingImage(true);
        const body = new FormData();
        body.append("image", imageFile);
        const response = await fetch(`${API_BASE}/api/v1/coaches/images`, {
          method: "POST",
          body,
          credentials: "include",
        });
        const result = await response.json();
        if (!response.ok) {
          throw result;
        }
        uploadedImage = result.data;
      }
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
        image: uploadedImage?.image ?? null,
        fullName,
        bio: form.bio.trim() || null,
      }).unwrap();

      setForm(emptyCoachForm);
      setImageFile(null);
      setOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Could not create coach account."));
    } finally {
      setIsUploadingImage(false);
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
              <div className="space-y-2">
                <Label htmlFor="coach-image">Image</Label>
                <Input
                  id="coach-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                />
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
                <Label htmlFor="edit-coach-image">Image URL</Label>
                <Input
                  id="edit-coach-image"
                  value={editForm.image}
                  onChange={(event) => setEditForm((current) => ({ ...current, image: event.target.value }))}
                  placeholder="https://..."
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
