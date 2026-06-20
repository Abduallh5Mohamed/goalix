"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Dumbbell,
  Languages,
  ListChecks,
  Loader2,
  Maximize2,
  Minimize2,
  Moon,
  Move,
  PanelLeftClose,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Users,
  ZapOff,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/lib/auth/auth-context";
import {
  type CoachGroup,
  useGetCoachGroupsScopedQuery,
} from "@/lib/store/api/calendarApi";
import { cn, getInitials } from "@/lib/utils";

type DashboardLanguage = "en" | "ar";
type DashboardTheme = "light" | "dark";
type DashboardDensity = "comfortable" | "compact";
type DashboardMotion = "full" | "reduced";
type DashboardFocus = "off" | "on";
type TrainingEvaluationMode = "all" | "search";
type IconType = React.ComponentType<{ className?: string }>;

const keys = {
  language: "goalix-dashboard-language",
  theme: "goalix-dashboard-theme",
  density: "goalix-dashboard-density",
  motion: "goalix-dashboard-motion",
  focus: "goalix-dashboard-focus",
  notifications: "goalix-coach-browser-notifications",
  evaluationMode: "goalix-coach-training-evaluation-mode",
};

const readPreference = <T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
) => {
  if (typeof window === "undefined") return fallback;
  const saved = window.localStorage.getItem(key);
  return allowed.includes(saved as T) ? (saved as T) : fallback;
};

const emitDashboardSettings = (settings: {
  language: DashboardLanguage;
  theme: DashboardTheme;
  density: DashboardDensity;
  motion: DashboardMotion;
  focusMode: DashboardFocus;
}) => {
  window.dispatchEvent(
    new CustomEvent("goalix-dashboard-settings-changed", {
      detail: settings,
    }),
  );
};

const emitCoachSettings = (settings: {
  evaluationMode: TrainingEvaluationMode;
}) => {
  window.dispatchEvent(
    new CustomEvent("goalix-coach-settings-changed", {
      detail: settings,
    }),
  );
};

function OptionCard({
  active,
  title,
  description,
  icon: Icon,
  onClick,
  disabled = false,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: IconType;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex min-h-24 items-start gap-3 rounded-lg border p-4 text-left transition",
        disabled && "cursor-not-allowed opacity-55",
        active
          ? "border-lime-300/45 bg-lime-300/10 text-white shadow-[0_0_24px_rgba(190,242,100,0.08)]"
          : disabled
            ? "border-white/10 bg-white/[0.025] text-slate-500"
            : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.055]",
      )}
    >
      <span
        className={cn(
          "rounded-lg p-2",
          active
            ? "bg-lime-300/15 text-lime-100"
            : disabled
              ? "bg-white/[0.035] text-slate-500"
              : "bg-white/[0.05] text-slate-300",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-semibold">
          {title}
          {active && <CheckCircle2 className="h-4 w-4 text-lime-300" />}
        </span>
        <span className="mt-1 block text-sm leading-5 text-slate-400">
          {description}
        </span>
      </span>
    </button>
  );
}

const titleCase = (value: string | null | undefined) =>
  (value || "Not set")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

function PermissionStat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: IconType;
  tone: "lime" | "cyan" | "amber" | "slate";
}) {
  const toneClass = {
    lime: "bg-lime-300/10 text-lime-100",
    cyan: "bg-cyan-300/10 text-cyan-100",
    amber: "bg-amber-300/10 text-amber-100",
    slate: "bg-white/[0.055] text-slate-100",
  }[tone];

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          {label}
        </span>
        <span className={cn("rounded-lg p-2", toneClass)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 font-display text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{hint}</p>
    </div>
  );
}

function PermissionBadge({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <Badge variant={enabled ? "success" : "secondary"}>
      {enabled ? label : `No ${label.toLowerCase()}`}
    </Badge>
  );
}

function CoachGroupPermissionRow({ group }: { group: CoachGroup }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{group.group_name}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
            <Building2 className="h-4 w-4 shrink-0 text-cyan-300" />
            <span className="truncate">{group.branch_name}</span>
          </p>
        </div>
        <Badge
          variant={
            group.can_create_training ||
            group.can_take_attendance ||
            group.can_evaluate_players
              ? "info"
              : "outline"
          }
          className="w-fit"
        >
          {titleCase(group.role)}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <PermissionBadge enabled={group.can_create_training} label="Training" />
        <PermissionBadge enabled={group.can_take_attendance} label="Attendance" />
        <PermissionBadge enabled={group.can_evaluate_players} label="Evaluation" />
      </div>
    </div>
  );
}

export default function CoachSettingsPage() {
  const { user } = useCurrentUser();
  const [settingsReady, setSettingsReady] = useState(false);
  const [language, setLanguage] = useState<DashboardLanguage>("en");
  const [theme, setTheme] = useState<DashboardTheme>("light");
  const [density, setDensity] =
    useState<DashboardDensity>("comfortable");
  const [motion, setMotion] = useState<DashboardMotion>("full");
  const [focusMode, setFocusMode] = useState<DashboardFocus>("off");
  const [evaluationMode, setEvaluationMode] =
    useState<TrainingEvaluationMode>("all");
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | "unsupported">("default");
  const groupsQuery = useGetCoachGroupsScopedQuery(undefined, {
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });
  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const permissionCounts = useMemo(
    () =>
      groups.reduce(
        (acc, group) => {
          acc.total += 1;
          if (group.can_create_training) acc.training += 1;
          if (group.can_take_attendance) acc.attendance += 1;
          if (group.can_evaluate_players) acc.evaluation += 1;
          return acc;
        },
        { total: 0, training: 0, attendance: 0, evaluation: 0 },
      ),
    [groups],
  );
  const permissionsLoading =
    groupsQuery.isLoading || (groupsQuery.isFetching && groups.length === 0);
  const evaluationOptionsDisabled =
    !permissionsLoading && permissionCounts.evaluation === 0;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLanguage(readPreference(keys.language, ["en", "ar"] as const, "en"));
      setTheme(readPreference(keys.theme, ["light", "dark"] as const, "light"));
      setDensity(
        readPreference(
          keys.density,
          ["comfortable", "compact"] as const,
          "comfortable",
        ),
      );
      setMotion(readPreference(keys.motion, ["full", "reduced"] as const, "full"));
      setFocusMode(readPreference(keys.focus, ["off", "on"] as const, "off"));
      setEvaluationMode(
        readPreference(keys.evaluationMode, ["all", "search"] as const, "all"),
      );
      setBrowserNotifications(
        window.localStorage.getItem(keys.notifications) === "on",
      );
      setNotificationPermission(
        "Notification" in window
          ? window.Notification.permission
          : "unsupported",
      );
      setSettingsReady(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const dashboardSettings = useMemo(
    () => ({ language, theme, density, motion, focusMode }),
    [density, focusMode, language, motion, theme],
  );

  useEffect(() => {
    if (!settingsReady) return;
    window.localStorage.setItem(keys.language, dashboardSettings.language);
    window.localStorage.setItem(keys.theme, dashboardSettings.theme);
    window.localStorage.setItem(keys.density, dashboardSettings.density);
    window.localStorage.setItem(keys.motion, dashboardSettings.motion);
    window.localStorage.setItem(keys.focus, dashboardSettings.focusMode);
    emitDashboardSettings(dashboardSettings);
  }, [dashboardSettings, settingsReady]);

  useEffect(() => {
    if (!settingsReady) return;
    window.localStorage.setItem(keys.evaluationMode, evaluationMode);
    emitCoachSettings({ evaluationMode });
  }, [evaluationMode, settingsReady]);

  const toggleBrowserNotifications = async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    let permission = window.Notification.permission;
    if (permission === "default") {
      permission = await window.Notification.requestPermission();
    }

    setNotificationPermission(permission);
    const enabled = permission === "granted" ? !browserNotifications : false;
    setBrowserNotifications(enabled);
    window.localStorage.setItem(keys.notifications, enabled ? "on" : "off");
  };

  const resetPreferences = () => {
    setLanguage("en");
    setTheme("light");
    setDensity("comfortable");
    setMotion("full");
    setFocusMode("off");
    setEvaluationMode("all");
    setBrowserNotifications(false);
    window.localStorage.setItem(keys.notifications, "off");
  };

  const summary = [
    language === "ar" ? "Arabic" : "English",
    theme === "dark" ? "Dark" : "Light",
    density === "compact" ? "Compact" : "Comfortable",
    focusMode === "on" ? "Focus" : "Standard",
    evaluationMode === "search" ? "Search review" : "All-player review",
    permissionsLoading ? "Loading scope" : `${permissionCounts.total} groups`,
    permissionsLoading
      ? "Checking evaluation"
      : `${permissionCounts.evaluation} evaluation groups`,
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coach Settings"
        description="Control your coach workspace and review the group permissions assigned by the academy."
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Settings" },
        ]}
      />

      <Card className="border-white/10 bg-white/[0.045] shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-lime-300/10 text-lg font-bold text-lime-100">
              {getInitials(user?.fullName || "Coach")}
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                {user?.fullName || "Coach"}
              </p>
              <p className="text-sm text-slate-400">
                Personal coach preferences for this browser.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/[0.045] shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-lime-300" />
            Coach Permissions & Scope
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <PermissionStat
              label="Assigned groups"
              value={permissionsLoading ? "..." : permissionCounts.total}
              hint="Groups visible in your coach workspace."
              icon={Users}
              tone="slate"
            />
            <PermissionStat
              label="Create training"
              value={permissionsLoading ? "..." : permissionCounts.training}
              hint="Groups where you can create sessions."
              icon={Dumbbell}
              tone="cyan"
            />
            <PermissionStat
              label="Attendance"
              value={permissionsLoading ? "..." : permissionCounts.attendance}
              hint="Groups where attendance can be edited."
              icon={ClipboardCheck}
              tone="amber"
            />
            <PermissionStat
              label="Evaluation"
              value={permissionsLoading ? "..." : permissionCounts.evaluation}
              hint="Groups where player ratings can be saved."
              icon={Star}
              tone="lime"
            />
          </div>

          {permissionsLoading ? (
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-lime-300" />
              Loading coach permissions...
            </div>
          ) : groupsQuery.isError ? (
            <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
              Could not load your coach permissions right now. Saved workspace
              preferences will still work on this browser.
            </div>
          ) : groups.length > 0 ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {groups.map((group) => (
                <CoachGroupPermissionRow key={group.group_id} group={group} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
              No coach groups are assigned to this account yet. Academy admins
              control group assignment and system permissions.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.045] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-lime-300" />
              Training Evaluation Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">
                Applies to training evaluation pages where your group role
                allows player ratings.
              </p>
              <Badge
                variant={
                  permissionsLoading
                    ? "info"
                    : permissionCounts.evaluation > 0
                      ? "success"
                      : "warning"
                }
                className="w-fit"
              >
                {permissionsLoading
                  ? "Checking access"
                  : permissionCounts.evaluation > 0
                    ? `${permissionCounts.evaluation} evaluation group${
                        permissionCounts.evaluation === 1 ? "" : "s"
                      }`
                    : "No evaluation access"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <OptionCard
                active={evaluationMode === "all"}
                title="All players"
                description="Open training evaluations with every attended player visible."
                icon={Users}
                onClick={() => setEvaluationMode("all")}
                disabled={evaluationOptionsDisabled}
              />
              <OptionCard
                active={evaluationMode === "search"}
                title="Search player"
                description="Open training evaluations in focused search mode."
                icon={Search}
                onClick={() => setEvaluationMode("search")}
                disabled={evaluationOptionsDisabled}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.045] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-amber-300" />
              Browser Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-white">
                {browserNotifications ? "Enabled" : "Disabled"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Permission:{" "}
                {notificationPermission === "unsupported"
                  ? "not supported"
                  : notificationPermission}
              </p>
            </div>
            <Button
              type="button"
              variant={browserNotifications ? "outline" : "default"}
              onClick={toggleBrowserNotifications}
              disabled={notificationPermission === "unsupported"}
            >
              {browserNotifications ? "Turn off" : "Turn on"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.045] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Languages className="h-4 w-4 text-cyan-300" />
              Language
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              active={language === "en"}
              title="English"
              description="English labels and left-to-right layout."
              icon={Languages}
              onClick={() => setLanguage("en")}
            />
            <OptionCard
              active={language === "ar"}
              title="Arabic"
              description="Arabic labels and right-to-left layout."
              icon={Languages}
              onClick={() => setLanguage("ar")}
            />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.045] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4 text-lime-300" />
              Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              active={theme === "light"}
              title="Light"
              description="Brighter surfaces for daytime work."
              icon={Sun}
              onClick={() => setTheme("light")}
            />
            <OptionCard
              active={theme === "dark"}
              title="Dark"
              description="Darker surfaces for late sessions."
              icon={Moon}
              onClick={() => setTheme("dark")}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-white/10 bg-white/[0.045] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Minimize2 className="h-4 w-4 text-cyan-300" />
              Density
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <OptionCard
              active={density === "comfortable"}
              title="Comfortable"
              description="More spacing between dashboard sections."
              icon={Maximize2}
              onClick={() => setDensity("comfortable")}
            />
            <OptionCard
              active={density === "compact"}
              title="Compact"
              description="Tighter layout for quicker scanning."
              icon={Minimize2}
              onClick={() => setDensity("compact")}
            />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.045] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Move className="h-4 w-4 text-amber-300" />
              Motion
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <OptionCard
              active={motion === "full"}
              title="Full motion"
              description="Keep transitions and loading animations."
              icon={Sparkles}
              onClick={() => setMotion("full")}
            />
            <OptionCard
              active={motion === "reduced"}
              title="Reduced motion"
              description="Minimize transitions during repeated work."
              icon={ZapOff}
              onClick={() => setMotion("reduced")}
            />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.045] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PanelLeftClose className="h-4 w-4 text-lime-300" />
              Focus Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <OptionCard
              active={focusMode === "off"}
              title="Standard"
              description="Show all sidebar content and assistant prompts."
              icon={Settings}
              onClick={() => setFocusMode("off")}
            />
            <OptionCard
              active={focusMode === "on"}
              title="Focused"
              description="Hide non-essential sidebar promo content."
              icon={PanelLeftClose}
              onClick={() => setFocusMode("on")}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-white/[0.045] shadow-none">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-white">Reset coach preferences</p>
            <p className="mt-1 text-sm text-slate-400">
              Restores the workspace to the default coach experience.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={resetPreferences}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
