"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Download,
  FileBadge,
  FileText,
  ReceiptText,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { Invoice, Payment } from "@/types";
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_SHORT } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { invoiceBalance } from "@/lib/mock-data/analytics";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingPanel } from "@/components/shared/states";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { PaymentReceiptDocument } from "@/components/documents/payment-receipt";
import { EbmReferenceDialog } from "@/features/invoices/ebm-reference-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ReceiptsWorkspace() {
  const db = useDatabase();
  const ready = usePageReady();
  const [receipt, setReceipt] = React.useState<Payment | null>(null);
  const [ebmInvoice, setEbmInvoice] = React.useState<Invoice | null>(null);

  const receipts = db.payments
    .filter((payment) => payment.status === "completed" && payment.amount > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  const invoicesWithEbm = db.invoices.filter((invoice) => invoice.ebmReference);
  const missingEbm = db.invoices.filter(
    (invoice) =>
      invoice.status !== "draft" &&
      invoice.ebmStatus === "not_issued" &&
      (invoice.status === "paid" || invoice.amountPaid > 0),
  );
  const recentEbm = [...invoicesWithEbm].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const receiptTotal = receipts.reduce((sum, payment) => sum + payment.amount, 0);

  const columns: DataTableColumn<Payment>[] = [
    {
      id: "receipt",
      header: "Receipt",
      sortValue: (payment) => payment.reference,
      cell: (payment) => {
        const tenant = db.tenants.find((item) => item.id === payment.tenantId);
        const invoice = db.invoices.find((item) => item.id === payment.invoiceId);
        return (
          <div>
            <p className="font-mono text-[11px] font-medium">{payment.reference}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {tenant?.name} · {invoice?.number}
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
        <div>
          <p className="text-[11px]">{PAYMENT_METHOD_SHORT[payment.method]}</p>
          <p className="text-[10px] text-muted-foreground">{formatDate(payment.date)}</p>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      sortValue: (payment) => payment.amount,
      cell: (payment) => (
        <span className="text-[11.5px] font-semibold">{formatCurrency(payment.amount)}</span>
      ),
    },
    {
      id: "verified",
      header: "Verified",
      cell: (payment) => (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldCheck className="size-3 text-success" />
          {payment.verifiedBy ?? "System"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (payment) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px]"
          onClick={(event) => {
            event.stopPropagation();
            setReceipt(payment);
          }}
        >
          <ReceiptText className="size-3" /> Receipt
        </Button>
      ),
    },
  ];

  const exportReceipts = () => {
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      ["Receipt", "Date", "Tenant", "Invoice", "Method", "Amount", "Verified by"],
      ...receipts.map((payment) => [
        payment.reference,
        payment.date,
        db.tenants.find((tenant) => tenant.id === payment.tenantId)?.name ?? "",
        db.invoices.find((invoice) => invoice.id === payment.invoiceId)?.number ?? "",
        PAYMENT_METHOD_SHORT[payment.method],
        payment.amount,
        payment.verifiedBy ?? "",
      ]),
    ]
      .map((line) => line.map(escape).join(","))
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "genzura-receipts.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Receipt register exported", {
      description: `${receipts.length} receipts written to CSV.`,
    });
  };

  if (!ready) {
    return (
      <>
        <PageHeader title="Receipts & EBM" description="Loading receipt register…" />
        <LoadingPanel />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Receipts & EBM"
        description="Payment receipts generated by Genzura and external EBM fiscal references stored alongside invoices."
        badge={<Badge variant="navy">Accountant</Badge>}
        actions={
          <Button variant="outline" size="sm" onClick={exportReceipts}>
            <Download className="size-3.5" /> Export register
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Receipts issued"
          value={receipts.length}
          hint={`${formatCurrency(receiptTotal, true)} confirmed`}
          icon={ReceiptText}
          tone="success"
        />
        <StatCard
          label="EBM references"
          value={invoicesWithEbm.length}
          hint={`${ invoicesWithEbm.filter((invoice) => invoice.ebmStatus === "document_attached").length } with a PDF attached`}
          icon={FileBadge}
          tone="warning"
        />
        <StatCard
          label="Missing EBM reference"
          value={missingEbm.length}
          hint="Paid invoices without a fiscal reference"
          icon={TriangleAlert}
          tone={missingEbm.length > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Unpaid invoices"
          value={db.invoices.filter((invoice) => invoiceBalance(invoice) > 0).length}
          hint="No EBM reference expected yet"
          icon={FileText}
          tone="default"
        />
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-500/[0.07]">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <FileBadge className="size-3.5" />
          </span>
          <div>
            <p className="text-[11.5px] font-semibold text-amber-900 dark:text-amber-200">
              EBM fiscal invoices are issued outside Genzura
            </p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-amber-800/80 dark:text-amber-200/70">
              This workspace only stores references and attached PDFs. Genzura receipt and rental
              invoice documents are never presented as fiscal invoices.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <div className="mb-2.5">
            <h2 className="text-[13px] font-semibold">Receipt register</h2>
            <p className="text-[10.5px] text-muted-foreground">
              Confirmed payment receipts issued to tenants. Open a row to preview the receipt.
            </p>
          </div>
          <DataTable
            data={receipts}
            columns={columns}
            getRowId={(payment) => payment.id}
            getSearchText={(payment) => {
              const tenant = db.tenants.find((item) => item.id === payment.tenantId);
              return `${payment.reference} ${tenant?.name ?? ""}`;
            }}
            searchPlaceholder="Search receipts by reference or tenant…"
            emptyTitle="No receipts issued"
            emptyDescription="A receipt appears here once a payment is confirmed."
            onRowClick={(payment) => setReceipt(payment)}
          />
        </div>

        <div className="space-y-4 xl:col-span-4">
          <SectionCard
            title="Recent EBM references"
            description="External fiscal references linked to invoices"
            action={<Badge variant="warning">{invoicesWithEbm.length}</Badge>}
          >
            <div className="divide-y divide-border/70">
              {recentEbm.slice(0, 5).map((invoice) => {
                const tenant = db.tenants.find((item) => item.id === invoice.tenantId);
                return (
                  <div key={invoice.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[10.5px] font-medium">{invoice.number}</p>
                      <StatusBadge
                        status={invoice.ebmStatus === "document_attached" ? "verified" : "pending"}
                        label={invoice.ebmStatus === "document_attached" ? "PDF" : "Reference"}
                        className="h-4 px-1.5 text-[9px]"
                      />
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {tenant?.name}
                    </p>
                    <p className="mt-1 font-mono text-[9.5px] text-amber-700 dark:text-amber-300">
                      {invoice.ebmReference}
                    </p>
                  </div>
                );
              })}
              {recentEbm.length === 0 && (
                <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">
                  No EBM references recorded yet.
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Missing references"
            description="Paid invoices still awaiting an EBM reference"
            action={<Badge variant={missingEbm.length > 0 ? "warning" : "success"}>{missingEbm.length}</Badge>}
          >
            <div className="divide-y divide-border/70">
              {missingEbm.slice(0, 4).map((invoice) => {
                const tenant = db.tenants.find((item) => item.id === invoice.tenantId);
                return (
                  <div key={invoice.id} className="flex items-center gap-2 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium">{tenant?.name}</p>
                      <p className="font-mono text-[9.5px] text-muted-foreground">
                        {invoice.number} · {formatCurrency(invoice.amount, true)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => setEbmInvoice(invoice)}
                    >
                      <FileBadge className="size-3" /> Record
                    </Button>
                  </div>
                );
              })}
              {missingEbm.length === 0 && (
                <div className="flex items-center gap-2 px-5 py-8">
                  <BadgeCheck className="size-4 text-success" />
                  <p className="text-[11px] text-muted-foreground">
                    Every paid invoice has an EBM reference.
                  </p>
                </div>
              )}
            </div>
            <div className="border-t border-border px-5 py-3">
              <Button variant="ghost" size="sm" className="h-7 px-0 text-[10.5px]" asChild>
                <Link href="/accountant/invoices">
                  Open invoice register <ArrowUpRight className="size-3" />
                </Link>
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2.5">
          <h2 className="text-[13px] font-semibold">Invoice audit</h2>
          <p className="text-[10.5px] text-muted-foreground">
            Track rental invoices and record missing external EBM references where needed.
          </p>
        </div>
        <SectionCard
          title="Invoice document audit"
          description="Rental invoices issued, with fiscal reference status"
        >
          <div className="divide-y divide-border/70">
            {[...db.invoices]
              .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
              .slice(0, 6)
              .map((invoice) => {
                const tenant = db.tenants.find((item) => item.id === invoice.tenantId);
                return (
                  <div
                    key={invoice.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
                      <FileText className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10.5px] font-medium">{invoice.number}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {tenant?.name} · issued {formatDate(invoice.issueDate)} ·{" "}
                        {formatCurrency(invoice.amount, true)}
                      </p>
                    </div>
                    <StatusBadge
                      status={invoice.status}
                      label={INVOICE_STATUS_LABELS[invoice.status]}
                      className="h-5 px-1.5 text-[9.5px]"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => setEbmInvoice(invoice)}
                    >
                      <FileBadge className="size-3" />
                      {invoice.ebmReference ? "Manage EBM" : "Add EBM"}
                    </Button>
                  </div>
                );
              })}
          </div>
        </SectionCard>
      </div>

      <div className="mt-3 text-[10.5px] text-muted-foreground">
        Last receipt issued{" "}
        {receipts[0] ? `${formatDateTime(receipts[0].createdAt)} · ${receipts[0].reference}` : "—"}
      </div>

      {receipt && (
        <Dialog open onOpenChange={(open) => !open && setReceipt(null)}>
          <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-lg">
            <div className="p-4 pb-0">
              <DialogHeader>
                <DialogTitle>Payment receipt</DialogTitle>
                <DialogDescription>
                  A Genzura receipt confirms money received. It is not an EBM fiscal invoice.
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
                onClick={() =>
                  toast.message("Download unavailable", {
                    description: "PDF export is not available yet.",
                  })
                }
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

      {ebmInvoice && <EbmReferenceDialog invoice={ebmInvoice} onClose={() => setEbmInvoice(null)} />}
    </div>
  );
}
