"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockNotifications } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/utils";
import { Bell, AlertTriangle, CheckCircle, Info, Send, Check } from "lucide-react";
import Link from "next/link";

const typeIcons: Record<string, React.ElementType> = {
  warning: AlertTriangle,
  alert: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const typeColors: Record<string, string> = {
  warning: "bg-amber-500/10 text-amber-400",
  alert: "bg-red-500/10 text-red-400",
  success: "bg-emerald-500/10 text-emerald-400",
  info: "bg-blue-500/10 text-blue-400",
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(mockNotifications);

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifs.filter((n) => !n.read).length;

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
              <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead}>
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
        <Badge variant="info" className="text-sm">
          {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
        </Badge>
      )}

      <div className="space-y-3">
        {notifs.map((notif) => {
          const Icon = typeIcons[notif.type] || Info;
          const color = typeColors[notif.type] || typeColors.info;

          return (
            <Card
              key={notif.id}
              className={`border-border/50 bg-card transition-all ${!notif.read ? "border-l-2 border-l-primary" : ""}`}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div className={`mt-0.5 rounded-lg p-2 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">{notif.title}</h4>
                    {!notif.read && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notif.message}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDateTime(notif.sentAt)}</span>
                    <Badge variant="outline" className="text-[10px]">{notif.channel}</Badge>
                    {notif.targetRole && (
                      <Badge variant="secondary" className="text-[10px] capitalize">{notif.targetRole}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
