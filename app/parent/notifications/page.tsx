"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mockNotifications } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import {
  Bell,
  CheckCheck,
  CreditCard,
  Calendar,
  ClipboardCheck,
  Trophy,
  Star,
  AlertCircle,
  Info,
  Trash2,
} from "lucide-react";

const typeIcons: Record<string, typeof Bell> = {
  payment: CreditCard,
  session: Calendar,
  attendance: ClipboardCheck,
  evaluation: Star,
  ranking: Trophy,
  alert: AlertCircle,
  info: Info,
};

const typeColors: Record<string, string> = {
  payment: "text-emerald-400",
  session: "text-blue-400",
  attendance: "text-amber-400",
  evaluation: "text-purple-400",
  ranking: "text-yellow-400",
  alert: "text-red-400",
  info: "text-cyan-400",
};

export default function ParentNotificationsPage() {
  const [filter, setFilter] = useState("all");
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered =
    filter === "all"
      ? notifications
      : filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications.filter((n) => n.read);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
        breadcrumbs={[
          { label: "Home", href: "/parent/home" },
          { label: "Notifications" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="bg-muted/30">
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="read">
              Read ({notifications.length - unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-2">
          {filtered.length > 0 ? (
            filtered.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell;
              const iconColor = typeColors[notification.type] || "text-primary";

              return (
                <Card
                  key={notification.id}
                  className={`border-border/30 transition-all hover:border-border/60 ${
                    !notification.read
                      ? "bg-primary/[0.03] border-l-2 border-l-primary"
                      : "bg-card"
                  }`}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        !notification.read ? "bg-primary/10" : "bg-muted/30"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4
                            className={`text-sm leading-tight ${
                              !notification.read
                                ? "font-semibold"
                                : "font-medium text-muted-foreground"
                            }`}
                          >
                            {notification.title}
                          </h4>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(notification.sentAt)}
                        </span>
                        <Badge
                          variant="outline"
                          className="capitalize text-[10px] px-1.5 py-0"
                        >
                          {notification.type}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Mark as read"
                          onClick={() => markRead(notification.id)}
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        title="Delete"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
