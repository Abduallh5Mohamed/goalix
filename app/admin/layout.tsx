"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { ROLE_ROUTES } from "@/lib/constants";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, role } = useCurrentUser();

  useEffect(() => {
    if (!isAuthenticated) return;

    if (role !== "admin") {
      router.replace(role ? ROLE_ROUTES[role] ?? "/admin-login" : "/admin-login");
    }
  }, [isAuthenticated, role, router]);

  if (!isAuthenticated || role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#dfe4e7] text-[#111c17]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(0,216,255,0.12),transparent_34%),radial-gradient(circle_at_78%_4%,rgba(182,255,0,0.16),transparent_30%),linear-gradient(135deg,#e8ecef_0%,#f5f6f1_52%,#dfe4e7_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(14,42,27,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(14,42,27,0.055)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="relative min-h-screen">
        <main className="min-h-screen w-full p-2 sm:p-3 lg:p-4">{children}</main>
      </div>
    </div>
  );
}
