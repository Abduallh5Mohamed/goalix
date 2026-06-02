"use client";

import { DashboardFrame } from "@/components/layout/DashboardFrame";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardFrame role="coach">{children}</DashboardFrame>;
}
