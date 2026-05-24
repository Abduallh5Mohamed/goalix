"use client";

import { useEffect } from "react";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { PortalSidebar } from "@/components/layout/PortalSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { useGetCoachAccessStatusQuery } from "@/lib/store/api/coachApi";
import { Loader2, LockKeyhole } from "lucide-react";
import { PortalTopNav } from "@/components/layout/PortalTopNav";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, role } = useCurrentUser();
  const { data: accessStatus, isLoading: loadingAccess } = useGetCoachAccessStatusQuery(undefined, {
    skip: !isAuthenticated || role !== "coach",
  });

  useEffect(() => {
    if (!isAuthenticated) return;

    if (role !== "coach") {
      window.location.replace("/admin-login");
    }
  }, [isAuthenticated, role]);

  if (!isAuthenticated || role !== "coach") {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <PortalSidebar role="coach" />
      <div className="flex flex-1 flex-col transition-all duration-300 lg:ml-64">
        <main className="relative flex-1 p-4 pt-16 lg:p-6 lg:pt-6">
          <div className={accessStatus?.hasAssignments === false ? "pointer-events-none select-none blur-sm" : ""}>
            {children}
          </div>
          {loadingAccess && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/40 backdrop-blur-sm">
              <Card className="border-border/60 bg-card/95">
                <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking coach access...
                </CardContent>
              </Card>
            </div>
          )}
          {accessStatus?.hasAssignments === false && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/55 p-4 backdrop-blur-sm">
              <Card className="max-w-md border-amber-500/30 bg-card/95 shadow-xl">
                <CardContent className="space-y-3 p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
                    <LockKeyhole className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Your account has not been assigned yet</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Please wait until an admin assigns you to groups or birth years before using the coach portal.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
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
