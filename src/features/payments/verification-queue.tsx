"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Check,
  Clock3,
  Download,
  FileCheck2,
  Landmark,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Payment } from "@/types";
import { PAYMENT_METHOD_SHORT, VERIFICATION_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime, initials } from "@/lib/utils";
import { currentMonthKey } from "@/lib/mock-data/analytics";
import { verifyPayment } from "@/lib/services";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState, LoadingPanel } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog, ReasonDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function VerificationQueue() {
  const db = useDatabase();
  const ready = usePageReady();
  const [methodFilter, setMethodFilter] = React.useState("all");
  const [approveTarget, setApproveTarget] = React.useState<Payment | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<Payment | null>(null);

  const pending = db.payments
    .filter((payment) => payment.verification === "pending")
    .sort((a, b) => a.date.localeCompare(b.date));
  const filtered = pending.filter(
    (payment) =>
      methodFilter === "all" ||
      (methodFilter === "bank" && payment.method === "bank_transfer") ||
      (methodFilter === "momo" &&
        (payment.method === "mtn_momo" || payment.method === "airtel_money")),
  );
  const month = currentMonthKey();
  const verifiedThisMonth = db.payments.filter(
    (payment) => payment.verification === "verified" && payment.date.startsWith(month),
  );
  const rejected = db.payments.filter((payment) => payment.verification === "rejected");
  const awaiting = pending.reduce((sum, payment) => sum + payment.amount, 0);
  const verifiedAmount = verifiedThisMonth.reduce((sum, payment) => sum + payment.amount, 0);
  const bankPending = pending.filter((payment) => payment.method === "bank_transfer");
  const momoPending = pending.filter(
    (payment) => payment.method === "mtn_momo" || payment.method === "airtel_money",
  );

  if (!ready) {
    return (
      <>
        <PageHeader title="Verification queue" description="Loading pending payments…" />
        <LoadingPanel />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Verification queue"
        description="Review bank transfers and mobile money proofs before they count as collected rent."
        badge={<Badge variant="navy">Accountant</Badge>}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/accountant/reconciliation">
              <ShieldCheck className="size-3.5" /> Reconciliation
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting verification"
          value={pending.length}
          hint={`${formatCurrency(awaiting)} in total`}
          icon={Clock3}
          tone="warning"
        />
        <StatCard
          label="Verified this month"
          value={formatCurrency(verifiedAmount, true)}
          hint={`${verifiedThisMonth.length} payments confirmed`}
          icon={BadgeCheck}
          tone="success"
        />
        <StatCard
          label="Bank transfers"
          value={bankPending.length}
          hint={`${formatCurrency(bankPending.reduce((sum, payment) => sum + payment.amount, 0), true)} awaiting`}
          icon={Landmark}
          tone="info"
        />
        <StatCard
          label="Rejected transfers"
          value={rejected.length}
          hint="Original records retained"
          icon={X}
          tone="danger"
        />
      </div>

      <div className="mt-4 rounded-xl border border-warning/25 bg-warning/[0.055] px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <ShieldCheck className="size-4" />
          </span>
          <div className="flex-1">
            <p className="text-[12px] font-semibold">Verification protects the rent ledger</p>
            <p className="text-[10.5px] leading-relaxed text-muted-foreground">
              Pending amounts are excluded from collected rent. Approved transactions are applied
              immediately and can only be corrected with a reversal — never silently edited.
            </p>
          </div>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger size="sm" className="h-8 w-[150px] bg-card text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="bank">Bank transfers</SelectItem>
              <SelectItem value="momo">Mobile money</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-semibold">Payments to review</h2>
            <p className="text-[10.5px] text-muted-foreground">
              Approve or reject pending proofs. Approved payments are applied to invoices immediately.
            </p>
          </div>
          <span className="text-[10.5px] text-muted-foreground">{filtered.length} shown</span>
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card shadow-soft">
            <EmptyState
              icon={BadgeCheck}
              title="Queue is clear"
              description={
                pending.length === 0
                  ? "Every submitted payment has been reviewed. New bank proofs will appear here."
                  : "No pending payments match this channel filter."
              }
              action={
                methodFilter !== "all" ? (
                  <Button variant="outline" size="sm" onClick={() => setMethodFilter("all")}>
                    Show all channels
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.map((payment) => {
              const tenant = db.tenants.find((item) => item.id === payment.tenantId);
              const invoice = db.invoices.find((item) => item.id === payment.invoiceId);
              return (
                <div
                  key={payment.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-warning/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-9">
                        <AvatarFallback className="text-[10px]">
                          {initials(tenant?.name ?? "??")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-[12.5px] font-semibold">{tenant?.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {payment.reference}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[18px] font-semibold">
                        {formatCurrency(payment.amount)}
                      </p>
                      <StatusBadge status="pending" label="Pending" className="mt-0.5 h-4 px-1.5 text-[9px]" />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-muted/35 p-3 text-[10.5px]">
                    <div className="flex items-center gap-1.5">
                      {payment.method === "bank_transfer" ? (
                        <Landmark className="size-3 text-muted-foreground" />
                      ) : (
                        <Smartphone className="size-3 text-muted-foreground" />
                      )}
                      <span className="text-muted-foreground">{PAYMENT_METHOD_SHORT[payment.method]}</span>
                    </div>
                    <div className="text-right text-muted-foreground">{invoice?.number}</div>
                    <div>
                      <span className="text-muted-foreground">Submitted</span>{" "}
                      <span className="font-medium">{formatDate(payment.date)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground">Method ref</span>{" "}
                      <span className="font-mono text-[9.5px]">{payment.reference.slice(-8)}</span>
                    </div>
                    {payment.bankName && (
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-muted-foreground">Bank</span>
                        <span className="font-medium">{payment.bankName}</span>
                      </div>
                    )}
                    {payment.phone && (
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-muted-foreground">Mobile number</span>
                        <span className="font-medium">{payment.phone}</span>
                      </div>
                    )}
                    <div className="col-span-2 flex items-center justify-between border-t border-border/70 pt-2">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <FileCheck2 className="size-3" />
                        {payment.proofName ?? "No proof document"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[9.5px]"
                        onClick={() =>
                          toast.message("Proof preview", {
                            description: payment.proofName
                              ? `${payment.proofName} would open in a document viewer. File preview is simulated.`
                              : "No proof file was attached to this payment.",
                          })
                        }
                      >
                        <Download className="size-3" /> Proof
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      className="h-8 flex-1 bg-success text-success-foreground hover:bg-success/90"
                      onClick={() => setApproveTarget(payment)}
                    >
                      <Check className="size-3.5" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1 text-destructive"
                      onClick={() => setRejectTarget(payment)}
                    >
                      <X className="size-3.5" /> Reject
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8" asChild>
                      <Link href={`/accountant/invoices/${payment.invoiceId}`}>
                        <ArrowUpRight className="size-3.5" /> Invoice
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Bank transfers" description="Require statement matching before approval">
          <div className="divide-y divide-border/70">
            {bankPending.slice(0, 4).map((payment) => {
              const tenant = db.tenants.find((item) => item.id === payment.tenantId);
              return (
                <div key={payment.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Landmark className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium">{tenant?.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {payment.bankName} · {payment.reference}
                    </p>
                  </div>
                  <p className="text-[11.5px] font-semibold">{formatCurrency(payment.amount, true)}</p>
                </div>
              );
            })}
            {bankPending.length === 0 && (
              <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">
                No bank transfers awaiting review.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Mobile money" description="Verify against merchant transaction history">
          <div className="divide-y divide-border/70">
            {momoPending.slice(0, 4).map((payment) => {
              const tenant = db.tenants.find((item) => item.id === payment.tenantId);
              return (
                <div key={payment.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Smartphone className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium">{tenant?.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {payment.phone} · {formatDateTime(payment.createdAt)}
                    </p>
                  </div>
                  <p className="text-[11.5px] font-semibold">{formatCurrency(payment.amount, true)}</p>
                </div>
              );
            })}
            {momoPending.length === 0 && (
              <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">
                No mobile money payments awaiting review.
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Banknote className="size-3.5" /> {pending.length} pending · {formatCurrency(awaiting)} not
          yet counted as collected
        </span>
        <span>{Object.values(VERIFICATION_LABELS).join(" · ")}</span>
      </div>

      <ConfirmDialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        title="Approve this payment?"
        description={
          approveTarget
            ? `${formatCurrency(approveTarget.amount)} from ${db.tenants.find((tenant) => tenant.id === approveTarget.tenantId)?.name} will be applied to the invoice and counted as collected.`
            : ""
        }
        confirmLabel="Approve payment"
        onConfirm={async () => {
          if (!approveTarget) return;
          try {
            await verifyPayment(approveTarget.id, "approve");
            toast.success("Payment verified", {
              description: `${formatCurrency(approveTarget.amount)} is now in the collected ledger.`,
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
          description="The payment will be marked failed. The tenant is notified and can submit a new proof."
          label="Reason for rejection"
          placeholder="e.g. The reference does not appear on the bank statement…"
          confirmLabel="Reject payment"
          variant="destructive"
          onSubmit={async (reason) => {
            try {
              await verifyPayment(rejectTarget.id, "reject", reason);
              toast.success("Payment rejected", {
                description: "The invoice balance was not changed.",
              });
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not reject the payment.");
            }
            setRejectTarget(null);
          }}
        />
      )}
    </div>
  );
}
