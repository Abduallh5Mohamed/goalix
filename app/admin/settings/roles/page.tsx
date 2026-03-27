"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Eye, Edit, Trash2, Plus } from "lucide-react";

const roles = [
  {
    name: "Admin",
    description: "Full system access including settings, payments, and user management.",
    permissions: ["All Modules", "User Management", "Settings", "Payments", "Reports"],
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    count: 2,
  },
  {
    name: "Coach",
    description: "Access to groups, attendance, evaluations, and measurements.",
    permissions: ["My Groups", "Attendance", "Evaluations", "Measurements", "Schedule"],
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    count: 5,
  },
  {
    name: "Player",
    description: "View personal performance, training plans, and attendance.",
    permissions: ["Profile", "Performance", "Training", "Attendance"],
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    count: 10,
  },
  {
    name: "Parent",
    description: "View child performance, attendance, and manage payments.",
    permissions: ["Child Dashboard", "Attendance", "Payments", "Notifications"],
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    count: 5,
  },
];

export default function RolesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Roles & Permissions"
        description="Manage user roles and their access levels."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Settings" },
          { label: "Roles & Permissions" },
        ]}
        actions={
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Custom Role
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.name} className="border-border/50 bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${role.bgColor}`}>
                  <Shield className={`h-5 w-5 ${role.color}`} />
                </div>
                <div>
                  <CardTitle className="text-base">{role.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{role.count} users</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm">
                <Edit className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map((perm) => (
                  <Badge key={perm} variant="secondary" className="text-[10px]">
                    {perm}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
