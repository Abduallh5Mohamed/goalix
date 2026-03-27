"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { mockSubscriptions } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Subscription } from "@/lib/types";
import { PAYMENT_STATUS_CONFIG } from "@/lib/constants";

const columns: Column<Subscription>[] = [
  {
    key: "player",
    header: "Player",
    accessor: (row) => (
      <div>
        <p className="font-medium">{row.playerName}</p>
        <p className="text-xs text-muted-foreground">Parent: {row.parentName}</p>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.playerName,
  },
  {
    key: "plan",
    header: "Plan",
    accessor: (row) => (
      <Badge variant="outline" className="capitalize">{row.plan}</Badge>
    ),
    sortable: true,
    sortValue: (row) => row.plan,
  },
  {
    key: "amount",
    header: "Amount",
    accessor: (row) => (
      <span className="font-semibold">{formatCurrency(row.amount)}</span>
    ),
    sortable: true,
    sortValue: (row) => row.amount,
  },
  {
    key: "period",
    header: "Period",
    accessor: (row) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.startDate)} – {formatDate(row.endDate)}
      </span>
    ),
    sortable: true,
    sortValue: (row) => row.startDate,
  },
  {
    key: "renewal",
    header: "Renewal",
    accessor: (row) => formatDate(row.renewalDate),
    sortable: true,
    sortValue: (row) => row.renewalDate,
  },
  {
    key: "status",
    header: "Status",
    accessor: (row) => {
      const cfg = PAYMENT_STATUS_CONFIG[row.status];
      return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
    },
    sortable: true,
    sortValue: (row) => row.status,
  },
];

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Subscriptions"
        description="Manage all active subscriptions and renewal dates."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Payments" },
          { label: "Subscriptions" },
        ]}
      />

      <DataTable
        data={mockSubscriptions}
        columns={columns}
        searchable
        searchPlaceholder="Search subscriptions..."
        searchKey={(row) => `${row.playerName} ${row.parentName} ${row.plan}`}
      />
    </div>
  );
}
