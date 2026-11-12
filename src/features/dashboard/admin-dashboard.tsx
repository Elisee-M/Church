"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Percent,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { DEMO_USER, PAYMENT_METHOD_SHORT, INVOICE_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, formatPercent, initials, cn } from "@/lib/utils";
import {
  getDashboardMetrics,
  getExpenseBreakdown,
  getMonthlyFinancials,
  getPaymentMethodBreakdown,
  invoiceBalance,
} from "@/lib/mock-data/analytics";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingPanel } from "@/components/shared/states";
import { FinancialChart } from "@/components/charts/financial-chart";
import { OccupancyDonut } from "@/components/charts/occupancy-donut";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AdminDashboard() {
  const db = useDatabase();
  const ready = usePageReady();
  const metrics = getDashboardMetrics(db);
  const financials = getMonthlyFinancials(db);
  const methodData = getPaymentMethodBreakdown(db);
  const expenses = getExpenseBreakdown(db);
  const payments = db.payments
    .filter((payment) => payment.status === "completed")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const outstanding = db.invoices
    .filter((invoice) => invoice.status !== "draft" && invoiceBalance(invoice) > 0)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
    .slice(0, 5);
  const pendingVerification = db.payments.filter((payment) => payment.verification === "pending");
  const collectionGap = Math.max(metrics.expectedMonthly - metrics.collectedThisMonth, 0);
  const maxMethod = Math.max(...methodData.map((item) => item.total), 1);
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  if (!ready) {
    return (
      <>
        <PageHeader title={`${greeting}, ${DEMO_USER.admin.name.split(" ")[0]}`} description="Loading your property overview…" />
        <LoadingPanel />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`${greeting}, ${DEMO_USER.admin.name.split(" ")[0]}`}
        description={`Here is what is happening across the church's property portfolio on ${formatDate(new Date(), "long")}.`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/reports">
                <TrendingUp className="size-3.5" /> Reports
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/admin/invoices">
                <ReceiptText className="size-3.5" /> Manage invoices
              </Link>
            </Button>
          </>
        }
      />

      {pendingVerification.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning/[0.055] px-4 py-3 sm:flex-row sm:items-center">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <ShieldCheck className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold">
              {pendingVerification.length} bank transfer{pendingVerification.length === 1 ? "" : "s"} awaiting verification
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              Bank payments only count toward collected rent after the accountant verifies the proof.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0 bg-card">
            <Link href="/accountant/verify">
              Review queue <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Expected rent · this month"
          value={formatCurrency(metrics.expectedMonthly, true)}
          hint="Active agreements only"
          icon={Building2}
          tone="navy"
        />
        <StatCard
          label="Collected · this month"
          value={formatCurrency(metrics.collectedThisMonth, true)}
          hint={`${formatPercent(metrics.collectionRate)} of expected`}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Outstanding balances"
          value={formatCurrency(metrics.outstanding, true)}
          hint={`${metrics.overdueInvoices} overdue invoices`}
          icon={CalendarClock}
          tone="danger"
        />
        <StatCard
          label="Occupancy rate"
          value={formatPercent(metrics.occupancyRate)}
          hint={`${metrics.occupiedSpaces} of ${metrics.totalSpaces} spaces occupied`}
          icon={Percent}
          tone="info"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <SectionCard
          className="xl:col-span-8"
          title="Financial performance"
          description="Expected versus collected rent, with operating expenses overlaid."
          action={<Badge variant="neutral">Jan – Nov 2026</Badge>}
        >
          <FinancialChart data={financials} />
        </SectionCard>

        <SectionCard
          className="xl:col-span-4"
          title="Collection progress"
          description="November 2026 rent cycle"
        >
          <div className="px-5 pb-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="font-display text-[32px] font-semibold leading-none tracking-tight">
                  {formatPercent(metrics.collectionRate)}
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">of monthly expected rent</p>
              </div>
              <Badge variant={metrics.collectionRate >= 70 ? "success" : "warning"}>
                {metrics.collectionRate >= 70 ? "On track" : "Needs attention"}
              </Badge>
            </div>
            <Progress value={metrics.collectionRate} className="mt-4 h-2" />
            <div className="mt-4 space-y-2.5 text-[11.5px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expected</span>
                <span className="font-semibold">{formatCurrency(metrics.expectedMonthly)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Collected</span>
                <span className="font-semibold text-success">{formatCurrency(metrics.collectedThisMonth)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2.5">
                <span className="text-muted-foreground">Still to collect</span>
                <span className="font-semibold text-warning">{formatCurrency(collectionGap)}</span>
              </div>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                Collected by method
              </p>
              <div className="space-y-2.5">
                {methodData.map((item) => (
                  <div key={item.method}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{PAYMENT_METHOD_SHORT[item.method]}</span>
                      <span className="font-medium">{formatCurrency(item.total, true)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary dark:bg-foreground"
                        style={{ width: `${Math.max((item.total / maxMethod) * 100, item.total > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <SectionCard
          className="xl:col-span-4"
          title="Portfolio occupancy"
          description={`${metrics.totalSpaces} rentable spaces across ${db.buildings.length} buildings`}
          action={
            <Button variant="ghost" size="icon-sm" asChild>
              <Link href="/admin/properties">
                <ArrowUpRight className="size-4" />
                <span className="sr-only">View properties</span>
              </Link>
            </Button>
          }
        >
          <div className="px-5 pb-5">
            <OccupancyDonut
              occupied={metrics.occupiedSpaces}
              vacant={metrics.vacantSpaces}
              maintenance={metrics.maintenanceSpaces}
              rate={metrics.occupancyRate}
            />
            <div className="mt-5 rounded-lg border border-border bg-muted/35 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Operating expenses
              </p>
              <div className="mt-1.5 flex items-end justify-between">
                <p className="font-display text-lg font-semibold">
                  {formatCurrency(
                    expenses.reduce((sum, item) => sum + item.total, 0),
                    true,
                  )}
                </p>
                <span className="text-[10px] text-muted-foreground">{expenses.length} categories</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                Tracked separately from rental income. Never netted against rent.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          className="xl:col-span-8"
          title="Recent payments"
          description="Verified and completed payments across all payment channels."
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/payments">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          <div className="divide-y divide-border/70">
            {payments.map((payment) => {
              const tenant = db.tenants.find((item) => item.id === payment.tenantId);
              const invoice = db.invoices.find((item) => item.id === payment.invoiceId);
              return (
                <div key={payment.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-[10px]">{initials(tenant?.name ?? "??")}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium">{tenant?.name ?? "Unknown tenant"}</p>
                    <p className="text-[10.5px] text-muted-foreground">
                      {invoice?.number} · {PAYMENT_METHOD_SHORT[payment.method]} · {formatDate(payment.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12.5px] font-semibold">{formatCurrency(payment.amount)}</p>
                    <StatusBadge status={payment.status} label="Completed" className="mt-1 h-4 px-1.5 text-[9px]" />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <SectionCard
          className="xl:col-span-7"
          title="Invoices needing attention"
          description="Largest outstanding balances, oldest due first."
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/invoices">
                All invoices <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          <div className="divide-y divide-border/70">
            {outstanding.map((invoice) => {
              const tenant = db.tenants.find((item) => item.id === invoice.tenantId);
              return (
                <Link
                  key={invoice.id}
                  href={`/admin/invoices/${invoice.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/40"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ReceiptText className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium">{tenant?.name}</p>
                    <p className="text-[10.5px] text-muted-foreground">
                      {invoice.number} · due {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12.5px] font-semibold">{formatCurrency(invoiceBalance(invoice))}</p>
                    <StatusBadge
                      status={invoice.status}
                      label={INVOICE_STATUS_LABELS[invoice.status]}
                      className="mt-1 h-4 px-1.5 text-[9px]"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          className="xl:col-span-5"
          title="Recent activity"
          description="Audit-friendly trail of key actions."
          action={<Badge variant="neutral">Live</Badge>}
        >
          <div className="px-5 pb-5">
            <ol className="relative space-y-4 border-l border-border pl-4">
              {db.activities.slice(0, 6).map((activity) => (
                <li key={activity.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[21.5px] top-1 size-2 rounded-full ring-2 ring-card",
                      activity.type === "payment"
                        ? "bg-success"
                        : activity.type === "invoice"
                          ? "bg-chart-2"
                          : activity.type === "expense"
                            ? "bg-warning"
                            : "bg-muted-foreground",
                    )}
                  />
                  <p className="text-[11.5px] font-medium leading-snug">{activity.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground">
                    {activity.description}
                  </p>
                  <p className="mt-1 text-[9.5px] uppercase tracking-wide text-muted-foreground/70">
                    {activity.actor} · {formatDate(activity.date)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <CircleDollarSign className="size-4 text-success" />
          Rent and expenses are kept in separate ledgers — reports never mix the two.
        </div>
        <Button variant="link" size="sm" asChild className="h-auto p-0 text-[11px]">
          <Link href="/admin/reports">
            Open financial reports <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {pendingVerification.length > 0 && (
        <div className="sr-only" aria-live="polite">
          {pendingVerification.length} payments require verification.
        </div>
      )}
    </div>
  );
}
