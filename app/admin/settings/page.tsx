"use client";

import { useState } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDisable2FAMutation,
  useGetAcademyQuery,
  useGetCurrentUserQuery,
  useSetup2FAMutation,
  useUpdateAcademyMutation,
  useVerifySetup2FAMutation,
  type Setup2FAResponse,
} from "@/lib/store/api/adminApi";
import { Building, CheckCircle, KeyRound, Loader2, Save, ShieldCheck, ShieldOff } from "lucide-react";

type AcademyDraft = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  weekStartsOn?: string;
  matchDayOpenMinutesBeforeKickoff?: string;
  lateGraceMinutes?: string;
  autoCloseMinutes?: string;
  qrAttendanceEnabled?: boolean;
  keepQrOpenWhileEventActive?: boolean;
};

const numberDraft = (
  draftValue: string | undefined,
  storedValue: unknown,
  fallback: number,
) => draftValue ?? String(typeof storedValue === "number" ? storedValue : fallback);

const booleanDraft = (
  draftValue: boolean | undefined,
  storedValue: unknown,
  fallback: boolean,
) => draftValue ?? (typeof storedValue === "boolean" ? storedValue : fallback);

const clampInt = (value: string, min: number, max: number, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
};

function getApiErrorMessage(err: unknown, fallback: string) {
  if (
    typeof err === "object" &&
    err &&
    "data" in err &&
    typeof err.data === "object" &&
    err.data &&
    "error" in err.data &&
    typeof err.data.error === "object" &&
    err.data.error &&
    "message" in err.data.error
  ) {
    return String(err.data.error.message);
  }

  return fallback;
}

export default function AcademyProfilePage() {
  const { data: academy, isLoading } = useGetAcademyQuery();
  const { data: currentUser, isLoading: loadingUser } = useGetCurrentUserQuery();
  const [updateAcademy, { isLoading: saving }] = useUpdateAcademyMutation();
  const [setup2FA, { isLoading: settingUp2FA }] = useSetup2FAMutation();
  const [verifySetup2FA, { isLoading: verifying2FA }] = useVerifySetup2FAMutation();
  const [disable2FA, { isLoading: disabling2FA }] = useDisable2FAMutation();

  const [academyDraft, setAcademyDraft] = useState<AcademyDraft>({});
  const [saved, setSaved] = useState(false);
  const [setupData, setSetupData] = useState<Setup2FAResponse | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityError, setSecurityError] = useState("");

  const settings = (academy?.settings ?? {}) as Record<string, unknown>;
  const attendanceSettings =
    typeof settings.attendance === "object" && settings.attendance
      ? (settings.attendance as Record<string, unknown>)
      : {};
  const academyName = academyDraft.name ?? academy?.name ?? "";
  const academyEmail = academyDraft.email ?? academy?.email ?? "";
  const academyPhone = academyDraft.phone ?? academy?.phone ?? "";
  const academyAddress = academyDraft.address ?? academy?.address ?? "";
  const academyLogoUrl = academyDraft.logoUrl ?? academy?.logo_url ?? "";
  const timezone =
    academyDraft.timezone ??
    (typeof settings.timezone === "string" ? settings.timezone : "Africa/Cairo");
  const currency =
    academyDraft.currency ??
    (typeof settings.currency === "string" ? settings.currency : "EGP");
  const language =
    academyDraft.language ??
    (typeof settings.language === "string" ? settings.language : "en");
  const weekStartsOn =
    academyDraft.weekStartsOn ??
    (typeof settings.weekStartsOn === "string" ? settings.weekStartsOn : "saturday");
  const matchDayOpenMinutesBeforeKickoff =
    numberDraft(
      academyDraft.matchDayOpenMinutesBeforeKickoff,
      settings.matchDayOpenMinutesBeforeKickoff,
      5,
    );
  const lateGraceMinutes = numberDraft(
    academyDraft.lateGraceMinutes,
    attendanceSettings.lateGraceMinutes,
    10,
  );
  const autoCloseMinutes = numberDraft(
    academyDraft.autoCloseMinutes,
    attendanceSettings.autoCloseMinutes,
    30,
  );
  const qrAttendanceEnabled = booleanDraft(
    academyDraft.qrAttendanceEnabled,
    attendanceSettings.qrAttendanceEnabled,
    true,
  );
  const keepQrOpenWhileEventActive = booleanDraft(
    academyDraft.keepQrOpenWhileEventActive,
    attendanceSettings.keepQrOpenWhileEventActive,
    true,
  );
  const totpEnabled = Boolean(currentUser?.totpEnabled);

  const updateDraft = (field: keyof AcademyDraft, value: string) => {
    setAcademyDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const safeMatchDayOpenMinutes = clampInt(
        matchDayOpenMinutesBeforeKickoff,
        0,
        240,
        5,
      );
      await updateAcademy({
        name: academyName.trim(),
        email: academyEmail.trim() || null,
        phone: academyPhone.trim() || null,
        address: academyAddress.trim() || null,
        logoUrl: academyLogoUrl.trim() || null,
        settings: {
          ...settings,
          timezone,
          currency,
          language,
          weekStartsOn,
          matchDayOpenMinutesBeforeKickoff: safeMatchDayOpenMinutes,
          attendance: {
            ...attendanceSettings,
            qrAttendanceEnabled,
            keepQrOpenWhileEventActive,
            lateGraceMinutes: clampInt(lateGraceMinutes, 0, 120, 10),
            autoCloseMinutes: clampInt(autoCloseMinutes, 0, 240, 30),
          },
        },
      }).unwrap();
      setAcademyDraft({});
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch {
      // handled by RTK Query state
    }
  };

  const handleStart2FA = async () => {
    setSecurityError("");
    setSecurityMessage("");
    setBackupCodes([]);

    try {
      const result = await setup2FA().unwrap();
      setSetupData(result);
      setSetupCode("");
    } catch (err) {
      setSecurityError(getApiErrorMessage(err, "Could not start 2FA setup."));
    }
  };

  const handleVerify2FA = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSecurityError("");
    setSecurityMessage("");

    try {
      const result = await verifySetup2FA(setupCode.trim()).unwrap();
      setBackupCodes(result.backupCodes);
      setSetupData(null);
      setSetupCode("");
      setSecurityMessage("2FA enabled.");
    } catch (err) {
      setSecurityError(getApiErrorMessage(err, "Invalid verification code."));
    }
  };

  const handleDisable2FA = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSecurityError("");
    setSecurityMessage("");

    try {
      await disable2FA(disablePassword).unwrap();
      setDisablePassword("");
      setBackupCodes([]);
      setSetupData(null);
      setSecurityMessage("2FA disabled.");
    } catch (err) {
      setSecurityError(getApiErrorMessage(err, "Could not disable 2FA."));
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Academy Profile"
        description="Manage your academy information and admin security."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Settings" },
          { label: "Academy Profile" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Academy Name</Label>
                <Input value={academyName} onChange={(event) => updateDraft("name", event.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={academyEmail} onChange={(event) => updateDraft("email", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={academyPhone} onChange={(event) => updateDraft("phone", event.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={academyAddress} onChange={(event) => updateDraft("address", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={academyLogoUrl}
                  onChange={(event) => updateDraft("logoUrl", event.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="match-day-open-minutes">
                  Match Day opens before kick-off
                </Label>
                <Input
                  id="match-day-open-minutes"
                  type="number"
                  min={0}
                  max={240}
                  step={1}
                  value={matchDayOpenMinutesBeforeKickoff}
                  onChange={(event) =>
                    updateDraft(
                      "matchDayOpenMinutesBeforeKickoff",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="flex items-center gap-3">
                <Button className="gap-1.5" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                {saved && (
                  <span className="flex items-center gap-1 text-sm text-emerald-400">
                    <CheckCircle className="h-4 w-4" /> Saved
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">System Defaults</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={timezone}
                    onValueChange={(value) => updateDraft("timezone", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Cairo">Africa/Cairo</SelectItem>
                      <SelectItem value="Asia/Riyadh">Asia/Riyadh</SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={currency}
                    onValueChange={(value) => updateDraft("currency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EGP">EGP</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={language}
                    onValueChange={(value) => updateDraft("language", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Week Starts On</Label>
                  <Select
                    value={weekStartsOn}
                    onValueChange={(value) => updateDraft("weekStartsOn", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saturday">Saturday</SelectItem>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Late Grace Minutes</Label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={lateGraceMinutes}
                    onChange={(event) =>
                      updateDraft("lateGraceMinutes", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Auto Close Minutes</Label>
                  <Input
                    type="number"
                    min={0}
                    max={240}
                    value={autoCloseMinutes}
                    onChange={(event) =>
                      updateDraft("autoCloseMinutes", event.target.value)
                    }
                  />
                </div>
              </div>
              <label className="flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
                <span>QR Attendance</span>
                <input
                  type="checkbox"
                  checked={qrAttendanceEnabled}
                  onChange={(event) =>
                    setAcademyDraft((current) => ({
                      ...current,
                      qrAttendanceEnabled: event.target.checked,
                    }))
                  }
                />
              </label>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Admin Login Security</CardTitle>
                <CardDescription>Two-factor authentication for this admin account.</CardDescription>
              </div>
              <Badge variant={totpEnabled ? "success" : "secondary"}>
                {loadingUser ? "Checking" : totpEnabled ? "2FA On" : "2FA Off"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-5">
              {totpEnabled ? (
                <form onSubmit={handleDisable2FA} className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                    <ShieldCheck className="h-4 w-4" />
                    Admin login requires a 2FA code.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disable-2fa-password">Admin password</Label>
                    <Input
                      id="disable-2fa-password"
                      type="password"
                      value={disablePassword}
                      onChange={(event) => setDisablePassword(event.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <Button type="submit" variant="outline" disabled={disabling2FA} className="gap-1.5">
                    {disabling2FA ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                    Disable 2FA
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
                    <ShieldOff className="h-4 w-4" />
                    Admin login currently does not require 2FA.
                  </div>
                  {!setupData ? (
                    <Button onClick={handleStart2FA} disabled={settingUp2FA || loadingUser} className="gap-1.5">
                      {settingUp2FA ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      Enable 2FA
                    </Button>
                  ) : (
                    <form onSubmit={handleVerify2FA} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                        <div className="rounded-lg border border-border/50 bg-white p-2">
                          <Image
                            src={setupData.qrCode}
                            alt="2FA QR code"
                            width={164}
                            height={164}
                            unoptimized
                            className="h-[164px] w-[164px]"
                          />
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>Secret</Label>
                            <Input value={setupData.secret} readOnly className="font-mono text-xs" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="setup-2fa-code">Verification code</Label>
                            <Input
                              id="setup-2fa-code"
                              value={setupCode}
                              onChange={(event) => setSetupCode(event.target.value.replace(/\D/g, ""))}
                              inputMode="numeric"
                              maxLength={6}
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={verifying2FA} className="gap-1.5">
                          {verifying2FA && <Loader2 className="h-4 w-4 animate-spin" />}
                          Verify & Enable
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setSetupData(null)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {backupCodes.length > 0 && (
                <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-sm font-medium">Backup codes</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {backupCodes.map((code) => (
                      <code key={code} className="rounded bg-background px-2 py-1 text-sm">
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {securityMessage && <p className="text-sm text-emerald-400">{securityMessage}</p>}
              {securityError && <p className="text-sm text-red-400">{securityError}</p>}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50 bg-card h-fit">
          <CardHeader>
            <CardTitle className="text-base">Logo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/50">
              {academyLogoUrl ? (
                <span className="px-3 text-center text-xs text-muted-foreground">
                  Logo URL saved
                </span>
              ) : (
                <Building className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <p className="break-all text-center text-xs text-muted-foreground">
              {academyLogoUrl || "No logo URL"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
