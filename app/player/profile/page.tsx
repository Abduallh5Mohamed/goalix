"use client";

import type { ComponentType } from "react";
import Image from "next/image";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Footprints,
  Heart,
  IdCard,
  Loader2,
  MapPin,
  Phone,
  QrCode,
  ShieldCheck,
  Trophy,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useGetPlayerAttendanceQrQuery,
  useGetPlayerProfileQuery,
  useGetPlayerProgressQuery,
} from "@/lib/store/api/calendarApi";
import type { PlayerProfile } from "@/lib/store/api/calendarApi";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

type IconType = ComponentType<{ className?: string }>;

interface InfoItem {
  label: string;
  value: string | null;
  icon: IconType;
}

const normalizeKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const compactKey = (value: string) => normalizeKey(value).replace(/_/g, "");

const titleCase = (value: string | null | undefined) =>
  (value || "Not set")
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const textValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return formatDateTime(value);
  if (Array.isArray(value)) {
    const values = value.map(textValue).filter(Boolean);
    return values.length ? values.join(", ") : null;
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
};

const numberValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const safeDate = (value: unknown) => {
  const text = textValue(value);
  if (!text) return "Not set";
  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? text : formatDate(text);
};

const safeDateTime = (value: unknown) => {
  const text = textValue(value);
  if (!text) return "Not set";
  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? text : formatDateTime(text);
};

const ageFromBirthDate = (value: unknown) => {
  const text = textValue(value);
  if (!text) return null;
  const birthDate = new Date(text);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? String(age) : null;
};

const profileValue = (
  profile: PlayerProfile | undefined,
  keys: string[],
): string | null => {
  if (!profile) return null;
  const normalizedKeys = new Set(keys.map(normalizeKey));
  const compactKeys = new Set(keys.map(compactKey));

  for (const [key, value] of Object.entries(profile as Record<string, unknown>)) {
    if (
      normalizedKeys.has(normalizeKey(key)) ||
      compactKeys.has(compactKey(key))
    ) {
      const text = textValue(value);
      if (text) return text;
    }
  }

  for (const field of profile.customProfile ?? []) {
    if (
      normalizedKeys.has(normalizeKey(field.key)) ||
      normalizedKeys.has(normalizeKey(field.label)) ||
      compactKeys.has(compactKey(field.key)) ||
      compactKeys.has(compactKey(field.label))
    ) {
      const text = textValue(field.value);
      if (text) return text;
    }
  }

  return null;
};

const percentText = (value: unknown) => {
  const numeric = numberValue(value);
  return numeric === null ? "0%" : `${Math.round(numeric)}%`;
};

const numberText = (value: unknown) => {
  const numeric = numberValue(value);
  return numeric === null ? "0" : String(Math.round(numeric));
};

const ratingText = (value: unknown) => {
  const numeric = numberValue(value);
  if (numeric === null) return "N/A";
  return `${Number.isInteger(numeric) ? numeric : numeric.toFixed(1)}/10`;
};

const progressValue = (value: unknown, multiplier = 1) => {
  const numeric = numberValue(value);
  if (numeric === null) return 0;
  return Math.max(0, Math.min(100, numeric * multiplier));
};

const profileStatusVariant = (status: string | null | undefined) =>
  status === "complete" ? ("success" as const) : ("warning" as const);

function InfoRow({ label, value, icon: Icon }: InfoItem) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.035] px-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-sm text-slate-400">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span className="max-w-[60%] break-words text-right text-sm font-medium text-slate-100">
        {value || "Not set"}
      </span>
    </div>
  );
}

function FieldTile({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg bg-white/[0.035] p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm leading-6 text-slate-100">
        {value || "Not set"}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

export default function PlayerProfilePage() {
  const profileQuery = useGetPlayerProfileQuery();
  const progressQuery = useGetPlayerProgressQuery();
  const attendanceQrQuery = useGetPlayerAttendanceQrQuery();

  const profile = profileQuery.data;
  const progress = progressQuery.data;
  const attendanceQr = attendanceQrQuery.data;
  const isLoading = profileQuery.isLoading || progressQuery.isLoading;
  const hasError = profileQuery.isError;

  const playerName = profile?.full_name || progress?.playerName || "Player";
  const mainPosition =
    profileValue(profile, ["main_position", "main position"]) ||
    profile?.position ||
    null;
  const preferredFoot = profileValue(profile, ["preferred_foot", "preferred foot"]);
  const latestMeasurement = profile?.latestMeasurement as
    | Record<string, unknown>
    | null
    | undefined;
  const height =
    profileValue(profile, ["height", "height_cm", "height cm"]) ||
    textValue(latestMeasurement?.height_cm);
  const weight =
    profileValue(profile, ["weight", "weight_kg", "weight kg"]) ||
    textValue(latestMeasurement?.weight_kg);
  const age = ageFromBirthDate(profile?.date_of_birth);
  const photoValue = textValue(profile?.photo_url);
  const photoSrc = photoValue?.startsWith("/") ? photoValue : "/Player.png";
  const customFields = (profile?.customProfile ?? []).filter((field) =>
    textValue(field.value),
  );

  const personalInfo: InfoItem[] = [
    { label: "Full Name", value: profile?.full_name || null, icon: User },
    { label: "Player Code", value: textValue(profile?.player_code), icon: IdCard },
    { label: "Date of Birth", value: safeDate(profile?.date_of_birth), icon: Calendar },
    { label: "Age", value: age, icon: Clock },
    { label: "Main Position", value: mainPosition, icon: ShieldCheck },
    { label: "Preferred Foot", value: preferredFoot, icon: Footprints },
    { label: "Level", value: titleCase(profile?.level), icon: Trophy },
    { label: "Height", value: height, icon: Activity },
    { label: "Weight", value: weight, icon: Heart },
  ];

  const academyInfo: InfoItem[] = [
    { label: "Branch", value: profile?.branch_name || null, icon: MapPin },
    { label: "Group", value: profile?.group_name || null, icon: User },
    { label: "Profile Status", value: titleCase(profile?.profile_status), icon: CheckCircle2 },
    {
      label: "Completed At",
      value: safeDateTime(profile?.profile_completed_at),
      icon: Calendar,
    },
    { label: "Joined", value: safeDate(profile?.date_joined), icon: Calendar },
    { label: "Created At", value: safeDateTime(profile?.created_at), icon: Clock },
  ];

  const contactInfo: InfoItem[] = [
    { label: "Username", value: profile?.username || null, icon: User },
    { label: "Account Phone", value: profile?.account_phone || null, icon: Phone },
    { label: "Player Phone", value: profile?.phone || null, icon: Phone },
    { label: "Guardian Name", value: profile?.guardian_name || null, icon: Heart },
    { label: "Guardian Phone", value: profile?.guardian_phone || null, icon: Phone },
  ];

  const additionalFields = [
    { label: "Address", value: textValue(profile?.address) },
    { label: "Gender", value: titleCase(textValue(profile?.gender)) },
    { label: "Nationality", value: textValue(profile?.nationality) },
    {
      label: "Guardian Relation",
      value: titleCase(textValue(profile?.guardian_relation)),
    },
    {
      label: "Latest Measurement",
      value: safeDate(latestMeasurement?.measured_at),
    },
    { label: "BMI", value: textValue(latestMeasurement?.bmi) },
  ].filter((field) => field.value && field.value !== "Not set");

  const profileNotes = [
    { label: "Strengths", value: profileValue(profile, ["strengths"]) },
    { label: "Weaknesses", value: profileValue(profile, ["weaknesses"]) },
    {
      label: "Coach Notes",
      value: profileValue(profile, ["coach_notes", "coach notes", "coachNotes"]),
    },
    {
      label: "Improvement Notes",
      value: profileValue(profile, [
        "improvement_notes",
        "improvement notes",
        "improvementNotes",
      ]),
    },
    {
      label: "Development Plan",
      value: profileValue(profile, [
        "development_plan",
        "development plan",
        "developmentPlan",
      ]),
    },
    {
      label: "Recommended Position",
      value: profileValue(profile, [
        "recommended_position",
        "recommended position",
        "recommendedPosition",
      ]),
    },
    {
      label: "Final Notes",
      value: profileValue(profile, ["final_notes", "final notes", "coachFinalNotes"]),
    },
    {
      label: "Medical Notes",
      value: profileValue(profile, ["medical_notes", "medical notes", "medicalNotes"]),
    },
    {
      label: "Injury History",
      value: profileValue(profile, ["injury_history", "injury history", "injuryHistory"]),
    },
    {
      label: "General Notes",
      value: profileValue(profile, ["notes", "general notes"]),
    },
  ].filter((field) => field.value);

  const profileCompletion =
    profile?.profile_status === "complete" ? 100 : customFields.length ? 65 : 20;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Your full live player profile from the academy database."
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Profile" },
        ]}
      />

      {hasError && (
        <Card className="border-amber-400/30 bg-amber-500/10 shadow-none">
          <CardContent className="p-4 text-sm text-amber-100">
            Some profile data could not load from the backend. Anything shown
            here is still live data that was available.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card className="border-white/10 bg-white/[0.045] shadow-none">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your full player profile...
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden border-white/10 bg-white/[0.045] shadow-none">
            <CardContent className="p-0">
              <div className="grid gap-5 p-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                  <Image
                    src={photoSrc}
                    alt={playerName}
                    fill
                    sizes="96px"
                    className="object-cover"
                    priority
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-2xl font-semibold text-white">
                      {playerName}
                    </h2>
                    <Badge variant={profileStatusVariant(profile?.profile_status)}>
                      {titleCase(profile?.profile_status)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {[mainPosition, profile?.group_name, profile?.branch_name]
                      .filter(Boolean)
                      .join(" | ") || "No academy assignment set"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile?.player_code && (
                      <Badge variant="outline">Code {profile.player_code}</Badge>
                    )}
                    {age && <Badge variant="secondary">Age {age}</Badge>}
                    {preferredFoot && (
                      <Badge variant="outline">{preferredFoot} Foot</Badge>
                    )}
                    {profile?.level && (
                      <Badge variant="info">Level {titleCase(profile.level)}</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-center lg:min-w-80">
                  <div>
                    <p className="text-xl font-semibold text-cyan-200">
                      {percentText(progress?.attendancePercentage)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Attendance</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-lime-200">
                      {ratingText(progress?.averageTrainingRating)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Training</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-amber-200">
                      {ratingText(progress?.averageMatchRating)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Matches</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Profile Completion
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {profile?.profile_status === "complete" ? "Complete" : "Incomplete"}
                </p>
                <Progress
                  value={profileCompletion}
                  className="mt-3 h-1.5 bg-slate-800"
                  indicatorClassName={cn(
                    profile?.profile_status === "complete"
                      ? "bg-emerald-400"
                      : "bg-amber-400",
                  )}
                />
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Trainings Attended
                </p>
                <p className="mt-2 text-3xl font-semibold text-cyan-100">
                  {numberText(progress?.trainingsAttended)}
                </p>
                <p className="mt-2 text-sm text-slate-400">From live attendance</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Matches Played
                </p>
                <p className="mt-2 text-3xl font-semibold text-lime-100">
                  {numberText(progress?.matchesPlayed)}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {numberText(progress?.goals)} goals |{" "}
                  {numberText(progress?.assists)} assists
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Weekly Minutes
                </p>
                <p className="mt-2 text-3xl font-semibold text-amber-100">
                  {numberText(progress?.weeklyMinutesPlayed)}
                </p>
                <Progress
                  value={progressValue(progress?.weeklyMinutesPlayed, 1 / 0.9)}
                  className="mt-3 h-1.5 bg-slate-800"
                />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-4">
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-cyan-300" />
                  Personal Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {personalInfo.map((item) => (
                  <InfoRow key={item.label} {...item} />
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-lime-300" />
                  Academy Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {academyInfo.map((item) => (
                  <InfoRow key={item.label} {...item} />
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode className="h-4 w-4 text-cyan-300" />
                  Attendance QR
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {attendanceQrQuery.isLoading ? (
                  <div className="flex items-center gap-2 rounded-lg bg-white/[0.035] p-4 text-sm text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading QR...
                  </div>
                ) : attendanceQr?.qrCodeDataUrl ? (
                  <>
                    <div className="mx-auto flex aspect-square max-w-56 items-center justify-center rounded-lg bg-white p-3">
                      <Image
                        src={attendanceQr.qrCodeDataUrl}
                        alt="Attendance QR"
                        width={220}
                        height={220}
                        unoptimized
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <InfoRow
                      label="Player Code"
                      value={attendanceQr.playerCode || profile?.player_code || null}
                      icon={IdCard}
                    />
                  </>
                ) : (
                  <EmptyState text="Attendance QR is not available yet." />
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4 text-amber-300" />
                  Contact Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {contactInfo.map((item) => (
                  <InfoRow key={item.label} {...item} />
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-cyan-300" />
                  Complete Profile Fields
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customFields.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {customFields.map((field) => (
                      <FieldTile
                        key={`${field.key}-${field.label}`}
                        label={field.label || titleCase(field.key)}
                        value={textValue(field.value)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No complete profile fields have been filled for this player yet." />
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-lime-300" />
                  Progress Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldTile
                    label="Training Attendance"
                    value={`${numberText(progress?.trainingsAttended)}/${numberText(progress?.trainingsRecorded)}`}
                  />
                  <FieldTile
                    label="Match Attendance"
                    value={`${numberText(progress?.matchesAttended)}/${numberText(progress?.matchesRecorded)}`}
                  />
                  <FieldTile
                    label="Average Training"
                    value={ratingText(progress?.averageTrainingRating)}
                  />
                  <FieldTile
                    label="Average Match"
                    value={ratingText(progress?.averageMatchRating)}
                  />
                  <FieldTile
                    label="Yellow Cards"
                    value={numberText(progress?.disciplineRecord?.yellowCards)}
                  />
                  <FieldTile
                    label="Red Cards"
                    value={numberText(progress?.disciplineRecord?.redCards)}
                  />
                </div>
                <div className="rounded-lg bg-white/[0.035] p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Monthly Progress Summary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {progress?.monthlyProgressSummary ||
                      "No monthly progress summary has been generated yet."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {profileNotes.length > 0 && (
            <Card className="border-white/10 bg-white/[0.045] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-cyan-300" />
                  Coach Profile Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {profileNotes.map((field) => (
                    <FieldTile
                      key={field.label}
                      label={field.label}
                      value={field.value}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-white/10 bg-white/[0.045] shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <IdCard className="h-4 w-4 text-cyan-300" />
                Additional Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {additionalFields.length ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {additionalFields.map((field) => (
                    <FieldTile
                      key={field.label}
                      label={field.label}
                      value={field.value}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text="No additional profile details are available yet." />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
