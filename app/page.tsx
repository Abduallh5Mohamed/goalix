"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";

/* ─── Bar Chart Data ─── */
const bars = [
  { label: "Jan", value: 500 },
  { label: "Feb", value: 453 },
  { label: "Mar", value: 950 },
  { label: "Apr", value: 620 },
  { label: "May", value: 700 },
  { label: "Jun", value: 510 },
  { label: "Jul", value: 820 },
];
const maxVal = 1000;

/* ─── Features ─── */
const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="2" /><circle cx="15" cy="9" r="2" /><circle cx="9" cy="15" r="2" /><circle cx="15" cy="15" r="2" />
      </svg>
    ),
    label: "Building lasting",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    label: "Backing athletes",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    label: "Leading-edge technology",
  },
];

/* ─── Stats ─── */
const stats = [
  { value: "$50M", sub: "Invested in Sports Venture" },
  { value: "90%", sub: "Average ROI for Kickvest Investors" },
  { value: "500+", sub: "Athletes and Teams Supported" },
];

/* ─── SVG Bar Chart Component ─── */
function BarChart() {
  const chartW = 280;
  const chartH = 240;
  const padL = 40;
  const padB = 28;
  const padT = 10;
  const barW = 24;
  const gap = (chartW - padL - bars.length * barW) / (bars.length + 1);
  const drawH = chartH - padB - padT;

  const yTicks = [0, 250, 500, 750, 1000];

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ overflow: "visible" }}>
      {/* Y-axis grid + labels */}
      {yTicks.map((t) => {
        const y = padT + drawH - (t / maxVal) * drawH;
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={chartW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            <text x={padL - 6} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="Inter, sans-serif">
              {t}
            </text>
          </g>
        );
      })}
      {/* Bars + labels */}
      {bars.map((b, i) => {
        const x = padL + gap + i * (barW + gap);
        const barH = (b.value / maxVal) * drawH;
        const y = padT + drawH - barH;
        const isHighlight = i === 2;
        return (
          <g key={b.label}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={isHighlight ? "#1a56db" : "#c8d1dc"} />
            {/* Value on top */}
            <text x={x + barW / 2} y={y - 5} textAnchor="middle" fill={isHighlight ? "#fff" : "#94a3b8"} fontSize="9" fontFamily="Inter, sans-serif" fontWeight={isHighlight ? 600 : 400}>
              {b.value}
            </text>
            {/* X label */}
            <text x={x + barW / 2} y={chartH - 6} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="Inter, sans-serif">
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Home() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#ffffff",
        color: "#0f172a",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ═══ Navbar ═══ */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 56px",
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <Image
            src="/Logo.png"
            alt="Goalix"
            width={130}
            height={38}
            priority
            style={{ width: "auto", height: "auto", objectFit: "contain" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
          {["Home", "Service", "About", "Team", "Contact"].map((l, i) => (
            <a
              key={l}
              href="#"
              style={{
                fontSize: "14px",
                color: i === 0 ? "#0f172a" : "#6b7280",
                fontWeight: i === 0 ? 600 : 400,
                textDecoration: "none",
              }}
            >
              {l}
            </a>
          ))}
        </div>
        <button
          onClick={() => router.push("/login")}
          style={{
            border: "2px solid #0f172a",
            borderRadius: "999px",
            padding: "10px 30px",
            background: "transparent",
            color: "#0f172a",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign In
        </button>
      </nav>

      {/* ═══ Hero Section ═══ */}
      <div style={{ padding: "8px 56px 48px" }}>
        {/* — Row 1: Athlete Image + Heading — */}
        <div style={{ display: "flex", gap: "36px", alignItems: "flex-start" }}>
          {/* Athlete Image */}
          <div
            style={{
              position: "relative",
              width: "260px",
              minWidth: "260px",
              height: "310px",
              borderRadius: "20px",
              overflow: "hidden",
              background: "linear-gradient(135deg, #1a56db 0%, #4b83f0 50%, #7db2fa 100%)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `repeating-linear-gradient(-45deg,transparent,transparent 14px,rgba(255,255,255,0.08) 14px,rgba(255,255,255,0.08) 28px)`,
              }}
            />
            <Image
              src="/Background.jpg"
              alt="GOLX Sports Academy"
              fill
              style={{ objectFit: "cover", objectPosition: "top", zIndex: 1 }}
              sizes="260px"
              priority
            />
          </div>

          {/* Heading */}
          <div style={{ paddingTop: "32px" }}>
            <h1
              style={{
                fontSize: "clamp(36px, 4.5vw, 64px)",
                fontWeight: 400,
                lineHeight: 1.06,
                color: "#0f172a",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Pioneering{" "}
              <span style={{ fontWeight: 700 }}>Sports Investment</span>
              <br />
              for <span style={{ fontWeight: 700 }}>Tomorrow&apos;s Champions</span>
            </h1>
          </div>
        </div>

        {/* — Row 2: Features | Chart | Content — */}
        <div
          style={{
            display: "flex",
            gap: "28px",
            marginTop: "24px",
            alignItems: "flex-start",
          }}
        >
          {/* ▸ LEFT: Feature cards */}
          <div style={{ width: "260px", minWidth: "260px", display: "flex", flexDirection: "column", gap: "12px", flexShrink: 0 }}>
            {features.map((f) => (
              <div
                key={f.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#f3f5f8",
                  borderRadius: "16px",
                  padding: "16px 20px",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: "#1a2332",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {f.icon}
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "#0f172a" }}>
                    {f.label}
                  </span>
                </div>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12l4-4-4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ))}
          </div>

          {/* ▸ CENTER: Chart card */}
          <div
            style={{
              width: "320px",
              minWidth: "320px",
              background: "#0c1829",
              borderRadius: "18px",
              padding: "20px 20px 12px",
              flexShrink: 0,
            }}
          >
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 500, margin: "0 0 12px 0" }}>
              Total Earning
            </p>
            <div style={{ height: "270px" }}>
              <BarChart />
            </div>
          </div>

          {/* ▸ RIGHT: Description + CTA + Stats */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px", paddingTop: "4px" }}>
            {/* Description */}
            <p style={{ color: "#6b7280", fontSize: "14px", lineHeight: 1.7, margin: 0, maxWidth: "440px" }}>
              Dive into the dynamic world of sports investment with Kickvest, where passion
              meets profit. Discover unparalleled opportunities to support athletes, teams,
              and leagues while maximizing your financial portfolio.
            </p>

            {/* CTA + Satisfaction */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
              <button
                onClick={() => router.push("/login")}
                style={{
                  background: "#1a56db",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "14px 36px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Start Now
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Avatar stack */}
                <div style={{ display: "flex" }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        border: "2px solid #fff",
                        background: ["#3b82f6", "#1e293b", "#475569"][i],
                        marginLeft: i > 0 ? "-8px" : 0,
                      }}
                    />
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a", margin: 0 }}>
                    98% Customer Satisfaction
                  </p>
                  <div style={{ display: "flex", gap: "2px", marginTop: "3px" }}>
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="#1a56db">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginTop: "4px" }}>
              {stats.map((s) => (
                <div
                  key={s.value}
                  style={{
                    background: "#f3f5f8",
                    borderRadius: "18px",
                    padding: "22px 20px",
                    minHeight: "110px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <p style={{ fontSize: "28px", fontWeight: 700, color: "#1a3a5c", margin: 0 }}>
                    {s.value}
                  </p>
                  <p style={{ fontSize: "12px", color: "#6b7280", margin: "8px 0 0", lineHeight: 1.5 }}>
                    {s.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Portal Access ═══ */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          padding: "12px 0 32px",
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "Admin", href: "/admin/dashboard", color: "#1a56db" },
          { label: "Coach", href: "/coach/home", color: "#10b981" },
          { label: "Player", href: "/player/home", color: "#f59e0b" },
          { label: "Parent", href: "/parent/home", color: "#a855f7" },
        ].map((p) => (
          <button
            key={p.label}
            onClick={() => router.push(p.href)}
            style={{
              color: p.color,
              border: `1.5px solid ${p.color}55`,
              borderRadius: "999px",
              padding: "8px 24px",
              background: `${p.color}12`,
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "1px",
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
