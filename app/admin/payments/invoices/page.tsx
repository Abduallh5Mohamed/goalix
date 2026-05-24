"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileDown, RefreshCw } from "lucide-react";
import { useGetInvoicesQuery, type Invoice } from "@/lib/store/api/adminApi";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  paid: "success",
  pending: "warning",
  overdue: "destructive",
  cancelled: "secondary",
};

const columns: Column<Invoice>[] = [
  {
    key: "id",
    header: "Invoice #",
    accessor: (row) => (
      <span className="font-mono text-xs text-primary">{row.id.slice(0, 8).toUpperCase()}</span>
    ),
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
    key: "dueDate",
    header: "Due Date",
    accessor: (row) => formatDate(row.due_date),
    sortable: true,
    sortValue: (row) => row.due_date,
  },
  {
    key: "paidAt",
    header: "Paid At",
    accessor: (row) => (
      <span className={row.paid_at ? "" : "text-muted-foreground"}>
        {row.paid_at ? formatDate(row.paid_at) : "Not paid"}
      </span>
    ),
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

export default function InvoicesPage() {
  const { data, isLoading, isError, refetch } = useGetInvoicesQuery({ limit: 50 });

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
        <p className="text-muted-foreground">Failed to load invoices.</p>
        <Button variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const invoices = data?.data ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Invoices (${data?.pagination?.total ?? invoices.length})`}
        description="All invoices with payment status and history."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Payments" },
          { label: "Invoices" },
        ]}
        actions={
          <Button variant="outline" className="gap-1.5">
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        }
      />

      <DataTable
        data={invoices}
        columns={columns}
        searchable
        searchPlaceholder="Search invoices..."
        searchKey={(row) => `${row.id} ${row.status}`}
      />
    </div>
  );
}
