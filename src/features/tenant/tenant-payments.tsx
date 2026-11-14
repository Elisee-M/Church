"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  ReceiptText,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Payment } from "@/types";
import { PAYMENT_METHOD_SHORT, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getTenantSummary } from "@/lib/mock-data/analytics";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { useCurrentTenantId } from "@/hooks/use-current-tenant";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingPanel } from "@/components/shared/states";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { PaymentReceiptDocument } from "@/components/documents/payment-receipt";
import { downloadReceiptPdf } from "@/lib/pdf/download";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TenantPayments() {
  const db = useDatabase();
  const ready = usePageReady();
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [receipt, setReceipt] = React.useState<Payment | null>(null);
  const tenantId = useCurrentTenantId();
  const summary = getTenantSummary(db, tenantId);
  const tenant = summary.tenant;

  const payments = summary.payments;
  const filtered = payments.filter(
    (payment) => statusFilter === "all" || payment.status === statusFilter,
  );
  const confirmed = payments.filter((payment) => payment.status === "completed");
  const confirmedTotal = confirmed.reduce((sum, payment) => sum + payment.amount, 0);
  const pending = payments.filter((payment) => payment.verification === "pending");
  const failed = payments.filter((payment) => payment.status === "failed");

  const columns: DataTableColumn<Payment>[] = [
    {
      id: "payment",
      header: "Payment",
      sortValue: (payment) => payment.reference,
      cell: (payment) => {
        const invoice = db.invoices.find((item) => item.id === payment.invoiceId);
        return (
          <div>
            <p className="font-mono text-[11px] font-medium">{payment.reference}</p>
            <p className="text-[10px] text-muted-foreground">
              {invoice?.number} · {formatDate(payment.date)}
            </p>
          </div>
        );
      },
    },
    {
      id: "method",
      header: "Method",
      sortValue: (payment) => payment.method,
      cell: (payment) => (
        <span className="text-[11px]">{PAYMENT_METHOD_SHORT[payment.method]}</span>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      sortValue: (payment) => payment.amount,
      cell: (payment) => (
        <span
          className={`text-[11.5px] font-semibold ${payment.amount < 0 ? "text-destructive" : ""}`}
        >
          {formatCurrency(payment.amount)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (payment) => payment.status,
      cell: (payment) => (
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge
            status={payment.status}
            label={PAYMENT_STATUS_LABELS[payment.status]}
            className="h-5 px-1.5 text-[9.5px]"
          />
          {payment.verification === "pending" && (
            <Badge variant="warning" className="h-5 px-1.5 text-[9.5px]">
              Awaiting review
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (payment) => (
        <div onClick={(event) => event.stopPropagation()}>
          {payment.status === "completed" ? (
            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setReceipt(payment)}>
              <ReceiptText className="size-3" /> Receipt
            </Button>
          ) : payment.status === "failed" ? (
            <Button variant="ghost" size="sm" className="h-7 text-[10px]" asChild>
              <Link href={`/tenant/pay?invoice=${payment.invoiceId}`}>
                Try again <ArrowRight className="size-3" />
              </Link>
            </Button>
          ) : (
            <span className="text-[10px] text-muted-foreground">Pending</span>
          )}
        </div>
      ),
    },
  ];

  if (!ready) {
    return (
      <>
        <PageHeader title="My payments" description="Loading your payment history…" />
        <LoadingPanel />
      </>
    );
  }

  if (!tenant) {
    return (
      <PageHeader
        title="Tenant profile not found"
        description="No tenant account is available yet."
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My payments"
        description="Your payment history, receipts and verification status for bank transfers."
        actions={
          summary.balance > 0 ? (
            <Button size="sm" asChild>
              <Link href="/tenant/pay">
                <CreditCard className="size-3.5" /> Make a payment
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Confirmed payments"
          value={formatCurrency(confirmedTotal, true)}
          hint={`${confirmed.length} completed transactions`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Awaiting verification"
          value={pending.length}
          hint={
            pending.length
              ? `${formatCurrency(pending.reduce((sum, payment) => sum + payment.amount, 0))} pending`
              : "No bank proofs pending"
          }
          icon={Clock3}
          tone={pending.length ? "warning" : "default"}
        />
        <StatCard
          label="Failed attempts"
          value={failed.length}
          hint="No balance was changed"
          icon={XCircle}
          tone={failed.length ? "danger" : "default"}
        />
        <StatCard
          label="Corrections"
          value={payments.filter((payment) => payment.amount < 0).length}
          hint="Reversal entries recorded by finance"
          icon={RotateCcw}
          tone="info"
        />
      </div>

      <div className="mt-5">
        <div className="mb-2.5">
          <h2 className="text-[13px] font-semibold">Payment history</h2>
          <p className="text-[10.5px] text-muted-foreground">
            Confirmed payments include receipts. Pending bank transfers update after verification.
          </p>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(payment) => payment.id}
          getSearchText={(payment) => {
            const invoice = db.invoices.find((item) => item.id === payment.invoiceId);
            return `${payment.reference} ${invoice?.number ?? ""} ${payment.method}`;
          }}
          searchPlaceholder="Search by reference or invoice…"
          emptyTitle="No payments yet"
          emptyDescription="Payments you make will appear here along with receipts and verification status."
          emptyAction={
            summary.balance > 0 ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/tenant/pay">
                  <CreditCard className="size-3.5" /> Make a payment
                </Link>
              </Button>
            ) : undefined
          }
          toolbar={
            <>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger size="sm" className="h-8.5 w-[140px] bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {statusFilter !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8.5 text-[11px]"
                  onClick={() => setStatusFilter("all")}
                >
                  Clear
                </Button>
              )}
            </>
          }
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
        <span>Receipts are available for confirmed payments. Pending bank transfers have no receipt yet.</span>
        <span>{payments.length} transactions</span>
      </div>

      {receipt && (
        <Dialog open onOpenChange={(open) => !open && setReceipt(null)}>
          <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-lg">
            <div className="p-4 pb-0">
              <DialogHeader>
                <DialogTitle>Payment receipt</DialogTitle>
                <DialogDescription>
                  This receipt confirms money received. It is separate from the rental invoice and any
                  EBM fiscal invoice.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="p-4">
              <PaymentReceiptDocument payment={receipt} />
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await downloadReceiptPdf(receipt, db);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Could not download receipt PDF.");
                  }
                }}
              >
                <Download className="size-3.5" /> Download
              </Button>
              <Button size="sm" onClick={() => setReceipt(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
