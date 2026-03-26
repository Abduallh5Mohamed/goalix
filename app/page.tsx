"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

/*  SVG Card Path  viewBox 0 0 1000 700
 *  Clockwise from body top-left.
 *  Single cubic scoop (horizontal tangents both ends  ultra-smooth).
 *  Single cubic page curl (smooth arc, no hard angle).
 *  All corners Q-rounded.
 */
const CARD = [
  "M 36 56",
  "Q 0 56 0 92",
  "L 0 664",
  "Q 0 700 36 700",
  "L 964 700",
  "Q 1000 700 1000 664",
  "L 1000 20",
  "Q 1000 0 980 0",
  "L 820 0",
  "C 806 0 812 56 798 56",
  "Z",
].join(" ");

export default function Home() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);

  /* tab zone height as % of card (56 / 700) */
  const tabH = "8%";

  return (
    <main
      className="h-screen w-full relative"
      style={{
        background: "#f5f7fa",
        padding: "0",
        overflow: "visible",
        paddingBottom: "60px",
      }}
    >
      {/* Background image behind the card */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <Image
          src="/Background.jpg"
          alt=""
          fill
          className="object-cover object-center"
          style={{ opacity: 1 }}
          priority
        />
      </div>

      {/* Fade-to-white gradient overlay at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "220px",
          background: "linear-gradient(to top, #ffffff 0%, rgba(255,255,255,0.85) 40%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Layer 2: subtle white transparent frame */}
      <div
        className="absolute"
        style={{
          inset: "28px",
          borderRadius: "16px",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.06)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/*   CARD CONTAINER   */}
      <div
        className={`absolute transition-opacity duration-700 ${m ? "opacity-100" : "opacity-0"}`}
        style={{
          top: "28px",
          left: "28px",
          right: "28px",
          bottom: "28px",
          filter:
            "drop-shadow(0 18px 56px rgba(0,0,0,0.08)) drop-shadow(0 3px 10px rgba(0,0,0,0.05))",
          background: "#ffffff",
          overflow: "hidden",
          borderRadius: "24px",
        }}
      >
        {/* Background image layer */}
        <div className="absolute" style={{ top: 0, left: 0, right: 0, bottom: '-80px', zIndex: 0 }}>
          <Image
            src="/Background.jpg"
            alt=""
            fill
            className="object-cover object-bottom"
            style={{ opacity: 1 }}
            priority
          />
        </div>

        {/*  SVG Card Shape  */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 700"
          preserveAspectRatio="none"
          style={{ zIndex: 10 }}
        >
          <defs>
            {/* card fill gradient */}
            <linearGradient id="cf" x1="0%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#0d2036" />
              <stop offset="100%" stopColor="#060e1a" />
            </linearGradient>
            {/* page curl fill */}
            <linearGradient id="cuG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1a3250" />
              <stop offset="100%" stopColor="#091420" />
            </linearGradient>
            {/* border gradient */}
            <linearGradient id="brd" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.13)" />
              <stop offset="40%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.015)" />
            </linearGradient>
            <clipPath id="cc">
              <path d={CARD} />
            </clipPath>
            {/* centre-left radial glow */}
            <radialGradient id="gl" cx="36%" cy="55%" r="40%">
              <stop offset="0%" stopColor="#0e2844" stopOpacity="0.45" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Card fill - REMOVED for transparency */}

          {/* Clipped background treatments - REMOVED */}

          {/* White outer rim - REMOVED */}
          {/* Card border - REMOVED */}

          {/* Tab top highlight */}
          <path
            d="M 820 0 L 980 0 Q 1000 0 1000 20"
            fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
          />
          {/* Scoop highlight */}
          <path
            d="M 798 56 C 812 56 806 0 820 0"
            fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
          />
          {/* Body top-left highlight */}
          <path
            d="M 798 56 L 36 56 Q 0 56 0 92"
            fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
          />


        </svg>

        {/*  LOGO + NAV  frosted glass tab  */}
        <div
          className="absolute top-0 left-0 z-20 flex items-center"
          style={{
            width: "62%",
            height: tabH,
            paddingLeft: "clamp(40px,3.8vw,62px)",
            backdropFilter: "blur(15px)",
            WebkitBackdropFilter: "blur(15px)",
            background: "rgba(255, 255, 255, 0.28)",
          }}
        >
          <Image
            src="/logo.png"
            alt="Goalix"
            width={480}
            height={144}
            className="h-48 w-auto object-contain shrink-0 -mt-2 -ml-8"
            priority
          />
          <nav
            className="hidden lg:flex items-center ml-12"
            style={{ gap: "70px", marginTop: "-10px" }}
          >
            <a
              href="#"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: "20px",
                fontWeight: 300,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                lineHeight: "3.2",
                color: "rgba(57, 217, 138, 0.85)",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                padding: "20px 0"
              }}
            >
              Home
            </a>
            <a
              href="#"
              className="flex items-center gap-2 hover:text-white transition-colors"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: "20px",
                fontWeight: 300,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                lineHeight: "3.2",
                color: "rgba(255, 255, 255, 0.75)",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                padding: "20px 0"
              }}
            >
              Platform
              <svg width="11" height="8" viewBox="0 0 8 5" fill="none">
                <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="#" 
              className="hover:text-white transition-colors"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: "20px",
                fontWeight: 300,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                lineHeight: "3.2",
                color: "rgba(255, 255, 255, 0.75)",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                padding: "20px 0"
              }}
            >Features</a>
            <a href="#" 
              className="hover:text-white transition-colors"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: "20px",
                fontWeight: 300,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                lineHeight: "3.2",
                color: "rgba(255, 255, 255, 0.75)",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                padding: "20px 0"
              }}
            >AI Engine</a>
            <a href="#" 
              className="hover:text-white transition-colors"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: "20px",
                fontWeight: 300,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                lineHeight: "3.2",
                color: "rgba(255, 255, 255, 0.75)",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                padding: "20px 0"
              }}
            >Pricing</a>
            <a href="#" 
              className="hover:text-white transition-colors"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: "20px",
                fontWeight: 300,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                lineHeight: "3.2",
                color: "rgba(255, 255, 255, 0.75)",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                padding: "20px 0"
              }}
            >Contact</a>
          </nav>
        </div>

        {/*  LOGIN  (inside the protruding tab)  */}
        <div
          className="absolute top-0 right-0 z-20 flex items-center justify-center"
          style={{ width: "18%", height: tabH, paddingRight: "clamp(14px,1.6vw,28px)" }}
        >
          <button 
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: "18px",
              fontWeight: 300,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "rgba(255, 255, 255, 0.7)",
              border: "1.2px solid rgba(255, 255, 255, 0.22)",
              borderRadius: "32px",
              padding: "8px 34px",
              transition: "all 0.3s ease",
              backgroundColor: "transparent"
            }}
            className="flex items-center justify-center gap-2 bg-transparent transition-all hover:border-white hover:bg-white/10 hover:text-white"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#ffffff";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.35)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M5.5 2H3.5A1.5 1.5 0 0 0 2 3.5v7A1.5 1.5 0 0 0 3.5 12h2M9.5 10l3-3-3-3M12.5 7h-7"
                stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            Login
          </button>
        </div>

        {/*   CARD BODY CONTENT   */}
        <div className="absolute z-10 flex" style={{ top: tabH, left: 0, right: 0, bottom: 0 }}>

          {/*  LEFT FEATURE RAIL  */}
          <aside
            className="hidden"
            style={{
              display: "none",
              width: "clamp(152px,14.5%,182px)"
            }}
          >
          </aside>

          {/*  MAIN CONTENT  */}
          <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">



            {/*  Main content area  */}
            <div className="flex-1 relative min-h-0">
            </div>


          </div>
        </div>
      </div>
    </main>
  );
}
