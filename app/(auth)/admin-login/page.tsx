"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    ArrowRight,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    LockKeyhole,
    ShieldCheck,
    UserCheck,
} from "lucide-react";
import { useAppDispatch } from "@/lib/store/hooks";
import { loginFailure, loginStart, loginSuccess } from "@/lib/store/slices/authSlice";
import { ROLE_ROUTES } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import { rememberAuthSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    const [showPassword, setShowPassword] = useState(false);
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

    const title = step === "credentials" ? "Staff portal" : step === "totp" ? "Verify access" : "Backup code";
    const description =
        step === "credentials"
            ? "Admins and coaches sign in here."
            : step === "totp"
              ? "Enter the 6-digit code from your authenticator app."
              : "Use one of your saved backup codes.";

    return (
        <div className="mx-auto grid min-h-[calc(100dvh-40px)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="mx-auto w-full max-w-md lg:order-2">
                <div className="mb-7 flex items-center justify-between">
                    <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-slate-200 transition hover:border-[#2D9AD5]/45 hover:text-white">
                        <ArrowLeft size={16} />
                        Home
                    </Link>
                    <Image src="/Logo.png" alt="Goalix" width={112} height={34} priority className="h-auto w-[112px] object-contain lg:hidden" />
                </div>

                <div className="rounded-[8px] border border-[#2D9AD5]/20 bg-white/[0.07] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-7">
                    <div className="mb-7">
                        <div className="mb-4 grid h-12 w-12 place-items-center rounded-[8px] border border-[#B2D23B]/30 bg-[#B2D23B]/10 text-[#B2D23B]">
                            {step === "credentials" ? <ShieldCheck size={24} /> : <KeyRound size={24} />}
                        </div>
                        <h1 className="font-display text-4xl font-black uppercase leading-none tracking-normal">{title}</h1>
                        <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
                    </div>

                    {step === "credentials" && (
                        <form onSubmit={handleCredentials} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="staff-identifier" className="text-slate-200">Admin email / Coach username</Label>
                                <div className="relative">
                                    <UserCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                    <Input
                                        id="staff-identifier"
                                        type="text"
                                        placeholder="admin@example.com or coach.username"
                                        value={identifier}
                                        onChange={(event) => setIdentifier(event.target.value)}
                                        autoComplete="username"
                                        required
                                        className="h-12 border-white/10 bg-[#071B2C]/72 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-[#2D9AD5]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="staff-password" className="text-slate-200">Password</Label>
                                <div className="relative">
                                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                    <Input
                                        id="staff-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        autoComplete="current-password"
                                        required
                                        className="h-12 border-white/10 bg-[#071B2C]/72 pl-10 pr-12 text-white placeholder:text-slate-500 focus-visible:ring-[#2D9AD5]"
                                    />
                                    <button
                                        type="button"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        onClick={() => setShowPassword((current) => !current)}
                                        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[8px] text-slate-400 transition hover:bg-white/10 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            {error && (
                                <p className="rounded-[8px] border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                                    {error}
                                </p>
                            )}
                            <Button type="submit" size="lg" className="h-12 w-full rounded-[8px] bg-gradient-to-r from-[#B2D23B] via-[#51B848] to-[#2D9AD5] font-bold text-[#07111f] hover:opacity-95" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign in
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </Button>
                            <p className="text-center text-xs text-slate-400">
                                Player or parent?{" "}
                                <Link href="/login" className="font-semibold text-[#2D9AD5] hover:text-[#B2D23B]">
                                    Use academy login
                                </Link>
                            </p>
                        </form>
                    )}

                    {step === "totp" && (
                        <form onSubmit={handleTotpVerify} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="totp-code" className="text-slate-200">Verification Code</Label>
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
                                    className="h-14 border-white/10 bg-[#071B2C]/72 text-center font-mono text-2xl tracking-[0.45em] text-white placeholder:text-slate-600 focus-visible:ring-[#2D9AD5]"
                                />
                            </div>
                            {error && (
                                <p className="rounded-[8px] border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                                    {error}
                                </p>
                            )}
                            <Button type="submit" size="lg" className="h-12 w-full rounded-[8px] bg-gradient-to-r from-[#B2D23B] via-[#51B848] to-[#2D9AD5] font-bold text-[#07111f] hover:opacity-95" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify"
                                )}
                            </Button>
                            <button
                                type="button"
                                className="h-11 w-full rounded-[8px] border border-white/10 text-sm font-semibold text-slate-300 transition hover:border-[#2D9AD5]/40 hover:text-white"
                                onClick={() => {
                                    setError("");
                                    setStep("backup");
                                }}
                            >
                                Use backup code instead
                            </button>
                        </form>
                    )}

                    {step === "backup" && (
                        <form onSubmit={handleBackupVerify} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="backup-code" className="text-slate-200">Backup Code</Label>
                                <Input
                                    id="backup-code"
                                    type="text"
                                    placeholder="xxxxxxxx"
                                    value={backupCode}
                                    onChange={(event) => setBackupCode(event.target.value)}
                                    autoFocus
                                    required
                                    className="h-12 border-white/10 bg-[#071B2C]/72 text-center font-mono text-lg text-white placeholder:text-slate-600 focus-visible:ring-[#2D9AD5]"
                                />
                            </div>
                            {error && (
                                <p className="rounded-[8px] border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                                    {error}
                                </p>
                            )}
                            <Button type="submit" size="lg" className="h-12 w-full rounded-[8px] bg-gradient-to-r from-[#B2D23B] via-[#51B848] to-[#2D9AD5] font-bold text-[#07111f] hover:opacity-95" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify Backup Code"
                                )}
                            </Button>
                            <button
                                type="button"
                                className="h-11 w-full rounded-[8px] border border-white/10 text-sm font-semibold text-slate-300 transition hover:border-[#2D9AD5]/40 hover:text-white"
                                onClick={() => {
                                    setError("");
                                    setStep("totp");
                                }}
                            >
                                Use authenticator code instead
                            </button>
                        </form>
                    )}
                </div>
            </section>

            <section className="relative hidden min-h-[660px] overflow-hidden rounded-[8px] border border-[#2D9AD5]/20 bg-[#07111f] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.34)] lg:block">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_12%,rgba(178,210,59,0.18),transparent_30%),linear-gradient(145deg,rgba(7,27,44,0.44),rgba(7,17,31,0.98))]" />
                <div className="relative z-10 flex items-center justify-between">
                    <Image src="/Logo.png" alt="Goalix" width={126} height={38} priority className="h-auto w-[126px] object-contain" />
                    <span className="rounded-full border border-[#2D9AD5]/35 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#2D9AD5]">
                        Staff Access
                    </span>
                </div>

                <div className="relative z-10 mt-16 max-w-md">
                    <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#B2D23B]">Command Center</p>
                    <h1 className="mt-4 font-display text-6xl font-black uppercase leading-[0.9] tracking-normal">
                        Control the academy flow.
                    </h1>
                    <p className="mt-5 max-w-sm text-base leading-7 text-slate-300">
                        Manage training, attendance, players and match operations.
                    </p>
                </div>

                <div className="absolute bottom-8 left-8 right-8 z-10 grid grid-cols-2 gap-3">
                    {[
                        ["Admin", "Academy OS"],
                        ["Coach", "Team Hub"],
                        ["2FA", "Protected"],
                        ["Live", "Operations"],
                    ].map(([value, label]) => (
                        <div key={label} className="rounded-[8px] border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                            <strong className="font-display text-3xl text-white">{value}</strong>
                            <p className="mt-1 text-xs font-semibold text-slate-400">{label}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
