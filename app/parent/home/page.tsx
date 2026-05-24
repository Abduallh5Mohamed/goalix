"use client";

import Image from "next/image";
import {
  CalendarDays,
  FileText,
  Goal,
  HeartPulse,
  Mail,
  MessageSquare,
  Moon,
  ShieldCheck,
  Smile,
  Star,
  Trophy,
  User,
  Users,
  Zap,
} from "lucide-react";

const topStats = [
  { icon: CalendarDays, value: "85%", label: "Attendance" },
  { icon: Users, value: "92%", label: "Participation" },
  { icon: Smile, value: "Great", label: "Wellness" },
  { icon: Star, value: "On Track", label: "Overall Progress" },
];

const skillRows = [
  ["Finishing", "78%"], ["Passing", "72%"], ["Dribbling", "81%"], ["Defending", "65%"], ["Game IQ", "75%"],
];

const alerts = [
  ["Training time change", "Tomorrow, 20 May", "16:00 → 17:30"],
  ["Bring: Shin guards", "20 May", "Equipment Reminder"],
  ["Match day", "24 May vs FC United", "4d"],
];

const sessions = [
  ["Today", "Technical Training", "20 May", "16:00 - 17:30", "GOALIX Arena"],
  ["Thu", "Strength & Conditioning", "22 May", "17:00 - 18:00", "GOALIX Gym"],
  ["Sat", "Match Day", "24 May", "10:00", "Riverside Stadium"],
];

const wellness = [
  ["Energy", "Good", "82", Zap],
  ["Sleep", "7.8 h", "68", Moon],
  ["Mood", "Positive", "92", Smile],
  ["Soreness", "Low", "45", HeartPulse],
];

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[18px] border border-[#2a4460]/80 bg-[#07172a]/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_44px_rgba(0,0,0,0.24)] ${className}`}>{children}</section>;
}

function Ring({ value, label, color = "lime" }: { value: number; label?: string; color?: string }) {
  const stroke = color === "cyan" ? "#00d8ff" : color === "teal" ? "#2ee8c9" : "#b6ff00";
  return (
    <div className="relative mx-auto grid h-28 w-28 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle cx="50" cy="50" r="39" fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${value * 2.45} 245`} />
      </svg>
      <div className="text-center">
        <div className="font-display text-3xl font-bold text-white">{value}%</div>
        {label && <div className="text-xs text-slate-300">{label}</div>}
      </div>
    </div>
  );
}

function Heatmap() {
  return (
    <svg viewBox="0 0 360 230" className="h-full w-full rounded-xl">
      <rect width="360" height="230" fill="#071524" />
      <rect x="12" y="12" width="336" height="206" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <line x1="180" y1="12" x2="180" y2="218" stroke="rgba(255,255,255,0.55)" />
      <circle cx="180" cy="115" r="36" fill="none" stroke="rgba(255,255,255,0.55)" />
      <filter id="parentHeatBlur"><feGaussianBlur stdDeviation="14" /></filter>
      <g filter="url(#parentHeatBlur)" opacity="0.9">
        {[[118, 72, "#b6ff00"], [154, 92, "#ffef37"], [180, 120, "#ff2d2d"], [222, 106, "#7bea28"], [250, 148, "#00d8ff"], [116, 150, "#00d8ff"], [205, 165, "#b6ff00"]].map(([x, y, c], i) => (
          <circle key={i} cx={Number(x)} cy={Number(y)} r="30" fill={String(c)} />
        ))}
      </g>
    </svg>
  );
}

export default function ParentHomePage() {
  return (
    <div className="rounded-[34px] border border-[#2b4661] bg-[#05101f]/95 p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.42)] md:p-7">
      <section className="mb-5 grid gap-5 xl:grid-cols-[1fr_auto]">
        <div><h1 className="font-display text-5xl font-bold leading-none md:text-6xl">Welcome back, Parent</h1><p className="mt-2 text-lg text-slate-300">Here&apos;s your child&apos;s journey at a glance <span className="text-lime-300">♡</span></p></div>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">{topStats.map((s) => <div key={s.label} className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full border border-lime-300/30 bg-lime-300/5 text-lime-300"><s.icon size={22} /></span><div><strong className="text-2xl">{s.value}</strong><p className="text-xs text-slate-400">{s.label}</p></div></div>)}</div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.98fr_0.72fr]">
        <Panel className="overflow-hidden xl:row-span-2">
          <div className="relative min-h-[340px] p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(182,255,0,0.28),transparent_28%)]" />
            <div className="absolute right-7 top-10 font-display text-[190px] font-black leading-none text-lime-300/20">X</div>
            <Image src="/Player.png" alt="child player placeholder" fill sizes="340px" className="object-cover object-center opacity-80 mix-blend-screen" priority />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#07172a] to-transparent" />
            <div className="absolute bottom-6 left-5 right-5">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-lime-300/35 bg-[#07111f]/85 text-center"><span className="text-xs">OVR</span><strong className="font-display text-3xl text-lime-300">78</strong></div>
              <h2 className="text-3xl font-semibold">Noah Williams</h2><p className="mt-1"><span className="font-bold text-lime-300">U13</span> <span className="text-slate-300">• Striker</span></p>
              <div className="mt-5 grid grid-cols-5 gap-3 border-t border-[#2a4460] pt-4 text-xs">{["Age|12","DOB|12 Jan 2013","Height|158 cm","Weight|52 kg","Foot|Right"].map((i)=>{const [l,v]=i.split("|"); return <div key={l}><p className="text-slate-400">{l}</p><strong>{v}</strong></div>;})}</div>
            </div>
          </div>
          <button className="m-4 flex w-[calc(100%-2rem)] items-center justify-between rounded-2xl border border-[#2a4460] px-4 py-3 text-sm"><span className="flex items-center gap-2"><User size={18} />View Full Profile</span>→</button>
        </Panel>

        <Panel className="grid gap-0 overflow-hidden md:grid-cols-5">
          {[["Attendance",85,"lime"],["Training Participation",92,"teal"],["On-Time Rate",90,"lime"],["Session Rating",92,"cyan"],["Safety Status",100,"teal"]].map(([label,value,color]) => <div key={String(label)} className="border-b border-[#2a4460] p-5 text-center md:border-b-0 md:border-r last:md:border-r-0"><p className="font-semibold">{label}</p>{label==="Safety Status"?<ShieldCheck className="mx-auto my-5 h-24 w-24 text-teal-300" />:<Ring value={Number(value)} label="This Season" color={String(color)} />}<p className="text-sm text-lime-300">↑ {label==="Attendance"?"10":"8"}% <span className="text-slate-400">vs last season</span></p></div>)}
        </Panel>

        <Panel className="p-4 xl:row-span-2"><div className="flex justify-between"><h2 className="font-semibold">Alerts</h2><span className="text-xs text-slate-400">View All</span></div><div className="mt-4 space-y-3">{alerts.map((a,i)=><div key={a[0]} className="flex gap-3 border-b border-[#2a4460] pb-3 last:border-b-0"><span className={`grid h-9 w-9 place-items-center rounded-xl ${i===0?"bg-yellow-400/15 text-yellow-400":i===1?"bg-red-400/15 text-red-400":"bg-cyan-400/15 text-cyan-300"}`}>●</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{a[0]}</p><p className="text-xs text-slate-400">{a[1]}</p></div><p className="text-xs text-slate-400">{a[2]}</p></div>)}</div><p className="mt-4 text-xs text-orange-300">● 3 unread alerts</p></Panel>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.85fr_0.85fr]">
          <Panel className="p-5"><div className="mb-4 flex justify-between"><h2 className="font-semibold">Skill Development</h2><button className="rounded-xl border border-[#2a4460] px-3 py-1 text-xs">This Season</button></div>{skillRows.map(([l,v])=><div key={l} className="mb-4 grid grid-cols-[90px_1fr_45px] items-center gap-3 text-sm"><span>{l}</span><div className="h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-lime-300" style={{width:v}} /></div><span className="text-lime-300">{v}</span></div>)}<div className="rounded-xl border border-[#2a4460] p-3"><div className="flex justify-between"><span>Overall Progress</span><strong>76%</strong></div><div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-full w-[76%] rounded-full bg-lime-300" /></div></div></Panel>
          <Panel className="p-5"><h2 className="mb-4 font-semibold">Performance Heatmap</h2><div className="h-[210px]"><Heatmap /></div><p className="mt-3 text-sm text-slate-400">Attacking Direction →</p></Panel>
          <Panel className="p-5"><h2 className="font-semibold">Coach Notes</h2><div className="mt-5 flex gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-orange-300/20">CA</div><div><p className="font-semibold">Coach Alex</p><p className="text-xs text-slate-400">19 May 2025</p></div></div><p className="mt-4 text-sm leading-6 text-slate-300">Noah has shown great improvement in movement off the ball and finishing in training.</p><div className="mt-4 flex gap-2"><span className="rounded-full bg-lime-300/15 px-3 py-1 text-xs text-lime-300">Hard Worker</span><span className="rounded-full bg-cyan-300/15 px-3 py-1 text-xs text-cyan-300">Team Player</span></div></Panel>
          <Panel className="p-5"><div className="mb-4 flex justify-between"><h2 className="font-semibold">Wellness Summary</h2><button className="text-xs text-slate-400">This Week</button></div>{wellness.map(([l,v,p,Icon])=><div key={String(l)} className="mb-4 grid grid-cols-[24px_1fr_50px] items-center gap-3 text-sm"><Icon className="text-cyan-300" size={20}/><div><div className="flex justify-between"><span>{l}</span></div><div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-lime-300" style={{width:`${p}%`}} /></div></div><span className="text-right text-lime-300">{v}</span></div>)}</Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_0.95fr_0.9fr_0.85fr]">
        <Panel className="p-5"><div className="flex justify-between"><h2 className="font-semibold">Upcoming Sessions</h2><span className="text-xs text-slate-400">View Full Schedule</span></div><div className="mt-4 space-y-4">{sessions.map((s,i)=><div key={s[1]} className="grid grid-cols-[4px_50px_1fr] gap-4 border-b border-[#2a4460] pb-4 last:border-b-0"><span className={`rounded-full ${i===0?"bg-teal-300":i===1?"bg-yellow-300":"bg-lime-300"}`} /><span className="text-sm text-slate-300">{s[0]}<br />{s[2]}</span><div><p className="font-semibold">{s[1]}</p><p className="text-sm text-slate-400">{s[3]} <span className="text-lime-300">• {s[4]}</span></p></div></div>)}</div></Panel>
        <Panel className="p-5"><div className="flex justify-between"><h2 className="font-semibold">Recent Match</h2><span className="text-xs text-slate-400">View All</span></div><div className="mt-6 grid grid-cols-3 items-center text-center"><div><Trophy className="mx-auto text-lime-300" /><p>GOALIX FC<br /><span className="text-xs text-slate-400">U13</span></p></div><div><strong className="font-display text-5xl">3 - 1</strong><p className="text-lime-300">Win</p></div><div><Goal className="mx-auto text-cyan-300" /><p>City Rovers<br /><span className="text-xs text-slate-400">U13</span></p></div></div></Panel>
        <Panel className="p-5"><h2 className="font-semibold">Academic Progress</h2><div className="mt-6 grid grid-cols-4 gap-3 text-center">{["A|Maths","A-|Science","B+|English","A|PE"].map((g)=>{const [v,l]=g.split("|"); return <div key={l}><div className="grid h-20 w-20 place-items-center rounded-full border-[6px] border-lime-300 font-display text-3xl">{v}</div><p className="mt-2 text-sm text-slate-300">{l}</p></div>;})}</div><div className="mt-5 rounded-xl border border-[#2a4460] p-3"><span className="text-lime-300">Overall Average</span><strong className="float-right text-2xl">A-</strong></div></Panel>
        <Panel className="p-5"><div className="flex justify-between"><h2 className="font-semibold">Calendar</h2><span className="text-sm text-slate-400">May 2025</span></div><div className="mt-4 grid grid-cols-7 gap-2 text-center text-sm">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun",...Array.from({length:35},(_,i)=>String(i+1))].map((d,i)=><span key={`${d}-${i}`} className={`rounded-full p-1 ${["20","22","24"].includes(d)?"bg-lime-300 text-[#06111f] font-bold":i<7?"text-slate-400":"text-white"}`}>{d}</span>)}</div></Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-4">
        <Panel className="p-5"><h2 className="font-semibold">Communication</h2><div className="mt-4 space-y-3"><div className="flex gap-3"><MessageSquare className="text-cyan-300" /><span>Team Group<br /><small className="text-slate-400">Coach Alex: Great session everyone!</small></span></div><div className="flex gap-3"><Mail className="text-cyan-300" /><span>Direct Message<br /><small className="text-slate-400">Let&apos;s chat about Noah&apos;s progress.</small></span></div></div></Panel>
        <Panel className="p-5"><h2 className="font-semibold">Documents & Forms</h2>{["Medical Consent Form|Valid","Code of Conduct|Accepted","Photo & Video Consent|Valid"].map((d)=><div key={d} className="mt-4 flex justify-between border-b border-[#2a4460] pb-3"><span><FileText className="mr-2 inline text-cyan-300" size={18}/>{d.split("|")[0]}</span><span className="text-lime-300">{d.split("|")[1]} ✓</span></div>)}</Panel>
        <Panel className="p-5"><h2 className="font-semibold">Payments & Subscription</h2><p className="mt-5 text-slate-400">Current Plan</p><p className="text-lg font-semibold">GOALIX Elite Annual <span className="float-right rounded-lg bg-lime-300/15 px-3 py-1 text-sm text-lime-300">Active</span></p><div className="mt-5 rounded-xl border border-[#2a4460] p-4"><p className="text-slate-400">Next Payment</p><strong>30 Nov 2025</strong><p>£299.00 <span className="float-right">Auto-pay ON ✓</span></p></div></Panel>
        <Panel className="p-5"><h2 className="font-semibold">Family Access</h2>{["Sarah Williams|Mother • Primary Contact|Full Access","Mark Williams|Father|View Access"].map((f)=><div key={f} className="mt-4 flex items-center gap-3"><User className="text-slate-300"/><span className="flex-1">{f.split("|")[0]}<br/><small className="text-slate-400">{f.split("|")[1]}</small></span><span className="rounded-lg border border-lime-300/35 px-3 py-1 text-xs text-lime-300">{f.split("|")[2]}</span></div>)}<button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#2a4460] py-3"><Users size={18}/> Invite Family Member</button></Panel>
      </div>
    </div>
  );
}
