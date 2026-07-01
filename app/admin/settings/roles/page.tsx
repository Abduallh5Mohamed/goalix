"use client";

import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type AdminRole,
  type AdminAccessUser,
  useAssignAdminRoleToUserMutation,
  useCreateAdminAccessUserMutation,
  useCreateAdminRoleMutation,
  useDeleteAdminRoleMutation,
  useGetAdminAccessControlQuery,
  useGetCurrentUserQuery,
  useRevokeAdminRoleFromUserMutation,
  useUpdateAdminRoleMutation,
} from "@/lib/store/api/adminApi";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  Save,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

type RoleDraft = {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
};

type RoleEdit = Partial<RoleDraft> & { permissionIds?: string[] };

type NewAccessUserDraft = {
  fullName: string;
  accountRole: "admin";
  email: string;
  phone: string;
  username: string;
  password: string;
  address: string;
  jobTitle: string;
  department: string;
  notes: string;
};

const emptyAccessUserDraft: NewAccessUserDraft = {
  fullName: "",
  accountRole: "admin",
  email: "",
  phone: "",
  username: "",
  password: "",
  address: "",
  jobTitle: "",
  department: "",
  notes: "",
};

const roleEditLockStorageKey = "goalix-admin-role-edit-locks";

const readStoredEditLocks = () => {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.localStorage.getItem(roleEditLockStorageKey);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set<string>(
      Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [],
    );
  } catch {
    return new Set<string>();
  }
};

const hiddenPortalRoleCodes = new Set([
  "coach",
  "head_coach",
  "assistant_coach",
  "player",
  "parent",
  "parent_guardian",
]);

const protectedRoleCodes = new Set([
  "super_admin",
  "academy_owner",
  ...hiddenPortalRoleCodes,
]);

const adminPortalPermissionCodes = new Set([
  "access_admin_dashboard",
  "admin.dashboard.access",
  "manage_users",
  "admin.user.create",
  "admin.user.update",
  "manage_teams",
  "admin.group.manage",
  "manage_coaches",
  "coach.read.branch",
  "coach.read.academy",
  "coach.create",
  "coach.update",
  "manage_players",
  "player.read.branch",
  "player.read.academy",
  "player.create",
  "player.update",
  "manage_schedules",
  "calendar.manage.academy",
  "manage_attendance",
  "attendance.view.branch",
  "attendance.view.academy",
  "attendance.export",
  "ranking.read.branch",
  "ranking.read.academy",
  "view_financial_reports",
  "payment.read.academy",
  "payment.export",
  "manage_subscriptions",
  "manage_payments",
  "manage_academy_settings",
  "admin.settings.update",
  "manage_roles",
  "manage_permissions",
  "admin.role.manage",
]);

const rolePermissionIds = (role: AdminRole | undefined) =>
  new Set(
    (role?.permissionAssignments ?? [])
      .filter((assignment) => !assignment.denied)
      .map((assignment) => assignment.permissionId),
  );

const toRoleCode = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[0-9]+/, "");

const editableCopyCode = (role: AdminRole) => {
  const suffix = Math.random().toString(36).slice(2, 7);
  return toRoleCode(`${role.code}_custom_${suffix}`).slice(0, 60);
};

const getApiErrorMessage = (err: unknown, fallback: string) => {
  if (
    typeof err === "object" &&
    err &&
    "data" in err &&
    typeof err.data === "object" &&
    err.data &&
    "error" in err.data &&
    typeof err.data.error === "object" &&
    err.data.error &&
    "message" in err.data.error
  ) {
    const message = String(err.data.error.message);
    const details =
      "details" in err.data.error && Array.isArray(err.data.error.details)
        ? err.data.error.details
        : [];
    const detailMessages = details
      .map((detail) => {
        if (
          typeof detail === "object" &&
          detail &&
          "message" in detail
        ) {
          const field =
            "field" in detail && detail.field
              ? `${String(detail.field)}: `
              : "";
          return `${field}${String(detail.message)}`;
        }
        return "";
      })
      .filter(Boolean);

    return detailMessages.length
      ? `${message}: ${detailMessages.join(" • ")}`
      : message;
  }

  return fallback;
};

const validatePassword = (password: string) => {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one digit.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character.";
  return "";
};

const validateUsername = (username: string) => {
  const value = username.trim();
  if (value.length < 3) return "Username must be at least 3 characters.";
  if (value.length > 60) return "Username must be 60 characters or less.";
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
    return "Username may only contain letters, numbers, dots, underscores, and hyphens.";
  }
  return "";
};

const displayUserName = (user: AdminAccessUser) =>
  user.fullName || user.email || user.username || user.phone || user.role;

export default function RolesPage() {
  const { data, isLoading, isError } = useGetAdminAccessControlQuery();
  const { data: currentUser } = useGetCurrentUserQuery();
  const [createRole, { isLoading: creating }] = useCreateAdminRoleMutation();
  const [createAccessUser, { isLoading: creatingUser }] =
    useCreateAdminAccessUserMutation();
  const [updateRole, { isLoading: saving }] = useUpdateAdminRoleMutation();
  const [deleteRole, { isLoading: deleting }] = useDeleteAdminRoleMutation();
  const [assignRole, { isLoading: assigning }] = useAssignAdminRoleToUserMutation();
  const [revokeRole, { isLoading: revoking }] = useRevokeAdminRoleFromUserMutation();

  const roles = useMemo(
    () =>
      (data?.roles ?? []).filter((role) => !hiddenPortalRoleCodes.has(role.code)),
    [data?.roles],
  );
  const users = useMemo(
    () => (data?.users ?? []).filter((user) => user.role === "admin"),
    [data?.users],
  );
  const permissionGroups = useMemo(
    () => data?.permissionGroups ?? [],
    [data?.permissionGroups],
  );
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [userSearch, setUserSearch] = useState("");
  const [newUser, setNewUser] =
    useState<NewAccessUserDraft>(emptyAccessUserDraft);
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0];
  const [editLockedRoleIds, setEditLockedRoleIds] = useState<Set<string>>(
    readStoredEditLocks,
  );
  const selectedRoleEditLocked = Boolean(
    selectedRole && editLockedRoleIds.has(selectedRole.id),
  );
  const roleIsCustom = Boolean(selectedRole && !selectedRole.isSystem);
  const editable = Boolean(roleIsCustom && !selectedRoleEditLocked);
  const [roleEdits, setRoleEdits] = useState<Record<string, RoleEdit>>({});
  const [newRole, setNewRole] = useState({ name: "", code: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedEdit = selectedRole ? roleEdits[selectedRole.id] : undefined;
  const draft: RoleDraft = selectedRole
    ? {
        name: selectedEdit?.name ?? selectedRole.name,
        code: selectedEdit?.code ?? selectedRole.code,
        description: selectedEdit?.description ?? selectedRole.description ?? "",
        isActive: selectedEdit?.isActive ?? selectedRole.isActive,
      }
    : { name: "", code: "", description: "", isActive: true };
  const selectedPermissionIds = useMemo(() => {
    if (!selectedRole) return new Set<string>();
    return new Set(
      selectedEdit?.permissionIds ?? Array.from(rolePermissionIds(selectedRole)),
    );
  }, [selectedEdit?.permissionIds, selectedRole]);

  const selectedPermissionCount = selectedPermissionIds.size;
  const selectedPermissionCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const permission of permissionGroups.flatMap((group) => group.permissions)) {
      if (selectedPermissionIds.has(permission.id)) codes.add(permission.code);
    }
    return codes;
  }, [permissionGroups, selectedPermissionIds]);
  const hasAdminPortalPermissions = useMemo(
    () =>
      Array.from(selectedPermissionCodes).some((code) =>
        adminPortalPermissionCodes.has(code),
      ),
    [selectedPermissionCodes],
  );
  const canAccessAdminDashboard = hasAdminPortalPermissions;
  const recommendedAccountRole: NewAccessUserDraft["accountRole"] = "admin";
  const accountRoleHelp =
    "Roles settings is for admin/staff access only. Coaches are assigned from /admin/coaches/assign, parents from /admin/parents, and players from /admin/players.";
  const isAccountRoleAllowed = useCallback((accountRole: NewAccessUserDraft["accountRole"]) => {
    return accountRole === "admin";
  }, []);
  const selectedRoleProtected = selectedRole
    ? protectedRoleCodes.has(selectedRole.code)
    : false;
  const selectedRoleCanAssignUsers = Boolean(selectedRole && !selectedRoleProtected);
  const selectedAccountRole = isAccountRoleAllowed(newUser.accountRole)
    ? newUser.accountRole
    : recommendedAccountRole;
  const newUserLoginPath = "/admin-login";

  const persistEditLocks = (ids: Set<string>) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(roleEditLockStorageKey, JSON.stringify(Array.from(ids)));
  };

  const totalPermissionCount = useMemo(
    () => permissionGroups.reduce((sum, group) => sum + group.permissions.length, 0),
    [permissionGroups],
  );
  const selectedRoleUserIds = useMemo(() => {
    if (!selectedRole) return new Set<string>();
    return new Set(
      users
        .filter((user) =>
          user.roleAssignments.some((assignment) => assignment.roleId === selectedRole.id),
        )
        .map((user) => user.id),
    );
  }, [selectedRole, users]);
  const filteredUsers = useMemo(() => {
    const needle = userSearch.trim().toLowerCase();
    const sorted = [...users].sort((a, b) => {
      const assignedDiff =
        Number(selectedRoleUserIds.has(b.id)) - Number(selectedRoleUserIds.has(a.id));
      if (assignedDiff) return assignedDiff;
      return displayUserName(a).localeCompare(displayUserName(b));
    });
    if (!needle) return sorted;
    return sorted.filter((user) =>
      [
        user.fullName,
        user.email,
        user.username,
        user.phone,
        user.role,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [selectedRoleUserIds, userSearch, users]);

  const setDraftValue = <K extends keyof RoleDraft>(key: K, value: RoleDraft[K]) => {
    if (!selectedRole) return;
    setRoleEdits((current) => ({
      ...current,
      [selectedRole.id]: {
        ...(current[selectedRole.id] ?? {}),
        [key]: value,
      },
    }));
  };

  const togglePermission = (permissionId: string) => {
    if (!editable || !selectedRole) return;
    const next = new Set(selectedPermissionIds);
    if (next.has(permissionId)) next.delete(permissionId);
    else next.add(permissionId);
    setRoleEdits((current) => ({
      ...current,
      [selectedRole.id]: {
        ...(current[selectedRole.id] ?? {}),
        permissionIds: Array.from(next),
      },
    }));
  };

  const handleToggleSelectedRoleEditLock = () => {
    if (!selectedRole || selectedRole.isSystem) return;
    setMessage("");
    setError("");

    setEditLockedRoleIds((current) => {
      const next = new Set(current);
      if (next.has(selectedRole.id)) {
        next.delete(selectedRole.id);
        setMessage("Role editing enabled.");
      } else {
        next.add(selectedRole.id);
        setRoleEdits((edits) => {
          const clean = { ...edits };
          delete clean[selectedRole.id];
          return clean;
        });
        setMessage("Role editing disabled.");
      }
      persistEditLocks(next);
      return next;
    });
  };

  const handleCreateRole = async () => {
    setMessage("");
    setError("");
    const code = toRoleCode(newRole.code || newRole.name);
    if (!newRole.name.trim() || !code) {
      setError("Role name and code are required.");
      return;
    }

    try {
      const created = await createRole({
        name: newRole.name.trim(),
        code,
        description: "",
        isActive: true,
        permissionIds: [],
      }).unwrap();
      setNewRole({ name: "", code: "" });
      setSelectedRoleId(created.id);
      setMessage("Role created.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create role."));
    }
  };

  const handleCreateEditableCopy = async () => {
    if (!selectedRole) return;
    setMessage("");
    setError("");

    try {
      const created = await createRole({
        name: `${selectedRole.name} Custom`,
        code: editableCopyCode(selectedRole),
        description: selectedRole.description || `Editable copy of ${selectedRole.name}.`,
        isActive: true,
        permissionIds: Array.from(rolePermissionIds(selectedRole)),
      }).unwrap();
      setSelectedRoleId(created.id);
      setMessage("Editable custom role created. You can now change permissions and save.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create editable copy."));
    }
  };

  const handleCreateAccessUser = async () => {
    setMessage("");
    setError("");

    if (!selectedRole) {
      setError("Select a role before adding a user.");
      return;
    }
    if (!selectedRoleCanAssignUsers) {
      setError(
        selectedRoleProtected
          ? "This is a protected system role and cannot be assigned from this screen."
          : "This role cannot be assigned from this screen.",
      );
      return;
    }
    if (!isAccountRoleAllowed(selectedAccountRole)) {
      setError(accountRoleHelp);
      return;
    }
    if (
      !newUser.fullName.trim() ||
      !newUser.phone.trim() ||
      !newUser.username.trim() ||
      !newUser.password
    ) {
      setError("Name, phone, username, and password are required.");
      return;
    }
    const usernameError = validateUsername(newUser.username);
    if (usernameError) {
      setError(usernameError);
      return;
    }
    const passwordError = validatePassword(newUser.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      const created = await createAccessUser({
        fullName: newUser.fullName.trim(),
        accountRole: selectedAccountRole,
        email: newUser.email.trim() || null,
        phone: newUser.phone.trim(),
        username: newUser.username.trim().toLowerCase(),
        password: newUser.password,
        address: newUser.address.trim() || null,
        jobTitle: newUser.jobTitle.trim() || null,
        department: newUser.department.trim() || null,
        notes: newUser.notes.trim() || null,
        roleId: selectedRole.id,
      }).unwrap();
      const createdUsername = created.user.username || newUser.username.trim().toLowerCase();
      const createdLoginPath = "/admin-login";
      setNewUser(emptyAccessUserDraft);
      setMessage(
        `User created. Login from ${createdLoginPath} using username "${createdUsername}".`,
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create user."));
    }
  };

  const handleSaveRole = async () => {
    if (!selectedRole || !editable) return;
    setMessage("");
    setError("");
    const code = toRoleCode(draft.code);
    if (!draft.name.trim() || !code) {
      setError("Role name and valid code are required.");
      return;
    }

    try {
      await updateRole({
        id: selectedRole.id,
        body: {
          name: draft.name.trim(),
          code,
          description: draft.description || null,
          isActive: draft.isActive,
          permissionIds: Array.from(selectedPermissionIds),
        },
      }).unwrap();
      setRoleEdits((current) => {
        const next = { ...current };
        delete next[selectedRole.id];
        return next;
      });
      setMessage("Role saved.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save role."));
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole || !editable) return;
    setMessage("");
    setError("");

    try {
      await deleteRole(selectedRole.id).unwrap();
      const nextRole = roles.find((role) => role.id !== selectedRole.id);
      setSelectedRoleId(nextRole?.id ?? "");
      setRoleEdits((current) => {
        const next = { ...current };
        delete next[selectedRole.id];
        return next;
      });
      setMessage("Role deleted.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not delete role."));
    }
  };

  const handleToggleUserRole = async (user: AdminAccessUser) => {
    if (!selectedRole || user.id === currentUser?.id) return;
    setMessage("");
    setError("");
    if (!selectedRoleCanAssignUsers) {
      setError(
        selectedRoleProtected
          ? "This is a protected system role and cannot be assigned from this screen."
          : "This role cannot be assigned from this screen.",
      );
      return;
    }
    const assigned = selectedRoleUserIds.has(user.id);
    const compatibleAccountRole =
      user.role !== "player" &&
      user.role !== "parent" &&
      isAccountRoleAllowed(user.role as NewAccessUserDraft["accountRole"]);
    if (!assigned && !compatibleAccountRole) {
      setError(
        `${displayUserName(user)} uses ${user.role} login, but ${accountRoleHelp}`,
      );
      return;
    }

    try {
      if (assigned) {
        await revokeRole({ roleId: selectedRole.id, userId: user.id }).unwrap();
        setMessage("Role removed from user.");
      } else {
        await assignRole({ roleId: selectedRole.id, userId: user.id }).unwrap();
        setMessage("Role assigned to user.");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update user role."));
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <Card className="border-destructive/40 bg-destructive/10">
        <CardContent className="flex items-center gap-3 p-5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          Access control data could not load.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Roles & Permissions"
        description="Manage academy roles and permission grants."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Settings" },
          { label: "Roles & Permissions" },
        ]}
      />

      <Card className="border-border/50 bg-card">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
          <div className="space-y-2">
            <Label>New Custom Role</Label>
            <Input
              value={newRole.name}
              onChange={(event) =>
                setNewRole((current) => ({
                  ...current,
                  name: event.target.value,
                  code: current.code || toRoleCode(event.target.value),
                }))
              }
              placeholder="Operations Manager"
            />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input
              value={newRole.code}
              onChange={(event) =>
                setNewRole((current) => ({
                  ...current,
                  code: toRoleCode(event.target.value),
                }))
              }
              placeholder="operations_manager"
            />
          </div>
          <Button
            type="button"
            className="self-end gap-1.5"
            onClick={handleCreateRole}
            disabled={creating}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Role
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => {
                  setSelectedRoleId(role.id);
                  setMessage("");
                  setError("");
                }}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedRole?.id === role.id
                    ? "border-lime-300/60 bg-lime-300/10"
                    : "border-border/60 bg-muted/10 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{role.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{role.code}</p>
                  </div>
                  <Badge variant={role.isSystem ? "secondary" : "info"}>
                    {role.isSystem ? "System" : "Custom"}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{role.userCount} users</span>
                  <span>{role.permissionAssignments.length} permissions</span>
                </div>
              </button>
            ))}
            {!roles.length && (
              <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                No roles found.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/50 bg-card">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-lime-300" />
                  {selectedRole?.name ?? "Select Role"}
                </CardTitle>
              </div>
              {selectedRole && (
                <div className="flex flex-wrap justify-end gap-2">
                  <Badge variant={selectedRole.isActive ? "success" : "secondary"}>
                    {selectedRole.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {roleIsCustom && (
                    <Badge variant={selectedRoleEditLocked ? "secondary" : "success"}>
                      {selectedRoleEditLocked ? "Editing Off" : "Editing On"}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {selectedPermissionCount}/{totalPermissionCount}
                  </Badge>
                </div>
              )}
            </CardHeader>
            {selectedRole && (
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={draft.name}
                      disabled={!editable}
                      onChange={(event) => setDraftValue("name", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input
                      value={draft.code}
                      disabled={!editable}
                      onChange={(event) => setDraftValue("code", toRoleCode(event.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={draft.description}
                    disabled={!editable}
                    onChange={(event) => setDraftValue("description", event.target.value)}
                  />
                </div>
                <label className="flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
                  <span>Role Active</span>
                  <input
                    type="checkbox"
                    disabled={!editable}
                    checked={draft.isActive}
                    onChange={(event) => setDraftValue("isActive", event.target.checked)}
                  />
                </label>
                {!editable && (
                  <div className="flex flex-col gap-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-300 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {selectedRoleEditLocked
                        ? "Editing is currently disabled for this custom role. Enable editing to change permissions."
                        : "System roles are read-only. Create an editable custom copy to add or remove permissions."}
                    </span>
                    {selectedRoleEditLocked ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleToggleSelectedRoleEditLock}
                        className="shrink-0 gap-1.5"
                      >
                        Enable Editing
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateEditableCopy}
                        disabled={creating}
                        className="shrink-0 gap-1.5"
                      >
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Make Editable Copy
                      </Button>
                    )}
                  </div>
                )}
                {editable && (
                  <div className="flex flex-col gap-3 rounded-lg border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-200 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      This custom role is editable. Disable editing when you want to protect it from accidental changes.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleToggleSelectedRoleEditLock}
                      className="shrink-0"
                    >
                      Disable Editing
                    </Button>
                  </div>
                )}
                {!canAccessAdminDashboard && (
                  <div className="rounded-lg border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-200">
                    This role does not include admin dashboard access. Users can still
                    hold it, but admin pages will remain hidden until this role grants
                    dashboard access.
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {selectedRole && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserPlus className="h-4 w-4 text-lime-300" />
                    Add User to This Role
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Create an admin/staff account and assign only{" "}
                    <span className="font-medium text-foreground">{selectedRole.name}</span>.
                    Coaches, parents, and players are managed from their dedicated pages.
                  </p>
                </div>
                <Badge variant="secondary">
                  Login: {newUserLoginPath}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedRoleCanAssignUsers && (
                  <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200">
                    {selectedRoleProtected
                      ? "This protected system role cannot be assigned here. Create a custom role or use a lower-privilege system role."
                      : "This role cannot be assigned from this screen."}
                  </div>
                )}
                {!isAccountRoleAllowed(newUser.accountRole) && (
                  <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200">
                    Login type was adjusted automatically. {accountRoleHelp}
                  </div>
                )}
                {message && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">
                    <CheckCircle className="h-4 w-4 shrink-0" /> {message}
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={newUser.fullName}
                      onChange={(event) =>
                        setNewUser((current) => ({
                          ...current,
                          fullName: event.target.value,
                        }))
                      }
                      placeholder="Ahmed Hassan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Login Type</Label>
                    <div className="flex h-10 items-center rounded-md border border-input bg-muted/20 px-3 text-sm">
                      Staff / Admin Login
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {accountRoleHelp}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Email (optional)</Label>
                    <Input
                      type="email"
                      value={newUser.email}
                      onChange={(event) =>
                        setNewUser((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="optional@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={newUser.phone}
                      onChange={(event) =>
                        setNewUser((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="+201000000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={newUser.username}
                      onChange={(event) =>
                        setNewUser((current) => ({
                          ...current,
                          username: event.target.value,
                        }))
                      }
                      placeholder="ahmed.hassan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(event) =>
                        setNewUser((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="At least 8 chars, uppercase, number, symbol"
                    />
                    <p className="text-xs text-muted-foreground">
                      Required: 8+ chars, uppercase letter, number, and symbol.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={newUser.address}
                      onChange={(event) =>
                        setNewUser((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      placeholder="City, street, area"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input
                      value={newUser.jobTitle}
                      onChange={(event) =>
                        setNewUser((current) => ({
                          ...current,
                          jobTitle: event.target.value,
                        }))
                      }
                      placeholder="Operations Manager"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Department</Label>
                    <Input
                      value={newUser.department}
                      onChange={(event) =>
                        setNewUser((current) => ({
                          ...current,
                          department: event.target.value,
                        }))
                      }
                      placeholder="Administration"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newUser.notes}
                      onChange={(event) =>
                        setNewUser((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Internal notes for this user"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  className="gap-1.5"
                  onClick={handleCreateAccessUser}
                  disabled={creatingUser || !selectedRoleCanAssignUsers}
                >
                  {creatingUser ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Add User & Assign Role
                </Button>
              </CardContent>
            </Card>
          )}

          {selectedRole && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4 text-lime-300" />
                    Assigned Users
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Grant or revoke this role for admin/staff users only. Coach,
                    player, and parent access is managed from their dedicated pages.
                  </p>
                </div>
                <Badge variant="outline">{selectedRoleUserIds.size} assigned</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Search users by name, email, username, or role"
                    className="pl-9"
                  />
                  <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {filteredUsers.map((user) => {
                    const assigned = selectedRoleUserIds.has(user.id);
                    const isSelf = user.id === currentUser?.id;
                    const compatibleAccountRole =
                      user.role === "admin" &&
                      isAccountRoleAllowed(user.role as NewAccessUserDraft["accountRole"]);
                    const disabled =
                      isSelf ||
                      assigning ||
                      revoking ||
                      !selectedRoleCanAssignUsers ||
                      (!assigned && !compatibleAccountRole);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleToggleUserRole(user)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition ${
                          assigned
                            ? "border-lime-300/50 bg-lime-300/10"
                            : "border-border/50 bg-muted/10 hover:bg-muted/30"
                        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {displayUserName(user)}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{user.email || user.username || user.phone || "No login label"}</span>
                            <Badge variant="secondary" className="rounded-md text-[10px]">
                              {user.role}
                            </Badge>
                            {isSelf && <span>self protected</span>}
                            {!assigned && !compatibleAccountRole && (
                              <span>
                                needs {recommendedAccountRole} login
                              </span>
                            )}
                          </span>
                        </span>
                        <Badge variant={assigned ? "success" : "outline"}>
                          {assigned ? "Assigned" : "Not assigned"}
                        </Badge>
                      </button>
                    );
                  })}
                  {!filteredUsers.length && (
                    <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                      No users match this search.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50 bg-card">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Permissions</CardTitle>
                {editable ? (
                  <Badge variant="success">Editable</Badge>
                ) : (
                  <Badge variant="secondary">
                    {selectedRoleEditLocked ? "Editing disabled" : "Read-only system role"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {permissionGroups.map((group) => (
                <div key={group.code} className="rounded-xl border border-border/50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{group.name}</p>
                      <p className="text-xs text-muted-foreground">{group.code}</p>
                    </div>
                    <Badge variant="outline">{group.permissions.length}</Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {group.permissions.map((permission) => (
                      <label
                        key={permission.id}
                        className={`flex min-h-[70px] items-start gap-3 rounded-lg border p-3 text-sm ${
                          selectedPermissionIds.has(permission.id)
                            ? "border-lime-300/50 bg-lime-300/10"
                            : "border-border/50 bg-muted/10"
                        } ${editable ? "cursor-pointer hover:border-lime-300/70 hover:bg-lime-300/15" : "cursor-not-allowed opacity-70"}`}
                        title={
                          editable
                            ? "Click to grant or remove this permission"
                            : selectedRoleEditLocked
                              ? "Editing is disabled for this custom role. Enable editing first."
                              : "System role permissions are read-only. Make an editable copy first."
                        }
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          disabled={!editable}
                          checked={selectedPermissionIds.has(permission.id)}
                          onChange={() => togglePermission(permission.id)}
                        />
                        <span className="min-w-0">
                          <span className="block font-medium">{permission.code}</span>
                          <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                            {permission.description || `${permission.resource}.${permission.action}`}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {!permissionGroups.length && (
                <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  No permissions found.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            {!editable && selectedRole && (
              <span className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-300">
                {selectedRoleEditLocked
                  ? "Save/Delete are disabled because editing is off for this custom role."
                  : "Save/Delete are disabled because this is a system role."}
              </span>
            )}
            <Button
              type="button"
              className="gap-1.5"
              onClick={handleSaveRole}
              disabled={!editable || saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Role
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-1.5"
              onClick={handleDeleteRole}
              disabled={!editable || deleting || Boolean(selectedRole?.userCount)}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Role
            </Button>
            {message && (
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <CheckCircle className="h-4 w-4" /> {message}
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" /> {error}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
