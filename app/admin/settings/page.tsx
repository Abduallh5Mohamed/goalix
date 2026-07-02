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
  useGetMfaDevicesQuery,
  useRegenerateMfaBackupCodesMutation,
  useRevokeMfaDeviceMutation,
  useSetup2FAMutation,
  useSetupMfaDeviceMutation,
  useUpdateAcademyMutation,
  useVerifySetup2FAMutation,
  useVerifyMfaDeviceMutation,
  type Setup2FAResponse,
} from "@/lib/store/api/adminApi";
import { useAppDispatch } from "@/lib/store/hooks";
import { setMfaSetupRequired, updateUser } from "@/lib/store/slices/authSlice";
import { CheckCircle, Copy, KeyRound, Loader2, Plus, Save, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";

type AcademyDraft = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  timezone?: string;
  communityWhatsappUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  matchDayOpenMinutesBeforeKickoff?: string;
  lateGraceMinutes?: string;
  autoCloseMinutes?: string;
  qrAttendanceEnabled?: boolean;
  keepQrOpenWhileEventActive?: boolean;
};

const SYSTEM_WEEK_STARTS_ON = "saturday";

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

const normalizeOptionalUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
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

function getMfaVerificationErrorMessage(err: unknown, fallback: string) {
  const message = getApiErrorMessage(err, fallback);

  if (/invalid totp code/i.test(message)) {
    return "This code does not match the active authenticator device. Check that you scanned the newest QR code and that your phone time is set automatically.";
  }

  return message;
}

export default function AcademyProfilePage() {
  const dispatch = useAppDispatch();
  const { data: academy, isLoading } = useGetAcademyQuery();
  const { data: currentUser, isLoading: loadingUser } = useGetCurrentUserQuery();
  const [updateAcademy, { isLoading: saving }] = useUpdateAcademyMutation();
  const [setup2FA, { isLoading: settingUp2FA }] = useSetup2FAMutation();
  const [verifySetup2FA, { isLoading: verifying2FA }] = useVerifySetup2FAMutation();
  const [disable2FA, { isLoading: disabling2FA }] = useDisable2FAMutation();
  const { data: mfaDevices = [] } = useGetMfaDevicesQuery(undefined, {
    skip: !currentUser?.totpEnabled,
  });
  const [setupMfaDevice, { isLoading: settingUpDevice }] = useSetupMfaDeviceMutation();
  const [verifyMfaDevice, { isLoading: verifyingDevice }] = useVerifyMfaDeviceMutation();
  const [revokeMfaDevice, { isLoading: revokingDevice }] = useRevokeMfaDeviceMutation();
  const [regenerateBackupCodes, { isLoading: regeneratingBackupCodes }] =
    useRegenerateMfaBackupCodesMutation();

  const [academyDraft, setAcademyDraft] = useState<AcademyDraft>({});
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [setupData, setSetupData] = useState<Setup2FAResponse | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("Admin phone");
  const [newDeviceSetup, setNewDeviceSetup] = useState<Setup2FAResponse | null>(null);
  const [newDeviceCode, setNewDeviceCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [backupCodesPassword, setBackupCodesPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);
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
  const socialLinks =
    typeof settings.socialLinks === "object" && settings.socialLinks
      ? (settings.socialLinks as Record<string, unknown>)
      : {};
  const facebookUrl =
    academyDraft.facebookUrl ??
    (typeof socialLinks.facebook === "string" ? socialLinks.facebook : "");
  const instagramUrl =
    academyDraft.instagramUrl ??
    (typeof socialLinks.instagram === "string" ? socialLinks.instagram : "");
  const twitterUrl =
    academyDraft.twitterUrl ??
    (typeof socialLinks.twitter === "string" ? socialLinks.twitter : "");
  const linkedinUrl =
    academyDraft.linkedinUrl ??
    (typeof socialLinks.linkedin === "string" ? socialLinks.linkedin : "");
  const timezone =
    academyDraft.timezone ??
    (typeof settings.timezone === "string" ? settings.timezone : "Africa/Cairo");
  const communityWhatsappUrl =
    academyDraft.communityWhatsappUrl ??
    (typeof settings.communityWhatsappUrl === "string" ? settings.communityWhatsappUrl : "");
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
  const mfaAccountLabel = currentUser?.email || currentUser?.username || currentUser?.phone || "admin";

  const getAuthenticatorLabel = (issuer?: string) => `${issuer ?? "Goalix Academy Admin"}:${mfaAccountLabel}`;

  const updateDraft = (field: keyof AcademyDraft, value: string) => {
    setAcademyDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setSaveError("");
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
        settings: {
          ...settings,
          timezone,
          weekStartsOn: SYSTEM_WEEK_STARTS_ON,
          communityWhatsappUrl: normalizeOptionalUrl(communityWhatsappUrl),
          socialLinks: {
            ...socialLinks,
            facebook: normalizeOptionalUrl(facebookUrl),
            instagram: normalizeOptionalUrl(instagramUrl),
            twitter: normalizeOptionalUrl(twitterUrl),
            linkedin: normalizeOptionalUrl(linkedinUrl),
          },
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
    } catch (err) {
      setSaveError(getApiErrorMessage(err, "Could not save academy settings."));
    }
  };

  const handleStart2FA = async () => {
    setSecurityError("");
    setSecurityMessage("");
    setBackupCodes([]);
    setBackupCodesCopied(false);

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
      setBackupCodesCopied(false);
      setSetupData(null);
      setSetupCode("");
      dispatch(updateUser({ totpEnabled: true }));
      dispatch(setMfaSetupRequired(false));
      setSecurityMessage("2FA enabled.");
    } catch (err) {
      setSecurityError(getMfaVerificationErrorMessage(err, "Invalid verification code."));
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
      dispatch(updateUser({ totpEnabled: false }));
      dispatch(setMfaSetupRequired(true));
      setSecurityMessage("2FA disabled. Set it up again before using the admin dashboard.");
    } catch (err) {
      setSecurityError(getApiErrorMessage(err, "Could not disable 2FA."));
    }
  };

  const handleStartDeviceSetup = async () => {
    setSecurityError("");
    setSecurityMessage("");

    try {
      const result = await setupMfaDevice({ deviceName: newDeviceName.trim() || "Admin phone" }).unwrap();
      setNewDeviceSetup(result);
      setNewDeviceCode("");
    } catch (err) {
      setSecurityError(getApiErrorMessage(err, "Could not add MFA device."));
    }
  };

  const handleVerifyDevice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newDeviceSetup?.deviceId) return;
    setSecurityError("");
    setSecurityMessage("");

    try {
      await verifyMfaDevice({
        deviceId: newDeviceSetup.deviceId,
        token: newDeviceCode.trim(),
      }).unwrap();
      setNewDeviceSetup(null);
      setNewDeviceCode("");
      setSecurityMessage("MFA device added.");
    } catch (err) {
      setSecurityError(getMfaVerificationErrorMessage(err, "Invalid device verification code."));
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    setSecurityError("");
    setSecurityMessage("");

    try {
      await revokeMfaDevice(deviceId).unwrap();
      setSecurityMessage("MFA device removed.");
    } catch (err) {
      setSecurityError(getApiErrorMessage(err, "Could not remove MFA device."));
    }
  };

  const handleRegenerateBackupCodes = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSecurityError("");
    setSecurityMessage("");

    try {
      const result = await regenerateBackupCodes(backupCodesPassword).unwrap();
      setBackupCodes(result.backupCodes);
      setBackupCodesCopied(false);
      setBackupCodesPassword("");
      setSecurityMessage("New backup codes generated. Save them now.");
    } catch (err) {
      setSecurityError(getApiErrorMessage(err, "Could not generate backup codes."));
    }
  };

  const handleCopyBackupCodes = async () => {
    if (!backupCodes.length) return;

    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setBackupCodesCopied(true);
      setSecurityMessage("Backup codes copied. Keep them somewhere private.");
    } catch {
      setSecurityError("Could not copy backup codes. Select and copy them manually.");
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

      <div className="space-y-6">
        <div className="space-y-6">
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
              {saveError && <p className="text-sm text-red-400">{saveError}</p>}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">Footer & Social Links</CardTitle>
              <CardDescription>
                These contact details and social links appear on the public homepage footer.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Facebook URL</Label>
                <Input
                  type="url"
                  value={facebookUrl}
                  onChange={(event) => updateDraft("facebookUrl", event.target.value)}
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Instagram URL</Label>
                <Input
                  type="url"
                  value={instagramUrl}
                  onChange={(event) => updateDraft("instagramUrl", event.target.value)}
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Twitter / X URL</Label>
                <Input
                  type="url"
                  value={twitterUrl}
                  onChange={(event) => updateDraft("twitterUrl", event.target.value)}
                  placeholder="https://x.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn URL</Label>
                <Input
                  type="url"
                  value={linkedinUrl}
                  onChange={(event) => updateDraft("linkedinUrl", event.target.value)}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
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
              {saveError && <p className="text-sm text-red-400 sm:col-span-2">{saveError}</p>}
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
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="community-whatsapp-url">WhatsApp Community Link</Label>
                  <Input
                    id="community-whatsapp-url"
                    type="url"
                    value={communityWhatsappUrl}
                    onChange={(event) =>
                      updateDraft("communityWhatsappUrl", event.target.value)
                    }
                    placeholder="https://chat.whatsapp.com/..."
                  />
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
                <div className="space-y-5">
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                    <ShieldCheck className="h-4 w-4" />
                    Admin login requires a 2FA code.
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/50 bg-muted/10 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">Authenticator devices</p>
                        <p className="text-xs text-muted-foreground">
                          Scan a new QR code to add another phone. It will show as Goalix Academy Admin.
                        </p>
                      </div>
                      {!newDeviceSetup && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleStartDeviceSetup}
                          disabled={settingUpDevice}
                          className="gap-1.5"
                        >
                          {settingUpDevice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          Add device
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {mfaDevices.map((device) => (
                        <div
                          key={device.id}
                          className="flex flex-col gap-2 rounded-lg border border-border/40 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{device.deviceName}</p>
                              {device.isPrimary && <Badge variant="success">Primary</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Added {new Date(device.createdAt).toLocaleString()}
                              {device.lastUsedAt ? ` - Last used ${new Date(device.lastUsedAt).toLocaleString()}` : ""}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeDevice(device.id)}
                            disabled={revokingDevice || mfaDevices.length <= 1}
                            className="gap-1.5"
                            title={mfaDevices.length <= 1 ? "Add and verify another device before removing this one." : undefined}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      ))}
                      {!mfaDevices.length && (
                        <p className="rounded-lg border border-dashed border-border/40 p-3 text-sm text-muted-foreground">
                          Your existing MFA device is still active. Add a new device to manage devices here.
                        </p>
                      )}
                    </div>

                    {!newDeviceSetup && (
                      <div className="space-y-2">
                        <Label htmlFor="new-mfa-device-name">New device name</Label>
                        <Input
                          id="new-mfa-device-name"
                          value={newDeviceName}
                          onChange={(event) => setNewDeviceName(event.target.value)}
                          placeholder="Admin phone"
                        />
                      </div>
                    )}

                    {newDeviceSetup && (
                      <form onSubmit={handleVerifyDevice} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                          <div className="rounded-lg border border-border/50 bg-white p-2">
                            <Image
                              src={newDeviceSetup.qrCode}
                              alt="New MFA device QR code"
                              width={164}
                              height={164}
                              unoptimized
                              className="h-[164px] w-[164px]"
                            />
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Authenticator label</Label>
                              <Input value={getAuthenticatorLabel(newDeviceSetup.issuer)} readOnly />
                            </div>
                            <div className="space-y-2">
                              <Label>Secret</Label>
                              <Input value={newDeviceSetup.secret} readOnly className="font-mono text-xs" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new-device-code">Verification code</Label>
                              <Input
                                id="new-device-code"
                                value={newDeviceCode}
                                onChange={(event) => setNewDeviceCode(event.target.value.replace(/\D/g, ""))}
                                inputMode="numeric"
                                maxLength={6}
                                required
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={verifyingDevice || newDeviceCode.length !== 6} className="gap-1.5">
                            {verifyingDevice && <Loader2 className="h-4 w-4 animate-spin" />}
                            Verify device
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setNewDeviceSetup(null)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>

                  <form
                    onSubmit={handleRegenerateBackupCodes}
                    className="space-y-3 rounded-lg border border-border/50 bg-muted/10 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">MFA backup codes</p>
                      <p className="text-xs text-muted-foreground">
                        Existing codes cannot be viewed again. Generate and save a fresh set before signing out.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-backup-codes-password">Admin password</Label>
                      <Input
                        id="admin-backup-codes-password"
                        type="password"
                        value={backupCodesPassword}
                        onChange={(event) => setBackupCodesPassword(event.target.value)}
                        autoComplete="current-password"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={regeneratingBackupCodes || !backupCodesPassword}
                      className="gap-1.5"
                    >
                      {regeneratingBackupCodes ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      Generate new backup codes
                    </Button>
                  </form>

                  <form onSubmit={handleDisable2FA} className="space-y-3">
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
                </div>
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
                            <Label>Authenticator label</Label>
                            <Input value={getAuthenticatorLabel(setupData.issuer)} readOnly />
                          </div>
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Backup codes</p>
                      <p className="text-xs text-muted-foreground">
                        Each code works once. Save them before leaving this page.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyBackupCodes}
                      className="gap-1.5"
                    >
                      <Copy className="h-4 w-4" />
                      {backupCodesCopied ? "Copied" : "Copy"}
                    </Button>
                  </div>
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

      </div>
    </div>
  );
}
