"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  mockSubscriptions,
  mockInvoices,
  mockPlayers,
} from "@/lib/mock-data";
import { PAYMENT_STATUS_CONFIG } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ParentPaymentsPage() {
  const sub = mockSubscriptions.find((s) => s.playerId === "p1");
  const invoices = mockInvoices.filter((i) => i.playerId === "p1");
  const child = mockPlayers.find((p) => p.id === "p1")!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Status"
        description={`${child.fullName}'s subscription and billing`}
        breadcrumbs={[
          { label: "Home", href: "/parent/home" },
          { label: "Payments" },
          { label: "Status" },
        ]}
        actions={
          <Link href="/parent/payments/pay">
            <Button size="sm">
              <CreditCard className="mr-1 h-4 w-4" />
              Pay Now
            </Button>
          </Link>
        }
      />

      {/* Current Subscription */}
      {sub && (
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-lg font-bold capitalize">{sub.plan}</p>
              </div>
              <div className="rounded-lg bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-lg font-bold">{formatCurrency(sub.amount)}</p>
              </div>
              <div className="rounded-lg bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Period</p>
                <p className="text-sm font-medium">
                  {formatDate(sub.startDate)} – {formatDate(sub.endDate)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge
                  className="mt-1"
                  variant={
                    PAYMENT_STATUS_CONFIG[sub.status as keyof typeof PAYMENT_STATUS_CONFIG]
                      ?.variant || "secondary"
                  }
                >
                  {PAYMENT_STATUS_CONFIG[sub.status as keyof typeof PAYMENT_STATUS_CONFIG]
                    ?.label || sub.status}
                </Badge>
              </div>
            </div>
            {sub.renewalDate && (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Renewal: {formatDate(sub.renewalDate)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Invoices */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">
            Recent Invoices
          </CardTitle>
          <Link href="/parent/payments/history">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-4"
            >
              <div className="flex items-center gap-3">
                {inv.status === "paid" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                )}
                <div>
                  <p className="font-medium">{formatCurrency(inv.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    Issued: {formatDate(inv.issueDate)} · Due:{" "}
                    {formatDate(inv.dueDate)}
                  </p>
                </div>
              </div>
              <Badge
                variant={
                  PAYMENT_STATUS_CONFIG[inv.status as keyof typeof PAYMENT_STATUS_CONFIG]
                    ?.variant || "secondary"
                }
              >
                {PAYMENT_STATUS_CONFIG[inv.status as keyof typeof PAYMENT_STATUS_CONFIG]
                  ?.label || inv.status}
              </Badge>
            </div>
          ))}
          {invoices.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              No invoices yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
