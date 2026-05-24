"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";
import { Shield, Dumbbell, UserCheck, Baby, Loader2 } from "lucide-react";
import Link from "next/link";
import { GoalixLogo } from "@/components/shared/GoalixLogo";

const roleIcons: Record<UserRole, React.ReactNode> = {
  admin: <Shield className="h-5 w-5" />,
  coach: <Dumbbell className="h-5 w-5" />,
  player: <UserCheck className="h-5 w-5" />,
  parent: <Baby className="h-5 w-5" />,
};

const roleDescriptions: Record<UserRole, string> = {
  admin: "Full academy management",
  coach: "Groups, attendance & evaluations",
  player: "My performance & training",
  parent: "Child progress & payments",
};

export default function LoginPage() {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email || "demo@goalix.com", password || "demo", selectedRole);
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3.5">
        <GoalixLogo size="lg" />
        <p className="text-sm text-muted-foreground">Sign in to your account</p>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Select Your Role</CardTitle>
          <CardDescription>Choose how you want to sign in</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Role Selector */}
          <div className="mb-6 grid grid-cols-2 gap-2">
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all",
                  selectedRole === role
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 bg-transparent text-muted-foreground hover:border-border hover:bg-muted/30"
                )}
              >
                {roleIcons[role]}
                <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
                <span className="text-[10px] leading-tight opacity-70">
                  {roleDescriptions[role]}
                </span>
              </button>
            ))}
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="demo@goalix.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter any password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                `Sign in as ${ROLE_LABELS[selectedRole]}`
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Forgot your password?
            </Link>
          </div>

          <div className="mt-4 rounded-lg border border-dashed border-border/50 bg-muted/20 p-3 text-center">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-primary">Demo Mode:</span>{" "}
              Select any role and click sign in. No credentials required.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
