"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { getInitials, formatDate, formatTime12 } from "@/lib/utils";
import {
  ClipboardCheck,
  Star,
  Calendar,
  Clock,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Trophy,
  Loader2,
  UserPlus,
  Cake,
} from "lucide-react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/auth/auth-context";
import {
  useGetCoachAccessStatusQuery,
  useGetCoachBirthdaysQuery,
  useGetCoachDashboardQuery,
} from "@/lib/store/api/coachApi";
import {
  useCreatePlayerMutation,
  useUpdatePlayerMutation,
} from "@/lib/store/api/adminApi";

type CreateStep = "basic" | "complete";

const GUARDIAN_RELATIONS = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "paternal_uncle", label: "Paternal Uncle" },
  { value: "maternal_uncle", label: "Maternal Uncle" },
  { value: "paternal_aunt", label: "Paternal Aunt" },
  { value: "maternal_aunt", label: "Maternal Aunt" },
  { value: "grandfather", label: "Grandfather" },
  { value: "grandmother", label: "Grandmother" },
  { value: "older_brother", label: "Older Brother" },
  { value: "older_sister", label: "Older Sister" },
  { value: "legal_guardian", label: "Legal Guardian" },
  { value: "other", label: "Other" },
];

type PlayerForm = {
  username: string;
  password: string;
  fullName: string;
  birthDate: string;
  gender: "" | "male" | "female" | "other";
  address: string;
  nationality: string;
  photoUrl: string;
  branchId: string;
  groupId: string;
  level: "beginner" | "intermediate" | "advanced" | "elite";
  position: string;
  secondaryPositions: string;
  preferredFoot: "left" | "right" | "both";
  currentTeam: string;
  shirtNumber: string;
  playingStyle: string;
  yearsExperience: string;
  previousClubAcademy: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: string;
  phone: string;
  heightCm: string;
  weightKg: string;
  bmi: string;
  sprintSpeed: string;
  acceleration: string;
  stamina: string;
  strength: string;
  agility: string;
  balance: string;
  jumpHeightCm: string;
  flexibility: string;
  ballControl: string;
  firstTouch: string;
  passing: string;
  shooting: string;
  dribbling: string;
  crossing: string;
  heading: string;
  tackling: string;
  weakFoot: string;
  finishing: string;
  longPassing: string;
  shortPassing: string;
  positioning: string;
  decisionMaking: string;
  offBallMovement: string;
  pressing: string;
  defensiveAwareness: string;
  teamwork: string;
  gameReading: string;
  trackingBack: string;
  creatingSpace: string;
  tacticalDiscipline: string;
  trainingSessionsCount: string;
  attendanceCount: string;
  absenceCount: string;
  lateArrivals: string;
  attendanceRate: string;
  trainingPerformanceRating: string;
  coachNotes: string;
  improvementNotes: string;
  matchesPlayed: string;
  minutesPlayed: string;
  goals: string;
  assists: string;
  shots: string;
  shotsOnTarget: string;
  passAccuracy: string;
  keyPasses: string;
  successfulDribbles: string;
  tackles: string;
  interceptions: string;
  fouls: string;
  yellowCards: string;
  redCards: string;
  manOfTheMatchCount: string;
  matchRating: string;
  medicalNotes: string;
  injuryHistory: string;
  currentInjuryStatus: "" | "none" | "injured" | "rehab" | "recovered";
  injuryType: string;
  injuryDate: string;
  recoveryDate: string;
  fitnessStatus: "" | "fit" | "limited" | "unfit" | "medical_hold";
  allergies: string;
  chronicProblems: string;
  overallRating: string;
  potentialRating: string;
  strengths: string;
  weaknesses: string;
  recommendedPosition: string;
  developmentPlan: string;
  coachFinalNotes: string;
  subscriptionType: "" | "monthly" | "quarterly" | "yearly";
  monthlyFees: string;
  paymentStatus: "" | "pending" | "paid" | "overdue" | "cancelled";
  lastPaymentDate: string;
  nextPaymentDue: string;
  discount: string;
  penalty: string;
  notes: string;
};

const emptyPlayerForm: PlayerForm = {
  username: "",
  password: "",
  fullName: "",
  birthDate: "",
  gender: "",
  address: "",
  nationality: "",
  photoUrl: "",
  branchId: "",
  groupId: "",
  level: "beginner",
  position: "",
  secondaryPositions: "",
  preferredFoot: "right",
  currentTeam: "",
  shirtNumber: "",
  playingStyle: "",
  yearsExperience: "",
  previousClubAcademy: "",
  guardianName: "",
  guardianPhone: "",
  guardianRelation: "",
  phone: "",
  heightCm: "",
  weightKg: "",
  bmi: "",
  sprintSpeed: "",
  acceleration: "",
  stamina: "",
  strength: "",
  agility: "",
  balance: "",
  jumpHeightCm: "",
  flexibility: "",
  ballControl: "",
  firstTouch: "",
  passing: "",
  shooting: "",
  dribbling: "",
  crossing: "",
  heading: "",
  tackling: "",
  weakFoot: "",
  finishing: "",
  longPassing: "",
  shortPassing: "",
  positioning: "",
  decisionMaking: "",
  offBallMovement: "",
  pressing: "",
  defensiveAwareness: "",
  teamwork: "",
  gameReading: "",
  trackingBack: "",
  creatingSpace: "",
  tacticalDiscipline: "",
  trainingSessionsCount: "",
  attendanceCount: "",
  absenceCount: "",
  lateArrivals: "",
  attendanceRate: "",
  trainingPerformanceRating: "",
  coachNotes: "",
  improvementNotes: "",
  matchesPlayed: "",
  minutesPlayed: "",
  goals: "",
  assists: "",
  shots: "",
  shotsOnTarget: "",
  passAccuracy: "",
  keyPasses: "",
  successfulDribbles: "",
  tackles: "",
  interceptions: "",
  fouls: "",
  yellowCards: "",
  redCards: "",
  manOfTheMatchCount: "",
  matchRating: "",
  medicalNotes: "",
  injuryHistory: "",
  currentInjuryStatus: "",
  injuryType: "",
  injuryDate: "",
  recoveryDate: "",
  fitnessStatus: "",
  allergies: "",
  chronicProblems: "",
  overallRating: "",
  potentialRating: "",
  strengths: "",
  weaknesses: "",
  recommendedPosition: "",
  developmentPlan: "",
  coachFinalNotes: "",
  subscriptionType: "",
  monthlyFees: "",
  paymentStatus: "",
  lastPaymentDate: "",
  nextPaymentDue: "",
  discount: "",
  penalty: "",
  notes: "",
};

type ApiErrorDetails = {
  data?: {
    error?: {
      message?: string;
      details?: { message?: string }[];
    };
  };
};

const strongPasswordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

function getApiErrorMessage(err: unknown, fallback: string) {
  const apiError = err as ApiErrorDetails;
  const detailMessages = apiError.data?.error?.details
    ?.map((detail) => detail.message)
    .filter(Boolean);

  return detailMessages?.length
    ? detailMessages.join(". ")
    : (apiError.data?.error?.message ?? fallback);
}

const toNumber = (value: string) => (value.trim() ? Number(value) : undefined);
const toText = (value: string) => value.trim() || undefined;
const toSelect = <T extends string>(
  value: T | "",
): Exclude<T, ""> | undefined =>
  value ? (value as Exclude<T, "">) : undefined;
const toList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

type TextField = {
  field: keyof PlayerForm;
  label: string;
  type?: string;
  min?: number;
  max?: number;
};

const basicFields: TextField[] = [
  { field: "phone", label: "Phone Number" },
  { field: "nationality", label: "Nationality" },
  { field: "address", label: "Address" },
  { field: "photoUrl", label: "Profile Photo URL" },
];

const footballFields: TextField[] = [
  { field: "secondaryPositions", label: "Secondary Positions" },
  { field: "currentTeam", label: "Current Team / Age Group" },
  {
    field: "shirtNumber",
    label: "Shirt Number",
    type: "number",
    min: 1,
    max: 99,
  },
  {
    field: "yearsExperience",
    label: "Years of Experience",
    type: "number",
    min: 0,
    max: 50,
  },
  { field: "playingStyle", label: "Playing Style" },
  { field: "previousClubAcademy", label: "Previous Club / Academy" },
];

const physicalFields: TextField[] = [
  { field: "heightCm", label: "Height", type: "number", min: 1, max: 250 },
  { field: "weightKg", label: "Weight", type: "number", min: 1, max: 200 },
  { field: "bmi", label: "BMI", type: "number", min: 1, max: 80 },
  { field: "sprintSpeed", label: "Sprint Speed", type: "number", min: 0 },
  { field: "acceleration", label: "Acceleration", type: "number", min: 0 },
  { field: "stamina", label: "Stamina", type: "number", min: 1, max: 100 },
  { field: "strength", label: "Strength", type: "number", min: 1, max: 100 },
  { field: "agility", label: "Agility", type: "number", min: 1, max: 100 },
  { field: "balance", label: "Balance", type: "number", min: 1, max: 100 },
  { field: "jumpHeightCm", label: "Jump Height", type: "number", min: 0 },
  {
    field: "flexibility",
    label: "Flexibility",
    type: "number",
    min: 1,
    max: 100,
  },
];

const technicalSkillBaseFields: TextField[] = [
  { field: "ballControl", label: "Ball Control" },
  { field: "firstTouch", label: "First Touch" },
  { field: "passing", label: "Passing" },
  { field: "shooting", label: "Shooting" },
  { field: "dribbling", label: "Dribbling" },
  { field: "crossing", label: "Crossing" },
  { field: "heading", label: "Heading" },
  { field: "tackling", label: "Tackling" },
  { field: "weakFoot", label: "Weak Foot" },
  { field: "finishing", label: "Finishing" },
  { field: "longPassing", label: "Long Passing" },
  { field: "shortPassing", label: "Short Passing" },
];

const technicalSkillFields: TextField[] = technicalSkillBaseFields.map(
  (field) => ({ ...field, type: "number", min: 1, max: 100 }),
);

const tacticalSkillBaseFields: TextField[] = [
  { field: "positioning", label: "Positioning" },
  { field: "decisionMaking", label: "Decision Making" },
  { field: "offBallMovement", label: "Off-ball Movement" },
  { field: "pressing", label: "Pressing" },
  { field: "defensiveAwareness", label: "Defensive Awareness" },
  { field: "teamwork", label: "Teamwork" },
  { field: "gameReading", label: "Game Reading" },
  { field: "trackingBack", label: "Tracking Back" },
  { field: "creatingSpace", label: "Creating Space" },
  { field: "tacticalDiscipline", label: "Tactical Discipline" },
];

const tacticalSkillFields: TextField[] = tacticalSkillBaseFields.map(
  (field) => ({ ...field, type: "number", min: 1, max: 100 }),
);

const trainingFields: TextField[] = [
  {
    field: "trainingSessionsCount",
    label: "Training Sessions Count",
    type: "number",
    min: 0,
  },
  {
    field: "attendanceCount",
    label: "Attendance Count",
    type: "number",
    min: 0,
  },
  { field: "absenceCount", label: "Absence Count", type: "number", min: 0 },
  { field: "lateArrivals", label: "Late Arrivals", type: "number", min: 0 },
  {
    field: "attendanceRate",
    label: "Attendance Rate",
    type: "number",
    min: 0,
    max: 100,
  },
  {
    field: "trainingPerformanceRating",
    label: "Training Performance Rating",
    type: "number",
    min: 1,
    max: 100,
  },
  { field: "coachNotes", label: "Coach Notes" },
  { field: "improvementNotes", label: "Improvement Notes" },
];

const matchFields: TextField[] = [
  { field: "matchesPlayed", label: "Matches Played", type: "number", min: 0 },
  { field: "minutesPlayed", label: "Minutes Played", type: "number", min: 0 },
  { field: "goals", label: "Goals", type: "number", min: 0 },
  { field: "assists", label: "Assists", type: "number", min: 0 },
  { field: "shots", label: "Shots", type: "number", min: 0 },
  { field: "shotsOnTarget", label: "Shots on Target", type: "number", min: 0 },
  {
    field: "passAccuracy",
    label: "Pass Accuracy",
    type: "number",
    min: 0,
    max: 100,
  },
  { field: "keyPasses", label: "Key Passes", type: "number", min: 0 },
  {
    field: "successfulDribbles",
    label: "Successful Dribbles",
    type: "number",
    min: 0,
  },
  { field: "tackles", label: "Tackles", type: "number", min: 0 },
  { field: "interceptions", label: "Interceptions", type: "number", min: 0 },
  { field: "fouls", label: "Fouls", type: "number", min: 0 },
  { field: "yellowCards", label: "Yellow Cards", type: "number", min: 0 },
  { field: "redCards", label: "Red Cards", type: "number", min: 0 },
  {
    field: "manOfTheMatchCount",
    label: "Man of the Match Count",
    type: "number",
    min: 0,
  },
  {
    field: "matchRating",
    label: "Match Rating",
    type: "number",
    min: 0,
    max: 10,
  },
];

const healthFields: TextField[] = [
  { field: "medicalNotes", label: "Medical Notes" },
  { field: "injuryHistory", label: "Injury History" },
  { field: "injuryType", label: "Injury Type" },
  { field: "injuryDate", label: "Injury Date", type: "date" },
  { field: "recoveryDate", label: "Recovery Date", type: "date" },
  { field: "allergies", label: "Allergies" },
  { field: "chronicProblems", label: "Chronic Problems" },
];

const evaluationFields: TextField[] = [
  {
    field: "overallRating",
    label: "Overall Rating",
    type: "number",
    min: 0,
    max: 100,
  },
  {
    field: "potentialRating",
    label: "Potential Rating",
    type: "number",
    min: 0,
    max: 100,
  },
  { field: "strengths", label: "Strengths" },
  { field: "weaknesses", label: "Weaknesses" },
  { field: "recommendedPosition", label: "Recommended Position" },
  { field: "developmentPlan", label: "Development Plan" },
  { field: "coachFinalNotes", label: "Coach Final Notes" },
];

const paymentFields: TextField[] = [
  { field: "monthlyFees", label: "Monthly Fees", type: "number", min: 0 },
  { field: "lastPaymentDate", label: "Last Payment Date", type: "date" },
  { field: "nextPaymentDue", label: "Next Payment Due", type: "date" },
  { field: "discount", label: "Discount", type: "number", min: 0 },
  { field: "penalty", label: "Penalty", type: "number", min: 0 },
];

function renderTextFields(
  fields: TextField[],
  form: PlayerForm,
  update: (field: keyof PlayerForm, value: string) => void,
) {
  return fields.map((field) => (
    <div key={String(field.field)} className="space-y-2">
      <Label htmlFor={`player-${String(field.field)}`}>{field.label}</Label>
      <Input
        id={`player-${String(field.field)}`}
        type={field.type ?? "text"}
        min={field.min}
        max={field.max}
        value={form[field.field]}
        onChange={(event) => update(field.field, event.target.value)}
      />
    </div>
  ));
}

export default function CoachHomePage() {
  const { user } = useCurrentUser();
  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
  } = useGetCoachDashboardQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>("basic");
  const [createdPlayerId, setCreatedPlayerId] = useState<string | null>(null);
  const [playerForm, setPlayerForm] = useState<PlayerForm>(emptyPlayerForm);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const { data: accessStatus } = useGetCoachAccessStatusQuery();
  const { data: birthdays = [] } = useGetCoachBirthdaysQuery();
  const [createPlayer, { isLoading: isCreatingPlayer }] =
    useCreatePlayerMutation();
  const [updatePlayer, { isLoading: isUpdatingPlayer }] =
    useUpdatePlayerMutation();

  const myGroups = useMemo(() => dashboard?.groups ?? [], [dashboard?.groups]);
  const todaySessions = dashboard?.sessions ?? [];
  const recentEvaluations = dashboard?.evaluations ?? [];
  const coachNotifications = dashboard?.notifications ?? [];
  const hasAssignments =
    accessStatus?.hasAssignments ??
    (myGroups.length > 0 || birthdays.length > 0);
  const assignedBranches = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    birthdays.forEach((birthday) =>
      byId.set(birthday.branchId, {
        id: birthday.branchId,
        name: birthday.branchName,
      }),
    );
    myGroups.forEach((group) =>
      byId.set(group.branchId, { id: group.branchId, name: group.branchName }),
    );
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [birthdays, myGroups]);
  const scopedGroups = playerForm.branchId
    ? myGroups.filter((group) => group.branchId === playerForm.branchId)
    : myGroups;

  const stats = [
    {
      label: "My Groups",
      value: dashboard?.stats.groups ?? 0,
      icon: "Users" as const,
      change: 0,
      changeLabel: "assigned",
    },
    {
      label: "Total Players",
      value: dashboard?.stats.players ?? 0,
      icon: "UserCheck" as const,
      change: 0,
      changeLabel: "assigned",
    },
    {
      label: "Avg Attendance",
      value: `${dashboard?.stats.avgAttendance ?? 0}%`,
      icon: "ClipboardCheck" as const,
      change: 0,
      changeLabel: "current",
    },
    {
      label: "Evaluations Done",
      value: dashboard?.stats.evaluations ?? 0,
      icon: "Star" as const,
      change: 0,
      changeLabel: "saved",
    },
  ];
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Dumbbell,
  FilePlay,
  Goal,
  Medal,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { mockEvaluations, mockGroups, mockPlayers, mockSessions } from "@/lib/mock-data";

const readiness = [
  { label: "Match Readiness", value: "82%", sub: "Squad prepared", accent: "lime" },
  { label: "Team Form", value: "W-W-D-W-W", sub: "Last 5 matches", accent: "lime" },
  { label: "Possession", value: "56%", sub: "Training target", accent: "cyan" },
  { label: "xG (For)", value: "2.14", sub: "Per 90", accent: "white" },
  { label: "Sprint Load", value: "High", sub: "+12% vs last week", accent: "lime" },
];

const actions = [
  { icon: ClipboardCheck, title: "Mark Attendance", subtitle: "Today, 16:00", href: "/coach/attendance/mark", done: true },
  { icon: Star, title: "New Evaluation", subtitle: "U13 Elite Group", href: "/coach/evaluations/new", done: true },
  { icon: FilePlay, title: "Video Analysis", subtitle: "Review last match", href: "/coach/evaluations/history", done: false },
  { icon: ShieldCheck, title: "Opposition Report", subtitle: "vs FC United", href: "/coach/schedule", done: false },
];

const schedule = [
  { day: "Mon", date: "19 May", icon: Activity, title: "Recovery", time: "10:00", done: true },
  { day: "Tue", date: "20 May", icon: Target, title: "Tactical", time: "10:00", done: true },
  { day: "Wed", date: "21 May", icon: Dumbbell, title: "Intensity", time: "10:00", done: true },
  { day: "Thu", date: "22 May", icon: Zap, title: "Set Pieces", time: "10:00", done: true },
  { day: "Fri", date: "23 May", icon: Goal, title: "Match Prep", time: "10:00", done: false },
  { day: "Sat", date: "24 May", icon: Trophy, title: "Matchday", time: "18:00", done: false, active: true },
];

const roster = [
  { name: "Noah Williams", position: "RW", rating: 87, status: "Ready" },
  { name: "Liam Carter", position: "CM", rating: 83, status: "Monitor" },
  { name: "Ethan Brooks", position: "ST", rating: 81, status: "Ready" },
  { name: "Mason Lee", position: "GK", rating: 79, status: "Recovery" },
];

function Ring({ value, label, color = "lime" }: { value: number; label: string; color?: "lime" | "cyan" | "teal" }) {
  const stroke = color === "lime" ? "#b6ff00" : color === "cyan" ? "#00d8ff" : "#2ee8c9";

  const updatePlayerForm = (field: keyof PlayerForm, value: string) => {
    setPlayerForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "branchId" ? { groupId: "" } : null),
    }));
  };

  const resetCreateFlow = () => {
    setPlayerForm(emptyPlayerForm);
    setCreateStep("basic");
    setCreatedPlayerId(null);
    setCreateError("");
    setCreateSuccess("");
  };

  const handleCreateDialogChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) resetCreateFlow();
  };

  const buildBasicPlayerPayload = () => ({
    username: playerForm.username.trim(),
    password: playerForm.password,
    fullName: playerForm.fullName.trim(),
    birthDate: playerForm.birthDate,
    gender: toSelect(playerForm.gender),
    phone: playerForm.phone.trim() || undefined,
    guardianPhone: playerForm.guardianPhone.trim() || undefined,
    address: toText(playerForm.address),
    nationality: toText(playerForm.nationality),
    photoUrl: toText(playerForm.photoUrl),
    branchId: playerForm.branchId,
    groupId: undefined,
  });

  const buildExtendedPlayerPayload = () => {
    const secondaryPositions = toList(playerForm.secondaryPositions);

    return {
      groupId: playerForm.groupId || undefined,
      level: playerForm.level,
      position: playerForm.position.trim() || undefined,
      secondaryPositions: secondaryPositions.length
        ? secondaryPositions
        : undefined,
      preferredFoot: playerForm.preferredFoot,
      currentTeam: toText(playerForm.currentTeam),
      shirtNumber: toNumber(playerForm.shirtNumber),
      playingStyle: toText(playerForm.playingStyle),
      yearsExperience: toNumber(playerForm.yearsExperience),
      previousClubAcademy: toText(playerForm.previousClubAcademy),
      guardianName: playerForm.guardianName.trim() || undefined,
      guardianRelation: toText(playerForm.guardianRelation),
      heightCm: toNumber(playerForm.heightCm),
      weightKg: toNumber(playerForm.weightKg),
      bmi: toNumber(playerForm.bmi),
      sprintSpeed: toNumber(playerForm.sprintSpeed),
      acceleration: toNumber(playerForm.acceleration),
      stamina: toNumber(playerForm.stamina),
      strength: toNumber(playerForm.strength),
      agility: toNumber(playerForm.agility),
      balance: toNumber(playerForm.balance),
      jumpHeightCm: toNumber(playerForm.jumpHeightCm),
      flexibility: toNumber(playerForm.flexibility),
      ballControl: toNumber(playerForm.ballControl),
      firstTouch: toNumber(playerForm.firstTouch),
      passing: toNumber(playerForm.passing),
      shooting: toNumber(playerForm.shooting),
      dribbling: toNumber(playerForm.dribbling),
      crossing: toNumber(playerForm.crossing),
      heading: toNumber(playerForm.heading),
      tackling: toNumber(playerForm.tackling),
      weakFoot: toNumber(playerForm.weakFoot),
      finishing: toNumber(playerForm.finishing),
      longPassing: toNumber(playerForm.longPassing),
      shortPassing: toNumber(playerForm.shortPassing),
      positioning: toNumber(playerForm.positioning),
      decisionMaking: toNumber(playerForm.decisionMaking),
      offBallMovement: toNumber(playerForm.offBallMovement),
      pressing: toNumber(playerForm.pressing),
      defensiveAwareness: toNumber(playerForm.defensiveAwareness),
      teamwork: toNumber(playerForm.teamwork),
      gameReading: toNumber(playerForm.gameReading),
      trackingBack: toNumber(playerForm.trackingBack),
      creatingSpace: toNumber(playerForm.creatingSpace),
      tacticalDiscipline: toNumber(playerForm.tacticalDiscipline),
      trainingSessionsCount: toNumber(playerForm.trainingSessionsCount),
      attendanceCount: toNumber(playerForm.attendanceCount),
      absenceCount: toNumber(playerForm.absenceCount),
      lateArrivals: toNumber(playerForm.lateArrivals),
      attendanceRate: toNumber(playerForm.attendanceRate),
      trainingPerformanceRating: toNumber(playerForm.trainingPerformanceRating),
      coachNotes: toText(playerForm.coachNotes),
      improvementNotes: toText(playerForm.improvementNotes),
      matchesPlayed: toNumber(playerForm.matchesPlayed),
      minutesPlayed: toNumber(playerForm.minutesPlayed),
      goals: toNumber(playerForm.goals),
      assists: toNumber(playerForm.assists),
      shots: toNumber(playerForm.shots),
      shotsOnTarget: toNumber(playerForm.shotsOnTarget),
      passAccuracy: toNumber(playerForm.passAccuracy),
      keyPasses: toNumber(playerForm.keyPasses),
      successfulDribbles: toNumber(playerForm.successfulDribbles),
      tackles: toNumber(playerForm.tackles),
      interceptions: toNumber(playerForm.interceptions),
      fouls: toNumber(playerForm.fouls),
      yellowCards: toNumber(playerForm.yellowCards),
      redCards: toNumber(playerForm.redCards),
      manOfTheMatchCount: toNumber(playerForm.manOfTheMatchCount),
      matchRating: toNumber(playerForm.matchRating),
      medicalNotes: toText(playerForm.medicalNotes),
      injuryHistory: toText(playerForm.injuryHistory),
      currentInjuryStatus: toSelect(playerForm.currentInjuryStatus),
      injuryType: toText(playerForm.injuryType),
      injuryDate: toText(playerForm.injuryDate),
      recoveryDate: toText(playerForm.recoveryDate),
      fitnessStatus: toSelect(playerForm.fitnessStatus),
      allergies: toText(playerForm.allergies),
      chronicProblems: toText(playerForm.chronicProblems),
      overallRating: toNumber(playerForm.overallRating),
      potentialRating: toNumber(playerForm.potentialRating),
      strengths: toText(playerForm.strengths),
      weaknesses: toText(playerForm.weaknesses),
      recommendedPosition: toText(playerForm.recommendedPosition),
      developmentPlan: toText(playerForm.developmentPlan),
      coachFinalNotes: toText(playerForm.coachFinalNotes),
      subscriptionType: toSelect(playerForm.subscriptionType),
      monthlyFees: toNumber(playerForm.monthlyFees),
      paymentStatus: toSelect(playerForm.paymentStatus),
      lastPaymentDate: toText(playerForm.lastPaymentDate),
      nextPaymentDue: toText(playerForm.nextPaymentDue),
      discount: toNumber(playerForm.discount),
      penalty: toNumber(playerForm.penalty),
      notes: playerForm.notes.trim() || undefined,
      markProfileComplete: true,
    };
  };

  const handleCreatePlayer = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    if (!strongPasswordPattern.test(playerForm.password)) {
      setCreateError(
        "Password must be at least 8 characters and include uppercase, number, and special character.",
      );
      return;
    }

    if (!playerForm.branchId) {
      setCreateError("Select a branch before creating the player.");
      return;
    }

    if (!hasAssignments) {
      setCreateError("Your coach account has not been assigned yet.");
      return;
    }

    try {
      const player = await createPlayer(buildBasicPlayerPayload()).unwrap();
      setCreatedPlayerId(player.id);
      setCreateStep("complete");
      setCreateSuccess(
        "Player account created. Profile is incomplete until you complete the rest of the data.",
      );
    } catch (err) {
      setCreateError(
        getApiErrorMessage(err, "Could not create player account."),
      );
    }
  };

  const handleCompleteProfile = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    if (!createdPlayerId) {
      setCreateError("Create the basic player account first.");
      return;
    }

    try {
      await updatePlayer({
        id: createdPlayerId,
        body: buildExtendedPlayerPayload(),
      }).unwrap();

      resetCreateFlow();
      setCreateOpen(false);
    } catch (err) {
      setCreateError(
        getApiErrorMessage(err, "Could not complete player profile."),
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.fullName ?? user?.username ?? "Coach"}`}
        description="Here's your overview for today"
        breadcrumbs={[{ label: "Home" }]}
        actions={
          <Button
            className="gap-1.5"
            disabled={!hasAssignments}
            onClick={() => setCreateOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Add Player
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={handleCreateDialogChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {createStep === "basic"
                ? "Create Player Account"
                : "Complete Player Profile"}
            </DialogTitle>
            <DialogDescription>
              {createStep === "basic"
                ? "Add basic information and login credentials first."
                : "The player is created but the profile is still incomplete."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={
              createStep === "basic"
                ? handleCreatePlayer
                : handleCompleteProfile
            }
            className="space-y-5"
          >
            {createStep === "basic" ? (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Basic Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="player-full-name">Full name</Label>
                    <Input
                      id="player-full-name"
                      value={playerForm.fullName}
                      onChange={(event) =>
                        updatePlayerForm("fullName", event.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="player-birth-date">Birth date</Label>
                    <Input
                      id="player-birth-date"
                      type="date"
                      value={playerForm.birthDate}
                      onChange={(event) =>
                        updatePlayerForm("birthDate", event.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      value={playerForm.gender}
                      onValueChange={(value) =>
                        updatePlayerForm("gender", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {renderTextFields(basicFields, playerForm, updatePlayerForm)}
                  <div className="space-y-2">
                    <Label htmlFor="guardian-phone-basic">
                      Parent Phone Number
                    </Label>
                    <Input
                      id="guardian-phone-basic"
                      value={playerForm.guardianPhone}
                      onChange={(event) =>
                        updatePlayerForm("guardianPhone", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Select
                      value={playerForm.branchId}
                      onValueChange={(value) =>
                        updatePlayerForm("branchId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignedBranches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Birthday Assignment</Label>
                    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                      The player will be matched automatically by birth date.
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="player-username">Username</Label>
                    <Input
                      id="player-username"
                      value={playerForm.username}
                      onChange={(event) =>
                        updatePlayerForm("username", event.target.value)
                      }
                      autoComplete="username"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="player-password">Password</Label>
                    <Input
                      id="player-password"
                      type="password"
                      minLength={8}
                      value={playerForm.password}
                      onChange={(event) =>
                        updatePlayerForm("password", event.target.value)
                      }
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>
              </section>
            ) : (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Incomplete</Badge>
                  <p className="text-sm text-muted-foreground">
                    Complete the remaining football, medical, payment, and
                    evaluation data.
                  </p>
                </div>
              </div>
            )}

            {createStep === "complete" && (
              <>
                <section className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Football Information
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <Select
                        value={playerForm.branchId}
                        onValueChange={(value) =>
                          updatePlayerForm("branchId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignedBranches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Group</Label>
                      <Select
                        value={playerForm.groupId}
                        onValueChange={(value) =>
                          updatePlayerForm("groupId", value)
                        }
                        disabled={
                          !playerForm.branchId || scopedGroups.length === 0
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select group" />
                        </SelectTrigger>
                        <SelectContent>
                          {scopedGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Level</Label>
                      <Select
                        value={playerForm.level}
                        onValueChange={(value) =>
                          updatePlayerForm("level", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">
                            Intermediate
                          </SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="elite">Elite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Preferred foot</Label>
                      <Select
                        value={playerForm.preferredFoot}
                        onValueChange={(value) =>
                          updatePlayerForm("preferredFoot", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="right">Right</SelectItem>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player-position">Main Position</Label>
                      <Input
                        id="player-position"
                        value={playerForm.position}
                        onChange={(event) =>
                          updatePlayerForm("position", event.target.value)
                        }
                      />
                    </div>
                    {renderTextFields(
                      footballFields,
                      playerForm,
                      updatePlayerForm,
                    )}
                  </div>
                </section>

                <section className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Physical Data
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {renderTextFields(
                      physicalFields,
                      playerForm,
                      updatePlayerForm,
                    )}
                  </div>
                </section>

                <section className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Technical Skills
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {renderTextFields(
                      technicalSkillFields,
                      playerForm,
                      updatePlayerForm,
                    )}
                  </div>
                </section>

                <section className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Tactical Skills
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {renderTextFields(
                      tacticalSkillFields,
                      playerForm,
                      updatePlayerForm,
                    )}
                  </div>
                </section>

                <section className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Training & Attendance
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {renderTextFields(
                      trainingFields,
                      playerForm,
                      updatePlayerForm,
                    )}
                  </div>
                </section>

                <section className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Match Statistics
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {renderTextFields(
                      matchFields,
                      playerForm,
                      updatePlayerForm,
                    )}
                  </div>
                </section>

                <section className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Health & Injury Data
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Current Injury Status</Label>
                      <Select
                        value={playerForm.currentInjuryStatus}
                        onValueChange={(value) =>
                          updatePlayerForm("currentInjuryStatus", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="injured">Injured</SelectItem>
                          <SelectItem value="rehab">Rehab</SelectItem>
                          <SelectItem value="recovered">Recovered</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fitness Status</Label>
                      <Select
                        value={playerForm.fitnessStatus}
                        onValueChange={(value) =>
                          updatePlayerForm("fitnessStatus", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fitness" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fit">Fit</SelectItem>
                          <SelectItem value="limited">Limited</SelectItem>
                          <SelectItem value="unfit">Unfit</SelectItem>
                          <SelectItem value="medical_hold">
                            Medical Hold
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {renderTextFields(
                      healthFields,
                      playerForm,
                      updatePlayerForm,
                    )}
                  </div>
                </section>

                <section className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Coach Evaluation
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {renderTextFields(
                      evaluationFields,
                      playerForm,
                      updatePlayerForm,
                    )}
                  </div>
                </section>

                <section className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Parent / Guardian Data
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="guardian-name">Parent Name</Label>
                      <Input
                        id="guardian-name"
                        value={playerForm.guardianName}
                        onChange={(event) =>
                          updatePlayerForm("guardianName", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardian-relation">Relation</Label>
                      <Select
                        value={playerForm.guardianRelation}
                        onValueChange={(value) =>
                          updatePlayerForm(
                            "guardianRelation",
                            value,
                          )
                        }
                      >
                        <SelectTrigger id="guardian-relation">
                          <SelectValue placeholder="Choose relation" />
                        </SelectTrigger>
                        <SelectContent>
                          {GUARDIAN_RELATIONS.map((relation) => (
                            <SelectItem
                              key={relation.value}
                              value={relation.value}
                            >
                              {relation.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Payment Data
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Subscription Type</Label>
                      <Select
                        value={playerForm.subscriptionType}
                        onValueChange={(value) =>
                          updatePlayerForm("subscriptionType", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subscription" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Status</Label>
                      <Select
                        value={playerForm.paymentStatus}
                        onValueChange={(value) =>
                          updatePlayerForm("paymentStatus", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {renderTextFields(
                      paymentFields,
                      playerForm,
                      updatePlayerForm,
                    )}
                  </div>
                </section>

                <section className="space-y-4 border-t border-border/50 pt-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Notes
                  </h3>
                  <Input
                    id="player-notes"
                    value={playerForm.notes}
                    onChange={(event) =>
                      updatePlayerForm("notes", event.target.value)
                    }
                  />
                </section>
              </>
            )}

            {createError && (
              <p className="text-sm text-red-400">{createError}</p>
            )}
            {createSuccess && (
              <p className="text-sm text-emerald-400">{createSuccess}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCreateDialogChange(false)}
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={isCreatingPlayer || isUpdatingPlayer}
              >
                {(isCreatingPlayer || isUpdatingPlayer) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {createStep === "basic" ? "Create Player" : "Complete Profile"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {isDashboardError && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="p-4 text-sm text-red-300">
            Could not load coach data from the backend.
          </CardContent>
        </Card>
      )}

      {isDashboardLoading && (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading coach dashboard...
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatsCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Sessions */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">
                Today&apos;s Sessions
              </CardTitle>
              <Link href="/coach/schedule">
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{session.groupName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime12(session.startTime)} -{" "}
                        {formatTime12(session.endTime)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        session.type === "match"
                          ? "destructive"
                          : session.type === "assessment"
                            ? "secondary"
                            : "default"
                      }
                    >
                      {session.type}
                    </Badge>
                    <Link href="/coach/attendance/mark">
                      <Button size="sm">
                        <ClipboardCheck className="mr-1 h-4 w-4" />
                        Mark
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {todaySessions.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  No sessions scheduled for today
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + Notifications */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Link href="/coach/attendance/mark">
                <Button
                  variant="outline"
                  className="h-20 w-full flex-col gap-2"
                >
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  <span className="text-xs">Mark Attendance</span>
                </Button>
              </Link>
              <Link href="/coach/evaluations/new">
                <Button
                  variant="outline"
                  className="h-20 w-full flex-col gap-2"
                >
                  <Star className="h-5 w-5 text-amber-400" />
                  <span className="text-xs">New Evaluation</span>
                </Button>
              </Link>
              <Link href="/coach/measurements">
                <Button
                  variant="outline"
                  className="h-20 w-full flex-col gap-2"
                >
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  <span className="text-xs">Measurements</span>
                </Button>
              </Link>
              <Link href="/coach/rankings">
                <Button
                  variant="outline"
                  className="h-20 w-full flex-col gap-2"
                >
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  <span className="text-xs">Rankings</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {coachNotifications.slice(0, 3).map((notif) => (
                <div
                  key={notif.id}
                  className="flex items-start gap-3 rounded-lg bg-muted/20 p-3"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))}
              {coachNotifications.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No alerts
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Birthdays */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Birthdays</CardTitle>
          <Badge variant="secondary">{birthdays.length} assigned</Badge>
        </CardHeader>
        <CardContent>
          {birthdays.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {birthdays.map((birthday) => (
                <div
                  key={birthday.id}
                  className="rounded-lg border border-border/30 bg-muted/20 p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{birthday.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        {birthday.branchName}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Cake className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/20 p-2 text-xs">
                    <div>
                      <p className="font-semibold text-primary">
                        {birthday.fromYear}-{birthday.toYear}
                      </p>
                      <p className="text-muted-foreground">Years</p>
                    </div>
                    <div>
                      <p className="font-semibold text-accent">
                        {birthday.playerCount}
                      </p>
                      <p className="text-muted-foreground">Players</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No birth years assigned yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* My Groups Overview */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">My Groups</CardTitle>
          <Link href="/coach/my-groups">
            <Button variant="ghost" size="sm">
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {myGroups.map((group) => {
              return (
                <Link
                  key={group.id}
                  href={`/coach/my-groups/${group.id}`}
                  className="rounded-lg border border-border/30 bg-muted/20 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">{group.name}</h3>
                    <Badge variant="outline">
                      {group.playerCount}/{group.maxPlayers}
                    </Badge>
                  </div>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {group.schedule}
                  </p>
                  <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/20 p-2 text-xs">
                    <div>
                      <p className="font-semibold text-primary">
                        {group.avgAttendance}%
                      </p>
                      <p className="text-muted-foreground">Attendance</p>
                    </div>
                    <div>
                      <p className="font-semibold text-accent">
                        {group.avgPerformance}
                      </p>
                      <p className="text-muted-foreground">Avg Score</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Evaluations */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">
            Recent Evaluations
          </CardTitle>
          <Link href="/coach/evaluations/history">
            <Button variant="ghost" size="sm">
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentEvaluations.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/20 text-xs text-primary">
                      {getInitials(ev.playerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{ev.playerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(ev.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {ev.overallScore}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Overall</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    <div className="relative mx-auto grid h-28 w-28 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={stroke}
          strokeDasharray={`${value * 2.51} 251`}
          strokeLinecap="round"
          strokeWidth="8"
        />
      </svg>
      <div className="text-center">
        <div className="font-display text-3xl font-bold text-white">{value}%</div>
        <div className="text-xs font-semibold text-slate-300">{label}</div>
      </div>
    </div>
  );
}

function TrendChart() {
  return (
    <svg viewBox="0 0 520 230" className="h-full w-full">
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1="34" x2="500" y1={34 + i * 39} y2={34 + i * 39} stroke="rgba(255,255,255,0.08)" />
      ))}
      {["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"].map((m, i) => (
        <text key={m} x={45 + i * 61} y="215" fill="#91a0b5" fontSize="13">
          {m}
        </text>
      ))}
      <polyline points="45,150 110,126 175,136 240,101 305,141 370,112 435,130 485,116" fill="none" stroke="#b6ff00" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <polyline points="45,188 110,164 175,177 240,151 305,169 370,157 435,174 485,163" fill="none" stroke="#00d8ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <rect x="458" y="98" width="39" height="26" rx="7" fill="#b6ff00" />
      <text x="468" y="116" fill="#06111f" fontSize="14" fontWeight="800">
        7.8
      </text>
      <rect x="458" y="150" width="39" height="26" rx="7" fill="#00d8ff" />
      <text x="468" y="168" fill="#06111f" fontSize="14" fontWeight="800">
        2.1
      </text>
    </svg>
  );
}

function Heatmap() {
  return (
    <svg viewBox="0 0 360 230" className="h-full w-full rounded-xl">
      <rect width="360" height="230" fill="#071524" />
      <rect x="12" y="12" width="336" height="206" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="2" />
      <line x1="180" x2="180" y1="12" y2="218" stroke="rgba(255,255,255,0.55)" />
      <circle cx="180" cy="115" r="36" fill="none" stroke="rgba(255,255,255,0.55)" />
      <rect x="12" y="64" width="54" height="102" fill="none" stroke="rgba(255,255,255,0.55)" />
      <rect x="294" y="64" width="54" height="102" fill="none" stroke="rgba(255,255,255,0.55)" />
      <filter id="coachHeatBlur">
        <feGaussianBlur stdDeviation="13" />
      </filter>
      <g filter="url(#coachHeatBlur)" opacity="0.92">
        {[
          [126, 68, "#b6ff00"],
          [158, 91, "#ffef37"],
          [181, 121, "#ff2d2d"],
          [228, 104, "#7bea28"],
          [245, 151, "#00d8ff"],
          [130, 156, "#00d8ff"],
          [194, 167, "#b6ff00"],
        ].map(([x, y, color], index) => (
          <circle key={index} cx={Number(x)} cy={Number(y)} r="30" fill={String(color)} />
        ))}
      </g>
    </svg>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[18px] border border-[#2a4460]/80 bg-[#07172a]/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

export default function CoachHomePage() {
  const myGroups = mockGroups.filter((group) => ["g1", "g3"].includes(group.id));
  const myPlayers = mockPlayers.filter((player) => ["g1", "g3"].includes(player.groupId));
  const todaySessions = mockSessions.filter((session) => session.coachId === "c1").slice(0, 3);
  const completedEvaluations = mockEvaluations.filter((evaluation) => evaluation.coachId === "c1").length;

  const heroStats = [
    { icon: Users, value: myPlayers.length, label: "Active Players" },
    { icon: CalendarDays, value: todaySessions.length + 2, label: "Upcoming Sessions" },
    { icon: UserCheck, value: myGroups.length, label: "Training Groups" },
    { icon: Star, value: completedEvaluations, label: "Evaluations" },
  ];

  return (
    <div className="rounded-[34px] border border-[#2b4661] bg-[#05101f]/95 p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.42)] md:p-7">
      <section className="mb-5 grid gap-5 xl:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-lime-300">Coach performance hub</p>
          <h1 className="font-display text-5xl font-bold leading-none tracking-normal md:text-6xl">Welcome back, Coach</h1>
          <p className="mt-2 text-lg text-slate-300">Here is your team performance overview for today.</p>
        </div>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {heroStats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <stat.icon className="h-8 w-8 text-white" />
              <div>
                <div className="font-display text-4xl font-bold leading-none">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-300">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Panel className="mb-5 grid gap-0 overflow-hidden md:grid-cols-5">
        {readiness.map((item, index) => (
          <div key={item.label} className="border-b border-[#2a4460] p-5 md:border-b-0 md:border-r last:md:border-r-0">
            <div className="text-sm font-semibold text-white">{item.label}</div>
            <div className={`mt-3 font-display text-3xl font-bold ${item.accent === "cyan" ? "text-cyan-300" : item.accent === "lime" ? "text-lime-300" : "text-white"}`}>
              {item.value}
            </div>
            <div className="mt-1 text-sm text-slate-300">{item.sub}</div>
            {index === 2 && (
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className="h-full w-[56%] rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(0,216,255,0.55)]" />
              </div>
            )}
          </div>
        ))}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.25fr_0.62fr_0.62fr_0.62fr]">
        <Panel className="overflow-hidden">
          <div className="relative min-h-[350px] p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(182,255,0,0.28),transparent_26%),linear-gradient(135deg,rgba(47,140,255,0.18),transparent_58%)]" />
            <div className="absolute right-8 top-12 font-display text-[210px] font-black leading-none text-lime-300/20">X</div>
            <Image src="/Player.png" alt="Goalix player placeholder" fill sizes="(min-width: 1280px) 360px, 100vw" className="object-cover object-center opacity-80 mix-blend-screen" priority />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#07172a] to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <h2 className="text-2xl font-semibold">Noah Williams</h2>
              <p className="mt-1 text-sm">
                <span className="font-bold text-lime-300">RW</span> <span className="text-slate-300">- Winger</span>
              </p>
              <div className="mt-5 grid grid-cols-4 gap-3 border-t border-[#2a4460] pt-4 text-sm">
                {["Age|24", "Height|178 cm", "Weight|72 kg", "Foot|Left"].map((item) => {
                  const [label, value] = item.split("|");
                  return (
                    <div key={label}>
                      <div className="text-slate-400">{label}</div>
                      <div className="font-semibold text-white">{value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="absolute bottom-32 right-5 rounded-2xl border border-lime-300/35 bg-[#07111f]/85 px-4 py-3 text-center">
              <div className="text-xs text-slate-300">OVR</div>
              <div className="font-display text-4xl font-bold text-lime-300">87</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Performance Trend</h2>
            <button className="inline-flex items-center gap-2 rounded-xl border border-[#2a4460] bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
              Last 8 Matches <ChevronDown size={16} />
            </button>
          </div>
          <div className="h-[260px]">
            <TrendChart />
          </div>
        </Panel>

        <Panel className="p-5 text-center">
          <h2 className="text-left text-xl font-semibold">Physical Load</h2>
          <Ring value={78} label="Optimal" />
          <p className="mt-4 text-left text-sm text-lime-300">+8% <span className="text-slate-400">vs last week</span></p>
        </Panel>

        <Panel className="p-5 text-center">
          <h2 className="text-left text-xl font-semibold">Stamina</h2>
          <Ring value={91} label="High" color="cyan" />
          <p className="mt-4 text-left text-sm text-cyan-300">+15% <span className="text-slate-400">vs last week</span></p>
        </Panel>

        <Panel className="p-5 text-center">
          <h2 className="text-left text-xl font-semibold">Recovery</h2>
          <Ring value={85} label="Good" color="teal" />
          <p className="mt-4 text-left text-sm text-teal-300">+6% <span className="text-slate-400">vs last week</span></p>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.78fr_0.7fr_1.45fr_0.78fr]">
        <Panel className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Coach Actions</h2>
            <Link href="/coach/schedule" className="text-sm text-cyan-300">
              View plan
            </Link>
          </div>
          <div className="space-y-1">
            {actions.map((action) => (
              <Link key={action.title} href={action.href} className="flex items-center gap-3 border-b border-[#2a4460] py-3 last:border-b-0">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#2a4460] bg-white/[0.03] text-white">
                  <action.icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">{action.title}</span>
                  <span className="text-sm text-slate-400">{action.subtitle}</span>
                </span>
                <span className={`grid h-6 w-6 place-items-center rounded-full ${action.done ? "bg-lime-300 text-[#06111f]" : "border border-[#2a4460] text-slate-500"}`}>
                  {action.done && <Check size={15} />}
                </span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-xl font-semibold">Heatmap <span className="text-sm text-slate-400">(Last Match)</span></h2>
          <div className="h-[235px]">
            <Heatmap />
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Training Schedule</h2>
            <button className="inline-flex items-center gap-2 rounded-xl border border-[#2a4460] bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
              This Week <ChevronDown size={16} />
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-6">
            {schedule.map((item) => (
              <div key={item.day} className={`min-h-[178px] border-r border-[#2a4460] p-3 last:border-r-0 ${item.active ? "rounded-2xl bg-cyan-300/5" : ""}`}>
                <div className="text-sm font-semibold">{item.day}</div>
                <div className="text-xs text-slate-400">{item.date}</div>
                <item.icon className={`mt-5 h-8 w-8 ${item.active ? "text-cyan-300" : "text-lime-300"}`} />
                <p className="mt-4 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-slate-400">{item.time}</p>
                <span className={`mt-4 grid h-6 w-6 place-items-center rounded-full ${item.done ? "bg-lime-300/80 text-[#06111f]" : "border border-cyan-300 text-cyan-300"}`}>
                  {item.done ? <Check size={14} /> : ""}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-5 text-xl font-semibold">Focus Players</h2>
          <div className="space-y-4">
            {roster.map((player) => (
              <div key={player.name} className="flex items-center gap-3 rounded-2xl border border-[#2a4460] bg-white/[0.025] p-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-lime-300 to-cyan-300 font-black text-[#06111f]">
                  {player.position}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{player.name}</p>
                  <p className="text-xs text-slate-400">{player.status}</p>
                </div>
                <strong className="font-display text-2xl text-lime-300">{player.rating}</strong>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <Panel className="p-5">
          <h2 className="mb-4 text-xl font-semibold">Group Overview</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {myGroups.map((group) => (
              <Link key={group.id} href={`/coach/my-groups/${group.id}`} className="rounded-2xl border border-[#2a4460] bg-white/[0.025] p-4 transition hover:border-lime-300/40">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{group.name}</h3>
                  <span className="rounded-full bg-lime-300/10 px-3 py-1 text-xs font-bold text-lime-300">
                    {group.playerCount}/{group.maxPlayers}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{group.schedule}</p>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-xl font-semibold">Upcoming Sessions</h2>
          <div className="space-y-3">
            {todaySessions.map((session) => (
              <div key={session.id} className="flex items-center gap-4 rounded-2xl border border-[#2a4460] bg-white/[0.025] p-4">
                <CalendarDays className="h-9 w-9 text-cyan-300" />
                <div className="flex-1">
                  <p className="font-semibold text-white">{session.groupName}</p>
                  <p className="text-sm text-slate-400">{session.startTime} - {session.endTime}</p>
                </div>
                <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-bold capitalize text-cyan-300">{session.type}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-xl font-semibold">Coach Impact</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ["91%", "Attendance", Trophy],
              ["14", "New Reports", Medal],
              ["7.8", "Avg Rating", Star],
            ].map(([value, label, Icon]) => (
              <div key={label} className="rounded-2xl border border-[#2a4460] bg-white/[0.025] p-4">
                <Icon className="mx-auto mb-3 h-8 w-8 text-lime-300" />
                <strong className="font-display text-3xl text-white">{value}</strong>
                <p className="mt-1 text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
