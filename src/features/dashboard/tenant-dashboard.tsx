"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileText,
  FolderOpen,
  Home,
  Info,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { PAYMENT_METHOD_SHORT, SPACE_CATEGORY_LABELS } from "@/lib/constants";
import { cn, formatCurrency, formatDate, formatPercent, daysBetween } from "@/lib/utils";
import { getTenantSummary, invoiceBalance, todayISO } from "@/lib/mock-data/analytics";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingPanel } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function TenantDashboard() {
  const db = useDatabase();
  const ready = usePageReady();
  const tenantId = db.tenants[0]?.id ?? "";
  const summary = getTenantSummary(db, tenantId);
  const tenant = summary.tenant;
  const invoice = summary.currentInvoice;
  const daysToDue = invoice ? daysBetween(todayISO(), invoice.dueDate) : 0;
  const documents = db.documents
    .filter((document) => document.tenantId === tenantId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  if (!ready) {
    return (
      <>
        <PageHeader title="My home" description="Loading your rental summary…" />
        <LoadingPanel />
      </>
    );
  }

  if (!tenant) {
    return (
      <PageHeader
        title="Tenant profile not found"
        description="No tenant account is available yet. Add a tenant in the admin portal to view this dashboard."
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Muraho, ${tenant.name.split(" ")[0]}`}
        description={`Your rental overview for ${formatDate(new Date(), "long")}. All amounts are in Rwandan Francs.`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/tenant/invoices">
                <FileText className="size-3.5" /> My invoices
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/tenant/pay">
                <CreditCard className="size-3.5" /> Make a payment
              </Link>
            </Button>
          </>
        }
      />

      {invoice &&
        (invoice.status === "overdue" ? (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.045] px-4 py-3 sm:flex-row sm:items-center">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <CalendarClock className="size-4" />
            </span>
            <div className="flex-1">
              <p className="text-[12.5px] font-semibold">
                Invoice {invoice.number} is overdue by {Math.abs(daysToDue)} days
              </p>
              <p className="text-[11.5px] text-muted-foreground">
                Outstanding balance {formatCurrency(invoiceBalance(invoice))}. Paying today avoids any further penalty.
              </p>
            </div>
            <Button size="sm" asChild className="shrink-0">
              <Link href={`/tenant/invoices/${invoice.id}`}>
                View invoice <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        ) : daysToDue <= 10 ? (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning/[0.055] px-4 py-3 sm:flex-row sm:items-center">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <CalendarClock className="size-4" />
            </span>
            <div className="flex-1">
              <p className="text-[12.5px] font-semibold">
                Rent is due in {Math.max(daysToDue, 0)} day{daysToDue === 1 ? "" : "s"}
              </p>
              <p className="text-[11.5px] text-muted-foreground">
                {formatCurrency(invoiceBalance(invoice))} remaining on invoice {invoice.number}.
              </p>
            </div>
            <Button size="sm" asChild className="shrink-0">
              <Link href={`/tenant/invoices/${invoice.id}`}>
                Pay now <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        ) : null)}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monthly rent"
          value={formatCurrency(summary.monthlyRent)}
          hint={`${summary.spaces.length} space${summary.spaces.length === 1 ? "" : "s"} on your agreement`}
          icon={Home}
          tone="navy"
        />
        <StatCard
          label="Outstanding balance"
          value={formatCurrency(summary.balance)}
          hint={summary.balance > 0 ? `${summary.pendingInvoices.length} invoice${summary.pendingInvoices.length === 1 ? "" : "s"} awaiting payment` : "You are all paid up"}
          icon={Wallet}
          tone={summary.balance > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Next due date"
          value={summary.nextDueDate ? formatDate(summary.nextDueDate) : "—"}
          hint={invoice ? `Invoice ${invoice.number}` : "No open invoice"}
          icon={CalendarClock}
          tone="default"
        />
        <StatCard
          label="Agreement"
          value={summary.agreement ? "Active" : "—"}
          hint={summary.agreement ? `${summary.agreement.reference} · ends ${formatDate(summary.agreement.endDate)}` : "No active agreement"}
          icon={ShieldCheck}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <SectionCard
          className="xl:col-span-7"
          title="Current rent invoice"
          description={invoice ? `${invoice.number} · ${formatDate(invoice.issueDate, "long")}` : "Nothing outstanding"}
          action={invoice ? <StatusBadge status={invoice.status} /> : undefined}
        >
          {invoice ? (
            <div className="px-5 pb-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Balance due
                  </p>
                  <p className="mt-1 font-display text-[30px] font-semibold leading-none tracking-tight">
                    {formatCurrency(invoiceBalance(invoice))}
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Due {formatDate(invoice.dueDate)} · {formatPercent((invoice.amountPaid / invoice.amount) * 100)} paid
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tenant/invoices/${invoice.id}`}>Details</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`/tenant/pay?invoice=${invoice.id}`}>
                      <CreditCard className="size-3.5" /> Pay rent
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="mt-5 space-y-2 rounded-lg border border-border bg-muted/30 p-3.5">
                {invoice.lineItems.map((line) => {
                  const space = db.spaces.find((item) => item.id === line.spaceId);
                  return (
                    <div key={line.id} className="flex items-start justify-between gap-4 text-[11.5px]">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{line.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {space?.code} · {SPACE_CATEGORY_LABELS[space?.category ?? "shop"]}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium">{formatCurrency(line.amount)}</span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between border-t border-border pt-2 text-[12px] font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.amount)}</span>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-lg bg-accent/70 px-3 py-2.5 text-[10.5px] leading-relaxed text-muted-foreground dark:bg-white/[0.04]">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                Pay with MTN MoMo, Airtel Money or bank transfer. Genzura will never ask for your Mobile Money PIN.
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <CheckCircle2 className="size-9 text-success" strokeWidth={1.5} />
              <p className="mt-3 text-sm font-semibold">You are all caught up</p>
              <p className="mt-1 max-w-xs text-[11.5px] text-muted-foreground">
                There are no outstanding invoices on your account. Your next invoice will appear here.
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          className="xl:col-span-5"
          title="My rental spaces"
          description={summary.agreement ? `Agreement ${summary.agreement.reference}` : "No active agreement"}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tenant/rentals">
                Details <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          <div className="divide-y divide-border/70">
            {summary.spaces.map((space) => {
              const building = db.buildings.find((item) => item.id === space.buildingId);
              const floor = db.floors.find((item) => item.id === space.floorId);
              return (
                <div key={space.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Building2 className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium">{space.name}</p>
                    <p className="text-[10.5px] text-muted-foreground">
                      {space.code} · {building?.name} · {floor?.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="neutral" className="h-4 px-1.5 text-[9px]">
                        {SPACE_CATEGORY_LABELS[space.category]}
                      </Badge>
                      <span className="text-[9.5px] text-muted-foreground">{space.sizeSqm} m²</span>
                    </div>
                  </div>
                  <p className="shrink-0 text-[11.5px] font-semibold">{formatCurrency(space.monthlyRent)}</p>
                </div>
              );
            })}
            {summary.spaces.length === 0 && (
              <p className="px-5 py-10 text-center text-xs text-muted-foreground">
                No spaces linked to your account.
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <SectionCard
          className="xl:col-span-7"
          title="Recent payments"
          description="Confirmed and pending payments on your account."
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tenant/payments">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          <div className="divide-y divide-border/70">
            {summary.recentPayments.map((payment) => {
              const related = db.invoices.find((item) => item.id === payment.invoiceId);
              return (
                <div key={payment.id} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      payment.status === "completed"
                        ? "bg-success/10 text-success"
                        : payment.status === "pending"
                          ? "bg-warning/10 text-warning"
                          : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {payment.status === "completed" ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <Wallet className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium">{PAYMENT_METHOD_SHORT[payment.method]}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {related?.number} · {formatDate(payment.date)} · {payment.reference}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-semibold">{formatCurrency(payment.amount)}</p>
                    <StatusBadge status={payment.status} className="mt-0.5 h-4 px-1.5 text-[9px]" />
                  </div>
                </div>
              );
            })}
            {summary.recentPayments.length === 0 && (
              <p className="px-5 py-10 text-center text-xs text-muted-foreground">No payments yet.</p>
            )}
          </div>
        </SectionCard>

        <div className="space-y-4 xl:col-span-5">
          <SectionCard
            title="Documents"
            description="Invoices, receipts and your agreement"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/tenant/documents">
                  All <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            <div className="divide-y divide-border/70">
              {documents.map((document) => (
                <Link
                  key={document.id}
                  href="/tenant/documents"
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/40"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileText className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium">{document.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(document.date)} · {document.fileSize}
                    </p>
                  </div>
                  <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                </Link>
              ))}
              {documents.length === 0 && (
                <p className="px-5 py-8 text-center text-xs text-muted-foreground">No documents yet.</p>
              )}
            </div>
          </SectionCard>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/tenant/pay"
              className="group rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/20 hover:shadow-card"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
                <CreditCard className="size-4" />
              </span>
              <p className="mt-3 text-[12px] font-semibold">Pay rent</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">MoMo or bank transfer</p>
            </Link>
            <Link
              href="/tenant/documents"
              className="group rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/20 hover:shadow-card"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
                <FolderOpen className="size-4" />
              </span>
              <p className="mt-3 text-[12px] font-semibold">Documents</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">Receipts & agreement</p>
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <ReceiptText className="size-3.5 text-muted-foreground" />
              Need a receipt?
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              A payment receipt is available for every confirmed payment. EBM fiscal invoices are issued separately by the accountant.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
