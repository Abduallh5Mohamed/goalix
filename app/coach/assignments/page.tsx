"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ClipboardCheck, Edit, Eye, Loader2, Plus, RefreshCw, Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateMyPlayerAssignmentMutation,
  useGetCoachDailyAiInputsQuery,
  useGetCoachGroupsQuery,
  useGetMyCoachAssignmentsQuery,
  useGetMyPlayerAssignmentsQuery,
  useGetPlayerAssignmentSubmissionsQuery,
  useSubmitCoachAssignmentMutation,
  useUpdateMyPlayerAssignmentMutation,
  useUploadCoachAssignmentFileMutation,
  type CoachAssignment,
  type CoachPlayerAssignment,
  type PlayerAssignmentSubmission,
  type UploadedAssignmentFile,
} from "@/lib/store/api/coachApi";
import { formatDate } from "@/lib/utils";

const fileAccept =
  "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp";

const adminStatusVariant: Record<CoachAssignment["status"], "secondary" | "info" | "warning" | "success" | "destructive"> = {
  assigned: "secondary",
  in_progress: "info",
  submitted: "warning",
  reviewed: "success",
  cancelled: "destructive",
};

const playerStatusVariant: Record<CoachPlayerAssignment["status"], "secondary" | "success" | "destructive"> = {
  active: "success",
  closed: "secondary",
  cancelled: "destructive",
};

const emptyPlayerForm = {
  assignmentId: "",
  title: "",
  description: "",
  openAt: "",
  dueAt: "",
  groupId: "",
  status: "active" as CoachPlayerAssignment["status"],
};

const dateTimeInputValue = (value: string | null | undefined) => {
  if (!value) return "";
  return String(value).slice(0, 16);
};

function SubmissionList({ submissions }: { submissions: PlayerAssignmentSubmission[] }) {
  if (!submissions.length) {
    return <p className="text-sm text-muted-foreground">No player submissions yet.</p>;
  }

  return (
    <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
      {submissions.map((submission) => (
        <div key={submission.id} className="rounded-md border border-border/50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{submission.playerName || "Player"}</p>
              <p className="text-xs text-muted-foreground">
                Submitted {formatDate(submission.submittedAt)}
              </p>
            </div>
            <Badge variant="success">{submission.files.length} file{submission.files.length === 1 ? "" : "s"}</Badge>
          </div>
          {submission.notes && (
            <p className="mt-2 text-sm text-muted-foreground">{submission.notes}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {submission.files.map((file) => (
              <a
                key={file.id}
                href={file.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border/60 px-2 py-1 text-xs font-medium hover:bg-muted/20"
              >
                {file.fileName} ({file.fileType})
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CoachAssignmentsPage() {
  const [adminSelected, setAdminSelected] = useState<CoachAssignment | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedAssignmentFile | null>(null);
  const [adminForm, setAdminForm] = useState({ coachNotes: "" });
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [playerForm, setPlayerForm] = useState(emptyPlayerForm);
  const [submissionsFor, setSubmissionsFor] = useState<CoachPlayerAssignment | null>(null);

  const adminAssignments = useGetMyCoachAssignmentsQuery({ limit: 100 });
  const playerAssignments = useGetMyPlayerAssignmentsQuery({ limit: 100 });
  const groupsQuery = useGetCoachGroupsQuery();
  const dailyAiQuery = useGetCoachDailyAiInputsQuery();
  const submissionsQuery = useGetPlayerAssignmentSubmissionsQuery(
    submissionsFor?.id ?? "",
    { skip: !submissionsFor },
  );
  const [submitAdminAssignment, { isLoading: isSubmittingAdmin, error: adminSubmitError }] =
    useSubmitCoachAssignmentMutation();
  const [uploadFile, { isLoading: isUploading, error: uploadError }] =
    useUploadCoachAssignmentFileMutation();
  const [createPlayerAssignment, { isLoading: isCreatingPlayer }] =
    useCreateMyPlayerAssignmentMutation();
  const [updatePlayerAssignment, { isLoading: isUpdatingPlayer }] =
    useUpdateMyPlayerAssignmentMutation();

  const groups = groupsQuery.data ?? [];
  const dailyRows = dailyAiQuery.data?.data ?? [];
  const dailyPlayers = new Set(dailyRows.map((row) => row.playerId)).size;
  const dailyAverage = dailyRows.length
    ? Math.round(dailyRows.reduce((sum, row) => sum + row.dailyAiScore, 0) / dailyRows.length)
    : 0;

  const adminColumns = useMemo<Column<CoachAssignment>[]>(() => [
    {
      key: "title",
      header: "Admin Assignment",
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
        <Badge variant={adminStatusVariant[row.status]}>
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
          variant={row.submissions.length ? "outline" : "default"}
          className="gap-1.5"
          onClick={(event) => {
            event.stopPropagation();
            setAdminSelected(row);
          }}
        >
          <Upload className="h-3.5 w-3.5" />
          {row.submissions.length ? "Resubmit" : "Submit"}
        </Button>
      ),
    },
  ], []);

  const playerColumns = useMemo<Column<CoachPlayerAssignment>[]>(() => [
    {
      key: "title",
      header: "Player Assignment",
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
      key: "groups",
      header: "Groups",
      accessor: (row) => row.groups.map((group) => group.name).join(", ") || "No group",
    },
    {
      key: "window",
      header: "Window",
      accessor: (row) => (
        <div className="text-xs">
          <p>Opens {row.openAt ? formatDate(row.openAt) : "now"}</p>
          <p className="text-muted-foreground">Due {row.dueAt ? formatDate(row.dueAt) : "no deadline"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => <Badge variant={playerStatusVariant[row.status]}>{row.status}</Badge>,
      sortable: true,
      sortValue: (row) => row.status,
    },
    {
      key: "submissions",
      header: "Submissions",
      accessor: (row) => (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={(event) => {
            event.stopPropagation();
            setSubmissionsFor(row);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
          {row.submissionCount}
        </Button>
      ),
    },
    {
      key: "edit",
      header: "",
      accessor: (row) => (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={(event) => {
            event.stopPropagation();
            setPlayerForm({
              assignmentId: row.id,
              title: row.title,
              description: row.description,
              openAt: dateTimeInputValue(row.openAt),
              dueAt: dateTimeInputValue(row.dueAt),
              groupId: row.groups[0]?.id || "",
              status: row.status,
            });
            setPlayerDialogOpen(true);
          }}
        >
          <Edit className="h-3.5 w-3.5" />
          Edit
        </Button>
      ),
    },
  ], []);

  const handleAdminFileUpload = async (file: File | undefined) => {
    if (!file) return;
    const uploaded = await uploadFile(file).unwrap();
    setUploadedFile(uploaded);
  };

  const handleAdminSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adminSelected || !uploadedFile) return;

    await submitAdminAssignment({
      assignmentId: adminSelected.id,
      coachNotes: adminForm.coachNotes.trim() || undefined,
      files: [uploadedFile],
    }).unwrap();

    setAdminForm({ coachNotes: "" });
    setUploadedFile(null);
    setAdminSelected(null);
  };

  const openCreatePlayerDialog = () => {
    setPlayerForm({
      ...emptyPlayerForm,
      groupId: groups[0]?.id || "",
    });
    setPlayerDialogOpen(true);
  };

  const handlePlayerAssignmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!playerForm.groupId) return;

    const body = {
      title: playerForm.title.trim(),
      description: playerForm.description.trim() || undefined,
      openAt: playerForm.openAt || undefined,
      dueAt: playerForm.dueAt || undefined,
      groupIds: [playerForm.groupId],
    };

    if (playerForm.assignmentId) {
      await updatePlayerAssignment({
        assignmentId: playerForm.assignmentId,
        body: { ...body, status: playerForm.status },
      }).unwrap();
    } else {
      await createPlayerAssignment(body).unwrap();
    }

    setPlayerDialogOpen(false);
    setPlayerForm(emptyPlayerForm);
  };

  const isInitialLoading =
    adminAssignments.isLoading ||
    playerAssignments.isLoading ||
    groupsQuery.isLoading;

  if (isInitialLoading) {
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
        description="Admin tasks for you, player assignments from you, and the locked daily AI input assignment."
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Assignments" },
        ]}
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              adminAssignments.refetch();
              playerAssignments.refetch();
              dailyAiQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Admin Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {adminAssignments.isError ? (
            <div className="flex items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <span>Failed to load admin assignments.</span>
              <Button variant="outline" size="sm" onClick={() => adminAssignments.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <DataTable
              data={adminAssignments.data?.data ?? []}
              columns={adminColumns}
              searchable
              searchPlaceholder="Search admin assignments..."
              searchKey={(row) => `${row.title} ${row.branchName ?? ""} ${row.groupName ?? ""}`}
              emptyTitle="No admin assignments"
              emptyDescription="Admin requests for coach submissions will appear here."
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Daily AI Score Assignment
            </CardTitle>
            <Badge variant="secondary">locked system daily</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-xs">Inputs</p>
                <p className="mt-1 font-semibold text-foreground">sleep_hours, trained_today, meals_count</p>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-xs">Output</p>
                <p className="mt-1 font-semibold text-foreground">daily_ai_score (0-100)</p>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-xs">This week</p>
                <p className="mt-1 font-semibold text-foreground">
                  {dailyRows.length} submissions / {dailyPlayers} players
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Badge variant="outline">Sleep ≥ 8h = 40</Badge>
              <Badge variant="outline">Sleep ≥ 7h = 30</Badge>
              <Badge variant="outline">Otherwise = 20</Badge>
              <Badge variant="outline">trained_today 1 = 40</Badge>
              <Badge variant="outline">trained_today 0 = 0</Badge>
              <Badge variant="outline">4+ meals = 20</Badge>
              <Badge variant="outline">3 meals = 15</Badge>
              <Badge variant="outline">less than 3 meals = 10</Badge>
            </div>
          </div>
          <div className="rounded-md border border-border/50 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Weekly submissions</p>
              <Badge variant={dailyRows.length ? "success" : "warning"}>
                avg {dailyAverage}
              </Badge>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {dailyRows.slice(0, 8).map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 rounded bg-muted/20 px-2 py-1.5 text-xs">
                  <span className="font-medium">{row.playerName}</span>
                  <span className="text-muted-foreground">
                    {formatDate(row.inputDate)} · score {row.dailyAiScore}
                  </span>
                </div>
              ))}
              {!dailyRows.length && (
                <p className="text-sm text-muted-foreground">No daily AI inputs submitted this week yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Player Assignments</CardTitle>
            <Button className="gap-2" onClick={openCreatePlayerDialog} disabled={!groups.length}>
              <Plus className="h-4 w-4" />
              New Assignment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {playerAssignments.isError ? (
            <div className="flex items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <span>Failed to load player assignments.</span>
              <Button variant="outline" size="sm" onClick={() => playerAssignments.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <DataTable
              data={playerAssignments.data?.data ?? []}
              columns={playerColumns}
              searchable
              searchPlaceholder="Search player assignments..."
              searchKey={(row) => `${row.title} ${row.description} ${row.groups.map((group) => group.name).join(" ")}`}
              emptyTitle="No player assignments"
              emptyDescription="Create assignments for your groups and track player submissions here."
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!adminSelected}
        onOpenChange={(open) => {
          if (!open) {
            setAdminSelected(null);
            setUploadedFile(null);
            setAdminForm({ coachNotes: "" });
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Submit Admin Assignment</DialogTitle>
            <DialogDescription>Upload PDF, Word, or image files requested by admin.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAdminSubmit}>
            <div className="space-y-2">
              <Label htmlFor="submission-file">Upload File</Label>
              <Input
                id="submission-file"
                type="file"
                accept={fileAccept}
                onChange={(event) => handleAdminFileUpload(event.target.files?.[0])}
                disabled={isUploading}
                required
              />
              {isUploading && <p className="text-xs text-muted-foreground">Uploading file...</p>}
              {uploadedFile && (
                <p className="text-xs text-emerald-400">
                  Uploaded {uploadedFile.fileName} ({uploadedFile.fileType})
                </p>
              )}
              {uploadError && (
                <p className="text-xs text-red-400">
                  Upload failed. Accepted files: PDF, DOC, DOCX, PNG, JPG, JPEG, WEBP.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="submission-notes">Notes</Label>
              <Textarea
                id="submission-notes"
                value={adminForm.coachNotes}
                onChange={(event) => setAdminForm({ coachNotes: event.target.value })}
              />
            </div>
            {adminSubmitError && <p className="text-sm text-red-400">Could not submit this assignment.</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdminSelected(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingAdmin || isUploading || !uploadedFile} className="gap-2">
                {isSubmittingAdmin && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={playerDialogOpen} onOpenChange={setPlayerDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{playerForm.assignmentId ? "Edit Player Assignment" : "New Player Assignment"}</DialogTitle>
            <DialogDescription>Player assignments accept PDF, Word, and image submissions.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handlePlayerAssignmentSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="player-assignment-title">Title</Label>
                <Input
                  id="player-assignment-title"
                  value={playerForm.title}
                  onChange={(event) => setPlayerForm((current) => ({ ...current, title: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Target Group</Label>
                <Select
                  value={playerForm.groupId}
                  onValueChange={(value) => setPlayerForm((current) => ({ ...current, groupId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="player-assignment-description">Description</Label>
              <Textarea
                id="player-assignment-description"
                value={playerForm.description}
                onChange={(event) => setPlayerForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="player-assignment-open">Open At</Label>
                <Input
                  id="player-assignment-open"
                  type="datetime-local"
                  value={playerForm.openAt}
                  onChange={(event) => setPlayerForm((current) => ({ ...current, openAt: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-assignment-due">Deadline</Label>
                <Input
                  id="player-assignment-due"
                  type="datetime-local"
                  value={playerForm.dueAt}
                  onChange={(event) => setPlayerForm((current) => ({ ...current, dueAt: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={playerForm.status}
                  onValueChange={(value) =>
                    setPlayerForm((current) => ({
                      ...current,
                      status: value as CoachPlayerAssignment["status"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPlayerDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={isCreatingPlayer || isUpdatingPlayer || !playerForm.title.trim() || !playerForm.groupId}
              >
                {(isCreatingPlayer || isUpdatingPlayer) && <Loader2 className="h-4 w-4 animate-spin" />}
                {playerForm.assignmentId ? "Save Changes" : "Create Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!submissionsFor}
        onOpenChange={(open) => {
          if (!open) setSubmissionsFor(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Player Submissions</DialogTitle>
            <DialogDescription>{submissionsFor?.title}</DialogDescription>
          </DialogHeader>
          {submissionsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading submissions...
            </div>
          ) : (
            <SubmissionList submissions={submissionsQuery.data ?? []} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
