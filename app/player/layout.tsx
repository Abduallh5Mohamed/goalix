"use client";

import { DashboardFrame } from "@/components/layout/DashboardFrame";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardFrame role="player">{children}</DashboardFrame>;
}
