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

          {/* Social Divider */}
          <div className="goalix-login-divider">
            <span />
            <small>or continue with</small>
            <span />
          </div>

          {/* Social Login Buttons */}
          <div className="goalix-login-socials">
            <button type="button" aria-label="Continue with Google">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </button>
            <button type="button" aria-label="Continue with Apple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.62-2.2.44-3.06-.4C3.79 16.17 4.36 9.53 8.7 9.28c1.25.07 2.12.72 2.85.76.98-.2 1.93-.75 2.98-.68 1.27.1 2.22.6 2.83 1.51-2.6 1.55-1.98 4.97.36 5.93-.47 1.23-.95 2.45-1.67 3.48zM12.16 9.23C12 7.07 13.73 5.27 15.73 5.1c.3 2.37-2.15 4.17-3.57 4.13z"/>
              </svg>
            </button>
            <button type="button" aria-label="Continue with Microsoft">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
                <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
                <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
                <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
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
