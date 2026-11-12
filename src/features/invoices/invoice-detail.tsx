"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Download,
  FileBadge,
  FileText,
  Printer,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import type { Payment } from "@/types";
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_SHORT } from "@/lib/constants";
import { formatCurrency, formatDate, formatPercent, monthLabel } from "@/lib/utils";
import { invoiceBalance } from "@/lib/mock-data/analytics";
import { useDatabase } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states";
import { RentalInvoiceDocument } from "@/components/documents/rental-invoice";
import { PaymentReceiptDocument } from "@/components/documents/payment-receipt";
import { EbmReferencePanel } from "@/components/documents/ebm-panel";
import { RecordPaymentDialog } from "@/features/payments/record-payment-dialog";
import { EbmReferenceDialog } from "./ebm-reference-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function InvoiceDetail({
  invoiceId,
  basePath,
  mode = "admin",
}: {
  invoiceId: string;
  basePath: "/admin" | "/accountant" | "/tenant";
  mode?: "admin" | "accountant" | "tenant";
}) {
  const db = useDatabase();
  const [payOpen, setPayOpen] = React.useState(false);
  const [ebmOpen, setEbmOpen] = React.useState(false);
  const [receipt, setReceipt] = React.useState<Payment | null>(null);
  const invoice = db.invoices.find((item) => item.id === invoiceId);
  const tenant = invoice ? db.tenants.find((item) => item.id === invoice.tenantId) : undefined;
  const agreement = invoice ? db.agreements.find((item) => item.id === invoice.agreementId) : undefined;
  const payments = db.payments
    .filter((payment) => payment.invoiceId === invoiceId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const confirmedPayments = payments.filter((payment) => payment.status === "completed");

  if (!invoice) {
    return (
      <div>
        <PageHeader title="Invoice not found" backHref={`${basePath}/invoices`} />
        <div className="rounded-xl border border-border bg-card shadow-soft">
          <EmptyState
            icon={ReceiptText}
            title="This invoice does not exist"
            description="The link may be incorrect, or the invoice was removed from the demo data."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href={`${basePath}/invoices`}>Back to invoices</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const balance = invoiceBalance(invoice);
  const paidPercent = invoice.amount ? (invoice.amountPaid / invoice.amount) * 100 : 0;
  const canRecord = mode !== "tenant" && balance > 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        backHref={`${basePath}/invoices`}
        breadcrumbs={[
          { label: "Invoices", href: `${basePath}/invoices` },
          { label: invoice.number },
        ]}
        title={invoice.number}
        badge={<StatusBadge status={invoice.status} label={INVOICE_STATUS_LABELS[invoice.status]} />}
        description={`${tenant?.name ?? "Tenant"} · ${monthLabel(invoice.period)} rent`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-3.5" /> Print
            </Button>
            {mode === "tenant" && balance > 0 && (
              <Button size="sm" asChild>
                <Link href={`/tenant/pay?invoice=${invoice.id}`}>
                  <Wallet className="size-3.5" /> Pay now
                </Link>
              </Button>
            )}
            {canRecord && (
              <Button size="sm" onClick={() => setPayOpen(true)}>
                <Wallet className="size-3.5" /> Record payment
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Invoice amount"
          value={formatCurrency(invoice.amount)}
          hint={`${invoice.lineItems.length} line item${invoice.lineItems.length === 1 ? "" : "s"}`}
          icon={FileText}
          tone="navy"
        />
        <StatCard
          label="Paid to date"
          value={formatCurrency(invoice.amountPaid)}
          hint={`${formatPercent(paidPercent)} of the invoice`}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Balance due"
          value={formatCurrency(balance)}
          hint={balance === 0 ? "Fully settled" : `Due ${formatDate(invoice.dueDate)}`}
          icon={CalendarClock}
          tone={balance === 0 ? "success" : "warning"}
        />
        <StatCard
          label="EBM reference"
          value={invoice.ebmReference ? "Recorded" : "Not recorded"}
          hint={invoice.ebmReference ?? "Issued externally — never generated here"}
          icon={FileBadge}
          tone={invoice.ebmReference ? "info" : "default"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <SectionCard
            title="Rental invoice"
            description="The document sent to the tenant. Never presented as an EBM fiscal invoice."
            action={
              <Badge variant="navy">
                <FileText className="mr-1 size-3" /> Rental invoice
              </Badge>
            }
          >
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <RentalInvoiceDocument invoice={invoice} tenant={tenant} />
            </div>
          </SectionCard>

          <SectionCard
            title="Payment history"
            description={`${confirmedPayments.length} confirmed payment${confirmedPayments.length === 1 ? "" : "s"} on this invoice`}
            action={
              canRecord ? (
                <Button variant="outline" size="sm" onClick={() => setPayOpen(true)}>
                  <Wallet className="size-3.5" /> Add payment
                </Button>
              ) : undefined
            }
          >
            <div className="divide-y divide-border/70">
              {payments.map((payment) => (
                <div key={payment.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span
                    className={
                      payment.amount < 0
                        ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
                        : payment.status === "completed"
                          ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success"
                          : payment.status === "pending"
                            ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning"
                            : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                    }
                  >
                    <ReceiptText className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium">
                      {payment.reference} · {PAYMENT_METHOD_SHORT[payment.method]}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(payment.date)}
                      {payment.verifiedBy ? ` · verified by ${payment.verifiedBy}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[11.5px] font-semibold ${payment.amount < 0 ? "text-destructive" : ""}`}>
                      {formatCurrency(payment.amount)}
                    </p>
                    <div className="mt-0.5 flex items-center justify-end gap-1">
                      <StatusBadge status={payment.status} className="h-4 px-1.5 text-[9px]" />
                      {payment.verification === "pending" && (
                        <Badge variant="warning" className="h-4 px-1.5 text-[9px]">
                          Verify
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => setReceipt(payment)}
                  >
                    Receipt <ArrowRight className="size-3" />
                  </Button>
                </div>
              ))}
              {payments.length === 0 && (
                <p className="px-5 py-10 text-center text-[11px] text-muted-foreground">
                  No payments have been recorded against this invoice.
                </p>
              )}
            </div>
            <div className="border-t border-border px-5 py-3">
              <div className="mb-1.5 flex items-center justify-between text-[10.5px]">
                <span className="text-muted-foreground">Collection progress</span>
                <span className="font-medium">{formatPercent(paidPercent)}</span>
              </div>
              <Progress value={paidPercent} className="h-1.5" />
            </div>
          </SectionCard>

          {invoice.notes && (
            <SectionCard title="Internal notes" description="Visible to administrators and accountants">
              <p className="px-5 pb-5 text-[11.5px] leading-relaxed text-muted-foreground">
                {invoice.notes}
              </p>
            </SectionCard>
          )}
        </div>

        <div className="space-y-4 xl:col-span-4">
          {mode !== "tenant" && (
            <SectionCard title="Invoice actions" description="Manage this invoice">
              <div className="space-y-2 px-5 pb-5">
                {canRecord && (
                  <Button className="w-full justify-start" size="sm" onClick={() => setPayOpen(true)}>
                    <Wallet className="size-3.5" /> Record payment
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  onClick={() => setEbmOpen(true)}
                >
                  <FileBadge className="size-3.5" />
                  {invoice.ebmReference ? "Update EBM reference" : "Record EBM reference"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  onClick={() =>
                    toast.message("Reminder queued", {
                      description: `A reminder for ${invoice.number} was queued. Email delivery is simulated in this demo.`,
                    })
                  }
                >
                  <BellRing className="size-3.5" /> Send payment reminder
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  onClick={() =>
                    toast.message("Download prepared", {
                      description: "PDF export is simulated in this frontend prototype.",
                    })
                  }
                >
                  <Download className="size-3.5" /> Download invoice PDF
                </Button>
              </div>
            </SectionCard>
          )}

          <EbmReferencePanel
            invoice={invoice}
            onRecord={mode === "tenant" ? undefined : () => setEbmOpen(true)}
          />

          <SectionCard title="Invoice details">
            <div className="px-5 pb-5">
              <dl className="space-y-2.5 text-[11px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Tenant</dt>
                  <dd className="text-right font-medium">
                    {mode === "admin" ? (
                      <Link href={`/admin/tenants/${invoice.tenantId}`} className="hover:underline">
                        {tenant?.name}
                      </Link>
                    ) : (
                      tenant?.name
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Agreement</dt>
                  <dd className="font-mono text-[10.5px]">{agreement?.reference ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Billing period</dt>
                  <dd className="font-medium">{monthLabel(invoice.period)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Issued</dt>
                  <dd>{formatDate(invoice.issueDate, "long")}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Due</dt>
                  <dd>{formatDate(invoice.dueDate, "long")}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Rent due day</dt>
                  <dd>Day {agreement?.dueDay ?? "—"}</dd>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Deposit on file</dt>
                  <dd>{agreement ? formatCurrency(agreement.deposit) : "—"}</dd>
                </div>
              </dl>
            </div>
          </SectionCard>

          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <ShieldCheck className="size-3.5 text-success" /> Document integrity
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Rental invoices and payment receipts are generated by Genzura. EBM fiscal invoices are
              issued externally and only referenced here.
            </p>
          </div>
        </div>
      </div>

      {payOpen && (
        <RecordPaymentDialog
          defaultInvoiceId={invoice.id}
          actor={mode === "accountant" ? "Eric Mugisha" : "Claudine Uwimana"}
          onClose={() => setPayOpen(false)}
        />
      )}
      {ebmOpen && <EbmReferenceDialog invoice={invoice} onClose={() => setEbmOpen(false)} />}

      {receipt && (
        <Dialog open onOpenChange={(open) => !open && setReceipt(null)}>
          <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-lg">
            <div className="p-4 pb-0">
              <DialogHeader>
                <DialogTitle>Payment receipt</DialogTitle>
                <DialogDescription>
                  A receipt confirms money received. It is separate from both the rental invoice and
                  any EBM fiscal invoice.
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
                  toast.message("Receipt download prepared", {
                    description: "PDF export is simulated in this frontend prototype.",
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
    </div>
  );
}
