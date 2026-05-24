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

  const name = academyDraft.name ?? academy?.name ?? "";
  const email = academyDraft.email ?? academy?.email ?? "";
  const phone = academyDraft.phone ?? academy?.phone ?? "";
  const address = academyDraft.address ?? academy?.address ?? "";
  const totpEnabled = Boolean(currentUser?.totpEnabled);

  const updateDraft = (field: keyof AcademyDraft, value: string) => {
    setAcademyDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateAcademy({ name, email, phone, address }).unwrap();
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
                <Input value={name} onChange={(event) => updateDraft("name", event.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(event) => updateDraft("email", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(event) => updateDraft("phone", event.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={address} onChange={(event) => updateDraft("address", event.target.value)} />
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
              <Building className="h-12 w-12 text-muted-foreground" />
            </div>
            <Button variant="outline" size="sm">Upload Logo</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
