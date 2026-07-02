"use client";

import { use, useState } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetCoachByIdQuery,
  useGetCoachGroupsQuery,
  useRegenerateCoachMfaBackupCodesMutation,
  useSetupCoachMfaMutation,
  useUpdateCoachMutation,
  useVerifyCoachMfaMutation,
  type Setup2FAResponse,
} from "@/lib/store/api/adminApi";
import { getInitials } from "@/lib/utils";
import { Edit, Calendar, KeyRound, Loader2, ShieldCheck } from "lucide-react";

type ApiErrorDetails = {
  data?: {
    error?: {
      message?: string;
      details?: { message?: string }[];
    };
  };
};

function getApiErrorMessage(err: unknown, fallback: string) {
  const apiError = err as ApiErrorDetails;
  const detailMessages = apiError.data?.error?.details
    ?.map((detail) => detail.message)
    .filter(Boolean);

  return detailMessages?.length
    ? detailMessages.join(". ")
    : apiError.data?.error?.message ?? fallback;
}

const strongPasswordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

export default function CoachProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resetPassword?: string | string[] | undefined }>;
}) {
  const { id } = use(params);
  const query = use(searchParams);
  const { data: coach, isLoading, error, refetch } = useGetCoachByIdQuery(id);
  const { data: groups } = useGetCoachGroupsQuery(id);
  const [setupCoachMfa, { isLoading: isSettingUpMfa }] = useSetupCoachMfaMutation();
  const [verifyCoachMfa, { isLoading: isVerifyingMfa }] = useVerifyCoachMfaMutation();
  const [regenerateCoachMfaBackupCodes, { isLoading: isRegeneratingCoachBackupCodes }] =
    useRegenerateCoachMfaBackupCodesMutation();
  const [updateCoach, { isLoading: isResettingPassword }] = useUpdateCoachMutation();
  const [mfaOpen, setMfaOpen] = useState(false);
  const [mfaSetup, setMfaSetup] = useState<Setup2FAResponse | null>(null);
  const [mfaDeviceName, setMfaDeviceName] = useState("Coach phone");
  const [mfaToken, setMfaToken] = useState("");
  const [mfaBackupCodes, setMfaBackupCodes] = useState<string[]>([]);
  const [mfaError, setMfaError] = useState("");
  const [mfaMessage, setMfaMessage] = useState("");
  const resetPasswordQueryValue = Array.isArray(query.resetPassword)
    ? query.resetPassword[0]
    : query.resetPassword;
  const [resetPasswordOpen, setResetPasswordOpen] = useState(resetPasswordQueryValue === "1");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState("");
  const [resetPasswordMessage, setResetPasswordMessage] = useState("");

  const closeMfaDialog = () => {
    setMfaOpen(false);
    setMfaSetup(null);
    setMfaToken("");
    setMfaBackupCodes([]);
    setMfaError("");
    setMfaMessage("");
  };

  const openMfaDialog = () => {
    if (!coach) return;
    setMfaDeviceName(`${coach.full_name} phone`);
    setMfaOpen(true);
    setMfaSetup(null);
    setMfaToken("");
    setMfaBackupCodes([]);
    setMfaError("");
    setMfaMessage("");
  };

  const closeResetPasswordDialog = () => {
    setResetPasswordOpen(false);
    setResetPassword("");
    setResetPasswordConfirm("");
    setResetPasswordError("");
    setResetPasswordMessage("");
  };

  const handleResetCoachPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!coach) return;
    setResetPasswordError("");
    setResetPasswordMessage("");

    if (!strongPasswordPattern.test(resetPassword)) {
      setResetPasswordError("Password must be 8+ characters and include uppercase, number, and special character.");
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setResetPasswordError("Password confirmation does not match.");
      return;
    }

    try {
      await updateCoach({
        id: coach.id,
        body: { password: resetPassword },
      }).unwrap();
      setResetPassword("");
      setResetPasswordConfirm("");
      setResetPasswordMessage("Coach password changed. Any open reset request for this coach is now resolved.");
      void refetch();
    } catch (err) {
      setResetPasswordError(getApiErrorMessage(err, "Could not reset coach password."));
    }
  };

  const handleSetupCoachMfa = async (resetExisting = false) => {
    if (!coach) return;
    setMfaError("");
    setMfaMessage("");
    setMfaBackupCodes([]);
    try {
      const result = await setupCoachMfa({
        coachId: coach.id,
        deviceName: mfaDeviceName.trim() || `${coach.full_name} phone`,
        resetExisting,
      }).unwrap();
      setMfaSetup(result);
      setMfaMessage(resetExisting ? "Coach MFA was reset. Scan the new QR code." : "Scan this QR code with the coach authenticator app.");
    } catch (err) {
      setMfaError(getApiErrorMessage(err, "Could not start coach MFA setup."));
    }
  };

  const handleVerifyCoachMfa = async () => {
    if (!coach || !mfaSetup?.deviceId) return;
    setMfaError("");
    setMfaMessage("");
    if (!/^\d{6}$/.test(mfaToken.trim())) {
      setMfaError("Enter the 6-digit code from the coach phone.");
      return;
    }
    try {
      const result = await verifyCoachMfa({
        coachId: coach.id,
        deviceId: mfaSetup.deviceId,
        token: mfaToken.trim(),
      }).unwrap();
      setMfaBackupCodes(result.backupCodes || []);
      setMfaMessage("Coach MFA is active now. The coach can log in with this authenticator.");
      setMfaToken("");
      void refetch();
    } catch (err) {
      setMfaError(getApiErrorMessage(err, "Invalid MFA code."));
    }
  };

  const handleRegenerateCoachBackupCodes = async () => {
    if (!coach) return;
    setMfaError("");
    setMfaMessage("");
    try {
      const result = await regenerateCoachMfaBackupCodes({ coachId: coach.id }).unwrap();
      setMfaBackupCodes(result.backupCodes || []);
      setMfaMessage("New coach backup codes generated. Old coach backup codes are no longer valid.");
    } catch (err) {
      setMfaError(getApiErrorMessage(err, "Could not generate coach backup codes."));
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error || !coach) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Coach not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={coach.full_name}
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Coaches", href: "/admin/coaches" },
          { label: coach.full_name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-1.5">
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={() => setResetPasswordOpen(true)}>
              <KeyRound className="h-4 w-4" />
              Reset Password
            </Button>
            <Button className="gap-1.5" onClick={openMfaDialog}>
              <ShieldCheck className="h-4 w-4" />
              {coach.totp_enabled ? "Manage Coach MFA" : "Add Coach MFA"}
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/50 bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-accent/20 text-2xl font-bold text-accent">
                  {getInitials(coach.full_name)}
                </AvatarFallback>
              </Avatar>
              <h3 className="mt-4 text-lg font-bold">{coach.full_name}</h3>
              <p className="text-sm text-muted-foreground">{coach.specialization ?? "Coach"}</p>
              <div className="mt-6 w-full space-y-3 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date(coach.created_at).toLocaleDateString()}</span>
                </div>
                {coach.bio && (
                  <p className="text-xs text-muted-foreground mt-2">{coach.bio}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatsCard label="Specialization" value={coach.specialization ?? "\u2014"} icon="UserCheck" />
            <StatsCard label="Assigned Groups" value={groups?.length ?? 0} icon="Layers" />
            <StatsCard label="MFA" value={coach.totp_enabled ? "Enabled" : "Not set"} icon="ClipboardCheck" />
          </div>
          <Tabs defaultValue="groups">
            <TabsList>
              <TabsTrigger value="groups">Groups</TabsTrigger>
            </TabsList>
            <TabsContent value="groups" className="mt-4 space-y-3">
              {groups && groups.length > 0 ? (
                groups.map((g) => (
                  <Card key={g.id} className="border-border/50 bg-card">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">Group {g.group_id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">Role: {g.role}</p>
                      </div>
                      <Badge variant="secondary">{g.role}</Badge>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No groups assigned.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={resetPasswordOpen} onOpenChange={(nextOpen) => (nextOpen ? setResetPasswordOpen(true) : closeResetPasswordDialog())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Coach Password</DialogTitle>
            <DialogDescription>
              Change the coach login password. The username stays locked and will not change.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetCoachPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coach-reset-username">Username</Label>
              <Input id="coach-reset-username" value={coach.username ?? "No username"} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coach-reset-password">New password</Label>
              <Input
                id="coach-reset-password"
                type="password"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coach-reset-password-confirm">Confirm password</Label>
              <Input
                id="coach-reset-password-confirm"
                type="password"
                value={resetPasswordConfirm}
                onChange={(event) => setResetPasswordConfirm(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            {resetPasswordError && <p className="text-sm text-red-400">{resetPasswordError}</p>}
            {resetPasswordMessage && <p className="text-sm text-emerald-400">{resetPasswordMessage}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeResetPasswordDialog}>
                Close
              </Button>
              <Button type="submit" disabled={isResettingPassword} className="gap-2">
                {isResettingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={mfaOpen} onOpenChange={(nextOpen) => (nextOpen ? setMfaOpen(true) : closeMfaDialog())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Coach MFA</DialogTitle>
            <DialogDescription>
              This creates an authenticator device for {coach.full_name}. The verification code must come from the coach phone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-lg border border-border/70 bg-card/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="coach-detail-mfa-device-name">Device name</Label>
                  <Input
                    id="coach-detail-mfa-device-name"
                    value={mfaDeviceName}
                    onChange={(event) => setMfaDeviceName(event.target.value)}
                    placeholder="Coach phone"
                  />
                </div>
                <Button
                  type="button"
                  className="gap-2"
                  disabled={isSettingUpMfa}
                  onClick={() => handleSetupCoachMfa(false)}
                >
                  {isSettingUpMfa ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {coach.totp_enabled ? "Add Device" : "Start Setup"}
                </Button>
                {coach.totp_enabled && (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isSettingUpMfa}
                    onClick={() => handleSetupCoachMfa(true)}
                  >
                    Reset MFA
                  </Button>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                The authenticator app entry will show as Goalix Academy Coach.
              </p>
            </div>

            {mfaSetup && (
              <div className="grid gap-5 rounded-lg border border-border/70 bg-card/40 p-4 sm:grid-cols-[220px_1fr]">
                <div className="flex justify-center rounded-lg bg-white p-3">
                  <Image
                    src={mfaSetup.qrCode}
                    alt="Coach MFA QR code"
                    width={192}
                    height={192}
                    unoptimized
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Issuer</Label>
                    <Input value={mfaSetup.issuer ?? "Goalix Academy Coach"} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>Manual secret</Label>
                    <Input value={mfaSetup.secret} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coach-detail-mfa-token">6-digit coach code</Label>
                    <Input
                      id="coach-detail-mfa-token"
                      value={mfaToken}
                      onChange={(event) => setMfaToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                    />
                  </div>
                  <Button
                    type="button"
                    className="gap-2"
                    disabled={isVerifyingMfa || mfaToken.length !== 6}
                    onClick={handleVerifyCoachMfa}
                  >
                    {isVerifyingMfa && <Loader2 className="h-4 w-4 animate-spin" />}
                    Verify Coach Device
                  </Button>
                </div>
              </div>
            )}

            {coach.totp_enabled && (
              <div className="rounded-lg border border-border/70 bg-card/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">Coach backup codes</p>
                    <p className="text-sm text-muted-foreground">
                      Generate replacement backup codes for this coach. Old coach codes will stop working.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    disabled={isRegeneratingCoachBackupCodes}
                    onClick={handleRegenerateCoachBackupCodes}
                  >
                    {isRegeneratingCoachBackupCodes ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    Generate Codes
                  </Button>
                </div>
              </div>
            )}

            {mfaBackupCodes.length > 0 && (
              <div className="rounded-lg border border-lime-400/30 bg-lime-400/10 p-4">
                <p className="font-medium text-lime-200">Backup codes</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {mfaBackupCodes.map((code) => (
                    <code key={code} className="rounded-md bg-background/70 px-3 py-2 text-sm text-foreground">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {mfaMessage && <p className="text-sm text-lime-300">{mfaMessage}</p>}
            {mfaError && <p className="text-sm text-red-400">{mfaError}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
