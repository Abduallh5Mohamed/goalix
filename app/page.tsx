import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="text-center space-y-8 px-4">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Goalix
          </h1>
          <p className="text-xl text-slate-300 max-w-md mx-auto">
            Track your fitness goals, monitor your health metrics, and achieve more every day.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/30"
          >
            Go to Dashboard
          </Link>
          <button className="px-8 py-4 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 font-semibold rounded-xl transition-all">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}
