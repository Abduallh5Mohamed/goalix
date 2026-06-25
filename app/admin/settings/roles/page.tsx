"use client";

import { useMemo, useState } from "react";
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
  useCreateAdminRoleMutation,
  useDeleteAdminRoleMutation,
  useGetAdminAccessControlQuery,
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
} from "lucide-react";

type RoleDraft = {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
};

type RoleEdit = Partial<RoleDraft> & { permissionIds?: string[] };

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
    return String(err.data.error.message);
  }

  return fallback;
};

export default function RolesPage() {
  const { data, isLoading, isError } = useGetAdminAccessControlQuery();
  const [createRole, { isLoading: creating }] = useCreateAdminRoleMutation();
  const [updateRole, { isLoading: saving }] = useUpdateAdminRoleMutation();
  const [deleteRole, { isLoading: deleting }] = useDeleteAdminRoleMutation();

  const roles = useMemo(() => data?.roles ?? [], [data?.roles]);
  const permissionGroups = useMemo(
    () => data?.permissionGroups ?? [],
    [data?.permissionGroups],
  );
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0];
  const editable = Boolean(selectedRole && !selectedRole.isSystem);
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
  const totalPermissionCount = useMemo(
    () => permissionGroups.reduce((sum, group) => sum + group.permissions.length, 0),
    [permissionGroups],
  );

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
                  <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-300">
                    System roles are read-only. Create a custom academy role for editable access control.
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">Permissions</CardTitle>
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
                        } ${editable ? "cursor-pointer" : "cursor-default opacity-80"}`}
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
