import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6" suppressHydrationWarning>
      <div className="w-full max-w-4xl">
        {/* Hero Container with gradient background and rounded corners */}
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-8 border-white/20 shadow-2xl">
          {/* Dynamic gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900">
            {/* Animated gradient overlays */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-teal-500/30 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-500/20 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
            <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-r from-blue-500/20 to-teal-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          </div>

          {/* Geometric symbol - Large checkmark/S shape */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-2/3 h-2/3 text-teal-400 opacity-40"
              viewBox="0 0 200 200"
              fill="none"
              stroke="currentColor"
              strokeWidth="20"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Checkmark shape */}
              <path d="M 40 120 L 80 160 L 160 50" />
            </svg>
          </div>

          {/* Content overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <div className="text-center space-y-6 px-4">
              <div className="space-y-3">
                <h1 className="text-5xl md:text-6xl font-bold text-white">
                  Goalix
                </h1>
                <p className="text-lg md:text-xl text-white/80">
                  Track your fitness goals, monitor your health metrics
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Link
                  href="/dashboard"
                  className="px-8 py-3 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg transition-all shadow-lg shadow-teal-500/30"
                >
                  Get Started
                </Link>
                <button className="px-8 py-3 border-2 border-white/30 text-white hover:bg-white/10 font-semibold rounded-lg transition-all">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
