"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { FileDown, RefreshCw } from "lucide-react";
import { useGetPaymentOverviewQuery } from "@/lib/store/api/adminApi";

export default function PaymentsOverviewPage() {
  const { data: overview, isLoading, isError, refetch } = useGetPaymentOverviewQuery();

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Failed to load payment overview.</p>
        <Button variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const items = overview ?? [];
  const getAmount = (status: string) => {
    const found = items.find((item) => item.status === status);
    return found ? parseFloat(found.total_amount) : 0;
  };
  const getCount = (status: string) => {
    const found = items.find((item) => item.status === status);
    return found ? parseInt(found.count, 10) : 0;
  };

  const paid = getAmount("paid");
  const pending = getAmount("pending");
  const overdue = getAmount("overdue");
  const paidCount = getCount("paid");
  const pendingCount = getCount("pending");
  const overdueCount = getCount("overdue");
  const totalSubscriptions = items.reduce((sum, item) => sum + parseInt(item.count, 10), 0);

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
        <StatsCard label="Total Paid" value={formatCurrency(paid)} icon="CreditCard" />
        <StatsCard label="Pending" value={formatCurrency(pending)} icon="AlertTriangle" />
        <StatsCard label="Overdue" value={formatCurrency(overdue)} icon="AlertTriangle" />
        <StatsCard label="Total Subscriptions" value={totalSubscriptions} icon="Users" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/50 bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Payment Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment data available.</p>
            ) : (
              items.map((item) => (
                <div key={item.status} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div>
                    <p className="font-medium capitalize">{item.status}</p>
                    <p className="text-xs text-muted-foreground">{item.count} subscriptions</p>
                  </div>
                  <p className="font-bold">{formatCurrency(parseFloat(item.total_amount))}</p>
                </div>
              ))
            )}
            <div className="flex gap-2 pt-2">
              <Link href="/admin/payments/subscriptions">
                <Button variant="outline" size="sm">View Subscriptions</Button>
              </Link>
              <Link href="/admin/payments/invoices">
                <Button variant="outline" size="sm">View Invoices</Button>
              </Link>
            </div>
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
              colors={["#7bea28", "#b6ff00", "#2d9ad5"]}
              height={220}
              centerValue={`${paidCount}`}
              centerLabel="Paid"
            />
          </CardContent>
        </Card>
      </div>

      {overdueCount > 0 && (
        <Card className="border-cyan-500/30 bg-cyan-500/5">
          <CardHeader>
            <CardTitle className="text-base text-cyan-400">Overdue Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {overdueCount} overdue subscription{overdueCount > 1 ? "s" : ""} totalling {formatCurrency(overdue)}.
            </p>
            <Link href="/admin/payments/invoices?status=overdue">
              <Button size="sm" className="mt-3 bg-cyan-500 text-slate-950 hover:bg-cyan-400">View Overdue Invoices</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
