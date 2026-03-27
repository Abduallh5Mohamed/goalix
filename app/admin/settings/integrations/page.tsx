"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, CreditCard, Smartphone, Plug, Settings } from "lucide-react";

const integrations = [
  {
    name: "WhatsApp Business",
    description: "Send notifications and alerts via WhatsApp.",
    icon: MessageSquare,
    status: "not_configured",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    name: "SMS Gateway",
    description: "Send SMS notifications to parents and coaches.",
    icon: Smartphone,
    status: "active",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    name: "Payment Gateway",
    description: "Accept online payments for subscriptions.",
    icon: CreditCard,
    status: "active",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Integrations"
        description="Manage third-party integrations and API connections."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Settings" },
          { label: "Integrations" },
        ]}
      />

      <div className="space-y-4">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <Card key={integration.name} className="border-border/50 bg-card">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`rounded-lg p-3 ${integration.bgColor}`}>
                  <Icon className={`h-6 w-6 ${integration.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{integration.name}</h3>
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                </div>
                <Badge
                  variant={integration.status === "active" ? "success" : "secondary"}
                >
                  {integration.status === "active" ? "Connected" : "Not Configured"}
                </Badge>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  Configure
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
