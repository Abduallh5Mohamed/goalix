"use client";

import Image from "next/image";
import {
  Activity,
  CalendarDays,
  Check,
  ChevronDown,
  Dumbbell,
  FilePlay,
  Flame,
  Goal,
  LayoutDashboard,
  Plus,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { DashboardFrame } from "@/components/layout/DashboardFrame";

const readiness = [
  { label: "Match Readiness", value: "82%", sub: "82", accent: "lime" },
  { label: "Team Form", value: "W-W-D-W-W", sub: "Last 5 Matches", accent: "lime" },
  { label: "Possession", value: "56%", sub: "Controlled phases", accent: "cyan" },
  { label: "xG (For)", value: "2.14", sub: "Per 90", accent: "white" },
  { label: "Sprint Load", value: "High", sub: "+12% vs last week", accent: "lime" },
];

const heroStats = [
  { icon: Users, value: "23", label: "Active Players" },
  { icon: CalendarDays, value: "5", label: "Upcoming Matches" },
  { icon: ShieldCheck, value: "78%", label: "Availability" },
  { icon: Star, value: "1.72", label: "Team Rating" },
];

const tasks = [
  { icon: LayoutDashboard, title: "Lineup Review", subtitle: "vs FC United", done: true },
  { icon: Dumbbell, title: "Training Session", subtitle: "Today, 16:00", done: true },
  { icon: FilePlay, title: "Video Analysis", subtitle: "Yesterday", done: true },
  { icon: Plus, title: "Injury Follow-up", subtitle: "2 Players", done: false },
  { icon: ShieldCheck, title: "Opposition Report", subtitle: "vs FC United", done: false },
];

const schedule = [
  { day: "Mon", date: "19 May", icon: Activity, title: "Recovery Session", time: "10:00", done: true },
  { day: "Tue", date: "20 May", icon: Target, title: "Tactical Training", time: "10:00", done: true },
  { day: "Wed", date: "21 May", icon: Dumbbell, title: "High Intensity", time: "10:00", done: true },
  { day: "Thu", date: "22 May", icon: Zap, title: "Set Piece Practice", time: "10:00", done: true },
  { day: "Fri", date: "23 May", icon: Goal, title: "Match Preparation", time: "10:00", done: false },
  { day: "Sat", date: "24 May", icon: Star, title: "Matchday", time: "18:00", done: false, active: true },
];

const metricTiles = [
  { icon: Flame, label: "Top Speed", value: "33.6", unit: "km/h", sub: "Team High" },
  { icon: Activity, label: "Distance", value: "114.2", unit: "km", sub: "Team Avg" },
  { icon: Trophy, label: "Win Rate", value: "68%", unit: "", sub: "This Season" },
  { icon: Star, label: "Team Rating", value: "1.72", unit: "", sub: "ELO" },
  { icon: Users, label: "Availability", value: "78%", unit: "", sub: "Squad Fit" },
];

const matches = [
  { team: "FC United", date: "24 May - 18:00", tag: "Home" },
  { team: "City Rovers", date: "31 May - 20:00", tag: "Away" },
  { team: "Blue City", date: "07 Jun - 18:00", tag: "Home" },
];

function Ring({ value, label, color = "lime" }: { value: number; label: string; color?: "lime" | "cyan" | "teal" }) {
  const stroke = color === "lime" ? "#b6ff00" : color === "cyan" ? "#00d8ff" : "#2ee8c9";
  const dash = `${value * 2.64} 264`;

  return (
    <div className="relative mx-auto grid h-32 w-32 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeDasharray={dash} />
      </svg>
      <div className="text-center">
        <div className="font-display text-4xl font-bold text-white">{value}%</div>
        <div className="text-xs font-semibold text-lime-300">{label}</div>
      </div>
    </div>
  );
}

function TrendChart() {
  return (
    <svg viewBox="0 0 520 230" className="h-full w-full">
      <defs>
        <linearGradient id="trendGlow" x1="0" x2="1">
          <stop stopColor="#b6ff00" />
          <stop offset="1" stopColor="#00d8ff" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1="30" x2="500" y1={32 + i * 40} y2={32 + i * 40} stroke="rgba(255,255,255,0.08)" />
      ))}
      {["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"].map((m, i) => (
        <text key={m} x={48 + i * 61} y="215" fill="#8fa0b7" fontSize="13">
          {m}
        </text>
      ))}
      <polyline points="45,150 110,128 175,137 240,104 305,142 370,112 435,132 485,120" fill="none" stroke="#b6ff00" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="45,190 110,165 175,178 240,154 305,170 370,160 435,176 485,168" fill="none" stroke="#00d8ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {[45, 110, 175, 240, 305, 370, 435, 485].map((x, i) => (
        <circle key={x} cx={x} cy={[150, 128, 137, 104, 142, 112, 132, 120][i]} r="5" fill="#b6ff00" />
      ))}
      <rect x="458" y="101" width="38" height="26" rx="7" fill="#b6ff00" />
      <text x="468" y="119" fill="#06111f" fontSize="14" fontWeight="800">7.6</text>
      <rect x="458" y="154" width="38" height="26" rx="7" fill="#00d8ff" />
      <text x="468" y="172" fill="#06111f" fontSize="14" fontWeight="800">1.8</text>
    </svg>
  );
}

function Heatmap() {
  const blobs = [
    [36, 38, "#b6ff00"], [47, 34, "#ffef37"], [58, 41, "#25d0ff"], [62, 62, "#ff2d2d"],
    [40, 64, "#b6ff00"], [72, 52, "#7bea28"], [28, 58, "#00d8ff"], [52, 72, "#b6ff00"],
  ];

  return (
    <svg viewBox="0 0 360 230" className="h-full w-full rounded-xl">
      <rect width="360" height="230" fill="#071524" />
      <rect x="12" y="12" width="336" height="206" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <line x1="180" y1="12" x2="180" y2="218" stroke="rgba(255,255,255,0.62)" />
      <circle cx="180" cy="115" r="36" fill="none" stroke="rgba(255,255,255,0.62)" />
      <rect x="12" y="64" width="54" height="102" fill="none" stroke="rgba(255,255,255,0.62)" />
      <rect x="294" y="64" width="54" height="102" fill="none" stroke="rgba(255,255,255,0.62)" />
      <filter id="heatBlur">
        <feGaussianBlur stdDeviation="13" />
      </filter>
      <g filter="url(#heatBlur)" opacity="0.9">
        {blobs.map(([x, y, color], i) => (
          <circle key={i} cx={(Number(x) / 100) * 360} cy={(Number(y) / 100) * 230} r="28" fill={String(color)} />
        ))}
      </g>
      <g opacity="0.55">
        {Array.from({ length: 35 }).map((_, i) => (
          <circle key={i} cx={20 + ((i * 47) % 320)} cy={24 + ((i * 31) % 180)} r="2" fill={i % 2 ? "#00d8ff" : "#b6ff00"} />
        ))}
      </g>
    </svg>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`goalix-dashboard-panel rounded-[18px] border border-[#2a4460]/80 bg-[#07172a]/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_44px_rgba(0,0,0,0.25)] backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

export default function AdminDashboardPage() {
  return (
    <DashboardFrame role="admin">
      <section className="mb-5 grid gap-5 xl:grid-cols-[1fr_auto]">
        <div>
          <h1 className="font-display text-5xl font-bold leading-none tracking-normal text-white md:text-6xl">Welcome back, Admin</h1>
          <p className="mt-2 text-lg text-slate-300">Here&apos;s your academy performance overview</p>
        </div>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {heroStats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <stat.icon className="h-8 w-8 text-white" />
              <div>
                <div className="font-display text-4xl font-bold leading-none">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-300">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Panel className="mb-5 grid gap-0 overflow-hidden md:grid-cols-5">
        {readiness.map((item, index) => (
          <div key={item.label} className="border-b border-[#2a4460] p-5 md:border-b-0 md:border-r last:md:border-r-0">
            <div className="text-sm font-semibold text-white">{item.label}</div>
            <div className={`mt-3 font-display text-3xl font-bold ${item.accent === "cyan" ? "text-cyan-300" : item.accent === "lime" ? "text-lime-300" : "text-white"}`}>{item.value}</div>
            <div className="mt-1 text-sm text-slate-300">{item.sub}</div>
            {index === 2 && <div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-full w-[56%] rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(0,216,255,0.55)]" /></div>}
          </div>
        ))}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1.3fr_0.56fr_0.56fr_0.56fr]">
        <Panel className="goalix-dashboard-photo-card overflow-hidden">
          <div className="relative min-h-[340px] p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(182,255,0,0.28),transparent_26%),linear-gradient(135deg,rgba(47,140,255,0.18),transparent_58%)]" />
            <div className="absolute right-8 top-12 font-display text-[210px] font-black leading-none text-lime-300/20">X</div>
            <Image src="/Player.png" alt="Goalix player placeholder" fill sizes="(min-width: 1280px) 360px, 100vw" className="object-cover object-center opacity-80 mix-blend-screen" priority />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#07172a] to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Noah Williams</h2>
                <p className="mt-1 text-sm"><span className="font-bold text-lime-300">RW</span> <span className="text-slate-300">• Winger</span></p>
              </div>
              <div className="rounded-2xl border border-lime-300/35 bg-[#07111f]/85 px-4 py-3 text-center">
                <div className="text-xs text-slate-300">OVR</div>
                <div className="font-display text-4xl font-bold text-lime-300">87</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 border-t border-[#2a4460] p-4 text-sm">
            {["Age|24", "Height|178 cm", "Weight|72 kg", "Foot|Left"].map((item) => {
              const [label, value] = item.split("|");
              return <div key={label}><div className="text-slate-400">{label}</div><div className="font-semibold text-white">{value}</div></div>;
            })}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Performance Trend</h2>
            <button className="inline-flex items-center gap-2 rounded-xl border border-[#2a4460] bg-white/[0.03] px-4 py-2 text-sm text-slate-300">Last 8 Matches <ChevronDown size={16} /></button>
          </div>
          <div className="h-[260px]"><TrendChart /></div>
        </Panel>

        <Panel className="p-5 text-center">
          <h2 className="text-left text-xl font-semibold">Physical Load</h2>
          <Ring value={78} label="Optimal" />
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-300">
            <div><div className="text-white">820</div>Acute Load</div>
            <div><div className="text-white">680</div>Chronic Load</div>
          </div>
          <p className="mt-5 text-left text-sm text-lime-300">↑ 8% <span className="text-slate-400">vs last week</span></p>
        </Panel>

        <Panel className="p-5 text-center">
          <h2 className="text-left text-xl font-semibold">Stamina</h2>
          <Ring value={91} label="High" color="cyan" />
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-300">
            <div><div className="text-white">10.8 km</div>Distance</div>
            <div><div className="text-white">1.2 km</div>High Speed</div>
          </div>
          <p className="mt-5 text-left text-sm text-cyan-300">↑ 15% <span className="text-slate-400">vs last week</span></p>
        </Panel>

        <Panel className="p-5 text-center">
          <h2 className="text-left text-xl font-semibold">Recovery Score</h2>
          <Ring value={85} label="Good" color="teal" />
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-300">
            <div><div className="text-white">62 ms</div>HRV</div>
            <div><div className="text-white">7.1 h</div>Sleep</div>
          </div>
          <p className="mt-5 text-left text-sm text-teal-300">↑ 6% <span className="text-slate-400">vs last week</span></p>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.85fr_0.7fr_1.7fr]">
        <Panel className="p-4">
          <div className="space-y-1">
            {tasks.map((task) => (
              <div key={task.title} className="flex items-center gap-3 border-b border-[#2a4460] py-3 last:border-b-0">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#2a4460] bg-white/[0.03] text-white"><task.icon size={20} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{task.title}</p>
                  <p className="text-sm text-slate-400">{task.subtitle}</p>
                </div>
                <span className={`grid h-6 w-6 place-items-center rounded-full ${task.done ? "bg-lime-300 text-[#06111f]" : "border border-[#2a4460] text-slate-500"}`}>{task.done && <Check size={15} />}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-xl font-semibold">Heatmap <span className="text-sm text-slate-400">(Last Match)</span></h2>
          <div className="h-[235px]"><Heatmap /></div>
        </Panel>

        <Panel className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Training Schedule</h2>
            <button className="inline-flex items-center gap-2 rounded-xl border border-[#2a4460] bg-white/[0.03] px-4 py-2 text-sm text-slate-300">This Week <ChevronDown size={16} /></button>
          </div>
          <div className="grid gap-2 md:grid-cols-6">
            {schedule.map((item) => (
              <div key={item.day} className={`min-h-[190px] border-r border-[#2a4460] p-3 last:border-r-0 ${item.active ? "rounded-2xl bg-cyan-300/5" : ""}`}>
                <div className="text-sm font-semibold">{item.day}</div>
                <div className="text-xs text-slate-400">{item.date}</div>
                <item.icon className={`mt-6 h-8 w-8 ${item.active ? "text-cyan-300" : "text-lime-300"}`} />
                <p className="mt-4 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-slate-400">{item.time}</p>
                <span className={`mt-4 grid h-6 w-6 place-items-center rounded-full ${item.done ? "bg-lime-300/80 text-[#06111f]" : "border border-cyan-300 text-cyan-300"}`}>{item.done ? <Check size={14} /> : ""}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_repeat(5,0.72fr)]">
        <Panel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upcoming Matches</h2>
            <span className="text-lime-300">→</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {matches.map((match) => (
              <div key={match.team} className="flex items-center gap-4 border-r border-[#2a4460] last:border-r-0">
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[#2a4460] bg-white/[0.03]">
                  <Goal className="text-lime-300" />
                </div>
                <div>
                  <p className="font-semibold text-white">vs {match.team}</p>
                  <p className="text-sm text-slate-400">{match.date}</p>
                  <p className="text-sm font-semibold text-lime-300">{match.tag}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {metricTiles.map((tile) => (
          <Panel key={tile.label} className="p-5">
            <p className="mb-5 text-sm font-semibold text-white">{tile.label}</p>
            <div className="flex items-center gap-3">
              <tile.icon className="h-9 w-9 text-white" />
              <div>
                <div className="font-display text-4xl font-bold leading-none text-white">{tile.value}</div>
                {tile.unit && <div className="text-xs text-slate-400">{tile.unit}</div>}
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-400">{tile.sub}</p>
          </Panel>
        ))}
      </div>
    </DashboardFrame>
  );
}
