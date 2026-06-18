"use client";

import { useMemo } from "react";
import {
  Activity,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Dumbbell,
  Loader2,
  MapPin,
  Trophy,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import {
  useGetPlayerAttendanceQuery,
  type PlayerAttendanceRecord,
} from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

type AttendanceStatus = PlayerAttendanceRecord["status"];

const attendanceLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
  injured: "Injured",
};

const statusOrder: AttendanceStatus[] = [
  "present",
  "late",
  "absent",
  "excused",
  "injured",
];

const attendedStatuses = new Set<AttendanceStatus>(["present", "late"]);
const missedStatuses = new Set<AttendanceStatus>(["absent", "injured"]);
const excusedStatuses = new Set<AttendanceStatus>(["excused"]);

const emptyCounts = () =>
  statusOrder.reduce(
    (counts, status) => ({ ...counts, [status]: 0 }),
    {} as Record<AttendanceStatus, number>,
  );

const countAttendance = (records: PlayerAttendanceRecord[]) =>
  records.reduce((counts, record) => {
    counts[record.status] = (counts[record.status] ?? 0) + 1;
    return counts;
  }, emptyCounts());

const attendanceRate = (records: PlayerAttendanceRecord[]) => {
  if (!records.length) return 0;
  const attended = records.filter((record) =>
    attendedStatuses.has(record.status),
  ).length;
  return Math.round((attended / records.length) * 100);
};

const titleCase = (value: string | null | undefined) =>
  (value || "Not set")
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const statusVariant = (status: AttendanceStatus) => {
  if (status === "present") return "success" as const;
  if (status === "late" || status === "excused") return "warning" as const;
  if (status === "absent" || status === "injured") return "destructive" as const;
  return "secondary" as const;
};

const recordDateTime = (record: PlayerAttendanceRecord) =>
  record.start_datetime ||
  (record.match_date
    ? `${record.match_date}T${String(record.match_time || "00:00:00").slice(0, 8)}`
    : "");

const recordTitle = (record: PlayerAttendanceRecord) =>
  record.title ||
  (record.record_type === "match" && record.opponent_name
    ? `Match vs ${record.opponent_name}`
    : "Training session");

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.045] shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </div>
          <span className="rounded-lg bg-cyan-400/10 p-2 text-cyan-200">
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-400">{detail}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function AttendanceSummaryList({
  title,
  description,
  records,
  emptyText,
  icon: Icon,
  tone,
}: {
  title: string;
  description: string;
  records: PlayerAttendanceRecord[];
  emptyText: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "danger" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-400/10 text-emerald-200"
      : tone === "danger"
        ? "bg-red-400/10 text-red-200"
        : "bg-amber-400/10 text-amber-200";

  return (
    <Card className="border-white/10 bg-white/[0.045] shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-base font-semibold">
          <span>{title}</span>
          <Badge variant="outline">{records.length}</Badge>
        </CardTitle>
        <p className="text-sm text-slate-400">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {records.length ? (
          records.slice(0, 8).map((record) => {
            const dateTime = recordDateTime(record);

            return (
              <div
                key={`${record.record_type}-${record.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${toneClass}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {recordTitle(record)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {dateTime ? formatDate(dateTime) : "No date"}
                    </p>
                  </div>
                </div>
                <Badge variant={statusVariant(record.status)}>
                  {attendanceLabels[record.status] || titleCase(record.status)}
                </Badge>
              </div>
            );
          })
        ) : (
          <EmptyState text={emptyText} />
        )}
        {records.length > 8 && (
          <p className="text-xs text-slate-400">
            Showing latest 8 of {records.length} records.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AttendanceRow({ record }: { record: PlayerAttendanceRecord }) {
  const dateTime = recordDateTime(record);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-200">
          {record.record_type === "match" ? (
            <Trophy className="h-5 w-5" />
          ) : (
            <Dumbbell className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-white">{recordTitle(record)}</p>
            <Badge variant="outline">
              {record.record_type === "match" ? "Match" : "Training"}
            </Badge>
            {record.inferred_absence && (
              <Badge variant="secondary">Auto absent</Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {dateTime && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(dateTime)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime12(dateTime)}
                </span>
              </>
            )}
            {record.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {record.location}
              </span>
            )}
            {record.arrival_time && (
              <span>Arrival {formatTime12(record.arrival_time)}</span>
            )}
          </div>
          {(record.notes || record.reason) && (
            <p className="mt-2 text-xs text-slate-400">
              {record.notes || record.reason}
            </p>
          )}
        </div>
      </div>
      <Badge variant={statusVariant(record.status)}>
        {attendanceLabels[record.status] || titleCase(record.status)}
      </Badge>
    </div>
  );
}

export default function PlayerAttendancePage() {
  const attendanceQuery = useGetPlayerAttendanceQuery({
    limit: 500,
  });

  const records = useMemo(
    () => attendanceQuery.data?.data ?? [],
    [attendanceQuery.data],
  );
  const trainingRecords = useMemo(
    () => records.filter((record) => record.record_type !== "match"),
    [records],
  );
  const matchRecords = useMemo(
    () => records.filter((record) => record.record_type === "match"),
    [records],
  );
  const attendedRecords = useMemo(
    () => records.filter((record) => attendedStatuses.has(record.status)),
    [records],
  );
  const missedRecords = useMemo(
    () => records.filter((record) => missedStatuses.has(record.status)),
    [records],
  );
  const excusedRecords = useMemo(
    () => records.filter((record) => excusedStatuses.has(record.status)),
    [records],
  );
  const statusCounts = useMemo(() => countAttendance(records), [records]);
  const totalAttended = attendedRecords.length;
  const latestRecord = records[0];
  const totalRows = attendanceQuery.data?.pagination.total ?? records.length;

  const chartData = statusOrder.map((status) => ({
    label: attendanceLabels[status],
    value: statusCounts[status] || 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance"
        description="Your recorded training and match attendance from the academy database."
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Attendance" },
        ]}
      />

      {attendanceQuery.isError && (
        <Card className="border-amber-400/30 bg-amber-500/10 shadow-none">
          <CardContent className="p-4 text-sm text-amber-100">
            Attendance data could not load from the backend. Please refresh when
            the server is available.
          </CardContent>
        </Card>
      )}

      {attendanceQuery.isLoading ? (
        <Card className="border-white/10 bg-white/[0.045] shadow-none">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading attendance from the database...
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Attended"
              value={`${attendanceRate(records)}%`}
              detail={`${totalAttended}/${records.length} training and match records`}
              icon={CheckCircle2}
            />
            <MetricCard
              label="Missed"
              value={String(missedRecords.length)}
              detail="Absent or injured records"
              icon={XCircle}
            />
            <MetricCard
              label="Training / Matches"
              value={`${trainingRecords.length} / ${matchRecords.length}`}
              detail="All recorded attendance rows"
              icon={Activity}
            />
            <MetricCard
              label="Latest Status"
              value={
                latestRecord
                  ? attendanceLabels[latestRecord.status] || titleCase(latestRecord.status)
                  : "No records"
              }
              detail={latestRecord ? recordTitle(latestRecord) : "Nothing recorded yet"}
              icon={CalendarCheck}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <AttendanceSummaryList
              title="Attended"
              description="Sessions and matches you attended."
              records={attendedRecords}
              emptyText="No attended records yet."
              icon={CheckCircle2}
              tone="success"
            />
            <AttendanceSummaryList
              title="Missed"
              description="Sessions and matches marked absent or injured."
              records={missedRecords}
              emptyText="No missed records. Clean sheet."
              icon={XCircle}
              tone="danger"
            />
            <AttendanceSummaryList
              title="Excused"
              description="Records marked with an accepted excuse."
              records={excusedRecords}
              emptyText="No excused records."
              icon={CalendarCheck}
              tone="warning"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {records.length ? (
                  <DoughnutChart
                    labels={chartData.map((item) => item.label)}
                    data={chartData.map((item) => item.value)}
                    height={260}
                    centerLabel="Records"
                    centerValue={records.length}
                  />
                ) : (
                  <EmptyState text="No attendance statuses have been recorded yet." />
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base font-semibold">
                    Attendance Records
                  </CardTitle>
                  <p className="text-xs text-slate-400">
                    Showing {records.length} of {totalRows} database records
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {records.map((record) => (
                  <AttendanceRow key={record.id} record={record} />
                ))}
                {!records.length && (
                  <EmptyState text="No training or match attendance has been recorded for you yet." />
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
