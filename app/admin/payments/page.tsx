"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart } from "@/components/charts/BarChart";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { mockSubscriptions, mockInvoices, mockRevenueChartData } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PaymentsOverviewPage() {
  const totalRevenue = mockSubscriptions.filter((s) => s.status === "paid").reduce((sum, s) => sum + s.amount, 0);
  const pending = mockSubscriptions.filter((s) => s.status === "pending").reduce((sum, s) => sum + s.amount, 0);
  const overdue = mockSubscriptions.filter((s) => s.status === "overdue").reduce((sum, s) => sum + s.amount, 0);
  const paidCount = mockSubscriptions.filter((s) => s.status === "paid").length;
  const pendingCount = mockSubscriptions.filter((s) => s.status === "pending").length;
  const overdueCount = mockSubscriptions.filter((s) => s.status === "overdue").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Payments Overview"
        description="Revenue summary, pending, and overdue payments."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Payments" },
          { label: "Overview" },
        ]}
        actions={
          <Button variant="outline" className="gap-1.5">
            <FileDown className="h-4 w-4" />
            Export Financial Report
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon="CreditCard" change={8.5} changeLabel="vs last month" />
        <StatsCard label="Pending" value={formatCurrency(pending)} icon="AlertTriangle" />
        <StatsCard label="Overdue" value={formatCurrency(overdue)} icon="AlertTriangle" change={-5} changeLabel="vs last month" />
        <StatsCard label="Active Subscriptions" value={mockSubscriptions.length} icon="Users" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/50 bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              labels={mockRevenueChartData.map((d) => d.label)}
              datasets={[
                {
                  label: "Revenue (EGP)",
                  data: mockRevenueChartData.map((d) => d.value),
                  backgroundColor: "#3ddc84",
                },
              ]}
              height={280}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <DoughnutChart
              labels={["Paid", "Pending", "Overdue"]}
              data={[paidCount, pendingCount, overdueCount]}
              colors={["#3ddc84", "#f59e0b", "#ef4444"]}
              height={220}
              centerValue={`${paidCount}`}
              centerLabel="Paid"
            />
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alerts */}
      {overdueCount > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-base text-red-400">Overdue Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockSubscriptions
              .filter((s) => s.status === "overdue")
              .map((sub) => (
                <div key={sub.id} className="flex items-center justify-between rounded-lg border border-red-500/20 bg-card p-3">
                  <div>
                    <p className="font-medium">{sub.playerName}</p>
                    <p className="text-xs text-muted-foreground">Parent: {sub.parentName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-400">{formatCurrency(sub.amount)}</p>
                    <p className="text-xs text-muted-foreground">Due: {sub.endDate}</p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
