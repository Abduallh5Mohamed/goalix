"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetAcademyQuery,
  useUpdateAcademyMutation,
} from "@/lib/store/api/adminApi";
import {
  CheckCircle,
  CreditCard,
  Loader2,
  MessageSquare,
  Save,
  Smartphone,
} from "lucide-react";

type IntegrationKey = "whatsapp" | "sms" | "payments";
type IntegrationConfig = Record<string, string | boolean>;
type IntegrationDraft = Partial<Record<IntegrationKey, IntegrationConfig>>;

const getRecord = (value: unknown) =>
  typeof value === "object" && value ? (value as Record<string, unknown>) : {};

const getIntegration = (
  draft: IntegrationDraft,
  stored: Record<string, unknown>,
  key: IntegrationKey,
) => ({
  ...getRecord(stored[key]),
  ...(draft[key] ?? {}),
}) as IntegrationConfig;

const stringValue = (config: IntegrationConfig, key: string, fallback = "") =>
  typeof config[key] === "string" ? String(config[key]) : fallback;

const booleanValue = (config: IntegrationConfig, key: string, fallback = false) =>
  typeof config[key] === "boolean" ? Boolean(config[key]) : fallback;

export default function IntegrationsPage() {
  const { data: academy, isLoading } = useGetAcademyQuery();
  const [updateAcademy, { isLoading: saving }] = useUpdateAcademyMutation();
  const [draft, setDraft] = useState<IntegrationDraft>({});
  const [saved, setSaved] = useState(false);

  const settings = (academy?.settings ?? {}) as Record<string, unknown>;
  const storedIntegrations = getRecord(settings.integrations);
  const whatsapp = getIntegration(draft, storedIntegrations, "whatsapp");
  const sms = getIntegration(draft, storedIntegrations, "sms");
  const payments = getIntegration(draft, storedIntegrations, "payments");

  const setIntegrationValue = (
    key: IntegrationKey,
    field: string,
    value: string | boolean,
  ) => {
    setDraft((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? {}),
        [field]: value,
      },
    }));
  };

  const saveIntegrations = async () => {
    await updateAcademy({
      settings: {
        ...settings,
        integrations: {
          ...storedIntegrations,
          whatsapp,
          sms,
          payments,
        },
      },
    }).unwrap();
    setDraft({});
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Integrations"
        description="Manage third-party connections for notifications and payments."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Settings" },
          { label: "Integrations" },
        ]}
        actions={
          <Button onClick={saveIntegrations} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Integrations
          </Button>
        }
      />

      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          <CheckCircle className="h-4 w-4" />
          Integrations saved.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400">
                <MessageSquare className="h-6 w-6" />
              </span>
              <div>
                <CardTitle className="text-base">WhatsApp Business</CardTitle>
              </div>
            </div>
            <Badge variant={booleanValue(whatsapp, "enabled") ? "success" : "secondary"}>
              {booleanValue(whatsapp, "enabled") ? "Connected" : "Off"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
              <span>Enabled</span>
              <input
                type="checkbox"
                checked={booleanValue(whatsapp, "enabled")}
                onChange={(event) =>
                  setIntegrationValue("whatsapp", "enabled", event.target.checked)
                }
              />
            </label>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={stringValue(whatsapp, "provider", "meta")}
                onValueChange={(value) =>
                  setIntegrationValue("whatsapp", "provider", value)
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta">Meta Cloud API</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="360dialog">360dialog</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Business Phone ID</Label>
              <Input
                value={stringValue(whatsapp, "businessPhoneId")}
                onChange={(event) =>
                  setIntegrationValue("whatsapp", "businessPhoneId", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Access Token</Label>
              <Input
                type="password"
                value={stringValue(whatsapp, "accessToken")}
                onChange={(event) =>
                  setIntegrationValue("whatsapp", "accessToken", event.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-blue-500/10 p-3 text-blue-400">
                <Smartphone className="h-6 w-6" />
              </span>
              <div>
                <CardTitle className="text-base">SMS Gateway</CardTitle>
              </div>
            </div>
            <Badge variant={booleanValue(sms, "enabled") ? "success" : "secondary"}>
              {booleanValue(sms, "enabled") ? "Connected" : "Off"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
              <span>Enabled</span>
              <input
                type="checkbox"
                checked={booleanValue(sms, "enabled")}
                onChange={(event) =>
                  setIntegrationValue("sms", "enabled", event.target.checked)
                }
              />
            </label>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={stringValue(sms, "provider", "twilio")}
                onValueChange={(value) => setIntegrationValue("sms", "provider", value)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="victorylink">VictoryLink</SelectItem>
                  <SelectItem value="custom">Custom HTTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sender ID</Label>
              <Input
                value={stringValue(sms, "senderId")}
                onChange={(event) =>
                  setIntegrationValue("sms", "senderId", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={stringValue(sms, "apiKey")}
                onChange={(event) =>
                  setIntegrationValue("sms", "apiKey", event.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-amber-500/10 p-3 text-amber-400">
                <CreditCard className="h-6 w-6" />
              </span>
              <div>
                <CardTitle className="text-base">Payment Gateway</CardTitle>
              </div>
            </div>
            <Badge variant={booleanValue(payments, "enabled") ? "success" : "secondary"}>
              {booleanValue(payments, "enabled") ? "Connected" : "Off"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
              <span>Enabled</span>
              <input
                type="checkbox"
                checked={booleanValue(payments, "enabled")}
                onChange={(event) =>
                  setIntegrationValue("payments", "enabled", event.target.checked)
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={stringValue(payments, "provider", "paymob")}
                  onValueChange={(value) =>
                    setIntegrationValue("payments", "provider", value)
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paymob">Paymob</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="fawry">Fawry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select
                  value={stringValue(payments, "mode", "test")}
                  onValueChange={(value) =>
                    setIntegrationValue("payments", "mode", value)
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Public Key</Label>
              <Input
                value={stringValue(payments, "publicKey")}
                onChange={(event) =>
                  setIntegrationValue("payments", "publicKey", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Secret Key</Label>
              <Input
                type="password"
                value={stringValue(payments, "secretKey")}
                onChange={(event) =>
                  setIntegrationValue("payments", "secretKey", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Webhook Secret</Label>
              <Input
                type="password"
                value={stringValue(payments, "webhookSecret")}
                onChange={(event) =>
                  setIntegrationValue("payments", "webhookSecret", event.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
