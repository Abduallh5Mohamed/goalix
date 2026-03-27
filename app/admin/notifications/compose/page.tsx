"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Users } from "lucide-react";

export default function ComposeNotificationPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [channel, setChannel] = useState("");
  const [type, setType] = useState("info");

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
                <Label>Title</Label>
                <Input
                  placeholder="Notification title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <textarea
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Write your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                  <Label>Channel</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_app">In-App</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
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
              <Button className="w-full gap-1.5" disabled={!title || !message}>
                <Send className="h-4 w-4" />
                Send Notification
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50 bg-card h-fit">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {title || message ? (
              <div className="rounded-lg border border-border/50 p-4 space-y-2">
                <h4 className="font-semibold text-sm">{title || "Untitled"}</h4>
                <p className="text-xs text-muted-foreground">{message || "No message"}</p>
                <div className="flex gap-2 pt-2">
                  {targetRole && (
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      <Users className="mr-1 h-3 w-3" />
                      {targetRole}
                    </Badge>
                  )}
                  {channel && (
                    <Badge variant="outline" className="text-[10px]">{channel}</Badge>
                  )}
                  <Badge
                    variant={
                      type === "warning" ? "warning" : type === "alert" ? "destructive" : type === "success" ? "success" : "info"
                    }
                    className="text-[10px]"
                  >
                    {type}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Start composing to see preview
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
