"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Dumbbell,
  FilePlay,
  Goal,
  Medal,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { mockEvaluations, mockGroups, mockPlayers, mockSessions } from "@/lib/mock-data";

const readiness = [
  { label: "Match Readiness", value: "82%", sub: "Squad prepared", accent: "lime" },
  { label: "Team Form", value: "W-W-D-W-W", sub: "Last 5 matches", accent: "lime" },
  { label: "Possession", value: "56%", sub: "Training target", accent: "cyan" },
  { label: "xG (For)", value: "2.14", sub: "Per 90", accent: "white" },
  { label: "Sprint Load", value: "High", sub: "+12% vs last week", accent: "lime" },
];

const actions = [
  { icon: ClipboardCheck, title: "Mark Attendance", subtitle: "Today, 16:00", href: "/coach/attendance/mark", done: true },
  { icon: Star, title: "New Evaluation", subtitle: "U13 Elite Group", href: "/coach/evaluations/new", done: true },
  { icon: FilePlay, title: "Video Analysis", subtitle: "Review last match", href: "/coach/evaluations/history", done: false },
  { icon: ShieldCheck, title: "Opposition Report", subtitle: "vs FC United", href: "/coach/schedule", done: false },
];

const schedule = [
  { day: "Mon", date: "19 May", icon: Activity, title: "Recovery", time: "10:00", done: true },
  { day: "Tue", date: "20 May", icon: Target, title: "Tactical", time: "10:00", done: true },
  { day: "Wed", date: "21 May", icon: Dumbbell, title: "Intensity", time: "10:00", done: true },
  { day: "Thu", date: "22 May", icon: Zap, title: "Set Pieces", time: "10:00", done: true },
  { day: "Fri", date: "23 May", icon: Goal, title: "Match Prep", time: "10:00", done: false },
  { day: "Sat", date: "24 May", icon: Trophy, title: "Matchday", time: "18:00", done: false, active: true },
];

const roster = [
  { name: "Noah Williams", position: "RW", rating: 87, status: "Ready" },
  { name: "Liam Carter", position: "CM", rating: 83, status: "Monitor" },
  { name: "Ethan Brooks", position: "ST", rating: 81, status: "Ready" },
  { name: "Mason Lee", position: "GK", rating: 79, status: "Recovery" },
];

const impactMetrics = [
  { value: "91%", label: "Attendance", Icon: Trophy },
  { value: "14", label: "New Reports", Icon: Medal },
  { value: "7.8", label: "Avg Rating", Icon: Star },
];

function Ring({ value, label, color = "lime" }: { value: number; label: string; color?: "lime" | "cyan" | "teal" }) {
  const stroke = color === "lime" ? "#b6ff00" : color === "cyan" ? "#00d8ff" : "#2ee8c9";

  return (
    <div className="relative mx-auto grid h-28 w-28 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={stroke}
          strokeDasharray={`${value * 2.51} 251`}
          strokeLinecap="round"
          strokeWidth="8"
        />
      </svg>
      <div className="text-center">
        <div className="font-display text-3xl font-bold text-white">{value}%</div>
        <div className="text-xs font-semibold text-slate-300">{label}</div>
      </div>
    </div>
  );
}

function TrendChart() {
  return (
    <svg viewBox="0 0 520 230" className="h-full w-full">
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1="34" x2="500" y1={34 + i * 39} y2={34 + i * 39} stroke="rgba(255,255,255,0.08)" />
      ))}
      {["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"].map((m, i) => (
        <text key={m} x={45 + i * 61} y="215" fill="#91a0b5" fontSize="13">
          {m}
        </text>
      ))}
      <polyline points="45,150 110,126 175,136 240,101 305,141 370,112 435,130 485,116" fill="none" stroke="#b6ff00" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <polyline points="45,188 110,164 175,177 240,151 305,169 370,157 435,174 485,163" fill="none" stroke="#00d8ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <rect x="458" y="98" width="39" height="26" rx="7" fill="#b6ff00" />
      <text x="468" y="116" fill="#06111f" fontSize="14" fontWeight="800">
        7.8
      </text>
      <rect x="458" y="150" width="39" height="26" rx="7" fill="#00d8ff" />
      <text x="468" y="168" fill="#06111f" fontSize="14" fontWeight="800">
        2.1
      </text>
    </svg>
  );
}

function Heatmap() {
  return (
    <svg viewBox="0 0 360 230" className="h-full w-full rounded-xl">
      <rect width="360" height="230" fill="#071524" />
      <rect x="12" y="12" width="336" height="206" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="2" />
      <line x1="180" x2="180" y1="12" y2="218" stroke="rgba(255,255,255,0.55)" />
      <circle cx="180" cy="115" r="36" fill="none" stroke="rgba(255,255,255,0.55)" />
      <rect x="12" y="64" width="54" height="102" fill="none" stroke="rgba(255,255,255,0.55)" />
      <rect x="294" y="64" width="54" height="102" fill="none" stroke="rgba(255,255,255,0.55)" />
      <filter id="coachHeatBlur">
        <feGaussianBlur stdDeviation="13" />
      </filter>
      <g filter="url(#coachHeatBlur)" opacity="0.92">
        {[
          [126, 68, "#b6ff00"],
          [158, 91, "#ffef37"],
          [181, 121, "#ff2d2d"],
          [228, 104, "#7bea28"],
          [245, 151, "#00d8ff"],
          [130, 156, "#00d8ff"],
          [194, 167, "#b6ff00"],
        ].map(([x, y, color], index) => (
          <circle key={index} cx={Number(x)} cy={Number(y)} r="30" fill={String(color)} />
        ))}
      </g>
    </svg>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[18px] border border-[#2a4460]/80 bg-[#07172a]/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

export default function CoachHomePage() {
  const myGroups = mockGroups.filter((group) => ["g1", "g3"].includes(group.id));
  const myPlayers = mockPlayers.filter((player) => ["g1", "g3"].includes(player.groupId));
  const todaySessions = mockSessions.filter((session) => session.coachId === "c1").slice(0, 3);
  const completedEvaluations = mockEvaluations.filter((evaluation) => evaluation.coachId === "c1").length;

  const heroStats = [
    { icon: Users, value: myPlayers.length, label: "Active Players" },
    { icon: CalendarDays, value: todaySessions.length + 2, label: "Upcoming Sessions" },
    { icon: UserCheck, value: myGroups.length, label: "Training Groups" },
    { icon: Star, value: completedEvaluations, label: "Evaluations" },
  ];

  return (
    <div className="rounded-[34px] border border-[#2b4661] bg-[#05101f]/95 p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.42)] md:p-7">
      <section className="mb-5 grid gap-5 xl:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-lime-300">Coach performance hub</p>
          <h1 className="font-display text-5xl font-bold leading-none tracking-normal md:text-6xl">Welcome back, Coach</h1>
          <p className="mt-2 text-lg text-slate-300">Here is your team performance overview for today.</p>
        </div>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
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
            <div className={`mt-3 font-display text-3xl font-bold ${item.accent === "cyan" ? "text-cyan-300" : item.accent === "lime" ? "text-lime-300" : "text-white"}`}>
              {item.value}
            </div>
            <div className="mt-1 text-sm text-slate-300">{item.sub}</div>
            {index === 2 && (
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className="h-full w-[56%] rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(0,216,255,0.55)]" />
              </div>
            )}
          </div>
        ))}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.25fr_0.62fr_0.62fr_0.62fr]">
        <Panel className="overflow-hidden">
          <div className="relative min-h-[350px] p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(182,255,0,0.28),transparent_26%),linear-gradient(135deg,rgba(47,140,255,0.18),transparent_58%)]" />
            <div className="absolute right-8 top-12 font-display text-[210px] font-black leading-none text-lime-300/20">X</div>
            <Image src="/Player.png" alt="Goalix player placeholder" fill sizes="(min-width: 1280px) 360px, 100vw" className="object-cover object-center opacity-80 mix-blend-screen" priority />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#07172a] to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <h2 className="text-2xl font-semibold">Noah Williams</h2>
              <p className="mt-1 text-sm">
                <span className="font-bold text-lime-300">RW</span> <span className="text-slate-300">- Winger</span>
              </p>
              <div className="mt-5 grid grid-cols-4 gap-3 border-t border-[#2a4460] pt-4 text-sm">
                {["Age|24", "Height|178 cm", "Weight|72 kg", "Foot|Left"].map((item) => {
                  const [label, value] = item.split("|");
                  return (
                    <div key={label}>
                      <div className="text-slate-400">{label}</div>
                      <div className="font-semibold text-white">{value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="absolute bottom-32 right-5 rounded-2xl border border-lime-300/35 bg-[#07111f]/85 px-4 py-3 text-center">
              <div className="text-xs text-slate-300">OVR</div>
              <div className="font-display text-4xl font-bold text-lime-300">87</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Performance Trend</h2>
            <button className="inline-flex items-center gap-2 rounded-xl border border-[#2a4460] bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
              Last 8 Matches <ChevronDown size={16} />
            </button>
          </div>
          <div className="h-[260px]">
            <TrendChart />
          </div>
        </Panel>

        <Panel className="p-5 text-center">
          <h2 className="text-left text-xl font-semibold">Physical Load</h2>
          <Ring value={78} label="Optimal" />
          <p className="mt-4 text-left text-sm text-lime-300">+8% <span className="text-slate-400">vs last week</span></p>
        </Panel>

        <Panel className="p-5 text-center">
          <h2 className="text-left text-xl font-semibold">Stamina</h2>
          <Ring value={91} label="High" color="cyan" />
          <p className="mt-4 text-left text-sm text-cyan-300">+15% <span className="text-slate-400">vs last week</span></p>
        </Panel>

        <Panel className="p-5 text-center">
          <h2 className="text-left text-xl font-semibold">Recovery</h2>
          <Ring value={85} label="Good" color="teal" />
          <p className="mt-4 text-left text-sm text-teal-300">+6% <span className="text-slate-400">vs last week</span></p>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.78fr_0.7fr_1.45fr_0.78fr]">
        <Panel className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Coach Actions</h2>
            <Link href="/coach/schedule" className="text-sm text-cyan-300">
              View plan
            </Link>
          </div>
          <div className="space-y-1">
            {actions.map((action) => (
              <Link key={action.title} href={action.href} className="flex items-center gap-3 border-b border-[#2a4460] py-3 last:border-b-0">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#2a4460] bg-white/[0.03] text-white">
                  <action.icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">{action.title}</span>
                  <span className="text-sm text-slate-400">{action.subtitle}</span>
                </span>
                <span className={`grid h-6 w-6 place-items-center rounded-full ${action.done ? "bg-lime-300 text-[#06111f]" : "border border-[#2a4460] text-slate-500"}`}>
                  {action.done && <Check size={15} />}
                </span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-xl font-semibold">Heatmap <span className="text-sm text-slate-400">(Last Match)</span></h2>
          <div className="h-[235px]">
            <Heatmap />
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Training Schedule</h2>
            <button className="inline-flex items-center gap-2 rounded-xl border border-[#2a4460] bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
              This Week <ChevronDown size={16} />
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-6">
            {schedule.map((item) => (
              <div key={item.day} className={`min-h-[178px] border-r border-[#2a4460] p-3 last:border-r-0 ${item.active ? "rounded-2xl bg-cyan-300/5" : ""}`}>
                <div className="text-sm font-semibold">{item.day}</div>
                <div className="text-xs text-slate-400">{item.date}</div>
                <item.icon className={`mt-5 h-8 w-8 ${item.active ? "text-cyan-300" : "text-lime-300"}`} />
                <p className="mt-4 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-slate-400">{item.time}</p>
                <span className={`mt-4 grid h-6 w-6 place-items-center rounded-full ${item.done ? "bg-lime-300/80 text-[#06111f]" : "border border-cyan-300 text-cyan-300"}`}>
                  {item.done ? <Check size={14} /> : ""}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-5 text-xl font-semibold">Focus Players</h2>
          <div className="space-y-4">
            {roster.map((player) => (
              <div key={player.name} className="flex items-center gap-3 rounded-2xl border border-[#2a4460] bg-white/[0.025] p-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-lime-300 to-cyan-300 font-black text-[#06111f]">
                  {player.position}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{player.name}</p>
                  <p className="text-xs text-slate-400">{player.status}</p>
                </div>
                <strong className="font-display text-2xl text-lime-300">{player.rating}</strong>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <Panel className="p-5">
          <h2 className="mb-4 text-xl font-semibold">Group Overview</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {myGroups.map((group) => (
              <Link key={group.id} href={`/coach/my-groups/${group.id}`} className="rounded-2xl border border-[#2a4460] bg-white/[0.025] p-4 transition hover:border-lime-300/40">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{group.name}</h3>
                  <span className="rounded-full bg-lime-300/10 px-3 py-1 text-xs font-bold text-lime-300">
                    {group.playerCount}/{group.maxPlayers}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{group.schedule}</p>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-xl font-semibold">Upcoming Sessions</h2>
          <div className="space-y-3">
            {todaySessions.map((session) => (
              <div key={session.id} className="flex items-center gap-4 rounded-2xl border border-[#2a4460] bg-white/[0.025] p-4">
                <CalendarDays className="h-9 w-9 text-cyan-300" />
                <div className="flex-1">
                  <p className="font-semibold text-white">{session.groupName}</p>
                  <p className="text-sm text-slate-400">{session.startTime} - {session.endTime}</p>
                </div>
                <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-bold capitalize text-cyan-300">{session.type}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-xl font-semibold">Coach Impact</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            {impactMetrics.map(({ value, label, Icon }) => (
              <div key={label} className="rounded-2xl border border-[#2a4460] bg-white/[0.025] p-4">
                <Icon className="mx-auto mb-3 h-8 w-8 text-lime-300" />
                <strong className="font-display text-3xl text-white">{value}</strong>
                <p className="mt-1 text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
