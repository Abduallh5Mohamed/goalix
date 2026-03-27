"use client";

import { PortalSidebar } from "@/components/layout/PortalSidebar";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <PortalSidebar role="coach" />
      <div className="flex flex-1 flex-col transition-all duration-300 lg:ml-64">
        <main className="flex-1 p-4 pt-16 lg:p-6 lg:pt-6">{children}</main>
      </div>
    </div>
  );
}
