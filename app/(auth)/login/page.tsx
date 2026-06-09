"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  LockKeyhole,
  UserCheck,
} from "lucide-react";
import { GoalixAuthShell } from "@/components/auth/GoalixAuthShell";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginRole = "player" | "parent";

export default function LoginPage() {
  const { login } = useAuth();
  const [role, setRole] = useState<LoginRole>("player");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    <GoalixAuthShell
      badge="Seamless academy access"
      headline={
        <>
          Smarter <span>decisions.</span>
          <br />
          Better <span>results.</span>
        </>
      }
      description="AI-powered football insights for players and families, ready across desktop, tablet and mobile."
      metricLabel="Performance excellence"
      metricValue="82"
    >
      <div className="goalix-login-card">
        <div className="goalix-login-card-head">
          <div className="goalix-login-card-icon">
            <UserCheck size={24} />
          </div>
          <span>Goalix account</span>
          <h1>Welcome Back</h1>
          <p>Log in to your player or parent workspace.</p>
        </div>

        <form onSubmit={handleSubmit} className="goalix-login-form">
          <div className="goalix-login-role-switch" role="tablist" aria-label="Login role">
            <button
              type="button"
              className={role === "player" ? "is-active" : ""}
              onClick={() => setRole("player")}
            >
              Player
            </button>
            <button
              type="button"
              className={role === "parent" ? "is-active" : ""}
              onClick={() => setRole("parent")}
            >
              Parent
            </button>
          </div>

          <div className="goalix-login-field">
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

          <div className="goalix-login-field">
            <Label htmlFor="password">Password</Label>
            <div className="goalix-login-password">
              <LockKeyhole aria-hidden="true" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <div className="goalix-login-form-row">
            <label>
              <input type="checkbox" defaultChecked />
              <span>Remember me</span>
            </label>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>

          {error && (
            <p className="goalix-login-error">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="goalix-login-submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Log In
                <ArrowRight size={18} />
              </>
            )}
          </Button>

          <div className="goalix-login-divider">
            <span />
            <small>or continue with</small>
            <span />
          </div>
          <div className="goalix-login-socials">
            <button type="button">G</button>
            <button type="button">Apple</button>
            <button type="button">MS</button>
          </div>
          <p className="goalix-login-alt-link">
            Staff members use{" "}
            <Link href="/admin-login">admin login</Link>
          </p>
          <p className="goalix-login-secure">
            Your data is secure with enterprise-grade encryption.
          </p>
        </form>
      </div>
    </GoalixAuthShell>
  );
}
