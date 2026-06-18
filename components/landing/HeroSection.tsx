"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  ClipboardList,
  FileText,
  LineChart,
  PlaySquare,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { ROLE_ROUTES } from "@/lib/constants";

const S = {
  bg: "#000510",
  card: "rgba(10,20,40,0.7)",
  border: "rgba(255,255,255,0.07)",
  cyan: "#22d3ee",
  green: "#3ddc84",
  muted: "#64748b",
  dim: "#94a3b8",
};

const navLinks = [
  { label: "AI in Sport", href: "#ai-in-sport" },
  { label: "How GOALIX Works", href: "#how-goalix-works" },
  { label: "Product Suite", href: "#product-suite" },
  { label: "Clubs & Coaches", href: "#clubs-coaches" },
  { label: "Ecosystem", href: "#goalix-ecosystem" },
];

const testDashboardLinks = [
  { label: "Admin Dashboard", href: ROLE_ROUTES.admin, border: "rgba(163,230,53,0.55)" },
  { label: "Coach Dashboard", href: ROLE_ROUTES.coach, border: "rgba(34,211,238,0.55)" },
  { label: "Player Dashboard", href: ROLE_ROUTES.player, border: "rgba(59,130,246,0.55)" },
  { label: "Parent Dashboard", href: ROLE_ROUTES.parent, border: "rgba(167,139,250,0.55)" },
];

export default function HeroSection() {
  const router = useRouter();

  return (
    <>
    <div
      id="ai-in-sport"
      className="gx-hero"
      style={{
        background: S.bg,
        height: "100vh",
        fontFamily: "'Inter',sans-serif",
        color: "#e2e8f0",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <nav
        className="gx-hero-nav"
        style={{
          position: "relative",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 48px",
        }}
      >
        <div className="gx-hero-nav-left" style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <Image
            src="/Logo.png"
            alt="Goalix"
            width={110}
            height={32}
            priority
            style={{ width: "auto", height: "auto", objectFit: "contain" }}
          />
          <div className="gx-hero-links" style={{ display: "flex", gap: 36 }}>
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
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L5 5L9 1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </a>
                {index === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: -2,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <div style={{ width: "120%", height: 1, background: "linear-gradient(90deg, transparent, #cfff04, transparent)", opacity: 0.7 }} />
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#cfff04", marginTop: 4, boxShadow: "0 0 6px #cfff04" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="gx-hero-actions" style={{ display: "flex", gap: 16 }}>
          <button
            onClick={() => router.push("/login")}
            style={{
              background: "linear-gradient(90deg, #84cc16 0%, #22c55e 35%, #06b6d4 70%, #3b82f6 100%)",
              border: "none",
              borderRadius: 12,
              padding: "7px 22px",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            Log in
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </nav>

      <div className="gx-hero-stage" style={{ display: "flex", padding: "16px 48px 0", alignItems: "center", flex: 1, position: "relative" }}>
        <div className="gx-hero-copy" style={{ flex: 1, position: "relative", zIndex: 10, marginTop: -60 }}>
          <div style={{ display: "inline-flex", marginBottom: 24, borderRadius: 999, padding: 1, background: "linear-gradient(90deg, rgba(207,255,4,0.4) 0%, rgba(34,211,238,0.4) 100%)" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(4,10,22,0.95)", borderRadius: 999, padding: "6px 16px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#cfff04", display: "inline-block", boxShadow: "0 0 8px #cfff04" }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1.8,
                  fontFamily: "'Inter',sans-serif",
                  background: "linear-gradient(90deg, #cfff04 0%, #22d3ee 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                AI POWERED FOOTBALL ANALYTICS
              </span>
            </div>
          </div>

          <h1
            className="gx-hero-title"
            style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: "clamp(68px,8vw,115px)",
              fontWeight: 800,
              lineHeight: 0.9,
              margin: "0 0 16px",
              letterSpacing: "0.01em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "#fff", display: "block" }}>AI THAT</span>
            <span style={{ display: "block" }}>
              <span style={{ color: "#cfff04" }}>WINS </span>
              <span
                style={{
                  background: "linear-gradient(90deg, #22c55e 0%, #06b6d4 50%, #3b82f6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                MATCHES
              </span>
            </span>
          </h1>

          <p className="gx-hero-subtitle" style={{ fontSize: 18, color: "#94a3b8", lineHeight: 1.6, maxWidth: 460, margin: "0 0 36px", fontFamily: "'Inter',sans-serif" }}>
            Advanced AI analytics and real-time insights
            <br />
            that elevate teams, players and performance.
          </p>

          <div className="gx-hero-controls" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
            <div className="gx-hero-ctas" style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <button
                onClick={() => router.push("/login")}
                style={{
                  background: "linear-gradient(90deg, #84cc16 0%, #22c55e 40%, #06b6d4 80%, #3b82f6 100%)",
                  border: "none",
                  borderRadius: 12,
                  padding: "16px 28px",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "'Inter',sans-serif",
                }}
              >
                Start Analyzing Matches
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <button
                style={{
                  background: "transparent",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  padding: "16px 26px",
                  color: "#e2e8f0",
                  fontSize: 16,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "'Inter',sans-serif",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" />
                </svg>
                Watch Demo
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {testDashboardLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  style={{
                    background: "rgba(6,13,26,0.85)",
                    border: `1px solid ${link.border}`,
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#e2e8f0",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'Inter',sans-serif",
                  }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="gx-hero-player" style={{ position: "absolute", right: -50, top: -180, width: 900, height: 800, zIndex: 1 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: "scale(1.28)",
              transformOrigin: "center top",
              maskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, black 70%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, black 70%, transparent 100%)",
            }}
          >
            <Image src="/Player.png" alt="Player" fill style={{ objectFit: "contain", objectPosition: "center", mixBlendMode: "lighten" }} priority />
          </div>
        </div>
      </div>

      <div
        className="gx-hero-stats"
        style={{
          margin: "0 120px 32px",
          background: "#040914",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 20,
          padding: "24px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 20,
        }}
      >
        {[
          { value: "500+", label: "Teams Trust Us", color: "#84cc16", icon: "trophy" },
          { value: "25K+", label: "Professional Players", color: "#22d3ee", icon: "users" },
          { value: "10M+", label: "Matches Analyzed", color: "#22d3ee", icon: "chart" },
          { value: "120+", label: "Countries", color: "#22d3ee", icon: "globe" },
        ].map((stat, index) => (
          <div key={stat.label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, justifyContent: "center" }}>
              <StatIcon type={stat.icon} color={stat.color} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.1, fontFamily: "'Inter',sans-serif" }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, fontWeight: 500, fontFamily: "'Inter',sans-serif" }}>{stat.label}</div>
              </div>
            </div>
            {index < 3 && <div style={{ width: 1, height: 44, background: "rgba(255,255,255,0.08)" }} />}
          </div>
        ))}
      </div>
    </div>
    <GoalixAddedSections />
    </>
  );
}

const workSteps = [
  { icon: PlaySquare, title: "Capture", text: "Collect data from matches or training sessions." },
  { icon: BrainCircuit, title: "Analyze", text: "Our AI processes every movement and event." },
  { icon: ClipboardList, title: "Insights", text: "Get clear, actionable insights instantly." },
  { icon: BarChart3, title: "Improve", text: "Make smarter decisions and elevate performance." },
];

const mvpCards = [
  { icon: Target, title: "Match Analysis", text: "Break down matches with AI-powered event detection and heatmaps." },
  { icon: Users, title: "Player Performance", text: "Track key metrics and evaluate individual performance." },
  { icon: LineChart, title: "Team Insights", text: "Identify strengths, weaknesses and improvement areas." },
  { icon: FileText, title: "Custom Reports", text: "Generate and share reports with your coaching staff." },
];

function GoalixAddedSections() {
  return (
    <main className="goalix-additions">
      <section id="how-goalix-works" className="gx-section gx-work">
        <div className="gx-copy">
          <span className="gx-label">How GOALIX Works</span>
          <h2>
            From Raw Data To <span>Winning</span> Decisions
          </h2>
          <p>Goalix turns real-time match and training data into actionable insights in just a few simple steps.</p>
          <div className="gx-step-line">
            {workSteps.map((step, index) => (
              <article className="gx-step" key={step.title}>
                <div className="gx-step-icon">
                  <step.icon size={34} />
                </div>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="gx-dashboard-art">
          <img
            src="/goalix-dashboard-mockup.png?v=20260524"
            alt="GOALIX analytics dashboard mockup"
            width={1448}
            height={1086}
          />
        </div>
      </section>

      <section id="product-suite" className="gx-section gx-mvp">
        <div className="gx-copy">
          <span className="gx-label">Product Suite</span>
          <h2>
            Built For Today.
            <span className="gx-title-line">
              <span>Ready</span> For <span>Tomorrow.</span>
            </span>
          </h2>
          <p>Goalix products give teams the tools to analyze, understand and improve performance with clarity.</p>
        </div>
        <div className="gx-product-art">
          <img
            src="/goalix-feature-cards.png?v=20260524"
            alt="Goalix product feature cards"
            width={1536}
            height={864}
          />
        </div>
        <button className="gx-outline-button">
          Explore Products
          <ArrowRight size={18} />
        </button>
      </section>

      <section id="clubs-coaches" className="gx-club">
        <div className="gx-club-copy">
          <span className="gx-label">Trusted By Clubs & Coaches</span>
          <h2>
            Built On Trust.
            <br />
            Driven By Results.
          </h2>
          <p>Join hundreds of teams and thousands of players using Goalix to stay ahead.</p>
          <div className="gx-mini-stats">
            <div><Trophy size={20} /><strong>500+</strong><span>Teams</span></div>
            <div><Users size={20} /><strong>25K+</strong><span>Players</span></div>
            <div><BarChart3 size={20} /><strong>10M+</strong><span>Matches</span></div>
            <div><Target size={20} /><strong>120+</strong><span>Countries</span></div>
          </div>
        </div>
        <div className="gx-club-image">
          <img
            src="/goalix-coach-tablet.png?v=20260524"
            alt="Coach using Goalix tablet analytics"
            width={1536}
            height={1024}
          />
        </div>
      </section>

      <section id="goalix-ecosystem" className="gx-section gx-ecosystem">
        <div className="gx-copy">
          <span className="gx-label">The GOALIX Ecosystem</span>
          <h2>Gear. Data. Performance.</h2>
          <p>Every piece of the ecosystem is designed to capture, analyze and elevate performance.</p>
          <button className="gx-outline-button">
            Explore All Products
            <ArrowRight size={18} />
          </button>
        </div>
        <div className="gx-kit-art">
          <img
            src="/goalix-ecosystem-kit.png?v=20260524"
            alt="Goalix product ecosystem kit"
            width={1536}
            height={1024}
          />
        </div>
      </section>

      <section id="goalix-cta" className="gx-final">
        <div>
          <h2>Ready To Elevate Your Game?</h2>
          <p>Start your journey with Goalix products today.</p>
        </div>
        <button>
          Get Started Now
          <ArrowRight size={20} />
        </button>
      </section>

      <footer className="gx-footer">
        <div className="gx-footer-brand">
          <Image src="/Logo.png" alt="GOALIX" width={138} height={42} style={{ width: "auto", height: "auto" }} />
          <p>AI-powered football analytics platform built to win matches.</p>
          <div className="gx-socials" aria-label="Social links">
            <a href="#">IG</a>
            <a href="#">X</a>
            <a href="#">IN</a>
            <a href="#">YT</a>
          </div>
        </div>
        <div>
          <h3>Product</h3>
          <a href="#">Features</a>
          <a href="#">Pricing</a>
          <a href="#">Integrations</a>
          <a href="#">Updates</a>
        </div>
        <div>
          <h3>Solutions</h3>
          <a href="#">For Teams</a>
          <a href="#">For Coaches</a>
          <a href="#">For Players</a>
          <a href="#">For Academies</a>
        </div>
        <div>
          <h3>Company</h3>
          <a href="#">About Us</a>
          <a href="#">Careers</a>
          <a href="#">News</a>
          <a href="#">Contact</a>
        </div>
        <div>
          <h3>Resources</h3>
          <a href="#">Blog</a>
          <a href="#">Help Center</a>
          <a href="#">Docs</a>
          <a href="#">Support</a>
        </div>
        <form>
          <h3>Stay Updated</h3>
          <p>Get the latest updates and insights on AI in sport.</p>
          <label>
            <span>Email</span>
            <input type="email" placeholder="Enter your email" />
            <button type="submit" aria-label="Subscribe">
              <ArrowRight size={16} />
            </button>
          </label>
        </form>
        <div className="gx-footer-bottom">
          <span>© 2024 Goalix AI. All rights reserved.</span>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Cookies Settings</a>
        </div>
      </footer>
    </main>
  );
}

function StatIcon({ type, color }: { type: string; color: string }) {
  if (type === "trophy") {
    return (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
      </svg>
    );
  }

  if (type === "users") {
    return (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (type === "chart") {
    return (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    );
  }

  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
