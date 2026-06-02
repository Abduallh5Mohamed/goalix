"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/lib/store/hooks";
import { loginFailure, loginStart, loginSuccess } from "@/lib/store/slices/authSlice";
import { ROLE_ROUTES } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import { rememberAuthSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type Step = "credentials" | "totp" | "backup";

type ApiUser = {
    id: string;
    username?: string | null;
    email?: string | null;
    full_name?: string | null;
    fullName?: string | null;
    role: UserRole;
    avatar_url?: string | null;
    phone?: string | null;
    created_at?: string | null;
};

function buildLoginBody(identifier: string, password: string) {
    const value = identifier.trim();

    if (value.includes("@")) {
        return { email: value, password };
    }

    return { username: value, password };
}

function mapApiUser(apiUser: ApiUser, fallbackName: string) {
    return {
        id: apiUser.id,
        email: apiUser.email ?? "",
        username: apiUser.username ?? undefined,
        fullName: apiUser.full_name ?? apiUser.fullName ?? apiUser.username ?? fallbackName,
        role: apiUser.role,
        avatarUrl: apiUser.avatar_url ?? "",
        phone: apiUser.phone ?? "",
        createdAt: apiUser.created_at ?? new Date().toISOString(),
    };
}

export default function AdminLoginPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();

    const [step, setStep] = useState<Step>("credentials");
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [tempToken, setTempToken] = useState("");
    const [totpCode, setTotpCode] = useState("");
    const [backupCode, setBackupCode] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const completeLogin = (apiUser: ApiUser) => {
        const user = mapApiUser(apiUser, identifier.trim());
        rememberAuthSession();
        dispatch(loginSuccess({ user, role: user.role }));
        router.push(ROLE_ROUTES[user.role]);
    };

    const handleCredentials = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!identifier.trim() || !password) {
            setError("Enter the admin email or coach username and password.");
            return;
        }

        setError("");
        setIsLoading(true);

        try {
            dispatch(loginStart());
            const res = await fetch(`${API_BASE}/api/v1/auth/admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(buildLoginBody(identifier, password)),
                credentials: "include",
            });

            const json = await res.json();

            if (!res.ok) {
                dispatch(loginFailure());
                setError(json.error?.message || "Invalid login credentials.");
                return;
            }

            if (json.data?.requires2FA) {
                setTempToken(json.data.tempToken);
                setStep("totp");
                dispatch(loginFailure());
                return;
            }

            const apiUser: ApiUser | undefined = json.data?.user;
            if (apiUser) {
                completeLogin(apiUser);
                return;
            }

            dispatch(loginFailure());
            setError("Unexpected login response.");
        } catch {
            dispatch(loginFailure());
            setError("Could not connect to the server.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTotpVerify = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!totpCode || totpCode.length !== 6) {
            setError("Enter the 6-digit verification code.");
            return;
        }

        setError("");
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/v1/auth/2fa/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tempToken, token: totpCode }),
                credentials: "include",
            });

            const json = await res.json();
            if (!res.ok) {
                setError(json.error?.message || "Invalid verification code.");
                return;
            }

            const apiUser: ApiUser | undefined = json.data?.user;
            if (apiUser) {
                completeLogin(apiUser);
            }
        } catch {
            setError("Could not connect to the server.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackupVerify = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!backupCode) {
            setError("Enter a backup code.");
            return;
        }

        setError("");
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/v1/auth/2fa/backup-verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tempToken, code: backupCode }),
                credentials: "include",
            });

            const json = await res.json();
            if (!res.ok) {
                setError(json.error?.message || "Invalid backup code.");
                return;
            }

            const apiUser: ApiUser | undefined = json.data?.user;
            if (apiUser) {
                completeLogin(apiUser);
            }
        } catch {
            setError("Could not connect to the server.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                    {step === "credentials" ? (
                        <ShieldCheck className="h-8 w-8 text-primary" />
                    ) : (
                        <KeyRound className="h-8 w-8 text-primary" />
                    )}
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground">Admin / Coach Portal</h1>
                    <p className="text-sm text-muted-foreground">
                        {step === "credentials"
                            ? "Sign in with the account created by the admin"
                            : "Two-factor authentication required"}
                    </p>
                </div>
            </div>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg">
                        {step === "credentials" && "Staff Sign In"}
                        {step === "totp" && "Enter Verification Code"}
                        {step === "backup" && "Enter Backup Code"}
                    </CardTitle>
                    <CardDescription>
                        {step === "credentials" && "Admins and coaches use this login page"}
                        {step === "totp" && "Open your authenticator app and enter the 6-digit code"}
                        {step === "backup" && "Enter one of your backup codes"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === "credentials" && (
                        <form onSubmit={handleCredentials} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="staff-identifier">Admin email / Coach username</Label>
                                <Input
                                    id="staff-identifier"
                                    type="text"
                                    placeholder="admin@example.com or coach.username"
                                    value={identifier}
                                    onChange={(event) => setIdentifier(event.target.value)}
                                    autoComplete="username"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="staff-password">Password</Label>
                                <Input
                                    id="staff-password"
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                            {error && <p className="text-sm text-red-400">{error}</p>}
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign in"
                                )}
                            </Button>
                        </form>
                    )}

                    {step === "totp" && (
                        <form onSubmit={handleTotpVerify} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="totp-code">Verification Code</Label>
                                <Input
                                    id="totp-code"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={totpCode}
                                    onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ""))}
                                    autoFocus
                                    autoComplete="one-time-code"
                                    required
                                    className="text-center text-2xl tracking-[0.5em] font-mono"
                                />
                            </div>
                            {error && <p className="text-sm text-red-400">{error}</p>}
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify"
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full text-muted-foreground"
                                onClick={() => {
                                    setError("");
                                    setStep("backup");
                                }}
                            >
                                Use backup code instead
                            </Button>
                        </form>
                    )}

                    {step === "backup" && (
                        <form onSubmit={handleBackupVerify} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="backup-code">Backup Code</Label>
                                <Input
                                    id="backup-code"
                                    type="text"
                                    placeholder="xxxxxxxx"
                                    value={backupCode}
                                    onChange={(event) => setBackupCode(event.target.value)}
                                    autoFocus
                                    required
                                    className="text-center text-lg font-mono"
                                />
                            </div>
                            {error && <p className="text-sm text-red-400">{error}</p>}
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify Backup Code"
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full text-muted-foreground"
                                onClick={() => {
                                    setError("");
                                    setStep("totp");
                                }}
                            >
                                Use authenticator code instead
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
