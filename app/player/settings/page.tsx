"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Languages,
  Maximize2,
  Minimize2,
  Moon,
  Move,
  PanelLeftClose,
  RotateCcw,
  Settings,
  Sparkles,
  Sun,
  ZapOff,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { cn, getInitials } from "@/lib/utils";

type DashboardLanguage = "en" | "ar";
type DashboardTheme = "light" | "dark";
type DashboardDensity = "comfortable" | "compact";
type DashboardMotion = "full" | "reduced";
type DashboardFocus = "off" | "on";

const keys = {
  language: "goalix-dashboard-language",
  theme: "goalix-dashboard-theme",
  density: "goalix-dashboard-density",
  motion: "goalix-dashboard-motion",
  focus: "goalix-dashboard-focus",
  notifications: "goalix-player-browser-notifications",
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

function OptionCard({
  active,
  title,
  description,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-24 items-start gap-3 rounded-lg border p-4 text-left transition",
        active
          ? "border-cyan-300/45 bg-cyan-400/10 text-white shadow-[0_0_24px_rgba(34,211,238,0.08)]"
          : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.055]",
      )}
    >
      <span
        className={cn(
          "rounded-lg p-2",
          active ? "bg-cyan-300/15 text-cyan-100" : "bg-white/[0.05] text-slate-300",
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

export default function PlayerSettingsPage() {
  const { user } = useCurrentUser();
  const [language, setLanguage] = useState<DashboardLanguage>(() =>
    readPreference(keys.language, ["en", "ar"] as const, "en"),
  );
  const [theme, setTheme] = useState<DashboardTheme>(() =>
    readPreference(keys.theme, ["light", "dark"] as const, "light"),
  );
  const [density, setDensity] = useState<DashboardDensity>(() =>
    readPreference(keys.density, ["comfortable", "compact"] as const, "comfortable"),
  );
  const [motion, setMotion] = useState<DashboardMotion>(() =>
    readPreference(keys.motion, ["full", "reduced"] as const, "full"),
  );
  const [focusMode, setFocusMode] = useState<DashboardFocus>(() =>
    readPreference(keys.focus, ["off", "on"] as const, "off"),
  );
  const [browserNotifications, setBrowserNotifications] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(keys.notifications) === "on";
  });
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | "unsupported">(() => {
      if (typeof window === "undefined") return "default";
      return "Notification" in window
        ? window.Notification.permission
        : "unsupported";
    });

  const dashboardSettings = useMemo(
    () => ({ language, theme, density, motion, focusMode }),
    [density, focusMode, language, motion, theme],
  );

  useEffect(() => {
    window.localStorage.setItem(keys.language, language);
    window.localStorage.setItem(keys.theme, theme);
    window.localStorage.setItem(keys.density, density);
    window.localStorage.setItem(keys.motion, motion);
    window.localStorage.setItem(keys.focus, focusMode);
    emitDashboardSettings(dashboardSettings);
  }, [dashboardSettings, density, focusMode, language, motion, theme]);

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
    setBrowserNotifications(false);
    window.localStorage.setItem(keys.notifications, "off");
  };

  const summary = [
    language === "ar" ? "Arabic" : "English",
    theme === "dark" ? "Dark" : "Light",
    density === "compact" ? "Compact" : "Comfortable",
    motion === "reduced" ? "Reduced motion" : "Full motion",
    focusMode === "on" ? "Focus mode" : "Standard mode",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Player Settings"
        description="Tune the dashboard behavior on this device."
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Settings" },
        ]}
      />

      <Card className="border-white/10 bg-white/[0.045] shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-cyan-400/10 text-lg font-bold text-cyan-100">
              {getInitials(user?.fullName || "Player")}
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                {user?.fullName || "Player"}
              </p>
              <p className="text-sm text-slate-400">
                Preferences are saved for this browser.
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
              description="Brighter surfaces for daytime use."
              icon={Sun}
              onClick={() => setTheme("light")}
            />
            <OptionCard
              active={theme === "dark"}
              title="Dark"
              description="Darker surfaces for low-light sessions."
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
              description="More breathing room between dashboard elements."
              icon={Maximize2}
              onClick={() => setDensity("comfortable")}
            />
            <OptionCard
              active={density === "compact"}
              title="Compact"
              description="Tighter spacing for scanning more data at once."
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
              description="Keep transitions and animated loaders enabled."
              icon={Sparkles}
              onClick={() => setMotion("full")}
            />
            <OptionCard
              active={motion === "reduced"}
              title="Reduced motion"
              description="Minimize transitions across the player dashboard."
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
              description="Show all dashboard panels and sidebar extras."
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={browserNotifications ? "outline" : "default"}
              onClick={toggleBrowserNotifications}
              disabled={notificationPermission === "unsupported"}
            >
              {browserNotifications ? "Turn off" : "Turn on"}
            </Button>
            <Button type="button" variant="outline" onClick={resetPreferences}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
