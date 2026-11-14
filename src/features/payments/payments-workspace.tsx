"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Check,
  Clock3,
  Download,
  Landmark,
  MoreHorizontal,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Payment } from "@/types";
import {
  PAYMENT_METHOD_SHORT,
  PAYMENT_STATUS_LABELS,
  VERIFICATION_LABELS,
} from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { reversePayment, verifyPayment } from "@/lib/services";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog, ReasonDialog } from "@/components/shared/confirm-dialog";
import { LoadingPanel } from "@/components/shared/states";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { RecordPaymentDialog } from "./record-payment-dialog";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PaymentsWorkspace({
  basePath,
  mode = "admin",
}: {
  basePath: "/admin" | "/accountant";
  mode?: "admin" | "accountant";
}) {
  const db = useDatabase();
  const ready = usePageReady();
  const router = useRouter();
  const [methodFilter, setMethodFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [verificationFilter, setVerificationFilter] = React.useState("all");
  const [recordOpen, setRecordOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [approveTarget, setApproveTarget] = React.useState<Payment | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<Payment | null>(null);
  const [reverseTarget, setReverseTarget] = React.useState<Payment | null>(null);

  const selected = db.payments.find((payment) => payment.id === selectedId);
  const rows = [...db.payments].sort((a, b) => b.date.localeCompare(a.date));
  const filtered = rows.filter(
    (payment) =>
      (methodFilter === "all" || payment.method === methodFilter) &&
      (statusFilter === "all" || payment.status === statusFilter) &&
      (verificationFilter === "all" || payment.verification === verificationFilter),
  );
  const confirmed = rows.filter((payment) => payment.status === "completed");
  const collected = confirmed.reduce((sum, payment) => sum + payment.amount, 0);
  const pending = rows.filter((payment) => payment.verification === "pending");
  const pendingAmount = pending.reduce((sum, payment) => sum + payment.amount, 0);
  const failed = rows.filter((payment) => payment.status === "failed");
  const reversals = rows.filter((payment) => payment.amount < 0);

  const columns: DataTableColumn<Payment>[] = [
    {
      id: "payment",
      header: "Payment",
      sortValue: (payment) => payment.reference,
      cell: (payment) => {
        const tenant = db.tenants.find((item) => item.id === payment.tenantId);
        const invoice = db.invoices.find((item) => item.id === payment.invoiceId);
        return (
          <div className="flex items-center gap-2.5">
            <span
              className={
                payment.amount < 0
                  ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
                  : payment.method === "bank_transfer"
                    ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground"
                    : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground"
              }
            >
              {payment.method === "bank_transfer" ? (
                <Landmark className="size-3.5" />
              ) : payment.method === "cash" || payment.method === "cheque" ? (
                <Banknote className="size-3.5" />
              ) : (
                <Smartphone className="size-3.5" />
              )}
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-medium">{payment.reference}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {tenant?.name} · {invoice?.number}
              </p>
            </div>
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
          <p className="text-[11.5px]">{PAYMENT_METHOD_SHORT[payment.method]}</p>
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
        <span className={`text-[12px] font-semibold ${payment.amount < 0 ? "text-destructive" : ""}`}>
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
              Verify
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "verified",
      header: "Verified by",
      cell: (payment) => (
        <span className="text-[10.5px] text-muted-foreground">
          {payment.verifiedBy ?? (payment.verification === "pending" ? "Awaiting review" : "—")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (payment) => (
        <div onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Payment actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedId(payment.id)}>
                <ArrowRight /> View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`${basePath}/invoices/${payment.invoiceId}`)}>
                <ArrowUpRight /> Open invoice
              </DropdownMenuItem>
              {payment.verification === "pending" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setApproveTarget(payment)}>
                    <Check /> Approve payment
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setRejectTarget(payment)}>
                    <X /> Reject payment
                  </DropdownMenuItem>
                </>
              )}
              {payment.status === "completed" && payment.amount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setReverseTarget(payment)}>
                    <RotateCcw /> Record correction
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (!ready) {
    return (
      <>
        <PageHeader title="Payments" description="Loading the payment ledger…" />
        <LoadingPanel />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={mode === "accountant" ? "Payment history" : "Payments"}
        description="Every confirmed, pending, failed and reversed transaction — originals are never deleted."
        badge={mode === "accountant" ? <Badge variant="navy">Finance</Badge> : undefined}
        actions={
          <Button size="sm" onClick={() => setRecordOpen(true)}>
            <Wallet className="size-3.5" /> Record payment
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Confirmed collections"
          value={formatCurrency(collected, true)}
          hint={`${confirmed.length} completed transactions`}
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard
          label="Awaiting verification"
          value={formatCurrency(pendingAmount, true)}
          hint={`${pending.length} payments · excluded from collected`}
          icon={Clock3}
          tone="warning"
        />
        <StatCard
          label="Failed payments"
          value={failed.length}
          hint="No invoice balance was changed"
          icon={X}
          tone="danger"
        />
        <StatCard
          label="Corrections"
          value={reversals.length}
          hint={`${formatCurrency(reversals.reduce((sum, payment) => sum + payment.amount, 0), true)} reversed`}
          icon={RotateCcw}
          tone="default"
        />
      </div>

      <div className="mt-5">
        <div className="mb-2.5">
          <h2 className="text-[13px] font-semibold">Payment ledger</h2>
          <p className="text-[10.5px] text-muted-foreground">
            Track every transaction, verify pending transfers, and open receipts or related invoices.
          </p>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(payment) => payment.id}
          getSearchText={(payment) => {
            const tenant = db.tenants.find((item) => item.id === payment.tenantId);
            const invoice = db.invoices.find((item) => item.id === payment.invoiceId);
            return `${payment.reference} ${tenant?.name ?? ""} ${invoice?.number ?? ""}`;
          }}
          searchPlaceholder="Search by reference, tenant or invoice…"
          onRowClick={(payment) => setSelectedId(payment.id)}
          emptyTitle="No payments match"
          emptyDescription="Adjust the filters or record a new payment."
          emptyAction={
            <Button variant="outline" size="sm" onClick={() => setRecordOpen(true)}>
              <Wallet className="size-3.5" /> Record payment
            </Button>
          }
          toolbar={
            <>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger size="sm" className="h-8.5 w-[140px] bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  {Object.entries(PAYMENT_METHOD_SHORT).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger size="sm" className="h-8.5 w-[130px] bg-background text-xs">
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
              <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                <SelectTrigger size="sm" className="h-8.5 w-[150px] bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All verification</SelectItem>
                  {Object.entries(VERIFICATION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(methodFilter !== "all" || statusFilter !== "all" || verificationFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8.5 text-[11px]"
                  onClick={() => {
                    setMethodFilter("all");
                    setStatusFilter("all");
                    setVerificationFilter("all");
                  }}
                >
                  Clear
                </Button>
              )}
            </>
          }
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <RotateCcw className="size-3.5" />
          Confirmed payments are corrected with a reversal entry, never edited or deleted.
        </span>
        <span>{rows.length} transactions</span>
      </div>

      {recordOpen && (
        <RecordPaymentDialog
          actor={mode === "accountant" ? "Accountant" : "Administrator"}
          onClose={() => setRecordOpen(false)}
        />
      )}

      {selected && (
        <Sheet open onOpenChange={(open) => !open && setSelectedId(null)}>
          <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-lg">
            <div className="border-b border-border p-5">
              <SheetHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Payment
                    </p>
                    <SheetTitle className="mt-1 font-mono text-[15px]">{selected.reference}</SheetTitle>
                    <SheetDescription>
                      {db.tenants.find((item) => item.id === selected.tenantId)?.name} ·{" "}
                      {db.invoices.find((item) => item.id === selected.invoiceId)?.number}
                    </SheetDescription>
                  </div>
                  <StatusBadge
                    status={selected.status}
                    label={PAYMENT_STATUS_LABELS[selected.status]}
                  />
                </div>
              </SheetHeader>
            </div>

            <div className="space-y-4 p-5">
              {selected.verification === "pending" ? (
                <div className="overflow-hidden rounded-xl border border-amber-200 bg-white text-[#0F172A] shadow-soft dark:border-amber-500/25">
                  <div className="h-1.5 bg-[#D97706]" />
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-amber-600">
                          Proof of payment · awaiting verification
                        </p>
                        <p className="mt-2 font-display text-[26px] font-semibold leading-none">
                          {formatCurrency(selected.amount)}
                        </p>
                      </div>
                      <span className="flex size-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                        <Clock3 className="size-4" />
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-[10.5px] sm:grid-cols-2">
                      <div>
                        <p className="text-[9px] uppercase tracking-wide text-slate-500">Method</p>
                        <p className="mt-0.5 font-medium">{PAYMENT_METHOD_SHORT[selected.method]}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wide text-slate-500">Bank</p>
                        <p className="mt-0.5 font-medium">{selected.bankName ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wide text-slate-500">Proof document</p>
                        <p className="mt-0.5 font-medium">{selected.proofName ?? "Not attached"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wide text-slate-500">Submitted</p>
                        <p className="mt-0.5 font-medium">{formatDate(selected.date)}</p>
                      </div>
                    </div>
                    <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[9.5px] leading-relaxed text-amber-800">
                      This payment does not count toward collected rent until the accountant verifies
                      the bank statement or proof.
                    </p>
                  </div>
                </div>
              ) : selected.status === "failed" ? (
                <div className="overflow-hidden rounded-xl border border-destructive/25 bg-card shadow-soft">
                  <div className="h-1.5 bg-destructive" />
                  <div className="p-5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-destructive">
                      Failed transaction
                    </p>
                    <p className="mt-2 font-display text-[26px] font-semibold leading-none">
                      {formatCurrency(selected.amount)}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      {selected.notes ??
                        "This payment did not complete and no invoice balance was changed."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-muted-foreground">
                      <span>{PAYMENT_METHOD_SHORT[selected.method]}</span>
                      <span>{formatDate(selected.date)}</span>
                      <span>{selected.phone ?? selected.bankName ?? ""}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <PaymentReceiptDocument payment={selected} />
              )}

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-[10.5px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Verification</span>
                  <StatusBadge
                    status={
                      selected.verification === "pending"
                        ? "pending"
                        : selected.verification === "not_required"
                          ? "completed"
                          : selected.verification
                    }
                    label={VERIFICATION_LABELS[selected.verification]}
                    className="h-5 px-1.5 text-[9.5px]"
                  />
                </div>
                {selected.verifiedAt && (
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Verified at</span>
                    <span>{formatDateTime(selected.verifiedAt)}</span>
                  </div>
                )}
                {selected.notes && !selected.status.includes("failed") && (
                  <p className="mt-2 border-t border-border pt-2 leading-relaxed text-muted-foreground">
                    {selected.notes}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {selected.verification === "pending" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setApproveTarget(selected)}
                      className="w-full justify-start"
                    >
                      <Check className="size-3.5" /> Approve and mark as collected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRejectTarget(selected)}
                      className="w-full justify-start text-destructive"
                    >
                      <X className="size-3.5" /> Reject transfer
                    </Button>
                  </>
                )}
                {selected.status === "completed" && selected.amount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReverseTarget(selected)}
                    className="w-full justify-start"
                  >
                    <RotateCcw className="size-3.5" /> Record correction / reversal
                  </Button>
                )}
                <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                  <Link href={`${basePath}/invoices/${selected.invoiceId}`}>
                    <ArrowUpRight className="size-3.5" /> Open invoice
                  </Link>
                </Button>
                {selected.status === "completed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={async () => {
                      try {
                        await downloadReceiptPdf(selected, db);
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Could not download receipt PDF.");
                      }
                    }}
                  >
                    <Download className="size-3.5" /> Download receipt
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      <ConfirmDialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        title="Approve this payment?"
        description={
          approveTarget
            ? `${formatCurrency(approveTarget.amount)} from ${db.tenants.find((tenant) => tenant.id === approveTarget.tenantId)?.name} will be marked as collected and applied to the invoice.`
            : ""
        }
        confirmLabel="Approve payment"
        onConfirm={async () => {
          if (!approveTarget) return;
          try {
            await verifyPayment(approveTarget.id, "approve");
            toast.success("Payment verified", {
              description: `${formatCurrency(approveTarget.amount)} now counts as collected.`,
            });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not verify the payment.");
          }
          setApproveTarget(null);
        }}
      />

      {rejectTarget && (
        <ReasonDialog
          open
          onOpenChange={(open) => !open && setRejectTarget(null)}
          title="Reject this payment?"
          description="The transfer will be marked as failed and the tenant will be notified. The original record is kept."
          label="Reason for rejection"
          placeholder="e.g. No matching credit on the bank statement…"
          confirmLabel="Reject payment"
          variant="destructive"
          onSubmit={async (reason) => {
            try {
              await verifyPayment(rejectTarget.id, "reject", reason);
              toast.success("Payment rejected", {
                description: "The invoice balance is unchanged.",
              });
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not reject the payment.");
            }
            setRejectTarget(null);
          }}
        />
      )}

      {reverseTarget && (
        <ReasonDialog
          open
          onOpenChange={(open) => !open && setReverseTarget(null)}
          title="Record a payment correction?"
          description="A negative reversal entry will be added. The original payment is never edited or deleted."
          label="Reason for correction"
          placeholder="e.g. Payment was applied to the wrong invoice…"
          confirmLabel="Record correction"
          variant="destructive"
          onSubmit={async (reason) => {
            try {
              await reversePayment(reverseTarget.id, reason);
              toast.success("Correction recorded", {
                description: "The payment was corrected and the invoice balance recalculated.",
              });
              setReverseTarget(null);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not record the correction.");
            }
          }}
        />
      )}
    </div>
  );
}
