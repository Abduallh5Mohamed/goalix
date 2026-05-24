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
  useGetMyCoachAssignmentsQuery,
  useSubmitCoachAssignmentMutation,
  useUploadCoachAssignmentFileMutation,
  type UploadedAssignmentFile,
  type CoachAssignment,
} from "@/lib/store/api/coachApi";
import { formatDate } from "@/lib/utils";
import { Loader2, RefreshCw, Upload } from "lucide-react";

const statusVariant: Record<CoachAssignment["status"], "secondary" | "info" | "warning" | "success" | "destructive"> = {
  assigned: "secondary",
  in_progress: "info",
  submitted: "warning",
  reviewed: "success",
  cancelled: "destructive",
};

export default function CoachAssignmentsPage() {
  const [selected, setSelected] = useState<CoachAssignment | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedAssignmentFile | null>(null);
  const [form, setForm] = useState({
    coachNotes: "",
  });
  const { data, isLoading, isError, refetch } = useGetMyCoachAssignmentsQuery({ limit: 100 });
  const [submitAssignment, { isLoading: isSubmitting, error }] = useSubmitCoachAssignmentMutation();
  const [uploadFile, { isLoading: isUploading, error: uploadError }] =
    useUploadCoachAssignmentFileMutation();

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
      key: "scope",
      header: "Scope",
      accessor: (row) => [row.branchName, row.groupName].filter(Boolean).join(" - ") || "General",
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
    {
      key: "actions",
      header: "",
      accessor: (row) => (
        <Button
          size="sm"
          variant={row.status === "submitted" || row.status === "reviewed" ? "outline" : "default"}
          className="gap-1.5"
          onClick={(event) => {
            event.stopPropagation();
            setSelected(row);
          }}
        >
          <Upload className="h-3.5 w-3.5" />
          {row.submissions.length ? "Resubmit" : "Submit"}
        </Button>
      ),
    },
  ], []);

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    const uploaded = await uploadFile(file).unwrap();
    setUploadedFile(uploaded);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !uploadedFile) return;

    await submitAssignment({
      assignmentId: selected.id,
      coachNotes: form.coachNotes.trim() || undefined,
      files: [uploadedFile],
    }).unwrap();

    setForm({ coachNotes: "" });
    setUploadedFile(null);
    setSelected(null);
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
        title="Assignments"
        description="Receive admin tasks and upload PDF reports or images."
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Assignments" },
        ]}
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
          searchKey={(row) => `${row.title} ${row.branchName ?? ""} ${row.groupName ?? ""}`}
          emptyTitle="No assignments"
          emptyDescription="New coach assignments from admin will appear here."
        />
      )}

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setUploadedFile(null);
            setForm({ coachNotes: "" });
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>Only PDF reports and image files are accepted.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="submission-file">Upload File</Label>
              <Input
                id="submission-file"
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={(event) => handleFileUpload(event.target.files?.[0])}
                disabled={isUploading}
                required
              />
              {isUploading && (
                <p className="text-xs text-muted-foreground">Uploading file...</p>
              )}
              {uploadedFile && (
                <p className="text-xs text-emerald-400">
                  Uploaded {uploadedFile.fileName} ({uploadedFile.fileType})
                </p>
              )}
              {uploadError && (
                <p className="text-xs text-red-400">
                  Upload failed. Only PDF, PNG, JPG, JPEG, and WEBP files are accepted.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="submission-notes">Notes</Label>
              <Textarea
                id="submission-notes"
                value={form.coachNotes}
                onChange={(event) => updateForm("coachNotes", event.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-400">Could not submit this assignment.</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploading || !uploadedFile} className="gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
