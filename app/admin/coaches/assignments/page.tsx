"use client";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateCoachAssignmentMutation,
  useGetBranchesQuery,
  useGetCoachAssignmentsQuery,
  useGetCoachesQuery,
  useGetGroupsQuery,
  useUploadCoachAssignmentFileMutation,
  type AssignmentFileInput,
  type CoachAssignment,
} from "@/lib/store/api/adminApi";
import { formatDate } from "@/lib/utils";
import { FileImage, FileText, Loader2, Plus, RefreshCw } from "lucide-react";

const statusVariant: Record<CoachAssignment["status"], "secondary" | "info" | "warning" | "success" | "destructive"> = {
  assigned: "secondary",
  in_progress: "info",
  submitted: "warning",
  reviewed: "success",
  cancelled: "destructive",
};

export default function CoachAssignmentsPage() {
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [attachment, setAttachment] = useState<AssignmentFileInput | null>(null);
  const [form, setForm] = useState({
    coachId: "",
    branchId: "",
    groupId: "none",
    title: "",
    description: "",
    dueDate: "",
    adminNotes: "",
    fileType: "pdf" as "pdf" | "image",
    fileName: "",
    fileUrl: "",
    mimeType: "",
  });

  const { data: coachesRes } = useGetCoachesQuery({ limit: 100 });
  const { data: branches } = useGetBranchesQuery();
  const { data: groups } = useGetGroupsQuery({ branchId: form.branchId }, { skip: !form.branchId });
  const { data, isLoading, isError, refetch } = useGetCoachAssignmentsQuery({
    status: filterStatus === "all" ? undefined : filterStatus,
    limit: 100,
  });
  const [createAssignment, { isLoading: isCreating, error: createError }] = useCreateCoachAssignmentMutation();
  const [uploadAttachment, { isLoading: isUploading, error: uploadError }] =
    useUploadCoachAssignmentFileMutation();

  const coaches = coachesRes?.data ?? [];

  const columns = useMemo<Column<CoachAssignment>[]>(() => [
    {
      key: "title",
      header: "Assignment",
      accessor: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.description || "No description"}</p>
        </div>
      ),
      sortable: true,
      sortValue: (row) => row.title,
    },
    {
      key: "coach",
      header: "Coach",
      accessor: (row) => row.coachName ?? "Coach",
      sortable: true,
      sortValue: (row) => row.coachName ?? "",
    },
    {
      key: "scope",
      header: "Scope",
      accessor: (row) => (
        <span>{[row.branchName, row.groupName].filter(Boolean).join(" - ") || "General"}</span>
      ),
    },
    {
      key: "files",
      header: "Files",
      accessor: (row) => (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {row.attachments.length}
          </span>
          <span className="flex items-center gap-1">
            <FileImage className="h-3.5 w-3.5" />
            {row.submissions.length}
          </span>
        </div>
      ),
      sortable: true,
      sortValue: (row) => row.files.length,
    },
    {
      key: "due",
      header: "Due",
      accessor: (row) => row.dueDate ? formatDate(row.dueDate) : "No due date",
      sortable: true,
      sortValue: (row) => row.dueDate ?? "",
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => (
        <Badge variant={statusVariant[row.status]}>
          {row.status.replace("_", " ")}
        </Badge>
      ),
      sortable: true,
      sortValue: (row) => row.status,
    },
  ], []);

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      coachId: "",
      branchId: "",
      groupId: "none",
      title: "",
      description: "",
      dueDate: "",
      adminNotes: "",
      fileType: "pdf",
      fileName: "",
      fileUrl: "",
      mimeType: "",
    });
    setAttachment(null);
  };

  const handleAttachmentUpload = async (file: File | undefined) => {
    if (!file) return;
    const uploaded = await uploadAttachment(file).unwrap();
    setAttachment(uploaded);
    setForm((current) => ({
      ...current,
      fileType: uploaded.fileType,
      fileName: uploaded.fileName,
      fileUrl: uploaded.fileUrl,
      mimeType: uploaded.mimeType ?? "",
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await createAssignment({
      coachId: form.coachId,
      branchId: form.branchId || undefined,
      groupId: form.groupId === "none" ? undefined : form.groupId,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      dueDate: form.dueDate || undefined,
      adminNotes: form.adminNotes.trim() || undefined,
      attachments: attachment ? [attachment] : undefined,
    }).unwrap();

    resetForm();
    setOpen(false);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Coach Assignments"
        description="Send coach tasks and collect only PDF reports or image submissions."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Coaches", href: "/admin/coaches" },
          { label: "Assignments" },
        ]}
        actions={
          <Button className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New Assignment
          </Button>
        }
      />

      {isError ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <p className="text-muted-foreground">Failed to load assignments.</p>
          <Button variant="outline" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : (
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          searchable
          searchPlaceholder="Search assignments..."
          searchKey={(row) => `${row.title} ${row.coachName ?? ""} ${row.branchName ?? ""} ${row.groupName ?? ""}`}
          filters={
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          }
          emptyTitle="No assignments"
          emptyDescription="Create the first assignment for a coach."
        />
      )}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Coach Assignment</DialogTitle>
            <DialogDescription>Assignments accept PDF reports and image files only.</DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Coach</Label>
                <Select value={form.coachId} onValueChange={(value) => updateForm("coachId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select coach..." />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={form.branchId}
                  onValueChange={(value) => setForm((current) => ({ ...current, branchId: value, groupId: "none" }))}
                >
                  <SelectTrigger>
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
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Select value={form.groupId} onValueChange={(value) => updateForm("groupId", value)} disabled={!form.branchId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No group</SelectItem>
                    {(groups ?? []).map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} {group.birth_year ? `- ${group.birth_year}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-due">Due Date</Label>
                <Input
                  id="assignment-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => updateForm("dueDate", event.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="assignment-title">Title</Label>
                <Input
                  id="assignment-title"
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  placeholder="U14 progress report"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="assignment-description">Description</Label>
                <Textarea
                  id="assignment-description"
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="assignment-file">Brief File (optional)</Label>
                <Input
                  id="assignment-file"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(event) => handleAttachmentUpload(event.target.files?.[0])}
                  disabled={isUploading}
                />
                {isUploading && (
                  <p className="text-xs text-muted-foreground">Uploading file...</p>
                )}
                {attachment && (
                  <p className="text-xs text-emerald-400">
                    Uploaded {attachment.fileName} ({attachment.fileType})
                  </p>
                )}
                {uploadError && (
                  <p className="text-xs text-red-400">
                    Upload failed. Only PDF, PNG, JPG, JPEG, and WEBP files are accepted.
                  </p>
                )}
              </div>
            </div>
            {createError && <p className="text-sm text-red-400">Could not create assignment. Check the coach, branch, and file type.</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !form.coachId || !form.title.trim()} className="gap-2">
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Assignment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
