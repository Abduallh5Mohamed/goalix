"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  HeartPulse,
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetCoachPlayerDetailQuery } from "@/lib/store/api/calendarApi";
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

export default function CoachPlayerDetailPage() {
  const params = useParams<{ playerId: string }>();
  const router = useRouter();
  const playerId = String(params.playerId || "");
  const { data, isLoading, error } = useGetCoachPlayerDetailQuery(playerId, {
    skip: !playerId,
  });

  const player = data?.player;
  const matchTotals = data?.summary.matchTotals;
  const attendanceTotals = data?.summary.attendanceTotals;
  const attendanceRate = useMemo(() => {
    const total = Number(attendanceTotals?.total || 0);
    if (!total) return 0;
    const attended = Number(attendanceTotals?.present || 0) + Number(attendanceTotals?.late || 0);
    return Math.round((attended / total) * 100);
  }, [attendanceTotals]);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={player.full_name}
        description={`${compact(player.position)} - ${compact(player.group_name)} - ${compact(player.branch_name)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/coach/home" },
          { label: "Players", href: "/coach/players" },
          { label: player.full_name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {player.profile_status !== "complete" && (
              <Button
                className="gap-2"
                onClick={() => router.push(`/coach/players?complete=${player.id}`)}
              >
                <ShieldAlert className="h-4 w-4" />
                Complete profile
              </Button>
            )}
            <Button variant="outline" className="gap-2" onClick={() => router.push("/coach/players")}>
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
          <TabsTrigger value="development">Development</TabsTrigger>
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
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Custom Profile</CardTitle></CardHeader>
            <CardContent>
              <DetailGrid rows={data.customProfile.map((row) => [`${compact(row.category_name)} - ${row.label}`, row.value])} />
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
              { key: "coach_name", label: "Coach" },
            ]}
          />
        </TabsContent>

        <TabsContent value="medical" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><HeartPulse className="h-4 w-4" /> Health Profile</CardTitle></CardHeader>
            <CardContent>
              <DetailGrid rows={Object.entries(data.healthProfile ?? {})} />
            </CardContent>
          </Card>
          <RecordsTable
            rows={data.measurements}
            empty="No measurements yet."
            columns={[
              { key: "measured_at", label: "Date" },
              { key: "height_cm", label: "Height" },
              { key: "weight_kg", label: "Weight" },
              { key: "bmi", label: "BMI" },
              { key: "sprint_speed", label: "Sprint" },
              { key: "notes", label: "Notes" },
            ]}
          />
          <RecordsTable
            rows={data.injuries}
            empty="No injury history."
            columns={[
              { key: "injury_date", label: "Injury date" },
              { key: "injury_type", label: "Type" },
              { key: "recovery_date", label: "Recovery" },
              { key: "notes", label: "Notes" },
            ]}
          />
        </TabsContent>

        <TabsContent value="development" className="space-y-4">
          <RecordsTable
            rows={data.skillAssessments}
            empty="No skill assessments yet."
            columns={[
              { key: "assessed_at", label: "Date" },
              { key: "group_name", label: "Group" },
              { key: "ball_control", label: "Ball control" },
              { key: "passing", label: "Passing" },
              { key: "shooting", label: "Shooting" },
              { key: "positioning", label: "Positioning" },
              { key: "decision_making", label: "Decision making" },
            ]}
          />
          <RecordsTable
            rows={data.rankings}
            empty="No ranking history yet."
            columns={[
              { key: "period", label: "Period" },
              { key: "group_name", label: "Group" },
              { key: "rank", label: "Rank" },
              { key: "total_score", label: "Score" },
              { key: "trend", label: "Trend" },
            ]}
          />
          <RecordsTable
            rows={data.coachRatings}
            empty="No coach ratings yet."
            columns={[
              { key: "eval_date", label: "Date" },
              { key: "coach_name", label: "Coach" },
              { key: "group_name", label: "Group" },
              { key: "score", label: "Score" },
              { key: "notes", label: "Notes" },
            ]}
          />
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
        </TabsContent>

      </Tabs>
    </div>
  );
}
