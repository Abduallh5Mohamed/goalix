"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockCoaches, mockGroups, mockBranches } from "@/lib/mock-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Save, Users } from "lucide-react";

export default function AssignCoachPage() {
  const [selectedCoach, setSelectedCoach] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  const activeCoaches = mockCoaches.filter((c) => c.status === "active");
  const activeGroups = mockGroups.filter((g) => g.status === "active");

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Assign Coach"
        description="Assign coaches to groups and branches."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Coaches", href: "/admin/coaches" },
          { label: "Assign Coach" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">New Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Coach</label>
              <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a coach..." />
                </SelectTrigger>
                <SelectContent>
                  {activeCoaches.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName} – {c.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Group</label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a group..." />
                </SelectTrigger>
                <SelectContent>
                  {activeGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full gap-1.5" disabled={!selectedCoach || !selectedGroup}>
              <Save className="h-4 w-4" />
              Assign Coach to Group
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Current Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeCoaches.map((coach) => (
              <div key={coach.id} className="rounded-lg border border-border/50 p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-accent/20 text-xs text-accent">
                      {getInitials(coach.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{coach.fullName}</p>
                    <p className="text-xs text-muted-foreground">{coach.branchName}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {coach.groupNames.length > 0 ? (
                    coach.groupNames.map((g) => (
                      <Badge key={g} variant="secondary" className="text-[10px]">
                        {g}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No groups assigned</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
