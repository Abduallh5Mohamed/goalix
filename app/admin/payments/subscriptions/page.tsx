"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useGetSubscriptionsQuery, type Subscription } from "@/lib/store/api/adminApi";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  active: "success",
  paid: "success",
  pending: "warning",
  overdue: "destructive",
  expired: "secondary",
  cancelled: "destructive",
};

const columns: Column<Subscription>[] = [
  {
    key: "id",
    header: "ID",
    accessor: (row) => (
      <span className="font-mono text-xs text-primary">{row.id.slice(0, 8).toUpperCase()}</span>
    ),
  },
  {
    key: "plan",
    header: "Plan",
    accessor: (row) => (
      <Badge variant="outline" className="capitalize">{row.plan_id}</Badge>
    ),
    sortable: true,
    sortValue: (row) => row.plan_id,
  },
  {
    key: "amount",
    header: "Amount",
    accessor: (row) => (
      <span className="font-semibold">{formatCurrency(parseFloat(row.amount))}</span>
    ),
    sortable: true,
    sortValue: (row) => parseFloat(row.amount),
  },
  {
    key: "period",
    header: "Period",
    accessor: (row) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.starts_at)} - {formatDate(row.ends_at)}
      </span>
    ),
    sortable: true,
    sortValue: (row) => row.starts_at,
  },
  {
    key: "status",
    header: "Status",
    accessor: (row) => (
      <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"} className="capitalize">
        {row.status}
      </Badge>
    ),
    sortable: true,
    sortValue: (row) => row.status,
  },
];

export default function SubscriptionsPage() {
  const { data, isLoading, isError, refetch } = useGetSubscriptionsQuery({ limit: 50 });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Failed to load subscriptions.</p>
        <Button variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const subscriptions = data?.data ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Subscriptions (${data?.pagination?.total ?? subscriptions.length})`}
        description="Manage all active subscriptions and renewal dates."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Payments" },
          { label: "Subscriptions" },
        ]}
      />

      <DataTable
        data={subscriptions}
        columns={columns}
        searchable
        searchPlaceholder="Search subscriptions..."
        searchKey={(row) => `${row.id} ${row.plan_id} ${row.status}`}
      />
    </div>
  );
}
