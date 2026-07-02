"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { GoalixAuthShell } from "@/components/auth/GoalixAuthShell";
import { useAuth } from "@/lib/auth/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"player" | "parent">("player");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }
    if (username.includes("@")) {
      setError("Staff accounts use the staff login page.");
      router.push("/admin-login");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await login(username.trim(), password, role);
    } catch {
      setError("Invalid username, password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GoalixAuthShell>
      <div className="goalix-login-card">
        <div className="goalix-login-card-head">
          <h1>Welcome Back</h1>
          <p>Log in to your GOALIX account</p>
        </div>

        <form onSubmit={handleSubmit} className="goalix-login-form">
          <div className="goalix-login-role-switch" aria-label="Account type">
            <button
              type="button"
              className={role === "player" ? "is-active" : ""}
              onClick={() => {
                setRole("player");
                setError("");
              }}
              aria-pressed={role === "player"}
            >
              Player
            </button>
            <button
              type="button"
              className={role === "parent" ? "is-active" : ""}
              onClick={() => {
                setRole("parent");
                setError("");
              }}
              aria-pressed={role === "parent"}
            >
              Parent
            </button>
          </div>

          {/* Username Field */}
          <div className="goalix-login-field">
            <label htmlFor="username">Username</label>
            <div className="goalix-login-input-wrapper">
              <UserRound size={18} aria-hidden="true" />
              <input
                id="username"
                type="text"
                placeholder={role === "parent" ? "parent.username" : "player.username"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="goalix-login-field">
            <label htmlFor="password">Password</label>
            <div className="goalix-login-input-wrapper">
              <Lock size={18} aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="goalix-login-eye-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me / Forgot Password */}
          <div className="goalix-login-form-row">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>

          {error && (
            <p className="goalix-login-error">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <button type="submit" className="goalix-login-submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="goalix-spin" size={18} />
                Signing in...
              </>
            ) : (
              <>
                Log In
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <p className="goalix-login-alt-link">
            Staff or coach?{" "}
            <Link href="/admin-login">
              Use staff login
            </Link>
          </p>

          {/* Social login divider */}
          <div className="goalix-login-divider">
            <span />
            <small>or continue with</small>
            <span />
          </div>

          {/* Social buttons */}
          <div className="goalix-login-socials">
            <button type="button" aria-label="Sign in with Google">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </button>
            <button type="button" aria-label="Sign in with Apple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.05 20.28c-.98.95-2.05 1.88-3.08 1.88-1.07 0-1.41-.65-2.63-.65-1.23 0-1.61.63-2.63.67-1.05.04-2.23-1.01-3.23-1.98C3.44 18.2 1.8 13.56 3.91 9.94c1.05-1.8 2.9-2.93 4.88-2.93 1.5 0 2.92 1.04 3.84 1.04.91 0 2.63-1.25 4.45-1.07.76.03 2.89.31 4.26 2.3-.11.07-2.54 1.48-2.51 4.54.03 3.66 3.06 4.88 3.1 4.9-.03.07-.49 1.67-1.6 3.16zM15.47 4.94c.8-1 1.33-2.38 1.18-3.76-1.18.05-2.62.79-3.47 1.78-.73.84-1.37 2.24-1.2 3.6 1.31.1 2.68-.62 3.49-1.62z"/>
              </svg>
            </button>
            <button type="button" aria-label="Sign in with Microsoft">
              <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="11" height="11" fill="#F25022"/>
                <rect x="12" width="11" height="11" fill="#7FBA00"/>
                <rect y="12" width="11" height="11" fill="#00A4EF"/>
                <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
              </svg>
            </button>
          </div>

          {/* Secure Badge */}
          <p className="goalix-login-secure">
            <ShieldCheck size={14} />
            Your data is <strong>secure</strong> with enterprise-grade encryption.
          </p>
        </form>
      </div>
    </GoalixAuthShell>
  );
}
