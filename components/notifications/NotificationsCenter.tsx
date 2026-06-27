"use client";

import Link from "next/link";
import { useMemo, useState, type ElementType } from "react";
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCheck,
  ClipboardCheck,
  CreditCard,
  Info,
  RefreshCw,
  Star,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getNotificationHref } from "@/lib/notifications";
import { useCurrentUser } from "@/lib/auth/auth-context";
import {
  useGetNotificationsQuery,
  useGetUnreadNotificationsCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  type NotificationRow,
} from "@/lib/store/api/calendarApi";
import type { UserRole } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

const typeIcons: Record<string, ElementType> = {
  payment: CreditCard,
  session: Calendar,
  training: Calendar,
  match: Trophy,
  attendance: ClipboardCheck,
  evaluation: Star,
  ranking: Trophy,
  alert: AlertCircle,
  error: AlertCircle,
  warning: AlertCircle,
  info: Info,
  system: Bell,
};

const typeColors: Record<string, string> = {
  payment: "text-emerald-500 bg-emerald-500/10",
  session: "text-blue-500 bg-blue-500/10",
  training: "text-blue-500 bg-blue-500/10",
  match: "text-amber-500 bg-amber-500/10",
  attendance: "text-cyan-500 bg-cyan-500/10",
  evaluation: "text-violet-500 bg-violet-500/10",
  ranking: "text-yellow-500 bg-yellow-500/10",
  alert: "text-red-500 bg-red-500/10",
  error: "text-red-500 bg-red-500/10",
  warning: "text-amber-500 bg-amber-500/10",
  info: "text-sky-500 bg-sky-500/10",
  system: "text-muted-foreground bg-muted",
};

const roleHome: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  coach: "/coach/home",
  player: "/player/home",
  parent: "/parent/home",
};

function matchesFilter(notification: NotificationRow, filter: string) {
  if (filter === "unread") return !notification.is_read;
  if (filter === "read") return notification.is_read;
  return true;
}

export function NotificationsCenter({ role }: { role: UserRole }) {
  const [filter, setFilter] = useState("all");
  const authState = useCurrentUser();
  const notificationsEnabled =
    authState.isAuthenticated && authState.role === role;
  const { data, isLoading, isError, refetch } = useGetNotificationsQuery(undefined, {
    skip: !notificationsEnabled,
    pollingInterval: 60000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const { data: unreadCountFromApi } = useGetUnreadNotificationsCountQuery(undefined, {
    skip: !notificationsEnabled,
    pollingInterval: 60000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const [markAllRead, markAllReadState] = useMarkAllNotificationsReadMutation();
  const [markRead] = useMarkNotificationReadMutation();

  const notifications = useMemo(() => data?.data ?? [], [data?.data]);
  const unreadCount = typeof unreadCountFromApi === "number"
    ? unreadCountFromApi
    : notifications.filter((item) => !item.is_read).length;
  const filtered = useMemo(
    () => notifications.filter((notification) => matchesFilter(notification, filter)),
    [filter, notifications],
  );

  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Bell className="h-10 w-10 text-muted-foreground/40" />
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
        breadcrumbs={[
          { label: "Home", href: roleHome[role] },
          { label: "Notifications" },
        ]}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead()}
              disabled={markAllReadState.isLoading}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="bg-muted/30">
            <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
            <TabsTrigger value="read">Read ({Math.max(notifications.length - unreadCount, 0)})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="h-[calc(100vh-16rem)] pr-2">
        <div className="space-y-2">
          {filtered.length > 0 ? (
            filtered.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell;
              const iconColor = typeColors[notification.type] || typeColors.info;

              return (
                <Card
                  key={notification.id}
                  className={cn(
                    "border-border/30 bg-card transition-all hover:border-border/60",
                    !notification.is_read && "border-l-2 border-l-primary bg-primary/[0.03]",
                  )}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconColor)}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <Link
                      href={getNotificationHref(role, notification.type, notification.data)}
                      onClick={() => {
                        if (!notification.is_read) markRead(notification.id);
                      }}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className={cn("text-sm leading-tight", notification.is_read ? "font-medium text-muted-foreground" : "font-semibold")}>
                            {notification.title}
                          </h4>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {notification.body}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(notification.created_at)}
                        </span>
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px] capitalize">
                          {notification.type}
                        </Badge>
                      </div>
                    </Link>

                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 px-2 text-xs"
                        onClick={() => markRead(notification.id)}
                      >
                        Read
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="border-border/30 bg-card">
              <CardContent className="flex flex-col items-center gap-3 p-12">
                <Bell className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground">No notifications</p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
