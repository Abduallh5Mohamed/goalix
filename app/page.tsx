"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

/* Smooth folder shape  gentle concave scoop, soft page curl, all bezier-rounded */
const CARD = [
  "M 20 68",
  "Q 0 68 0 88",
  "L 0 680",
  "Q 0 700 20 700",
  "L 945 700",
  "Q 958 700 968 690",
  "L 1000 655",
  "L 1000 18",
  "Q 1000 0 980 0",
  "L 738 0",
  "C 720 0 700 8 688 24",
  "C 676 42 666 58 660 68",
  "Z"
].join(" ");

export default function Home() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);

  return (
    <main
      className="h-screen w-full overflow-hidden relative flex flex-col"
      style={{ background: "linear-gradient(165deg, #c8d2dc 0%, #b4bec8 50%, #a4aeb8 100%)" }}
    >
      {/*  NAVBAR  */}
      <nav className="relative z-50 flex h-[62px] shrink-0 items-center px-5 sm:px-7 lg:px-9">
        <div className="flex items-center shrink-0">
          <Image src="/Logo.png" alt="Goalix" width={180} height={48} className="h-9 w-auto object-contain" priority />
        </div>
        <div className="hidden items-center gap-6 ml-8 lg:flex">
          <a href="#" className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#22703a]" style={{borderBottom:"1.5px solid #4ade80",paddingBottom:"2px"}}>Home</a>
          <a href="#" className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.13em] text-[#4a5a6a] hover:text-[#1a2a3a] transition-colors">
            Platform
            <svg width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          <a href="#" className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#4a5a6a] hover:text-[#1a2a3a] transition-colors">Features</a>
          <a href="#" className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#4a5a6a] hover:text-[#1a2a3a] transition-colors">AI Engine</a>
          <a href="#" className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#4a5a6a] hover:text-[#1a2a3a] transition-colors">Pricing</a>
          <a href="#" className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#4a5a6a] hover:text-[#1a2a3a] transition-colors">Contact</a>
        </div>
        <div className="ml-auto">
          <button className="flex items-center gap-2 rounded-full border border-[#5a6a7a]/40 px-6 py-2 text-[11px] font-semibold text-[#2a3a4a] tracking-[0.06em] hover:border-[#5a6a7a]/70 hover:bg-white/15 transition-all">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 2H3.5A1.5 1.5 0 0 0 2 3.5v7A1.5 1.5 0 0 0 3.5 12h2M9.5 10l3-3-3-3M12.5 7h-7" stroke="#2a3a4a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Login
          </button>
        </div>
      </nav>

      {/*  FOLDER CARD  */}
      <div className="relative flex-1 min-h-0 mx-2.5 mb-2.5 sm:mx-4 sm:mb-4 lg:mx-5 lg:mb-5">
        <div
          className={`relative w-full h-full transition-opacity duration-700 ${m ? "opacity-100" : "opacity-0"}`}
          style={{ filter: "drop-shadow(0 14px 44px rgba(0,0,0,0.4)) drop-shadow(0 2px 6px rgba(0,0,0,0.2))" }}
        >
          {/*  Card SVG shape  */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 700" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cf" x1="0%" y1="0%" x2="75%" y2="100%">
                <stop offset="0%" stopColor="#0e1e32"/>
                <stop offset="100%" stopColor="#070d18"/>
              </linearGradient>
              <linearGradient id="curlG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2a3a50"/>
                <stop offset="100%" stopColor="#0e1a28"/>
              </linearGradient>
              <linearGradient id="brd" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.18)"/>
                <stop offset="50%" stopColor="rgba(255,255,255,0.06)"/>
                <stop offset="100%" stopColor="rgba(255,255,255,0.02)"/>
              </linearGradient>
              <clipPath id="cc"><path d={CARD}/></clipPath>
            </defs>
            <path d={CARD} fill="url(#cf)"/>
            <g clipPath="url(#cc)">
              <ellipse cx="480" cy="450" rx="500" ry="280" fill="#0c1a2e" opacity="0.4"/>
              <g opacity="0.025">
                {[1,2,3,4,5,6,7,8,9].map(i=><line key={i} x1={i*100} y1="68" x2={i*100} y2="700" stroke="#fff" strokeWidth="1"/>)}
              </g>
            </g>
            <path d={CARD} fill="none" stroke="url(#brd)" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
            <path d="M 660 68 L 20 68 Q 0 68 0 88" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
            <path d="M 980 0 L 738 0 C 720 0 700 8 688 24 C 676 42 666 58 660 68" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
            <path d="M 945 700 Q 958 700 968 690 L 1000 655 L 1000 700 Z" fill="url(#curlG)"/>
            <path d="M 968 690 L 1000 655" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
          </svg>

          {/*  Card inner content  */}
          <div className="absolute z-10 flex flex-col" style={{top:"9.7%",left:0,right:0,bottom:0}}>
            <div className="flex flex-1 min-h-0">

              {/*  LEFT SIDEBAR  */}
              <aside className="hidden lg:flex flex-col items-center justify-between w-[180px] shrink-0 py-6 px-5 relative">
                <div className="absolute top-4 bottom-4 right-0 w-px" style={{background:"linear-gradient(to bottom, transparent, rgba(130,210,59,0.15) 20%, rgba(130,210,59,0.15) 80%, transparent)"}}/>
                {/* EKG block */}
                <div className="flex flex-col items-center gap-3 text-center">
                  <svg width="100" height="34" viewBox="0 0 100 34" fill="none" style={{filter:"drop-shadow(0 0 6px rgba(130,210,59,0.6))"}}>
                    <polyline points="0,17 8,17 14,3 20,31 26,1 32,33 38,17 54,17 60,6 68,28 74,17 100,17" stroke="#82D23B" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-white leading-[1.5]">Best Performance<br/>Accessories For You</p>
                  <div className="flex items-center gap-1.5">
                    <button className="h-[22px] w-[22px] rounded-full grid place-items-center text-[#071018] text-[10px] font-black" style={{background:"#82D23B"}}>{"\u2039"}</button>
                    <button className="h-[22px] w-[22px] rounded-full grid place-items-center text-[10px] font-black" style={{border:"1.5px solid rgba(130,210,59,0.5)",color:"#82D23B"}}>{"\u203A"}</button>
                  </div>
                </div>
                {/* Runner block */}
                <div className="flex flex-col items-center gap-3 text-center">
                  <svg width="44" height="62" viewBox="0 0 44 62" fill="none" style={{filter:"drop-shadow(0 0 4px rgba(130,210,59,0.4))"}}>
                    <circle cx="28" cy="6" r="4.5" stroke="#82D23B" strokeWidth="1.2" fill="none"/>
                    <line x1="28" y1="10.5" x2="24" y2="24" stroke="#82D23B" strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="26" y1="16" x2="14" y2="11" stroke="#82D23B" strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="14" y1="11" x2="8" y2="19" stroke="#82D23B" strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="26" y1="16" x2="36" y2="22" stroke="#82D23B" strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="36" y1="22" x2="40" y2="31" stroke="#82D23B" strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="24" y1="24" x2="16" y2="38" stroke="#82D23B" strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="16" y1="38" x2="8" y2="48" stroke="#82D23B" strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="24" y1="24" x2="32" y2="36" stroke="#82D23B" strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="32" y1="36" x2="38" y2="44" stroke="#82D23B" strokeWidth="1.2" strokeLinecap="round"/>
                    <circle cx="6" cy="54" r="4.5" stroke="#82D23B" strokeWidth="1.2" fill="none"/>
                  </svg>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-white leading-[1.5]">Training Optimization<br/>Insights</p>
                </div>
              </aside>

              {/*  MAIN CONTENT  */}
              <div className="flex-1 relative min-h-0 flex flex-col px-6 lg:px-8 pt-4 pb-0">

                {/* Badge + Performance widget row */}
                <div className="flex items-start justify-between mb-2">
                  <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em]" style={{border:"1px solid rgba(130,210,59,0.3)",background:"rgba(130,210,59,0.06)",color:"#82D23B"}}>
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><circle cx="5.5" cy="5.5" r="4.5" stroke="#82D23B" strokeWidth="0.8"/><path d="M4 3.5l3.5 2-3.5 2z" fill="#82D23B"/></svg>
                    Elevate Your Game
                  </div>
                  {/* Performance widget placeholder */}
                  <div className="w-[170px] h-[100px] rounded-[10px] overflow-hidden shrink-0 ml-4" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",backdropFilter:"blur(8px)"}}>
                    <p className="text-[7px] font-bold uppercase tracking-[0.15em] px-2.5 pt-2" style={{color:"#2d6a80"}}>performance data</p>
                    <div className="mx-2 mt-1.5 h-[68px] rounded-[6px] flex items-center justify-center text-[8px] text-white/20 font-bold uppercase tracking-widest" style={{background:"linear-gradient(135deg,#0c1e2e,#071420)",border:"1px solid rgba(255,255,255,0.05)"}}>
                      Image
                    </div>
                  </div>
                </div>

                {/* Stadium + Headline  overlapping layout */}
                <div className="flex-1 relative flex items-center min-h-0">
                  {/* Stadium placeholder */}
                  <div className="absolute left-0 top-1/2 -translate-y-[55%] w-[52%] aspect-square max-h-[92%] rounded-2xl flex items-center justify-center" style={{background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.08)"}}>
                    <span className="text-[11px] text-white/15 font-bold uppercase tracking-[0.2em]">Stadium Image</span>
                  </div>
                  {/* Headline */}
                  <div className="relative ml-auto w-[55%] flex flex-col justify-center pl-4">
                    <h1 className="font-black uppercase text-white" style={{fontSize:"clamp(42px,5.2vw,84px)",lineHeight:0.9,letterSpacing:"-0.02em"}}>
                      Train<br/>Smarter.<br/>Win Bigger.
                    </h1>
                  </div>
                </div>

                {/*  BOTTOM STRIP  */}
                <div className="flex items-center gap-5 py-4 mt-auto" style={{borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                  <div className="flex items-center gap-2 pr-5 text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap shrink-0" style={{borderRight:"1px solid rgba(255,255,255,0.06)",color:"#82D23B"}}>
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[4px]" style={{background:"rgba(130,210,59,0.1)",border:"1px solid rgba(130,210,59,0.2)"}}>
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><rect x="0.5" y="0.5" width="8" height="6" rx="1" stroke="#82D23B" strokeWidth="0.7"/><path d="M1.5 2.5h5.5M1.5 4.5h3.5" stroke="#82D23B" strokeWidth="0.7" strokeLinecap="round"/></svg>
                    </span>
                    Let&apos;s Get Moving
                  </div>
                  <p className="text-[9px] font-semibold uppercase leading-[1.6] tracking-[0.06em]" style={{color:"#2a5a6e"}}>
                    From Early Morning Workouts To Late-Night Hangouts, Our Apparel Blends Performance Tech
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
