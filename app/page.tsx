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
      style={{ background: "linear-gradient(135deg, #0f1f35 0%, #1a2d45 30%, #0d1a2e 70%, #081422 100%)" }}
    >
      {/*  NAVBAR  */}
      <nav className="relative z-50 flex h-16 shrink-0 items-center px-6 lg:px-12">
        <div className="flex items-center shrink-0">
          <Image src="/Logo.png" alt="Oalix" width={120} height={40} className="h-8 w-auto object-contain" priority />
        </div>
        <div className="hidden items-center gap-8 ml-12 lg:flex">
          <a href="#" className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors">Home</a>
          <a href="#" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors">
            Platform
            <svg width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          <a href="#" className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors">Features</a>
          <a href="#" className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors">AI Engine</a>
          <a href="#" className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors">Pricing</a>
          <a href="#" className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors">Contact</a>
        </div>
        <div className="ml-auto">
          <button className="flex items-center gap-2 rounded-full border border-gray-500/50 px-5 py-2 text-xs font-semibold text-white tracking-wider hover:border-gray-400 hover:bg-white/5 transition-all">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 2H3.5A1.5 1.5 0 0 0 2 3.5v7A1.5 1.5 0 0 0 3.5 12h2M9.5 10l3-3-3-3M12.5 7h-7" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Login
          </button>
        </div>
      </nav>

      {/*  FOLDER CARD  */}
      <div className="relative flex-1 min-h-0 mx-3 mb-3 lg:mx-6 lg:mb-6">
        <div
          suppressHydrationWarning
          className={`relative w-full h-full transition-opacity duration-700 ${m ? "opacity-100" : "opacity-0"}`}
          style={{ filter: "drop-shadow(0 20px 60px rgba(0,0,0,0.6))" }}
        >
          {/*  Card SVG shape  */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 700" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cf" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0a1929"/>
                <stop offset="50%" stopColor="#0f2847"/>
                <stop offset="100%" stopColor="#081422"/>
              </linearGradient>
              <linearGradient id="curlG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1a3a50"/>
                <stop offset="100%" stopColor="#0d1f2f"/>
              </linearGradient>
              <linearGradient id="brd" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.12)"/>
                <stop offset="50%" stopColor="rgba(255,255,255,0.04)"/>
                <stop offset="100%" stopColor="rgba(255,255,255,0.01)"/>
              </linearGradient>
              <clipPath id="cc"><path d={CARD}/></clipPath>
            </defs>
            <path d={CARD} fill="url(#cf)"/>
            <g clipPath="url(#cc)">
              <ellipse cx="250" cy="200" rx="400" ry="250" fill="#1a4a6a" opacity="0.15"/>
              <ellipse cx="750" cy="500" rx="350" ry="300" fill="#0f3a5a" opacity="0.1"/>
            </g>
            <path d={CARD} fill="none" stroke="url(#brd)" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
            <path d="M 660 68 L 20 68 Q 0 68 0 88" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
            <path d="M 980 0 L 738 0 C 720 0 700 8 688 24 C 676 42 666 58 660 68" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
            <path d="M 945 700 Q 958 700 968 690 L 1000 655 L 1000 700 Z" fill="url(#curlG)"/>
            <path d="M 968 690 L 1000 655" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
          </svg>

          {/*  Card inner content  */}
          <div className="absolute z-10 flex flex-col" style={{top:"9.7%",left:0,right:0,bottom:0}}>
            <div className="flex flex-1 min-h-0">

              {/*  LEFT SIDEBAR  */}
              <aside className="hidden lg:flex flex-col items-center justify-between w-48 shrink-0 py-8 px-6 relative">
                <div className="absolute top-6 bottom-6 right-0 w-px" style={{background:"linear-gradient(to bottom, transparent, rgba(100,180,100,0.2) 20%, rgba(100,180,100,0.2) 80%, transparent)"}}/>
                {/* EKG block */}
                <div className="flex flex-col items-center gap-4 text-center">
                  <svg width="110" height="38" viewBox="0 0 110 38" fill="none" style={{filter:"drop-shadow(0 0 8px rgba(100,200,100,0.5))"}}>
                    <polyline points="0,19 9,19 15,3 22,35 28,2 35,36 42,19 60,19 66,6 75,32 82,19 110,19" stroke="#64c864" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-[8.5px] font-black uppercase tracking-[0.14em] text-white leading-snug">Best Performance<br/>Accessories For You</p>
                  <div className="flex items-center gap-2">
                    <button className="h-6 w-6 rounded-full grid place-items-center text-slate-900 text-xs font-black" style={{background:"#64c864"}}>{"\u2039"}</button>
                    <button className="h-6 w-6 rounded-full grid place-items-center text-xs font-black" style={{border:"1.5px solid rgba(100,200,100,0.6)",color:"#64c864"}}>{"\u203A"}</button>
                  </div>
                </div>
                {/* Runner block */}
                <div className="flex flex-col items-center gap-4 text-center">
                  <svg width="50" height="70" viewBox="0 0 50 70" fill="none" style={{filter:"drop-shadow(0 0 5px rgba(100,200,100,0.4))"}}>
                    <circle cx="32" cy="8" r="5" stroke="#64c864" strokeWidth="1.3" fill="none"/>
                    <line x1="32" y1="13" x2="27" y2="28" stroke="#64c864" strokeWidth="1.3" strokeLinecap="round"/>
                    <line x1="30" y1="19" x2="16" y2="13" stroke="#64c864" strokeWidth="1.3" strokeLinecap="round"/>
                    <line x1="16" y1="13" x2="9" y2="22" stroke="#64c864" strokeWidth="1.3" strokeLinecap="round"/>
                    <line x1="30" y1="19" x2="41" y2="25" stroke="#64c864" strokeWidth="1.3" strokeLinecap="round"/>
                    <line x1="41" y1="25" x2="45" y2="35" stroke="#64c864" strokeWidth="1.3" strokeLinecap="round"/>
                    <line x1="27" y1="28" x2="18" y2="43" stroke="#64c864" strokeWidth="1.3" strokeLinecap="round"/>
                    <line x1="18" y1="43" x2="9" y2="54" stroke="#64c864" strokeWidth="1.3" strokeLinecap="round"/>
                    <line x1="27" y1="28" x2="36" y2="41" stroke="#64c864" strokeWidth="1.3" strokeLinecap="round"/>
                    <line x1="36" y1="41" x2="43" y2="50" stroke="#64c864" strokeWidth="1.3" strokeLinecap="round"/>
                    <circle cx="7" cy="62" r="5" stroke="#64c864" strokeWidth="1.3" fill="none"/>
                  </svg>
                  <p className="text-[8.5px] font-black uppercase tracking-[0.14em] text-white leading-snug">Training Optimization<br/>Insights</p>
                </div>
              </aside>

              {/*  MAIN CONTENT  */}
              <div className="flex-1 relative min-h-0 flex flex-col px-8 lg:px-10 pt-6 pb-0">

                {/* Badge + Performance widget row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[8.5px] font-bold uppercase tracking-wider" style={{border:"1px solid rgba(100,200,100,0.4)",background:"rgba(100,200,100,0.08)",color:"#64c864"}}>
                    <svg width="12" height="12" viewBox="0 0 11 11" fill="none"><circle cx="5.5" cy="5.5" r="4.5" stroke="#64c864" strokeWidth="0.8"/><path d="M4 3.5l3.5 2-3.5 2z" fill="#64c864"/></svg>
                    Elevate Your Game
                  </div>
                  {/* Performance widget placeholder */}
                  <div className="w-44 h-28 rounded-xl overflow-hidden shrink-0 ml-6" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",backdropFilter:"blur(10px)"}}>
                    <p className="text-[7px] font-bold uppercase tracking-wider px-3 pt-2.5" style={{color:"#4a8a9a"}}>Performance Data</p>
                    <div className="mx-3 mt-2 h-16 rounded-lg flex items-center justify-center text-[8px] text-white/25 font-bold uppercase tracking-wider" style={{background:"linear-gradient(135deg,#0f2540,#081830)",border:"1px solid rgba(255,255,255,0.06)"}}>
                      Image
                    </div>
                  </div>
                </div>

                {/* Stadium + Headline overlapping layout */}
                <div className="flex-1 relative flex items-center min-h-0">
                  {/* Stadium placeholder */}
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 w-1/2 aspect-square max-h-full rounded-3xl flex items-center justify-center" style={{background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.1)"}}>
                    <span className="text-xs text-white/20 font-bold uppercase tracking-wider">Stadium Image</span>
                  </div>
                  {/* Headline */}
                  <div className="relative ml-auto w-1/2 flex flex-col justify-center pr-8">
                    <h1 className="font-black uppercase text-white text-right" style={{fontSize:"clamp(48px,6vw,92px)",lineHeight:0.92,letterSpacing:"-0.01em"}}>
                      Train<br/>Smarter.<br/>Win Bigger.
                    </h1>
                  </div>
                </div>

                {/*  BOTTOM STRIP  */}
                <div className="flex items-center gap-6 py-5 mt-auto" style={{borderTop:"1px solid rgba(255,255,255,0.07)"}}>
                  <div className="flex items-center gap-3 pr-6 text-xs font-bold uppercase tracking-wider whitespace-nowrap shrink-0" style={{borderRight:"1px solid rgba(255,255,255,0.07)",color:"#64c864"}}>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md" style={{background:"rgba(100,200,100,0.12)",border:"1px solid rgba(100,200,100,0.3)"}}>
                      <svg width="10" height="8" viewBox="0 0 9 7" fill="none"><rect x="0.5" y="0.5" width="8" height="6" rx="1" stroke="#64c864" strokeWidth="0.8"/><path d="M1.5 2.5h5.5M1.5 4.5h3.5" stroke="#64c864" strokeWidth="0.8" strokeLinecap="round"/></svg>
                    </span>
                    Let&apos;s Get Moving
                  </div>
                  <p className="text-[8.5px] font-medium uppercase leading-relaxed tracking-wider" style={{color:"#5a8a9a"}}>
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
