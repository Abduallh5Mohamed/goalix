"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ClipboardCheck, FileUp, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
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
  useGetPlayerAssignmentsQuery,
  useSubmitDailyAiInputMutation,
  useSubmitPlayerAssignmentMutation,
  useUploadPlayerAssignmentFileMutation,
  type PlayerAssignment,
  type PlayerAssignmentUpload,
} from "@/lib/store/api/calendarApi";
import { formatDate } from "@/lib/utils";

const fileAccept =
  "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp";

const sleepOptions = Array.from({ length: 13 }, (_, value) => value);
const mealsOptions = Array.from({ length: 9 }, (_, value) => value);

export default function PlayerAssignmentsPage() {
  const assignmentsQuery = useGetPlayerAssignmentsQuery({ limit: 100 });
  const [submitDaily, { isLoading: isSubmittingDaily }] = useSubmitDailyAiInputMutation();
  const [uploadFile, { isLoading: isUploading, error: uploadError }] =
    useUploadPlayerAssignmentFileMutation();
  const [submitAssignment, { isLoading: isSubmittingAssignment, error: submitError }] =
    useSubmitPlayerAssignmentMutation();
  const [dailyForm, setDailyForm] = useState({
    sleepHours: "8",
    trainedToday: "1",
    mealsCount: "4",
  });
  const [selected, setSelected] = useState<PlayerAssignment | null>(null);
  const [uploaded, setUploaded] = useState<PlayerAssignmentUpload | null>(null);
  const [notes, setNotes] = useState("");

  const assignments = useMemo(
    () => assignmentsQuery.data?.data ?? [],
    [assignmentsQuery.data],
  );
  const dailyAssignment = assignments.find((assignment) => assignment.isSystemDaily);
  const coachTasks = assignments.filter((assignment) => !assignment.isSystemDaily);

  const handleDailySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitDaily({
      sleepHours: Number(dailyForm.sleepHours),
      trainedToday: Number(dailyForm.trainedToday) as 0 | 1,
      mealsCount: Number(dailyForm.mealsCount),
    }).unwrap();
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    const result = await uploadFile(file).unwrap();
    setUploaded(result);
  };

  const handleAssignmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !uploaded) return;

    await submitAssignment({
      assignmentId: selected.id,
      notes: notes.trim() || undefined,
      files: [uploaded],
    }).unwrap();

    setSelected(null);
    setUploaded(null);
    setNotes("");
  };

  if (assignmentsQuery.isLoading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="Submit coach assignments and your daily assignment."
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Assignments" },
        ]}
        actions={
          <Button variant="outline" className="gap-2" onClick={() => assignmentsQuery.refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {assignmentsQuery.isError && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="flex items-center justify-between gap-3 p-4 text-sm text-destructive">
            <span>Could not load assignments.</span>
            <Button variant="outline" size="sm" onClick={() => assignmentsQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Daily Assignment
            </CardTitle>
            <Badge variant="secondary">daily</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-4 sm:grid-cols-4" onSubmit={handleDailySubmit}>
            <div className="space-y-2">
              <Label>How many hours did you sleep today?</Label>
              <Select
                value={dailyForm.sleepHours}
                onValueChange={(value) => setDailyForm((current) => ({ ...current, sleepHours: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sleepOptions.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Did you train today?</Label>
              <Select
                value={dailyForm.trainedToday}
                onValueChange={(value) => setDailyForm((current) => ({ ...current, trainedToday: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="0">0</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>How many meals did you eat today?</Label>
              <Select
                value={dailyForm.mealsCount}
                onValueChange={(value) => setDailyForm((current) => ({ ...current, mealsCount: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mealsOptions.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full gap-2" disabled={isSubmittingDaily}>
                {isSubmittingDaily && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </div>
          </form>
          <div className="rounded-md border border-border/50 p-3 text-sm text-muted-foreground">
            {dailyAssignment?.submission ? (
              <p>{"Submitted today's answer."}</p>
            ) : (
              <p>{"You have not submitted today's answer yet."}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Coach Assignments</h2>
          <Badge variant="secondary">{coachTasks.length}</Badge>
        </div>
        <div className="grid gap-3">
          {coachTasks.map((assignment) => (
            <Card key={assignment.id} className="border-border/50 bg-card">
              <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{assignment.title}</h3>
                    <Badge variant={assignment.submission ? "success" : "warning"}>
                      {assignment.submission ? "submitted" : "pending"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {assignment.description || "No description"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {assignment.coachName && <span>Coach {assignment.coachName}</span>}
                    <span>Due {assignment.dueAt ? formatDate(assignment.dueAt) : "no deadline"}</span>
                    <span>{assignment.acceptedFileTypes.join(", ")}</span>
                  </div>
                </div>
                <Button
                  className="gap-2"
                  variant={assignment.submission ? "outline" : "default"}
                  onClick={() => {
                    setSelected(assignment);
                    setUploaded(null);
                    setNotes("");
                  }}
                >
                  <FileUp className="h-4 w-4" />
                  {assignment.submission ? "Resubmit" : "Submit"}
                </Button>
              </CardContent>
            </Card>
          ))}
          {!coachTasks.length && (
            <Card className="border-border/50 bg-card">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No coach assignments are open right now.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setUploaded(null);
            setNotes("");
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>{selected?.title}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAssignmentSubmit}>
            <div className="space-y-2">
              <Label htmlFor="assignment-file">Upload PDF, Word, or Image</Label>
              <Input
                id="assignment-file"
                type="file"
                accept={fileAccept}
                onChange={(event) => handleUpload(event.target.files?.[0])}
                disabled={isUploading}
                required
              />
              {isUploading && <p className="text-xs text-muted-foreground">Uploading file...</p>}
              {uploaded && (
                <p className="text-xs text-emerald-400">
                  Uploaded {uploaded.fileName} ({uploaded.fileType})
                </p>
              )}
              {uploadError && (
                <p className="text-xs text-red-400">
                  Upload failed. Accepted files: PDF, DOC, DOCX, PNG, JPG, JPEG, WEBP.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignment-notes">Notes</Label>
              <Textarea
                id="assignment-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            {submitError && <p className="text-sm text-red-400">Could not submit this assignment.</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2" disabled={isSubmittingAssignment || isUploading || !uploaded}>
                {isSubmittingAssignment && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
