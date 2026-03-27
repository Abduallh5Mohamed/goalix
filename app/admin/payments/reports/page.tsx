"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { Button } from "@/components/ui/button";
import { mockSubscriptions, mockRevenueChartData } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { FileDown } from "lucide-react";

export default function PaymentReportsPage() {
  const totalRevenue = mockSubscriptions.filter((s) => s.status === "paid").reduce((sum, s) => sum + s.amount, 0);
  const monthlyCount = mockSubscriptions.filter((s) => s.plan === "monthly").length;
  const quarterlyCount = mockSubscriptions.filter((s) => s.plan === "quarterly").length;
  const yearlyCount = mockSubscriptions.filter((s) => s.plan === "yearly").length;

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
        <StatsCard label="Avg per Player" value={formatCurrency(totalRevenue / mockSubscriptions.filter(s => s.status === "paid").length || 1)} icon="Users" />
        <StatsCard label="Collection Rate" value="71%" icon="ClipboardCheck" change={5} changeLabel="vs last month" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              labels={mockRevenueChartData.map((d) => d.label)}
              datasets={[
                {
                  label: "Revenue (EGP)",
                  data: mockRevenueChartData.map((d) => d.value),
                  borderColor: "#22d3ee",
                  backgroundColor: "rgba(34,211,238,0.1)",
                  fill: true,
                },
              ]}
              height={280}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DoughnutChart
              labels={["Monthly", "Quarterly", "Yearly"]}
              data={[monthlyCount, quarterlyCount, yearlyCount]}
              colors={["#22d3ee", "#3ddc84", "#f59e0b"]}
              height={260}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
