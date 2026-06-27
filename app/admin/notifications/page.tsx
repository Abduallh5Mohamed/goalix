"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, AlertTriangle, CheckCircle, Info, Send, Check, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { getNotificationHref } from "@/lib/notifications";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/lib/store/api/adminApi";

const typeIcons: Record<string, React.ElementType> = {
  warning: AlertTriangle,
  alert: AlertTriangle,
  error: AlertTriangle,
  success: CheckCircle,
  info: Info,
  system: Bell,
};

const typeColors: Record<string, string> = {
  warning: "bg-amber-500/10 text-amber-400",
  alert: "bg-red-500/10 text-red-400",
  error: "bg-red-500/10 text-red-400",
  success: "bg-emerald-500/10 text-emerald-400",
  info: "bg-blue-500/10 text-blue-400",
  system: "bg-muted text-muted-foreground",
};

export default function NotificationsPage() {
  const authState = useCurrentUser();
  const notificationsEnabled =
    authState.isAuthenticated && authState.role === "admin";
  const { data, isLoading, isError, refetch } = useGetNotificationsQuery(
    { limit: 50 },
    {
      skip: !notificationsEnabled,
      pollingInterval: 60000,
      skipPollingIfUnfocused: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );
  const [markAllRead] = useMarkAllNotificationsReadMutation();
  const [markRead] = useMarkNotificationReadMutation();

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Failed to load notifications.</p>
        <Button
          variant="outline"
          disabled={!notificationsEnabled}
          onClick={() => {
            if (notificationsEnabled) refetch();
          }}
          className="gap-1.5"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const notifs = data?.data ?? [];
  const unreadCount = notifs.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notification Center"
        description="All sent and received notifications."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Notifications" },
          { label: "Center" },
        ]}
        actions={
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => markAllRead()}
              >
                <Check className="h-4 w-4" />
                Mark All Read
              </Button>
            )}
            <Link href="/admin/notifications/compose">
              <Button size="sm" className="gap-1.5">
                <Send className="h-4 w-4" />
                Compose
              </Button>
            </Link>
          </div>
        }
      />

      {unreadCount > 0 && (
        <Badge variant="secondary" className="text-sm">
          {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
        </Badge>
      )}

      <div className="space-y-3">
        {notifs.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <div className="text-center">
              <Bell className="mx-auto h-10 w-10 mb-3 opacity-30" />
              <p>No notifications.</p>
            </div>
          </div>
        ) : (
          notifs.map((notif) => {
            const Icon = typeIcons[notif.type] ?? Info;
            const color = typeColors[notif.type] ?? typeColors.info;

            return (
              <Card
                key={notif.id}
                className={`border-border/50 bg-card transition-all ${!notif.is_read ? "border-l-2 border-l-primary" : ""}`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`mt-0.5 rounded-lg p-2 ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <Link
                    href={getNotificationHref("admin", notif.type, notif.data)}
                    onClick={() => {
                      if (!notif.is_read) markRead(notif.id);
                    }}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{notif.title}</h4>
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{notif.body}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(notif.created_at).toLocaleString()}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{notif.type}</Badge>
                    </div>
                  </Link>
                  {!notif.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => markRead(notif.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
