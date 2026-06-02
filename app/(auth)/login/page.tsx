"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginRole = "player" | "parent";
type LoginStep = "role" | "credentials";

const roleOptions = [
  {
    role: "player" as const,
    title: "Player",
    subtitle: "Athlete account",
    Icon: UserCheck,
  },
  {
    role: "parent" as const,
    title: "Parent",
    subtitle: "Guardian account",
    Icon: Baby,
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [step, setStep] = useState<LoginStep>("role");
  const [role, setRole] = useState<LoginRole>("player");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectRole = (nextRole: LoginRole) => {
    setRole(nextRole);
    setError("");
    setStep("credentials");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await login(username.trim(), password, role);
    } catch {
      setError("Invalid username, password, or role. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-40px)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-[660px] overflow-hidden rounded-[8px] border border-[#2D9AD5]/20 bg-[#07111f] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.34)] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(45,154,213,0.22),transparent_28%),linear-gradient(145deg,rgba(7,27,44,0.45),rgba(7,17,31,0.96))]" />
        <div className="relative z-10 flex items-center justify-between">
          <Image src="/Logo.png" alt="Goalix" width={126} height={38} priority className="h-auto w-[126px] object-contain" />
          <span className="rounded-full border border-[#B2D23B]/35 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#B2D23B]">
            Match Ready
          </span>
        </div>

        <div className="relative z-10 mt-16 max-w-md">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#2D9AD5]">Goalix Access</p>
          <h1 className="mt-4 font-display text-6xl font-black uppercase leading-[0.9] tracking-normal">
            Performance starts here.
          </h1>
          <p className="mt-5 max-w-sm text-base leading-7 text-slate-300">
            Sign in to continue to your academy workspace.
          </p>
        </div>

        <div className="absolute bottom-0 right-[-62px] h-[520px] w-[520px]">
          <Image
            src="/Player.png"
            alt="Goalix player"
            fill
            sizes="520px"
            className="object-contain object-bottom opacity-90 mix-blend-screen"
            priority
          />
        </div>

        <div className="absolute bottom-8 left-8 right-8 z-10 grid grid-cols-3 gap-3">
          {[
            ["92%", "Readiness"],
            ["10.8", "Distance"],
            ["33.6", "Speed"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-[8px] border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
              <strong className="font-display text-3xl text-white">{value}</strong>
              <p className="mt-1 text-xs font-semibold text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-md">
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
              <ShieldCheck size={24} />
            </div>
            <h1 className="font-display text-4xl font-black uppercase leading-none tracking-normal">
              {step === "role" ? "Choose access" : role === "player" ? "Player login" : "Parent login"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {step === "role"
                ? "Select your account type to continue."
                : "Enter the username and password created by your coach."}
            </p>
          </div>

          {step === "role" ? (
            <div className="space-y-3">
              {roleOptions.map(({ role: optionRole, title, subtitle, Icon }) => (
                <button
                  key={optionRole}
                  type="button"
                  onClick={() => selectRole(optionRole)}
                  className="group flex min-h-[92px] w-full items-center gap-4 rounded-[8px] border border-white/10 bg-[#071B2C]/72 p-4 text-left transition hover:border-[#B2D23B]/50 hover:bg-[#0a243a]"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-[8px] border border-[#2D9AD5]/30 bg-[#2D9AD5]/10 text-[#2D9AD5] transition group-hover:border-[#B2D23B]/45 group-hover:text-[#B2D23B]">
                    <Icon size={24} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold text-white">{title}</span>
                    <span className="mt-1 block text-sm text-slate-400">{subtitle}</span>
                  </span>
                  <ArrowRight className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-[#B2D23B]" size={20} />
                </button>
              ))}
              <p className="pt-3 text-center text-xs text-slate-400">
                Staff members use{" "}
                <Link href="/admin-login" className="font-semibold text-[#2D9AD5] hover:text-[#B2D23B]">
                  admin login
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center justify-between rounded-[8px] border border-white/10 bg-[#071B2C]/72 px-4 py-3 text-sm">
                <span className="text-slate-300">
                  Signing in as <strong className="text-white">{role}</strong>
                </span>
                <button type="button" onClick={() => setStep("role")} className="font-semibold text-[#2D9AD5] hover:text-[#B2D23B]">
                  Change
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-200">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={role === "player" ? "player.username" : "parent.username"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="h-12 border-white/10 bg-[#071B2C]/72 text-white placeholder:text-slate-500 focus-visible:ring-[#2D9AD5]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">Password</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
