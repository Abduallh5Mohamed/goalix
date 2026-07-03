"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Users } from "lucide-react";
import { useSendNotificationMutation } from "@/lib/store/api/adminApi";

export default function ComposeNotificationPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [type, setType] = useState("info");
  const [sendError, setSendError] = useState("");
  const [sendNotification, { isLoading }] = useSendNotificationMutation();

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSendError("");
    try {
      await sendNotification({
        title: title.trim(),
        body: message.trim(),
        type,
        ...(targetRole !== "all" ? { targetRole } : {}),
      }).unwrap();
      router.push("/admin/notifications");
    } catch {
      setSendError("Failed to send notification. Please try again.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Compose Notification"
        description="Send a custom notification to specific users or segments."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Notifications", href: "/admin/notifications" },
          { label: "Compose" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">Message Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notification-title">Title</Label>
                <Input
                  id="notification-title"
                  placeholder="Notification title..."
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notification-message">Message</Label>
                <Textarea
                  id="notification-message"
                  placeholder="Write your message..."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={targetRole} onValueChange={setTargetRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="coach">Coaches</SelectItem>
                      <SelectItem value="player">Players</SelectItem>
                      <SelectItem value="parent">Parents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {sendError && <p className="text-sm text-red-400">{sendError}</p>}
              <Button
                className="w-full gap-1.5"
                disabled={!title.trim() || !message.trim() || isLoading}
                onClick={handleSend}
              >
                <Send className="h-4 w-4" />
                {isLoading ? "Sending..." : "Send Notification"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {title || message ? (
              <div className="space-y-2 rounded-lg border border-border/50 p-4">
                <h4 className="text-sm font-semibold">{title || "Untitled"}</h4>
                <p className="text-xs text-muted-foreground">{message || "No message"}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {targetRole !== "all" && (
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      <Users className="mr-1 h-3 w-3" />
                      {targetRole}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] capitalize">{type}</Badge>
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Start composing to see preview.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
