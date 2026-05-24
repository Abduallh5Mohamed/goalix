"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { useAppSelector } from "@/lib/store/hooks";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { ROLE_ROUTES } from "@/lib/constants";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, role } = useCurrentUser();
  const { sidebarCollapsed } = useAppSelector((s) => s.ui);

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
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-64"
        )}
      >
        <AdminHeader />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
