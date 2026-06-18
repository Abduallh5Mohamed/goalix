"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { GoalixAuthShell } from "@/components/auth/GoalixAuthShell";
import { useAuth } from "@/lib/auth/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await login(email.trim(), password, "player");
    } catch {
      setError("Invalid email or password. Please try again.");
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
          {/* Email Field */}
          <div className="goalix-login-field">
            <label htmlFor="email">Email address</label>
            <div className="goalix-login-input-wrapper">
              <Mail size={18} aria-hidden="true" />
              <input
                id="email"
                type="email"
                placeholder="youremail@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
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
