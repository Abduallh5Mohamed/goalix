"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { Button } from "@/components/ui/button";
import {
  useGetPaymentOverviewQuery,
  useGetSubscriptionsQuery,
} from "@/lib/store/api/adminApi";
import { formatCurrency } from "@/lib/utils";
import { FileDown } from "lucide-react";

export default function PaymentReportsPage() {
  const { data: overview, isLoading: loadingOverview } = useGetPaymentOverviewQuery();
  const { data: subsRes, isLoading: loadingSubs } = useGetSubscriptionsQuery({ limit: 200 });

  if (loadingOverview || loadingSubs) return <LoadingSkeleton />;

  const paidItem = overview?.find((o) => o.status === "paid");
  const totalRevenue = paidItem ? Number(paidItem.total_amount) : 0;
  const paidCount = paidItem ? Number(paidItem.count) : 1;
  const avgPerPlayer = paidCount > 0 ? totalRevenue / paidCount : 0;

  const statusCounts = (overview ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = Number(o.count);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Financial Reports"
        description="Detailed financial analytics and reports."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Payments" },
          { label: "Reports" },
        ]}
        actions={
          <Button variant="outline" className="gap-1.5">
            <FileDown className="h-4 w-4" />
            Export Full Report
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard label="Total Revenue (Collected)" value={formatCurrency(totalRevenue)} icon="CreditCard" />
        <StatsCard label="Avg per Player" value={formatCurrency(avgPerPlayer)} icon="Users" />
        <StatsCard label="Total Subscriptions" value={subsRes?.pagination?.total ?? 0} icon="ClipboardCheck" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Payment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {overview && overview.length > 0 ? (
              <DoughnutChart
                labels={overview.map((o) => o.status)}
                data={overview.map((o) => Number(o.count))}
                colors={["#3ddc84", "#f59e0b", "#ef4444", "#22d3ee"]}
                height={260}
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No payment data.</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Revenue by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(overview ?? []).map((item) => (
                <div key={item.status} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <span className="font-medium text-sm capitalize">{item.status}</span>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(Number(item.total_amount))}</p>
                    <p className="text-xs text-muted-foreground">{item.count} subscriptions</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
