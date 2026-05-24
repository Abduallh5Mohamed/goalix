"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Baby, Loader2, UserCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type LoginRole = "player" | "parent";
type LoginStep = "role" | "credentials";

export default function LoginPage() {
  const { login } = useAuth();
  const [step, setStep] = useState<LoginStep>("role");
  const [role, setRole] = useState<LoginRole>("player");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/Logo.png"
          alt="GOLX Sports Academy"
          width={64}
          height={64}
          className="rounded-xl"
          style={{ width: "auto", height: "auto" }}
        />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">GOLX Sports Academy</h1>
          <p className="text-sm text-muted-foreground">Sign in with your coach-provided player or parent account</p>
        </div>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            {step === "role" ? "Choose your role" : role === "player" ? "Player login" : "Parent login"}
          </CardTitle>
          <CardDescription>
            {step === "role"
              ? "Select whether this account is for a player or a parent"
              : "Enter the username and password created by your coach"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "role" ? (
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => selectRole("player")}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all hover:border-primary/50 hover:bg-primary/5",
                  "border-border/50"
                )}
              >
                <UserCheck className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Player</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Athlete account</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectRole("parent")}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all hover:border-primary/50 hover:bg-primary/5",
                  "border-border/50"
                )}
              >
                <Baby className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Parent</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Guardian account</p>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Signing in as <span className="font-medium text-foreground">{role}</span>
                <button
                  type="button"
                  onClick={() => setStep("role")}
                  className="ml-2 text-primary hover:underline"
                >
                  Change
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={role === "player" ? "player.username" : "parent.username"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <p className="text-center text-xs text-muted-foreground">
                Coaches and admins use{" "}
                <Link href="/admin-login" className="text-primary hover:underline">
                  admin login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
