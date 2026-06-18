"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

type GoalixAuthShellProps = {
  children: React.ReactNode;
};

const navLinks = [
  { label: "AI in Sport", href: "/#ai-in-sport" },
  { label: "How GOALIX Works", href: "/#how-goalix-works" },
  { label: "Product Suite", href: "/#product-suite" },
  { label: "Clubs & Coaches", href: "/#clubs-coaches" },
  { label: "Ecosystem", href: "/#goalix-ecosystem" },
];

export function GoalixAuthShell({ children }: GoalixAuthShellProps) {
  const router = useRouter();

  return (
    <div className="goalix-login-system">
      {/* ─── Top Navbar ─── */}
      <nav
        className="goalix-login-story-header"
        style={{
          position: "relative",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 48px",
          fontFamily: "'Inter',sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <Link href="/" aria-label="Goalix home">
            <Image src="/Logo.png" alt="Goalix" width={110} height={32} priority style={{ objectFit: "contain" }} />
          </Link>
          <div className="goalix-login-nav-links" style={{ display: "flex", gap: 36 }}>
            {navLinks.map((link, index) => (
              <div
                key={link.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                <a
                  href={link.href}
                  style={{
                    fontSize: 14,
                    color: index === 0 ? "#cfff04" : "#e2e8f0",
                    textDecoration: "none",
                    fontWeight: index === 0 ? 600 : 400,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 0",
                  }}
                >
                  {link.label}
                  {index > 0 && (
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                      <path d="M1 1L5 5L9 1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </a>
                {index === 0 && (
                  <div style={{ position: "absolute", bottom: -2, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                    <div style={{ width: "120%", height: 1, background: "linear-gradient(90deg, transparent, #cfff04, transparent)", opacity: 0.7 }} />
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#cfff04", marginTop: 4, boxShadow: "0 0 6px #cfff04" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="goalix-login-top-actions" style={{ display: "flex", gap: 16 }}>
          <button
            onClick={() => router.push("/login")}
            style={{ background: "transparent", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "7px 20px", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
          >
            Log in
          </button>
          <button
            onClick={() => router.push("/signup")}
            style={{ background: "linear-gradient(90deg, #84cc16 0%, #22c55e 35%, #06b6d4 70%, #3b82f6 100%)", border: "none", borderRadius: 12, padding: "7px 22px", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: "'Inter',sans-serif" }}
          >
            Get Started
            <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      {/* ─── Left: story panel ─── */}
      <section className="goalix-login-story" aria-label="Goalix showcase">
        <div className="goalix-login-story-bg" />
        <div className="goalix-login-grid-overlay" aria-hidden="true" />

        {/* All content in one wrapper for compact layout */}
        <div className="goalix-login-story-content">
          {/* Hero copy - compact block */}
          <div className="goalix-login-copy">
            <h1>
              Smarter<br />
              <span>decisions.</span>
              {" "}Better<br />
              <span>results.</span>
            </h1>
            <p>AI-powered football insights<br />for <em>winning</em> teams.</p>
          </div>
        </div>

        {/* Team Performance floating card */}
        <div className="goalix-login-perf-card">
          <div className="goalix-login-perf-header">
            <span>Team Performance</span>
            <svg className="goalix-login-perf-chart" viewBox="0 0 80 32" fill="none">
              <polyline points="0,28 12,22 24,25 36,14 48,18 60,8 72,12 80,4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
              </linearGradient>
              <path d="M0,28 12,22 24,25 36,14 48,18 60,8 72,12 80,4 L80,32 L0,32 Z" fill="url(#chartGrad)" />
            </svg>
          </div>
          <div className="goalix-login-perf-score">
            {/* Circular ring around the score */}
            <div className="goalix-login-perf-ring">
              <svg viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle cx="32" cy="32" r="28" stroke="url(#ringGrad)" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray="176" strokeDashoffset="32" transform="rotate(-90 32 32)" />
                <defs>
                  <linearGradient id="ringGrad" x1="0" y1="0" x2="64" y2="64">
                    <stop stopColor="#22c55e" />
                    <stop offset="1" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <strong>82</strong>
            </div>
            <div>
              <span className="goalix-login-perf-dot" />
              <small>Performance</small>
              <em>Excellent</em>
            </div>
          </div>
        </div>

        {/* GOALIX G badge + soccer ball */}
        <div className="goalix-login-brand-cluster" aria-hidden="true">
          <div className="goalix-login-g-badge">
            <Image src="/Logo.png" alt="" width={80} height={24} style={{ objectFit: "contain" }} />
          </div>
          <div className="goalix-login-soccer-ball">
            <div className="goalix-login-ball-3d" />
          </div>
        </div>

        {/* Heatmap floating card */}
        <div className="goalix-login-heatmap-card" aria-hidden="true">
          <span className="goalix-login-heatmap-label">Heatmap</span>
          <div className="goalix-login-heatmap-field">
            <span className="goalix-login-heatmap-spot goalix-login-heatmap-spot-1" />
            <span className="goalix-login-heatmap-spot goalix-login-heatmap-spot-2" />
            <span className="goalix-login-heatmap-spot goalix-login-heatmap-spot-3" />
            <span className="goalix-login-heatmap-spot goalix-login-heatmap-spot-4" />
          </div>
        </div>

        {/* Live Match Analysis strip */}
        <div className="goalix-login-live-strip">
          <span className="goalix-login-live-icon" />
          <div>
            <strong>Live Match Analysis</strong>
            <p>Real-time data. Actionable insights.</p>
          </div>
          <em className="goalix-login-live-dot">● <span>Live</span></em>
        </div>
      </section>

      {/* ─── Right: form panel ─── */}
      <section className="goalix-login-panel-shell">
        {/*
          Wave SVG keeps the original S-curve divider shape.
        */}
        <svg
          className="goalix-login-wave"
          viewBox="0 0 200 900"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <filter id="waveShadow" x="-50%" y="0%" width="170%" height="100%">
              <feDropShadow dx="-10" dy="0" stdDeviation="12" floodColor="#000000" floodOpacity="0.16" result="shadow1" />
              <feDropShadow dx="-3" dy="0" stdDeviation="4" floodColor="#000000" floodOpacity="0.08" result="shadow2" />
            </filter>
          </defs>
          <path
            d="M200 0 C 40 80, 180 320, 180 450 C 180 580, 100 820, 200 900 L 200 0 Z"
            fill="#ffffff"
            filter="url(#waveShadow)"
          />
        </svg>
        <div className="goalix-login-mobile-brand">
          <Image src="/Logo.png" alt="Goalix" width={130} height={39} priority />
          <Link href="/">Home</Link>
        </div>
        {children}
      </section>
    </div>
  );
}
