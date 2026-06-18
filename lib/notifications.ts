import { ROLE_ROUTES } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

export function getNotificationHref(
  role: UserRole,
  type: string,
  data?: Record<string, unknown> | null,
) {
  const explicitHref = data?.href;
  if (
    typeof explicitHref === "string" &&
    explicitHref.startsWith("/") &&
    !explicitHref.startsWith("//")
  ) {
    return explicitHref;
  }

  const matchData = data?.match as { id?: string } | undefined;
  const matchId = (data?.matchId as string | undefined) ?? matchData?.id;
  const eventId = data?.eventId as string | undefined;

  if (type === "match" || matchId) {
    if (role === "admin") return "/admin/matches";
    if (role === "coach") return matchId ? `/coach/matches/evaluation/${matchId}` : "/coach/matches";
    if (role === "parent") return "/parent/matches";
    return "/player/matches";
  }

  if (type === "training" || type === "session" || eventId) {
    if (role === "admin") return "/admin/calendar";
    if (role === "coach") return eventId ? `/coach/training/${eventId}` : "/coach/training";
    if (role === "parent") return "/parent/calendar";
    return "/player/training";
  }

  if (type === "payment") {
    if (role === "admin") return "/admin/payments";
    if (role === "parent") return "/parent/payments";
  }

  if (type === "chat" || type === "message") {
    if (role === "admin") return "/admin/chat";
    if (role === "coach") return "/coach/chat";
    if (role === "player") return "/player/chat";
  }

  if (type === "ranking") {
    if (role === "coach") return "/coach/rankings";
    if (role === "player") return "/player/performance/ranking";
    if (role === "admin") return "/admin/rankings/weekly";
  }

  return ROLE_ROUTES[role];
}
