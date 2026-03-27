"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockInvoices } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@/lib/types";
import { PAYMENT_STATUS_CONFIG } from "@/lib/constants";
import { FileDown } from "lucide-react";

const columns: Column<Invoice>[] = [
  {
    key: "id",
    header: "Invoice #",
    accessor: (row) => (
      <span className="font-mono text-xs text-primary">{row.id.toUpperCase()}</span>
    ),
  },
  {
    key: "player",
    header: "Player / Parent",
    accessor: (row) => (
      <div>
        <p className="font-medium">{row.playerName}</p>
        <p className="text-xs text-muted-foreground">{row.parentName}</p>
      </div>
    ),
    sortable: true,
    sortValue: (row) => row.playerName,
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
    key: "issueDate",
    header: "Issued",
    accessor: (row) => formatDate(row.issueDate),
    sortable: true,
    sortValue: (row) => row.issueDate,
  },
  {
    key: "dueDate",
    header: "Due Date",
    accessor: (row) => formatDate(row.dueDate),
    sortable: true,
    sortValue: (row) => row.dueDate,
  },
  {
    key: "paidDate",
    header: "Paid Date",
    accessor: (row) => (
      <span className={row.paidDate ? "" : "text-muted-foreground"}>
        {row.paidDate ? formatDate(row.paidDate) : "—"}
      </span>
    ),
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

export default function InvoicesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Invoices"
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
        data={mockInvoices}
        columns={columns}
        searchable
        searchPlaceholder="Search invoices..."
        searchKey={(row) => `${row.id} ${row.playerName} ${row.parentName}`}
      />
    </div>
  );
}
