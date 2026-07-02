"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  HeartPulse,
  Pencil,
  Shield,
  ShieldAlert,
  Star,
  Target,
  Trophy,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetBranchesQuery, useUpdatePlayerMutation } from "@/lib/store/api/adminApi";
import {
  type ParentManagementRole,
  useGetManagedPlayerDetailQuery,
} from "@/lib/store/api/calendarApi";
import { formatDate, formatDateTime, getInitials } from "@/lib/utils";

type AnyRecord = Record<string, unknown>;

const guardianRelationLabels: Record<string, string> = {
  father: "Father",
  mother: "Mother",
  paternal_uncle: "Paternal Uncle",
  maternal_uncle: "Maternal Uncle",
  paternal_aunt: "Paternal Aunt",
  maternal_aunt: "Maternal Aunt",
  grandfather: "Grandfather",
  grandmother: "Grandmother",
  older_brother: "Older Brother",
  older_sister: "Older Sister",
  legal_guardian: "Legal Guardian",
  other: "Other",
};

const compact = (value: unknown) =>
  value === null || value === undefined || value === "" ? "--" : String(value);

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "--";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (!value.length) return "--";
    return value.map((item: unknown) => formatValue(item)).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return formatDate(text);
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return formatDateTime(text);
  return text;
};

const hasMeasurementValue = (value: unknown) =>
  value !== null && value !== undefined && value !== "";

const numberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const calculateBmi = (heightCm: unknown, weightKg: unknown) => {
  const height = numberValue(heightCm);
  const weight = numberValue(weightKg);
  if (!height || !weight) return null;
  const heightM = height / 100;
  return Number((weight / (heightM * heightM)).toFixed(2));
};

const ageFrom = (date: string | null | undefined) => {
  if (!date) return "--";
  const birth = new Date(date);
  if (Number.isNaN(birth.getTime())) return "--";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? `${age}` : "--";
};

const goalixExperienceFrom = (date: unknown) => {
  if (!date) return "--";
  const joined = new Date(String(date));
  if (Number.isNaN(joined.getTime())) return "--";
  const today = new Date();
  let years = today.getFullYear() - joined.getFullYear();
  const monthDiff = today.getMonth() - joined.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < joined.getDate())) {
    years -= 1;
  }
  if (years <= 0) return "Less than 1 year";
  return years === 1 ? "1 year" : `${years} years`;
};

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}

function DetailGrid({ rows }: { rows: Array<[string, unknown]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md border border-border/60 p-3">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-sm font-medium">{formatValue(value)}</p>
        </div>
      ))}
    </div>
  );
}

function RecordsTable({
  rows,
  columns,
  empty,
}: {
  rows: AnyRecord[];
  columns: Array<{ key: string; label: string; render?: (row: AnyRecord) => ReactNode }>;
  empty: string;
}) {
  if (!rows.length) {
    return <p className="rounded-md border border-border/60 p-4 text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border/60">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row.id ?? `${row.player_id ?? "row"}-${index}`)} className="border-t border-border/60">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2 align-top">
                  {column.render ? column.render(row) : formatValue(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const assignmentStatusMeta = (status: unknown) => {
  switch (status) {
    case "approved":
      return { label: "Approved", variant: "success" as const };
    case "rejected":
      return { label: "Rejected", variant: "destructive" as const };
    case "submitted":
      return { label: "Submitted", variant: "info" as const };
    default:
      return { label: "Not submitted", variant: "warning" as const };
  }
};

const injuryRiskVariant = (level: unknown) => {
  if (level === "High") return "destructive" as const;
  if (level === "Medium") return "warning" as const;
  if (level === "Low") return "success" as const;
  return "secondary" as const;
};

const emptyEditForm = {
  fullName: "",
  birthDate: "",
  heightCm: "",
  weightKg: "",
  preferredFoot: "",
  dateJoined: "",
  gender: "",
  nationality: "",
  branchId: "",
  position: "",
  level: "",
  phone: "",
  address: "",
  guardianName: "",
  guardianPhone: "",
  guardianRelation: "",
  password: "",
  notes: "",
};

const editFormFromPlayer = (
  player: Record<string, unknown>,
  latestMeasurement?: Record<string, unknown> | null,
) => ({
  fullName: String(player.full_name ?? ""),
  birthDate: String(player.date_of_birth ?? "").slice(0, 10),
  heightCm:
    latestMeasurement?.height_cm === null || latestMeasurement?.height_cm === undefined
      ? ""
      : String(latestMeasurement.height_cm),
  weightKg:
    latestMeasurement?.weight_kg === null || latestMeasurement?.weight_kg === undefined
      ? ""
      : String(latestMeasurement.weight_kg),
  preferredFoot: String(player.preferred_foot ?? ""),
  dateJoined: String(player.date_joined ?? "").slice(0, 10),
  gender: String(player.gender ?? ""),
  nationality: String(player.nationality ?? ""),
  branchId: String(player.branch_id ?? ""),
  position: String(player.position ?? ""),
  level: String(player.level ?? ""),
  phone: String(player.phone ?? ""),
  address: String(player.address ?? ""),
  guardianName: String(player.guardian_name ?? ""),
  guardianPhone: String(player.guardian_phone ?? ""),
  guardianRelation: String(player.guardian_relation ?? ""),
  password: "",
  notes: String(player.notes ?? ""),
});

export function ManagedPlayerDetailPage({
  role = "coach",
  playerId: explicitPlayerId,
}: {
  role?: ParentManagementRole;
  playerId?: string;
}) {
  const params = useParams<{ playerId: string }>();
  const router = useRouter();
  const playerId = explicitPlayerId ?? String(params.playerId || "");
  const { data, isLoading, error } = useGetManagedPlayerDetailQuery(
    { role, id: playerId },
    { skip: !playerId },
  );
  const { data: branches = [] } = useGetBranchesQuery(undefined, {
    skip: role !== "admin",
  });
  const [updatePlayer, updateState] = useUpdatePlayerMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editError, setEditError] = useState("");

  const player = data?.player;
  const matchTotals = data?.summary.matchTotals;
  const attendanceTotals = data?.summary.attendanceTotals;
  const attendanceRate = useMemo(() => {
    const total = Number(attendanceTotals?.total || 0);
    if (!total) return 0;
    const attended = Number(attendanceTotals?.present || 0) + Number(attendanceTotals?.late || 0);
    return Math.round((attended / total) * 100);
  }, [attendanceTotals]);
  const latestMeasurement = data?.summary.latestMeasurement ?? data?.measurements?.[0] ?? null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading player profile...</CardContent>
      </Card>
    );
  }

  if (error || !data || !player) {
    return (
      <div className="space-y-4">
        <Button variant="outline" className="gap-2" onClick={() => router.push("/coach/players")}>
          <ArrowLeft className="h-4 w-4" />
          Back to players
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Player not found.</CardContent>
        </Card>
      </div>
    );
  }

  const latestMeasurementValue = (key: string) => {
    for (const measurement of data.measurements) {
      const value = measurement[key];
      if (hasMeasurementValue(value)) return value;
    }
    return null;
  };
  const baselineHeight = latestMeasurementValue("height_cm");
  const baselineWeight = latestMeasurementValue("weight_kg");
  const baselineBmi =
    latestMeasurementValue("bmi") ?? calculateBmi(baselineHeight, baselineWeight);
  const linkedParent = player.linked_parent ?? null;
  const matchInjuries = (data.incidents as unknown as AnyRecord[]).filter(
    (incident) => incident.incident_type === "injury",
  );
  const injuryRisk = data.injuryRisk;
  const injuryPrediction = injuryRisk?.prediction ?? null;
  const injuryInput = injuryRisk?.input ?? null;
  const currentInjuryStatus =
    String(data.healthProfile?.current_injury_status ?? "none") || "none";
  const hasInjuryHistory =
    currentInjuryStatus === "injured" ||
    data.injuries.length > 0 ||
    matchInjuries.length > 0;
  const handleSaveEdit = async () => {
    setEditError("");
    if (!editForm.fullName.trim()) {
      setEditError("Full name is required.");
      return;
    }
    const level = ["A", "B", "C", "D", "F"].includes(editForm.level)
      ? (editForm.level as "A" | "B" | "C" | "D" | "F")
      : undefined;
    const preferredFoot = ["left", "right", "both"].includes(editForm.preferredFoot)
      ? (editForm.preferredFoot as "left" | "right" | "both")
      : undefined;
    const gender = ["male", "female", "other"].includes(editForm.gender)
      ? (editForm.gender as "male" | "female" | "other")
      : undefined;
    try {
      await updatePlayer({
        id: player.id,
        body: {
          fullName: editForm.fullName.trim(),
          birthDate: editForm.birthDate || undefined,
          heightCm: editForm.heightCm ? Number(editForm.heightCm) : undefined,
          weightKg: editForm.weightKg ? Number(editForm.weightKg) : undefined,
          preferredFoot,
          dateJoined: editForm.dateJoined || undefined,
          gender,
          nationality: editForm.nationality.trim() || undefined,
          branchId: editForm.branchId || undefined,
          position: editForm.position.trim() || undefined,
          level,
          phone: editForm.phone.trim() || undefined,
          address: editForm.address.trim() || undefined,
          guardianName: editForm.guardianName.trim() || undefined,
          guardianPhone: editForm.guardianPhone.trim() || undefined,
          guardianRelation: editForm.guardianRelation.trim() || undefined,
          password: editForm.password || undefined,
          notes: editForm.notes.trim() || undefined,
        },
      }).unwrap();
      setEditOpen(false);
    } catch (err) {
      const apiError = err as { data?: { error?: { message?: string } } };
      setEditError(apiError.data?.error?.message || "Could not update player.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={player.full_name}
        description={`${compact(player.position)} - ${compact(player.group_name)} - ${compact(player.branch_name)}`}
        breadcrumbs={[
          { label: "Dashboard", href: role === "admin" ? "/admin/dashboard" : "/coach/home" },
          { label: "Players", href: role === "admin" ? "/admin/players" : "/coach/players" },
          { label: player.full_name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {role === "admin" && (
              <Button
                className="gap-2"
                onClick={() => {
                  setEditForm(editFormFromPlayer(player, latestMeasurement));
                  setEditError("");
                  setEditOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit Player
              </Button>
            )}
            {role === "coach" && player.profile_status !== "complete" && (
              <Button
                className="gap-2"
                onClick={() => router.push(`/coach/players?complete=${player.id}`)}
              >
                <ShieldAlert className="h-4 w-4" />
                Complete profile
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push(role === "admin" ? "/admin/players" : "/coach/players")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="border-border/50 bg-card">
          <CardContent className="p-5">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-primary/20 text-2xl font-semibold text-primary">
                  {getInitials(player.full_name)}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-xl font-semibold">{player.full_name}</h2>
              <p className="text-sm text-muted-foreground">{compact(player.player_code)}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Badge variant={player.profile_status === "complete" ? "success" : "warning"}>
                  {player.profile_status === "complete" ? "Complete profile" : "Incomplete profile"}
                </Badge>
                <Badge variant="outline">{compact(player.level)}</Badge>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Age</span>
                <span className="font-medium">{ageFrom(player.date_of_birth)} years</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Preferred foot</span>
                <span className="font-medium capitalize">{compact(player.preferred_foot)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{compact(player.phone ?? player.account_phone)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Guardian</span>
                <span className="font-medium">{compact(player.guardian_name)}</span>
              </div>
            </div>
            {data.attendanceQr?.qrCodeDataUrl && (
              <div className="mt-6 rounded-md border border-border/60 bg-background/40 p-3 text-center">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Player QR Code</p>
                <img
                  src={data.attendanceQr.qrCodeDataUrl}
                  alt={`${player.full_name} QR code`}
                  className="mx-auto mt-3 h-44 w-44 rounded-md bg-white p-2"
                />
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  {data.attendanceQr.playerCode || data.attendanceQr.username || player.id}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Matches" value={matchTotals?.matches_played ?? 0} icon={<Trophy className="h-5 w-5" />} />
          <StatCard label="Minutes" value={matchTotals?.minutes_played ?? 0} icon={<Activity className="h-5 w-5" />} />
          <StatCard label="Goals" value={matchTotals?.goals ?? 0} icon={<Target className="h-5 w-5" />} />
          <StatCard label="Assists" value={matchTotals?.assists ?? 0} icon={<Star className="h-5 w-5" />} />
          <Card className="border-border/50 bg-card sm:col-span-2 xl:col-span-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Training attendance</p>
                <p className="text-sm text-muted-foreground">{attendanceRate}%</p>
              </div>
              <Progress value={attendanceRate} className="mt-3 h-2" />
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-5">
                <span>Total {attendanceTotals?.total ?? 0}</span>
                <span>Present {attendanceTotals?.present ?? 0}</span>
                <span>Late {attendanceTotals?.late ?? 0}</span>
                <span>Absent {attendanceTotals?.absent ?? 0}</span>
                <span>Injured {attendanceTotals?.injured ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" /> Identity</CardTitle></CardHeader>
            <CardContent>
              <DetailGrid
                rows={[
                  ["Full name", player.full_name],
                  ["Player code", player.player_code],
                  ["Date of birth", player.date_of_birth],
                  ["Gender", player.gender],
                  ["Nationality", player.nationality],
                  ["Branch", player.branch_name],
                  ["Current group", player.group_name],
                  ["Date joined", player.date_joined],
                  ["Profile completed", player.profile_completed_at],
                  ["Profile status", player.profile_status],
                  ["Active", player.is_active],
                  ["Notes", player.notes],
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Football Profile</CardTitle></CardHeader>
            <CardContent>
              <DetailGrid
                rows={[
                  ["Main position", player.position],
                  ["Preferred foot", player.preferred_foot],
                  ["Goalix experience", goalixExperienceFrom(player.date_joined)],
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4" /> Contact and Guardian</CardTitle></CardHeader>
            <CardContent>
              <DetailGrid
                rows={[
                  ["Player phone", player.phone],
                  ...(player.account_phone && player.account_phone !== player.phone
                    ? [["Account phone", player.account_phone] as [string, unknown]]
                    : []),
                  ["Address", player.address],
                  ["Guardian name", player.guardian_name],
                  ["Guardian phone", player.guardian_phone],
                  [
                    "Guardian relation",
                    guardianRelationLabels[String(player.guardian_relation ?? "")] ??
                      player.guardian_relation,
                  ],
                  ["Linked parent account", linkedParent?.name],
                  ["Parent username", linkedParent?.username],
                  ["Parent phone", linkedParent?.phone],
                  ["Parent address", linkedParent?.address],
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Account and Status</CardTitle></CardHeader>
            <CardContent>
              <DetailGrid
                rows={[
                  ["Username", player.username],
                  ["Login phone", player.account_phone],
                  ["Account active", player.account_is_active],
                  ["Account verified", player.account_is_verified],
                  ["Created at", player.created_at],
                  ["Updated at", player.updated_at],
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Physical Baseline</CardTitle></CardHeader>
            <CardContent>
              <DetailGrid
                rows={[
                  ["Height (cm)", baselineHeight],
                  ["Weight (kg)", baselineWeight],
                  ["BMI", baselineBmi],
                  ["Sprint (s)", latestMeasurementValue("sprint_speed")],
                  ["Endurance (/10)", latestMeasurementValue("stamina")],
                  ["Flexibility (/10)", latestMeasurementValue("flexibility")],
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Group Assignments</CardTitle></CardHeader>
            <CardContent>
              <RecordsTable
                rows={data.groups}
                empty="No group assignment history."
                columns={[
                  { key: "group_name", label: "Group" },
                  { key: "branch_name", label: "Branch" },
                  { key: "joined_at", label: "Joined" },
                  { key: "left_at", label: "Left" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Player Assignments</CardTitle></CardHeader>
            <CardContent>
              <RecordsTable
                rows={(data.playerAssignments || []) as unknown as AnyRecord[]}
                empty="No player assignments found."
                columns={[
                  { key: "title", label: "Assignment" },
                  {
                    key: "groups",
                    label: "Target",
                    render: (row) => {
                      const groups = Array.isArray(row.groups) ? row.groups : [];
                      return groups.length
                        ? groups
                            .map((group) =>
                              `${formatValue((group as AnyRecord).name)}${
                                (group as AnyRecord).branchName
                                  ? ` - ${formatValue((group as AnyRecord).branchName)}`
                                  : ""
                              }`,
                            )
                            .join(", ")
                        : "--";
                    },
                  },
                  { key: "coachName", label: "Coach" },
                  { key: "openAt", label: "Opened" },
                  { key: "dueAt", label: "Due" },
                  {
                    key: "playerStatus",
                    label: "Player status",
                    render: (row) => {
                      const meta = assignmentStatusMeta(row.playerStatus);
                      return <Badge variant={meta.variant}>{meta.label}</Badge>;
                    },
                  },
                  { key: "submittedAt", label: "Submitted" },
                  { key: "filesCount", label: "Files" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Custom Profile</CardTitle></CardHeader>
            <CardContent>
              {data.customProfile.length ? (
                <DetailGrid rows={data.customProfile.map((row) => [`${compact(row.category_name)} - ${row.label}`, row.value])} />
              ) : (
                <p className="rounded-md border border-border/60 p-4 text-sm text-muted-foreground">No custom profile data.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          <RecordsTable
            rows={data.matchStats}
            empty="No match stats yet."
            columns={[
              { key: "match_date", label: "Date" },
              { key: "opponent_name", label: "Opponent" },
              { key: "minutes_played", label: "Minutes" },
              { key: "goals", label: "Goals" },
              { key: "assists", label: "Assists" },
              { key: "performance_rating", label: "Overall" },
              { key: "match_status", label: "Status" },
            ]}
          />
          <RecordsTable
            rows={data.matchAttendance}
            empty="No match attendance yet."
            columns={[
              { key: "match_date", label: "Date" },
              { key: "opponent_name", label: "Opponent" },
              { key: "status", label: "Status" },
              { key: "notes", label: "Notes" },
            ]}
          />
          <RecordsTable
            rows={data.goals as unknown as AnyRecord[]}
            empty="No goals or assists recorded."
            columns={[
              { key: "match_date", label: "Date" },
              { key: "opponent_name", label: "Opponent" },
              { key: "minute", label: "Minute" },
              {
                key: "goal_role",
                label: "Contribution",
                render: (row) =>
                  row.scorer_player_id === player.id ? "Goal" : "Assist",
              },
              { key: "notes", label: "Notes" },
            ]}
          />
          <RecordsTable
            rows={data.matchSummaries}
            empty="No match summaries yet."
            columns={[
              { key: "recorded_at", label: "Date" },
              { key: "group_name", label: "Group" },
              { key: "matches_played", label: "Matches" },
              { key: "minutes_played", label: "Minutes" },
              { key: "goals", label: "Goals" },
              { key: "assists", label: "Assists" },
              { key: "match_rating", label: "Rating" },
            ]}
          />
          <RecordsTable
            rows={data.substitutions as unknown as AnyRecord[]}
            empty="No substitutions recorded for this player."
            columns={[
              { key: "match_date", label: "Date" },
              { key: "opponent_name", label: "Opponent" },
              { key: "minute", label: "Minute" },
              {
                key: "direction",
                label: "Direction",
                render: (row) => (row.in_player_id === player.id ? "Subbed in" : "Subbed off"),
              },
              { key: "reason", label: "Reason" },
            ]}
          />
          <RecordsTable
            rows={data.incidents as unknown as AnyRecord[]}
            empty="No cards or injuries in matches."
            columns={[
              { key: "match_date", label: "Date" },
              { key: "opponent_name", label: "Opponent" },
              { key: "incident_type", label: "Type" },
              { key: "minute", label: "Minute" },
              { key: "notes", label: "Notes" },
            ]}
          />
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <RecordsTable
            rows={data.trainingSummaries}
            empty="No training summaries yet."
            columns={[
              { key: "recorded_at", label: "Date" },
              { key: "group_name", label: "Group" },
              { key: "training_sessions_count", label: "Sessions" },
              { key: "attendance_count", label: "Attendance" },
              { key: "absence_count", label: "Absence" },
              { key: "attendance_rate", label: "Rate" },
              { key: "training_performance_rating", label: "Rating" },
            ]}
          />
          <RecordsTable
            rows={data.trainingAttendance}
            empty="No training attendance yet."
            columns={[
              { key: "start_datetime", label: "Date" },
              { key: "title", label: "Training" },
              { key: "training_focus", label: "Focus" },
              { key: "status", label: "Attendance" },
              { key: "arrival_time", label: "Arrival" },
              { key: "event_status", label: "Session status" },
            ]}
          />
          <RecordsTable
            rows={data.trainingEvaluations}
            empty="No training evaluations yet."
            columns={[
              { key: "start_datetime", label: "Date" },
              { key: "title", label: "Training" },
              { key: "overall_rating", label: "Overall" },
              { key: "technical_rating", label: "Technical" },
              { key: "tactical_rating", label: "Tactical" },
              { key: "physical_rating", label: "Physical" },
              { key: "mental_rating", label: "Mental" },
              { key: "endurance_rating", label: "Endurance" },
              { key: "strength_rating", label: "Strength" },
              { key: "agility_rating", label: "Agility" },
              { key: "coach_name", label: "Coach" },
              { key: "strengths", label: "Strengths" },
              { key: "improvement_areas", label: "Improvements" },
            ]}
          />
        </TabsContent>

        <TabsContent value="medical" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><HeartPulse className="h-4 w-4" /> Medical Summary</CardTitle></CardHeader>
            <CardContent>
              <DetailGrid
                rows={[
                  ["Has injury record", hasInjuryHistory ? "Yes" : "No"],
                  ["Current injury status", currentInjuryStatus],
                  ["Injury records", data.injuries.length],
                  ["Match injuries", matchInjuries.length],
                  ["Medical notes", data.healthProfile?.medical_notes],
                  ["Fitness status", data.healthProfile?.fitness_status],
                  ["Allergies", data.healthProfile?.allergies],
                  ["Chronic problems", data.healthProfile?.chronic_problems],
                ]}
              />
            </CardContent>
          </Card>

          <RecordsTable
            rows={matchInjuries}
            empty="No match injuries recorded for this player."
            columns={[
              { key: "match_date", label: "Match date" },
              { key: "opponent_name", label: "Match" },
              { key: "minute", label: "Minute" },
              { key: "body_part", label: "Injury" },
              { key: "notes", label: "Notes" },
            ]}
          />

          <RecordsTable
            rows={data.injuries}
            empty="No injury history."
            columns={[
              { key: "injury_date", label: "Injury date" },
              { key: "injury_type", label: "Type" },
              { key: "body_part", label: "Body part" },
              { key: "severity", label: "Severity" },
              { key: "recovery_date", label: "Recovery" },
              { key: "notes", label: "Notes" },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-4 w-4" />
                Injury Risk AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {injuryRisk ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={injuryRiskVariant(injuryPrediction?.risk_level)}>
                      {injuryPrediction?.risk_level || "No level"}
                    </Badge>
                    <span className="text-sm font-medium">
                      Risk {injuryPrediction?.risk_percentage ?? "--"}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatValue(injuryRisk.created_at)}
                    </span>
                  </div>
                  <DetailGrid
                    rows={[
                      ["Recommendation", injuryPrediction?.recommendation],
                      ["Alert flag", injuryPrediction?.alert_flag],
                      ["Model version", injuryRisk.model_version],
                      ["Attendance rate", injuryInput?.attendance_rate],
                      ["Training sessions/week", injuryInput?.training_sessions_per_week],
                      ["Match minutes last week", injuryInput?.match_minutes_last_week],
                      ["Fatigue rating", injuryInput?.fatigue_rating],
                      ["Previous injury input", injuryInput?.previous_injury],
                      ["Pain/discomfort input", injuryInput?.pain_or_discomfort],
                    ]}
                  />
                </>
              ) : (
                <p className="rounded-md border border-border/60 p-4 text-sm text-muted-foreground">
                  No injury risk model output yet for this player.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <RecordsTable
            rows={data.payments.subscriptions}
            empty="No payment subscriptions."
            columns={[
              { key: "plan", label: "Plan" },
              { key: "amount", label: "Amount" },
              { key: "currency", label: "Currency" },
              { key: "starts_at", label: "Starts" },
              { key: "ends_at", label: "Ends" },
              { key: "status", label: "Status" },
            ]}
          />
          <RecordsTable
            rows={data.payments.invoices}
            empty="No invoices."
            columns={[
              { key: "due_date", label: "Due" },
              { key: "amount", label: "Amount" },
              { key: "status", label: "Status" },
              { key: "paid_at", label: "Paid at" },
            ]}
          />
          <RecordsTable
            rows={data.payments.transactions}
            empty="No payment transactions."
            columns={[
              { key: "created_at", label: "Date" },
              { key: "amount", label: "Amount" },
              { key: "currency", label: "Currency" },
              { key: "status", label: "Status" },
              { key: "provider", label: "Provider" },
              { key: "reference", label: "Reference" },
            ]}
          />
        </TabsContent>

      </Tabs>
      {role === "admin" && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Player</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input id="edit-username" value={String(player.username ?? "")} readOnly />
                <p className="text-xs text-muted-foreground">Username cannot be changed.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">Password</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editForm.password}
                  placeholder="Leave empty to keep current password"
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
              </div>
              {[
                ["fullName", "Full name", "text"],
                ["birthDate", "Birth date", "date"],
                ["heightCm", "Height (cm)", "number"],
                ["weightKg", "Weight (kg)", "number"],
                ["dateJoined", "Date Joined Academy", "date"],
                ["nationality", "Nationality", "text"],
                ["phone", "Phone", "text"],
                ["position", "Position", "text"],
                ["address", "Address", "text"],
                ["guardianName", "Guardian name", "text"],
                ["guardianPhone", "Guardian phone", "text"],
              ].map(([key, label, type]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`edit-${key}`}>{label}</Label>
                  <Input
                    id={`edit-${key}`}
                    type={type}
                    value={editForm[key as keyof typeof editForm]}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="edit-preferredFoot">Preferred Foot</Label>
                <Select
                  value={editForm.preferredFoot}
                  onValueChange={(value) =>
                    setEditForm((current) => ({ ...current, preferredFoot: value }))
                  }
                >
                  <SelectTrigger id="edit-preferredFoot">
                    <SelectValue placeholder="Choose foot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-gender">Gender</Label>
                <Select
                  value={editForm.gender}
                  onValueChange={(value) =>
                    setEditForm((current) => ({ ...current, gender: value }))
                  }
                >
                  <SelectTrigger id="edit-gender">
                    <SelectValue placeholder="Choose gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-level">Level</Label>
                <Select
                  value={editForm.level}
                  onValueChange={(value) =>
                    setEditForm((current) => ({ ...current, level: value }))
                  }
                >
                  <SelectTrigger id="edit-level">
                    <SelectValue placeholder="Choose level" />
                  </SelectTrigger>
                  <SelectContent>
                    {["A", "B", "C", "D", "F"].map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-guardianRelation">Guardian relation</Label>
                <Select
                  value={editForm.guardianRelation}
                  onValueChange={(value) =>
                    setEditForm((current) => ({ ...current, guardianRelation: value }))
                  }
                >
                  <SelectTrigger id="edit-guardianRelation">
                    <SelectValue placeholder="Choose relation" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(guardianRelationLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-branchId">Branch</Label>
                <Select
                  value={editForm.branchId}
                  onValueChange={(value) =>
                    setEditForm((current) => ({ ...current, branchId: value }))
                  }
                >
                  <SelectTrigger id="edit-branchId">
                    <SelectValue placeholder="Choose branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            {editError && <p className="text-sm text-red-400">{editError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Close
              </Button>
              <Button type="button" disabled={updateState.isLoading} onClick={handleSaveEdit}>
                {updateState.isLoading ? (
                  <Activity className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function CoachPlayerDetailPage() {
  return <ManagedPlayerDetailPage role="coach" />;
}
