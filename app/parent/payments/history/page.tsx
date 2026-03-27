"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { mockInvoices } from "@/lib/mock-data";
import { PAYMENT_STATUS_CONFIG } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ParentPaymentHistoryPage() {
  const invoices = mockInvoices.filter((i) => i.parentId === "pa1");

  const columns = [
    {
      key: "issueDate",
      header: "Date",
      sortable: true,
      accessor: (row: (typeof invoices)[0]) => formatDate(row.issueDate),
    },
    {
      key: "playerName",
      header: "Player",
      accessor: (row: (typeof invoices)[0]) => row.playerName,
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      accessor: (row: (typeof invoices)[0]) => (
        <span className="font-semibold">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      accessor: (row: (typeof invoices)[0]) => formatDate(row.dueDate),
    },
    {
      key: "paidDate",
      header: "Paid Date",
      accessor: (row: (typeof invoices)[0]) =>
        row.paidDate ? formatDate(row.paidDate) : "—",
    },
    {
      key: "status",
      header: "Status",
      accessor: (row: (typeof invoices)[0]) => (
        <StatusBadge
          status={row.status}
          type="payment"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment History"
        description="All past payments and invoices"
        breadcrumbs={[
          { label: "Home", href: "/parent/home" },
          { label: "Payments" },
          { label: "History" },
        ]}
      />

      <DataTable
        data={invoices}
        columns={columns}
        searchKey={(row) => row.playerName}
        searchPlaceholder="Search..."
      />
    </div>
  );
}
