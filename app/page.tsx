import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div 
        className="w-full max-w-4xl h-96 rounded-3xl border-8 border-slate-200 shadow-2xl flex items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: "url('/hero-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <CheckCircle2 className="w-40 h-40 text-emerald-400 opacity-80" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
