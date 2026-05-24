"use client";

import { PortalTopNav } from "@/components/layout/PortalTopNav";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#020711] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_76%_2%,rgba(163,230,53,0.12),transparent_28%),linear-gradient(135deg,#020711_0%,#06111f_48%,#020711_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="relative min-h-screen">
        <PortalTopNav role="coach" />
        <main className="mx-auto max-w-[1880px] p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
