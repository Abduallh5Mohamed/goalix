"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Edit,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
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
  useDeleteMyPlayerAssignmentMutation,
  useGetCoachDailyAiInputsQuery,
  useGetCoachGroupsQuery,
  useGetMyCoachAssignmentsQuery,
  useGetMyPlayerAssignmentsQuery,
  useGetPlayerAssignmentSubmissionsQuery,
  useReviewPlayerAssignmentSubmissionMutation,
  useSubmitCoachAssignmentMutation,
  useUpdateMyPlayerAssignmentMutation,
  useUploadCoachAssignmentFileMutation,
  type CoachAssignment,
  type CoachPlayerAssignment,
  type PlayerAssignmentSubmission,
  type UploadedAssignmentFile,
} from "@/lib/store/api/coachApi";
import { formatDate, formatDateTime } from "@/lib/utils";

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

type PlayerTargetMode = "group" | "birthYear";

const emptyPlayerForm = {
  assignmentId: "",
  title: "",
  description: "",
  openAt: "",
  dueAt: "",
  targetMode: "group" as PlayerTargetMode,
  groupId: "",
  isOpenLocked: false,
  status: "active" as CoachPlayerAssignment["status"],
};

const allGroupsValue = "__all_available_groups__";
const allBirthYearsValue = "__all_available_birthdays__";

const pad2 = (value: number) => String(value).padStart(2, "0");

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const roundUpToStep = (date: Date, stepMinutes = 5) => {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const remainder = minutes % stepMinutes;
  if (remainder || rounded.getSeconds() || rounded.getMilliseconds()) {
    rounded.setMinutes(minutes + (stepMinutes - remainder));
  }
  rounded.setSeconds(0, 0);
  return rounded;
};

const toDateTimeLocalValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const dateTimeInputValue = (value: string | null | undefined) => {
  if (!value) return "";
  const raw = String(value).trim();
  const localValue = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d{1,3})?)?$/);
  if (localValue) return `${localValue[1]}T${localValue[2]}`;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : toDateTimeLocalValue(date);
};

const toOffsetDateTime = (value: string) => {
  const parts = parseLocalDateTimeParts(value);
  if (!parts) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  return `${parts.dateKey}T${parts.time}:00${sign}${pad2(Math.floor(absoluteOffset / 60))}:${pad2(absoluteOffset % 60)}`;
};

const dateTimeFromNow = (hours = 0) => {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000);
  return toDateTimeLocalValue(hours ? roundUpToStep(date) : date);
};

const dateTimeFromValue = (value: string, hours: number) => {
  const base = value ? new Date(value) : new Date();
  const timestamp = Number.isNaN(base.getTime()) ? Date.now() : base.getTime();
  return toDateTimeLocalValue(roundUpToStep(new Date(timestamp + hours * 60 * 60 * 1000)));
};

const laterDateTime = (first: string, second: string) => {
  if (!first) return second;
  if (!second) return first;
  return first > second ? first : second;
};

const TIME_OPTIONS = Array.from({ length: 24 * 12 }, (_, index) => {
  const hour = Math.floor(index / 12);
  const minute = (index % 12) * 5;
  const value = `${pad2(hour)}:${pad2(minute)}`;
  const hour12 = hour % 12 || 12;
  const period = hour < 12 ? "AM" : "PM";
  return { value, label: `${hour12}:${pad2(minute)} ${period}` };
});

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parseLocalDateTimeParts = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3]),
    dateKey: `${match[1]}-${match[2]}-${match[3]}`,
    time: match[4],
  };
};

const minDateKey = (minDateTime?: string) => minDateTime?.slice(0, 10) || "";
const minTimeValue = (minDateTime?: string) => minDateTime?.slice(11, 16) || "";

const firstSelectableTime = (dateKey: string, minDateTime?: string) => {
  if (!minDateTime || dateKey !== minDateKey(minDateTime)) {
    return TIME_OPTIONS[0].value;
  }
  return TIME_OPTIONS.find((option) => option.value >= minTimeValue(minDateTime))?.value || null;
};

const isBeforeMinDateTime = (dateKey: string, time: string, minDateTime?: string) =>
  Boolean(minDateTime && `${dateKey}T${time}` < minDateTime);

const formatDateTimeDisplay = (value: string) => {
  const parts = parseLocalDateTimeParts(value);
  if (!parts) return "Select date and time";
  const time = TIME_OPTIONS.find((option) => option.value === parts.time)?.label || parts.time;
  return `${monthNames[parts.monthIndex]} ${parts.day}, ${parts.year} • ${time}`;
};

const formatAssignmentDateTime = (value: string | null | undefined, fallback: string) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : formatDateTime(parsed);
};

const isAssignmentOpenNow = (assignment: CoachPlayerAssignment) => {
  if (assignment.status !== "active" || !assignment.openAt) return false;
  const now = Date.now();
  const openAt = new Date(assignment.openAt).getTime();
  const dueAt = assignment.dueAt ? new Date(assignment.dueAt).getTime() : Number.POSITIVE_INFINITY;
  return Number.isFinite(openAt) && openAt <= now && now <= dueAt;
};

const uniqueIds = (ids: string[]) => [...new Set(ids)];

function AssignmentDateTimePicker({
  id,
  label,
  value,
  onChange,
  minDateTime,
  quickActions,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDateTime?: string;
  quickActions: Array<{ label: string; value: string }>;
}) {
  const fallbackDateTime = value || minDateTime || dateTimeFromNow();
  const fallbackParts =
    parseLocalDateTimeParts(dateTimeInputValue(fallbackDateTime)) ??
    parseLocalDateTimeParts(dateTimeFromNow());
  const selectedParts = value ? parseLocalDateTimeParts(value) : null;
  const selectedDateKey = selectedParts?.dateKey || "";
  const selectedTime = selectedParts?.time || "";
  const selectedYearForOptions = selectedParts?.year ?? new Date().getFullYear();
  const [viewMonth, setViewMonth] = useState(
    () => new Date(fallbackParts?.year ?? new Date().getFullYear(), fallbackParts?.monthIndex ?? new Date().getMonth(), 1),
  );

  const nowYear = new Date().getFullYear();
  const startYear = Math.min(nowYear, selectedYearForOptions) - (minDateTime ? 0 : 2);
  const endYear = Math.max(nowYear + 8, selectedYearForOptions + 2);
  const years = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);

  const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const isDateDisabled = (day: number) => {
    const dateKey = `${viewMonth.getFullYear()}-${pad2(viewMonth.getMonth() + 1)}-${pad2(day)}`;
    const minimumDateKey = minDateKey(minDateTime);
    return Boolean(
      minimumDateKey &&
        (dateKey < minimumDateKey || (dateKey === minimumDateKey && !firstSelectableTime(dateKey, minDateTime))),
    );
  };

  const selectDate = (day: number) => {
    if (isDateDisabled(day)) return;
    const dateKey = `${viewMonth.getFullYear()}-${pad2(viewMonth.getMonth() + 1)}-${pad2(day)}`;
    const safeTime = isBeforeMinDateTime(dateKey, selectedTime, minDateTime)
      ? firstSelectableTime(dateKey, minDateTime)
      : selectedTime || firstSelectableTime(dateKey, minDateTime);
    if (safeTime) onChange(`${dateKey}T${safeTime}`);
  };

  const selectTime = (time: string) => {
    const dateKey = selectedDateKey || minDateKey(minDateTime) || localDateKey(new Date());
    if (isBeforeMinDateTime(dateKey, time, minDateTime)) return;
    onChange(`${dateKey}T${time}`);
  };

  return (
    <div className="space-y-3 rounded-lg border border-cyan-400/20 bg-slate-950/70 p-3 shadow-[0_18px_60px_rgba(8,47,73,0.25)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label htmlFor={id} className="text-slate-200">
            {label}
          </Label>
          <p id={id} className="mt-1 text-xs font-medium text-cyan-100">
            {formatDateTimeDisplay(value)}
          </p>
        </div>
        <CalendarDays className="h-5 w-5 text-cyan-300" />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-9 shrink-0 p-0"
          onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Select
          value={String(viewMonth.getMonth())}
          onValueChange={(month) => setViewMonth((current) => new Date(current.getFullYear(), Number(month), 1))}
        >
          <SelectTrigger className="h-9 border-cyan-400/20 bg-white/[0.04]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthNames.map((month, index) => (
              <SelectItem key={month} value={String(index)}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(viewMonth.getFullYear())}
          onValueChange={(year) => setViewMonth((current) => new Date(Number(year), current.getMonth(), 1))}
        >
          <SelectTrigger className="h-9 w-24 border-cyan-400/20 bg-white/[0.04]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-9 shrink-0 p-0"
          onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-500">
        {weekDays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarCells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} className="aspect-square" />;
          const dateKey = `${viewMonth.getFullYear()}-${pad2(viewMonth.getMonth() + 1)}-${pad2(day)}`;
          const isSelected = dateKey === selectedDateKey;
          const disabled = isDateDisabled(day);
          return (
            <button
              key={dateKey}
              type="button"
              disabled={disabled}
              onClick={() => selectDate(day)}
              className={[
                "aspect-square rounded-md border text-sm font-semibold transition",
                isSelected
                  ? "border-cyan-300 bg-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.35)]"
                  : "border-white/5 bg-white/[0.035] text-slate-200 hover:border-cyan-400/50 hover:bg-cyan-400/10",
                disabled ? "cursor-not-allowed opacity-30 hover:border-white/5 hover:bg-white/[0.035]" : "",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>

      <Select value={selectedTime} onValueChange={selectTime} disabled={!selectedDateKey && !minDateTime}>
        <SelectTrigger className="border-cyan-400/20 bg-white/[0.04]">
          <SelectValue placeholder="Select time" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {TIME_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={isBeforeMinDateTime(selectedDateKey || minDateKey(minDateTime), option.value, minDateTime)}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-3 gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => onChange(action.value)}
          >
            {action.label}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => onChange("")}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

const submissionReviewVariant: Record<PlayerAssignmentSubmission["reviewStatus"], "info" | "success" | "destructive"> = {
  pending: "info",
  approved: "success",
  rejected: "destructive",
};

function SubmissionReviewCard({
  submission,
  onRequestReview,
  isReviewing,
}: {
  submission: PlayerAssignmentSubmission;
  onRequestReview: (submission: PlayerAssignmentSubmission, status: "approved" | "rejected", comment: string) => void;
  isReviewing: boolean;
}) {
  const [comment, setComment] = useState(submission.coachComment || "");
  const isPending = (submission.reviewStatus || "pending") === "pending";

  return (
    <div className="rounded-md border border-border/50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{submission.playerName || "Player"}</p>
            <Badge variant={submissionReviewVariant[submission.reviewStatus || "pending"]}>
              {(submission.reviewStatus || "pending").replace("_", " ")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Submitted {formatDate(submission.submittedAt)}
          </p>
          {submission.reviewedAt && (
            <p className="text-xs text-muted-foreground">
              Reviewed {formatDate(submission.reviewedAt)}
            </p>
          )}
        </div>
        <Badge variant="secondary">
          {submission.files.length} file{submission.files.length === 1 ? "" : "s"}
        </Badge>
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
      <div className="mt-3 space-y-2">
        <Label htmlFor={`submission-comment-${submission.id}`}>Coach Comment</Label>
        <Textarea
          id={`submission-comment-${submission.id}`}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Write feedback for the player..."
        />
      </div>
      {isPending && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
            disabled={isReviewing}
            onClick={() => onRequestReview(submission, "approved", comment)}
          >
            <CheckCircle2 className="h-4 w-4" />
            Accept
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200"
            disabled={isReviewing}
            onClick={() => onRequestReview(submission, "rejected", comment)}
          >
            <XCircle className="h-4 w-4" />
            Needs Redo
          </Button>
        </div>
      )}
    </div>
  );
}

function SubmissionList({
  submissions,
  onRequestReview,
  isReviewing,
}: {
  submissions: PlayerAssignmentSubmission[];
  onRequestReview: (submission: PlayerAssignmentSubmission, status: "approved" | "rejected", comment: string) => void;
  isReviewing: boolean;
}) {
  if (!submissions.length) {
    return <p className="text-sm text-muted-foreground">No player submissions yet.</p>;
  }

  return (
    <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
      {submissions.map((submission) => (
        <SubmissionReviewCard
          key={submission.id}
          submission={submission}
          onRequestReview={onRequestReview}
          isReviewing={isReviewing}
        />
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
  const [playerFormError, setPlayerFormError] = useState("");
  const [deletePlayerAssignmentTarget, setDeletePlayerAssignmentTarget] = useState<CoachPlayerAssignment | null>(null);
  const [submissionsFor, setSubmissionsFor] = useState<CoachPlayerAssignment | null>(null);
  const [pendingSubmissionReview, setPendingSubmissionReview] = useState<{
    submission: PlayerAssignmentSubmission;
    status: "approved" | "rejected";
    comment: string;
  } | null>(null);

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
  const [deletePlayerAssignment, { isLoading: isDeletingPlayerAssignment }] =
    useDeleteMyPlayerAssignmentMutation();
  const [reviewPlayerSubmission, { isLoading: isReviewingPlayerSubmission }] =
    useReviewPlayerAssignmentSubmissionMutation();

  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const birthYearTargets = useMemo(() => {
    const byId = new Map<string, { id: string; label: string; groupIds: string[] }>();
    groups.forEach((group) => {
      group.birthYears.forEach((birthYear) => {
        const label = birthYear.label || `${birthYear.fromYear}-${birthYear.toYear}`;
        const current = byId.get(birthYear.id) || { id: birthYear.id, label, groupIds: [] };
        current.groupIds.push(group.id);
        byId.set(birthYear.id, current);
      });
    });
    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [groups]);
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
          <p>Opens {formatAssignmentDateTime(row.openAt, "now")}</p>
          <p className="text-muted-foreground">Due {formatAssignmentDateTime(row.dueAt, "no deadline")}</p>
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
      key: "actions",
      header: "",
      accessor: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={(event) => {
              event.stopPropagation();
              setPlayerFormError("");
              const assignedGroupIds = new Set(row.groups.map((group) => group.id));
              const assignedBirthYearIds = new Set(row.birthYears?.map((birthYear) => birthYear.id) || []);
              const allAvailableSelected =
                groups.length > 0 && groups.every((group) => assignedGroupIds.has(group.id));
              const allBirthYearsSelected =
                birthYearTargets.length > 0 && birthYearTargets.every((target) => assignedBirthYearIds.has(target.id));
              const birthYearSelected = birthYearTargets.find((target) => assignedBirthYearIds.has(target.id));
              const isBirthYearTarget = row.targetType === "birth_year";
              setPlayerForm({
                assignmentId: row.id,
                title: row.title,
                description: row.description,
                openAt: dateTimeInputValue(row.openAt),
                dueAt: dateTimeInputValue(row.dueAt),
                targetMode: isBirthYearTarget ? "birthYear" : "group",
                groupId: isBirthYearTarget && allBirthYearsSelected
                  ? allBirthYearsValue
                  : isBirthYearTarget && birthYearSelected
                    ? birthYearSelected.id
                    : allAvailableSelected
                      ? allGroupsValue
                      : row.groups[0]?.id || "",
                isOpenLocked: isAssignmentOpenNow(row),
                status: row.status,
              });
              setPlayerDialogOpen(true);
            }}
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200"
            onClick={(event) => {
              event.stopPropagation();
              setDeletePlayerAssignmentTarget(row);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      ),
    },
  ], [birthYearTargets, groups]);

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
    setPlayerFormError("");
    setPlayerForm({
      ...emptyPlayerForm,
      openAt: dateTimeFromNow(),
      dueAt: dateTimeFromNow(24),
      targetMode: "group",
      groupId: groups.length ? allGroupsValue : "",
    });
    setPlayerDialogOpen(true);
  };

  const handlePlayerAssignmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPlayerFormError("");
    if (!playerForm.groupId) return;

    const minCreateDateTime = dateTimeFromNow();
    if (!playerForm.assignmentId) {
      if (playerForm.openAt && playerForm.openAt < minCreateDateTime) {
        setPlayerFormError("Open At must be now or later.");
        return;
      }
      if (playerForm.dueAt && playerForm.dueAt < minCreateDateTime) {
        setPlayerFormError("Deadline must be now or later.");
        return;
      }
    }
    if (playerForm.openAt && playerForm.dueAt && playerForm.dueAt < playerForm.openAt) {
      setPlayerFormError("Deadline must be after Open At.");
      return;
    }
    const selectedBirthYearTarget = birthYearTargets.find((target) => target.id === playerForm.groupId);
    const selectedBirthYearIds =
      playerForm.targetMode === "birthYear"
        ? playerForm.groupId === allBirthYearsValue
          ? birthYearTargets.map((target) => target.id)
          : [playerForm.groupId].filter(Boolean)
        : [];
    const selectedGroupIds =
      playerForm.targetMode === "group"
        ? playerForm.groupId === allGroupsValue
          ? groups.map((group) => group.id)
          : [playerForm.groupId].filter(Boolean)
        : playerForm.groupId === allBirthYearsValue
          ? uniqueIds(birthYearTargets.flatMap((target) => target.groupIds))
          : selectedBirthYearTarget?.groupIds || [];
    if (!selectedGroupIds.length) {
      setPlayerFormError("Select at least one target group.");
      return;
    }

    const body = {
      title: playerForm.title.trim(),
      description: playerForm.description.trim() || undefined,
      ...(!playerForm.isOpenLocked ? { openAt: playerForm.openAt ? toOffsetDateTime(playerForm.openAt) : undefined } : {}),
      dueAt: playerForm.dueAt ? toOffsetDateTime(playerForm.dueAt) : undefined,
      targetType: playerForm.targetMode === "birthYear" ? "birth_year" as const : "group" as const,
      groupIds: selectedGroupIds,
      birthYearIds: selectedBirthYearIds,
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

  const confirmDeletePlayerAssignment = async () => {
    if (!deletePlayerAssignmentTarget) return;
    await deletePlayerAssignment(deletePlayerAssignmentTarget.id).unwrap();
    setDeletePlayerAssignmentTarget(null);
  };

  const confirmReviewPlayerSubmission = async () => {
    if (!submissionsFor || !pendingSubmissionReview) return;
    await reviewPlayerSubmission({
      assignmentId: submissionsFor.id,
      submissionId: pendingSubmissionReview.submission.id,
      status: pendingSubmissionReview.status,
      comment: pendingSubmissionReview.comment.trim() || undefined,
    }).unwrap();
    setPendingSubmissionReview(null);
    submissionsQuery.refetch();
  };

  const isInitialLoading =
    adminAssignments.isLoading ||
    playerAssignments.isLoading ||
    groupsQuery.isLoading;

  const minCreateDateTime = dateTimeFromNow();
  const openAtMinDateTime = playerForm.assignmentId ? undefined : minCreateDateTime;
  const dueAtMinDateTime = playerForm.assignmentId
    ? playerForm.isOpenLocked
      ? laterDateTime(minCreateDateTime, playerForm.openAt)
      : playerForm.openAt || undefined
    : laterDateTime(minCreateDateTime, playerForm.openAt);
  const playerDateError =
    !playerForm.assignmentId && playerForm.openAt && playerForm.openAt < minCreateDateTime
      ? "Open At must be now or later."
      : !playerForm.assignmentId && playerForm.dueAt && playerForm.dueAt < minCreateDateTime
        ? "Deadline must be now or later."
        : playerForm.isOpenLocked && playerForm.dueAt && playerForm.dueAt < minCreateDateTime
          ? "Deadline must be now or later for an open assignment."
        : playerForm.openAt && playerForm.dueAt && playerForm.dueAt < playerForm.openAt
          ? "Deadline must be after Open At."
          : "";

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

      <ConfirmDialog
        open={!!deletePlayerAssignmentTarget}
        onOpenChange={(open) => {
          if (!open) setDeletePlayerAssignmentTarget(null);
        }}
        title="Delete player assignment?"
        description={`This will remove "${deletePlayerAssignmentTarget?.title || "this assignment"}" from coach and player assignment lists. Existing submissions stay in the database for audit history.`}
        confirmLabel="Delete Assignment"
        variant="destructive"
        onConfirm={confirmDeletePlayerAssignment}
        isLoading={isDeletingPlayerAssignment}
      />

      <ConfirmDialog
        open={!!pendingSubmissionReview}
        onOpenChange={(open) => {
          if (!open) setPendingSubmissionReview(null);
        }}
        title={pendingSubmissionReview?.status === "approved" ? "Accept submission?" : "Mark as needs redo?"}
        description={
          pendingSubmissionReview?.status === "approved"
            ? `This will accept ${pendingSubmissionReview.submission.playerName || "this player's"} submission. They will not need to submit it again.`
            : `This will reject ${pendingSubmissionReview?.submission.playerName || "this player's"} submission and let them resubmit, even after the deadline.`
        }
        confirmLabel={pendingSubmissionReview?.status === "approved" ? "Accept Submission" : "Mark Needs Redo"}
        variant={pendingSubmissionReview?.status === "rejected" ? "destructive" : "default"}
        onConfirm={confirmReviewPlayerSubmission}
        isLoading={isReviewingPlayerSubmission}
      />

      <Dialog open={playerDialogOpen} onOpenChange={setPlayerDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{playerForm.assignmentId ? "Edit Player Assignment" : "New Player Assignment"}</DialogTitle>
            <DialogDescription>Player assignments accept PDF, Word, and image submissions.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handlePlayerAssignmentSubmit}>
            <div className="grid gap-4 lg:grid-cols-[1fr_180px_1fr]">
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
                <Label>Target By</Label>
                <Select
                  value={playerForm.targetMode}
                  onValueChange={(value) =>
                    setPlayerForm((current) => ({
                      ...current,
                      targetMode: value as PlayerTargetMode,
                      groupId: value === "group"
                        ? groups.length ? allGroupsValue : ""
                        : birthYearTargets.length ? allBirthYearsValue : "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="birthYear">Birthday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{playerForm.targetMode === "group" ? "Target Group" : "Target Birthday"}</Label>
                <Select
                  value={playerForm.groupId}
                  onValueChange={(value) => setPlayerForm((current) => ({ ...current, groupId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={playerForm.targetMode === "group" ? "Select group" : "Select birthday"} />
                  </SelectTrigger>
                  <SelectContent>
                    {playerForm.targetMode === "group" ? (
                      <>
                        <SelectItem value={allGroupsValue}>
                          All available groups ({groups.length})
                        </SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </>
                    ) : (
                      <>
                        <SelectItem value={allBirthYearsValue}>
                          All birthdays ({birthYearTargets.length})
                        </SelectItem>
                        {birthYearTargets.map((target) => (
                          <SelectItem key={target.id} value={target.id}>
                            {target.label} - {target.groupIds.length} group{target.groupIds.length === 1 ? "" : "s"}
                          </SelectItem>
                        ))}
                      </>
                    )}
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
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px]">
              {playerForm.isOpenLocked ? (
                <div className="space-y-3 rounded-lg border border-cyan-400/20 bg-slate-950/70 p-3 shadow-[0_18px_60px_rgba(8,47,73,0.25)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label className="text-slate-200">Open At</Label>
                      <p className="mt-1 text-xs font-medium text-cyan-100">
                        {formatAssignmentDateTime(playerForm.openAt, "now")}
                      </p>
                    </div>
                    <CalendarDays className="h-5 w-5 text-cyan-300" />
                  </div>
                  <div className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                    This assignment is already open, so the opening time is locked.
                  </div>
                </div>
              ) : (
                <AssignmentDateTimePicker
                  id="player-assignment-open"
                  label="Open At"
                  value={playerForm.openAt}
                  minDateTime={openAtMinDateTime}
                  onChange={(value) => {
                    setPlayerFormError("");
                    setPlayerForm((current) => ({
                      ...current,
                      openAt: value,
                      dueAt: value && current.dueAt && current.dueAt < value
                        ? dateTimeFromValue(value, 24)
                        : current.dueAt,
                    }));
                  }}
                  quickActions={[
                    { label: "Now", value: dateTimeFromNow() },
                    { label: "+1h", value: dateTimeFromValue(playerForm.openAt, 1) },
                  ]}
                />
              )}
              <AssignmentDateTimePicker
                id="player-assignment-due"
                label="Deadline"
                value={playerForm.dueAt}
                minDateTime={dueAtMinDateTime}
                onChange={(value) => {
                  setPlayerFormError("");
                  setPlayerForm((current) => ({ ...current, dueAt: value }));
                }}
                quickActions={[
                  { label: "+24h", value: dateTimeFromValue(playerForm.openAt || minCreateDateTime, 24) },
                  { label: "+48h", value: dateTimeFromValue(playerForm.openAt || minCreateDateTime, 48) },
                ]}
              />
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
            {(playerFormError || playerDateError) && (
              <p className="text-sm text-red-400">{playerFormError || playerDateError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPlayerDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={isCreatingPlayer || isUpdatingPlayer || !playerForm.title.trim() || !playerForm.groupId || Boolean(playerDateError)}
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
            <SubmissionList
              submissions={submissionsQuery.data ?? []}
              onRequestReview={(submission, status, comment) =>
                setPendingSubmissionReview({ submission, status, comment })
              }
              isReviewing={isReviewingPlayerSubmission}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
