import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 flex items-center justify-start px-8 md:px-16 lg:px-20">
      <div className="max-w-2xl space-y-8">
        {/* Heading */}
        <h1 className="text-5xl md:text-6xl font-bold text-cyan-400">
          Goalix
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-lg">
          Track your fitness goals, monitor your health metrics, and achieve more every day.
        </p>

        {/* Call-to-Action Buttons */}
        <div className="flex flex-col gap-4 pt-4">
          <Link
            href="/dashboard"
            className="inline-block text-lg font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Go to Dashboard
          </Link>
          <button className="inline-block text-lg font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}
