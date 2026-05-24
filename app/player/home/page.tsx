"use client";

import Image from "next/image";
import {
  Activity,
  Bed,
  ChevronDown,
  Cloud,
  Dumbbell,
  Goal,
  HeartPulse,
  Medal,
  Moon,
  Star,
  Target,
  Trophy,
  User,
  Zap,
} from "lucide-react";

const metrics = [
  { label: "Match Rating", value: "7.6", sub: "Last Match", trend: "+ 0.8" },
  { label: "Training Readiness", value: "82%", sub: "Optimal", ring: true, color: "lime" },
  { label: "Sprint Speed", value: "33.6", sub: "km/h", trend: "+ 1.2" },
  { label: "Distance Covered", value: "10.8", sub: "km", trend: "+ 1.5" },
  { label: "Recovery Score", value: "85%", sub: "Good", ring: true, color: "teal" },
  { label: "Stamina", value: "91%", sub: "High", ring: true, color: "cyan" },
];

const keyStats = [
  ["Goals", "9"], ["Assists", "6"], ["Minutes Played", "1,173"], ["Shots on Target", "24"], ["Pass Completion", "82%"], ["Key Passes", "23"],
];

const wellness = [
  { icon: Moon, label: "Sleep", value: "7.1 h", sub: "Good" },
  { icon: HeartPulse, label: "HRV", value: "62 ms", sub: "Good" },
  { icon: User, label: "Fatigue", value: "Low", sub: "Optimal" },
];

const schedule = [
  { day: "Mon", date: "19 May", icon: Zap, title: "Recovery Session", done: true },
  { day: "Tue", date: "20 May", icon: Target, title: "Speed Training", done: true },
  { day: "Wed", date: "21 May", icon: Goal, title: "Technical Drills", done: true },
  { day: "Thu", date: "22 May", icon: Dumbbell, title: "Strength Training", done: true },
  { day: "Fri", date: "23 May", icon: Activity, title: "Tactical Session", done: true },
  { day: "Sat", date: "24 May", icon: Trophy, title: "Match Preparation", done: false },
  { day: "Sun", date: "25 May", icon: Bed, title: "Rest Day", done: false },
];

function Ring({ value, color = "lime" }: { value: number; color?: string }) {
  const stroke = color === "cyan" ? "#00d8ff" : color === "teal" ? "#2ee8c9" : "#b6ff00";
  return (
    <div className="relative mx-auto grid h-24 w-24 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle cx="50" cy="50" r="39" fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${value * 2.45} 245`} />
      </svg>
      <span className="font-display text-2xl font-bold text-white">{value}%</span>
    </div>
  );
}

function Trend() {
  return (
    <svg viewBox="0 0 520 230" className="h-full w-full">
      {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="34" x2="500" y1={34 + i * 39} y2={34 + i * 39} stroke="rgba(255,255,255,0.08)" />)}
      {["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"].map((m, i) => <text key={m} x={45 + i * 61} y="215" fill="#91a0b5" fontSize="13">{m}</text>)}
      <polyline points="45,148 110,126 175,138 240,103 305,142 370,110 435,132 485,119" fill="none" stroke="#b6ff00" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="45,190 110,166 175,178 240,154 305,174 370,158 435,177 485,166" fill="none" stroke="#00d8ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="458" y="100" width="39" height="26" rx="7" fill="#b6ff00" /><text x="468" y="118" fill="#06111f" fontSize="14" fontWeight="800">7.6</text>
      <rect x="458" y="153" width="39" height="26" rx="7" fill="#00d8ff" /><text x="468" y="171" fill="#06111f" fontSize="14" fontWeight="800">1.8</text>
    </svg>
  );
}

function Heatmap() {
  return (
    <svg viewBox="0 0 360 230" className="h-full w-full rounded-xl">
      <rect width="360" height="230" fill="#071524" />
      <rect x="12" y="12" width="336" height="206" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <line x1="180" y1="12" x2="180" y2="218" stroke="rgba(255,255,255,0.55)" />
      <circle cx="180" cy="115" r="36" fill="none" stroke="rgba(255,255,255,0.55)" />
      <filter id="playerHeatBlur"><feGaussianBlur stdDeviation="13" /></filter>
      <g filter="url(#playerHeatBlur)" opacity="0.92">
        {[[155, 85, "#b6ff00"], [180, 108, "#ffef37"], [198, 130, "#ff2d2d"], [140, 140, "#00d8ff"], [235, 105, "#7bea28"], [120, 70, "#00d8ff"], [188, 170, "#b6ff00"]].map(([x, y, c], i) => (
          <circle key={i} cx={Number(x)} cy={Number(y)} r="30" fill={String(c)} />
        ))}
      </g>
    </svg>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[18px] border border-[#2a4460]/80 bg-[#07172a]/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_44px_rgba(0,0,0,0.24)] ${className}`}>{children}</section>;
}

export default function PlayerHomePage() {
  return (
    <div className="rounded-[34px] border border-[#2b4661] bg-[#05101f]/95 p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.42)] md:p-7">
      <div className="mb-5 grid gap-5 xl:grid-cols-[1fr_0.82fr_160px]">
        <div>
          <h1 className="font-display text-5xl font-bold leading-none tracking-normal md:text-6xl">Welcome back, Player</h1>
          <p className="mt-2 text-lg text-slate-300">Here&apos;s your personal performance overview</p>
        </div>
        <blockquote className="border-l border-[#263f59] pl-7 text-slate-200">
          <span className="text-4xl font-black text-lime-300">“</span> Focus on the process, the results will follow.
          <p className="mt-2 text-sm text-slate-400">- Coach</p>
        </blockquote>
        <Ring value={82} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_2.8fr]">
        <Panel className="overflow-hidden xl:row-span-2">
          <div className="relative min-h-[405px] p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(182,255,0,0.28),transparent_28%)]" />
            <div className="absolute right-7 top-10 font-display text-[210px] font-black leading-none text-lime-300/20">X</div>
            <Image src="/Player.png" alt="Goalix player placeholder" fill sizes="360px" className="object-cover object-center opacity-80 mix-blend-screen" priority />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#07172a] to-transparent" />
            <div className="absolute bottom-6 left-5 right-5">
              <h2 className="text-3xl font-semibold">Noah Williams</h2>
              <p className="mt-1 text-lg"><span className="font-bold text-lime-300">RW</span> <span className="text-slate-300">• Winger</span></p>
              <div className="mt-5 grid grid-cols-4 gap-3 border-t border-[#2a4460] pt-4 text-sm">
                {["Age|24", "Height|178 cm", "Weight|72 kg", "Foot|Left"].map((item) => {
                  const [label, value] = item.split("|");
                  return <div key={label}><div className="text-slate-400">{label}</div><div className="font-semibold">{value}</div></div>;
                })}
              </div>
            </div>
            <div className="absolute bottom-32 right-5 rounded-2xl border border-lime-300/35 bg-[#07111f]/85 px-4 py-3 text-center">
              <div className="text-xs text-slate-300">OVR</div><div className="font-display text-4xl font-bold text-lime-300">87</div>
            </div>
          </div>
        </Panel>

        <Panel className="grid gap-0 overflow-hidden md:grid-cols-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="border-b border-[#2a4460] p-5 text-center md:border-b-0 md:border-r last:md:border-r-0">
              <p className="font-semibold">{metric.label}</p>
              {metric.ring ? <Ring value={Number(metric.value.replace("%", ""))} color={metric.color} /> : <div className="mt-5 font-display text-4xl font-bold">{metric.value}</div>}
              <p className="text-sm text-slate-300">{metric.sub}</p>
              {metric.trend && <p className="mt-2 text-sm text-lime-300">↑ {metric.trend}</p>}
            </div>
          ))}
        </Panel>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.75fr_0.55fr_0.65fr]">
          <Panel className="p-5"><div className="mb-4 flex justify-between"><h2 className="text-xl font-semibold">Performance Trend</h2><button className="inline-flex items-center gap-2 rounded-xl border border-[#2a4460] px-3 py-1 text-sm text-slate-300">Last 8 Matches <ChevronDown size={14} /></button></div><div className="h-[245px]"><Trend /></div></Panel>
          <Panel className="p-5"><h2 className="mb-4 text-xl font-semibold">Heatmap <span className="text-sm text-slate-400">(Last Match)</span></h2><div className="h-[245px]"><Heatmap /></div></Panel>
          <Panel className="p-5"><h2 className="mb-4 text-xl font-semibold">Key Stats</h2><div className="space-y-4">{keyStats.map(([l, v]) => <div key={l} className="flex justify-between text-sm"><span className="text-slate-300">{l}</span><strong>{v}</strong></div>)}</div></Panel>
          <Panel className="p-5"><h2 className="text-xl font-semibold">Coach Feedback</h2><p className="mt-5 rounded-xl bg-white/[0.03] p-4 text-sm leading-6 text-slate-300"><span className="text-2xl text-lime-300">“</span> Great intensity and movement. Your decision making in the final third is improving.</p><div className="mt-5 flex items-center gap-1 text-yellow-400">★★★★★ <span className="ml-auto text-lime-300">4.5</span></div></Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.75fr_1.65fr_1.05fr]">
        <Panel className="p-4"><h2 className="mb-4 text-xl font-semibold">Wellness</h2>{wellness.map((w) => <div key={w.label} className="flex items-center gap-4 border-b border-[#2a4460] py-4 last:border-b-0"><w.icon className="text-cyan-300" /><span className="flex-1">{w.label}</span><span className="text-right"><strong>{w.value}</strong><p className="text-xs text-lime-300">{w.sub}</p></span></div>)}</Panel>
        <Panel className="p-5"><div className="mb-5 flex justify-between"><h2 className="text-xl font-semibold">Weekly Training Schedule</h2><button className="rounded-xl border border-[#2a4460] px-3 py-1 text-sm text-slate-300">This Week</button></div><div className="grid gap-2 md:grid-cols-7">{schedule.map((s) => <div key={s.day} className="border-r border-[#2a4460] p-3 text-center last:border-r-0"><p className="font-semibold">{s.day}</p><p className="text-xs text-slate-400">{s.date}</p><s.icon className="mx-auto mt-5 h-8 w-8 text-lime-300" /><p className="mt-4 text-sm font-semibold">{s.title}</p><p className="mt-1 text-xs text-slate-400">10:00</p><span className={`mx-auto mt-4 grid h-6 w-6 place-items-center rounded-full ${s.done ? "bg-lime-300 text-[#06111f]" : "border border-cyan-300"}`}>{s.done ? "✓" : ""}</span></div>)}</div></Panel>
        <Panel className="p-5"><div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold">Upcoming Match</h2><p className="mt-7 text-lg font-semibold">vs City Rovers</p><p className="mt-2 text-sm text-slate-300">Saturday, 31 May • 20:00</p><p className="text-sm text-slate-400">Riverside Stadium</p></div><span className="rounded-full border border-cyan-300/40 px-4 py-2 text-cyan-300">Away Match</span></div><div className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-[#2a4460] p-4"><div className="flex gap-3"><Cloud className="text-cyan-300" /><span>Weather<br /><strong>18°C</strong></span></div><div className="flex gap-3"><Target className="text-lime-300" /><span>Focus Area<br /><strong>Final Third</strong></span></div></div></Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_0.45fr_0.45fr_1fr_0.65fr]">
        <Panel className="grid grid-cols-5 gap-0 p-5 text-center"><h2 className="col-span-5 mb-5 text-left text-xl font-semibold">Season Highlights</h2>{[["9","Goals"],["6","Assists"],["23","Key Passes"],["24","Shots on Target"],["8.2","Avg Rating"]].map(([v,l]) => <div key={l} className="border-r border-[#2a4460] last:border-r-0"><Star className="mx-auto mb-3 text-lime-300" /><strong className="font-display text-3xl">{v}</strong><p className="text-sm text-slate-400">{l}</p></div>)}</Panel>
        <Panel className="p-5 text-center"><h2 className="text-left text-lg font-semibold">Top Speed</h2><Ring value={84} color="cyan" /><strong className="font-display text-4xl">33.6</strong><p className="text-sm text-slate-400">km/h</p></Panel>
        <Panel className="p-5 text-center"><h2 className="text-left text-lg font-semibold">Distance</h2><Ring value={72} color="cyan" /><strong className="font-display text-4xl">11.2</strong><p className="text-sm text-slate-400">km</p></Panel>
        <Panel className="p-5"><h2 className="mb-5 text-xl font-semibold">Achievements</h2><div className="grid grid-cols-3 gap-4 text-center">{["Player of the Match|3x","Top Performer|5x","Consistency Streak|7 Matches"].map((a) => { const [t,v]=a.split("|"); return <div key={t}><Medal className="mx-auto h-14 w-14 text-yellow-400" /><p className="mt-2 text-sm">{t}</p><strong className="text-lime-300">{v}</strong></div>; })}</div></Panel>
        <Panel className="p-5 text-center"><h2 className="mb-5 text-left text-xl font-semibold">Next Milestone</h2><Ring value={80} color="teal" /><p className="mt-3 font-semibold">Goal Contribution</p><p className="text-sm text-slate-400">2 more to unlock</p></Panel>
      </div>
    </div>
  );
}
