"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  CircleDollarSign,
  GitCompareArrows,
  Landmark,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { PAYMENT_METHOD_SHORT } from "@/lib/constants";
import { formatCurrency, formatDate, formatPercent, initials } from "@/lib/utils";
import {
  currentMonthKey,
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
import { ExpenseDonut } from "@/components/charts/expense-donut";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AccountantDashboard() {
  const db = useDatabase();
  const ready = usePageReady();
  const metrics = getDashboardMetrics(db);
  const month = currentMonthKey();
  const financials = getMonthlyFinancials(db);
  const methods = getPaymentMethodBreakdown(db);
  const expenses = getExpenseBreakdown(db);
  const pending = db.payments
    .filter((payment) => payment.verification === "pending")
    .sort((a, b) => b.date.localeCompare(a.date));
  const thisMonthExpenses = db.expenses
    .filter((expense) => expense.date.startsWith(month))
    .reduce((sum, expense) => sum + expense.amount, 0);
  const verifiedThisMonth = db.payments
    .filter(
      (payment) =>
        payment.date.startsWith(month) &&
        payment.status === "completed" &&
        (payment.verification === "verified" || payment.verification === "not_required"),
    )
    .reduce((sum, payment) => sum + payment.amount, 0);
  const awaitingAmount = pending.reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = db.invoices
    .filter((invoice) => invoiceBalance(invoice) > 0 && invoice.status !== "draft")
    .sort((a, b) => invoiceBalance(b) - invoiceBalance(a))
    .slice(0, 4);
  const bankPending = pending.filter((payment) => payment.method === "bank_transfer");
  const momoPending = pending.filter(
    (payment) => payment.method === "mtn_momo" || payment.method === "airtel_money",
  );

  if (!ready) {
    return (
      <>
        <PageHeader title="Financial control" description="Loading the accountant workspace…" />
        <LoadingPanel />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Financial control · ${formatDate(new Date(), "long")}`}
        badge={<Badge variant="navy">Accountant</Badge>}
        description="Verify collections, reconcile channels, and keep the rent ledger clean."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/accountant/reconciliation">
                <GitCompareArrows className="size-3.5" /> Reconcile
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/accountant/verify">
                <ShieldCheck className="size-3.5" /> Verification queue
                {pending.length > 0 && (
                  <span className="ml-1 rounded-full bg-warning px-1.5 text-[10px] text-warning-foreground">
                    {pending.length}
                  </span>
                )}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Verified collections"
          value={formatCurrency(verifiedThisMonth, true)}
          hint={`${formatPercent(metrics.collectionRate)} of expected rent`}
          icon={BadgeCheck}
          tone="success"
        />
        <StatCard
          label="Awaiting verification"
          value={formatCurrency(awaitingAmount, true)}
          hint={`${pending.length} transactions to review`}
          icon={ShieldCheck}
          tone="warning"
        />
        <StatCard
          label="Outstanding balances"
          value={formatCurrency(metrics.outstanding, true)}
          hint={`${metrics.overdueInvoices} overdue invoices`}
          icon={CalendarClock}
          tone="danger"
        />
        <StatCard
          label="Expenses · this month"
          value={formatCurrency(thisMonthExpenses, true)}
          hint={`${db.expenses.filter((expense) => expense.date.startsWith(month)).length} records`}
          icon={TrendingDown}
          tone="navy"
        />
      </div>

      {pending.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning/[0.055] px-4 py-3 sm:flex-row sm:items-center">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <ShieldCheck className="size-4" />
          </span>
          <div className="flex-1">
            <p className="text-[12.5px] font-semibold">
              {bankPending.length} bank transfer{bankPending.length === 1 ? "" : "s"} and {momoPending.length} mobile money payment{momoPending.length === 1 ? "" : "s"} need review
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              Pending amounts are excluded from collected rent until verified. Confirmed transactions are never silently edited.
            </p>
          </div>
          <Button size="sm" asChild className="shrink-0">
            <Link href="/accountant/verify">
              Open queue <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <SectionCard
          className="xl:col-span-8"
          title="Expected vs collected"
          description="Rent ledger performance with operating expenses shown separately."
          action={<Badge variant="neutral">Last 11 months</Badge>}
        >
          <FinancialChart data={financials} height={264} />
        </SectionCard>

        <SectionCard
          className="xl:col-span-4"
          title="Verification queue"
          description="Oldest pending first"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/accountant/verify">
                All <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          <div className="divide-y divide-border/70">
            {pending.slice(0, 4).map((payment) => {
              const tenant = db.tenants.find((item) => item.id === payment.tenantId);
              const invoice = db.invoices.find((item) => item.id === payment.invoiceId);
              return (
                <Link
                  key={payment.id}
                  href="/accountant/verify"
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/40"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {payment.method === "bank_transfer" ? (
                      <Landmark className="size-3.5" />
                    ) : (
                      <Smartphone className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">{tenant?.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {invoice?.number} · {PAYMENT_METHOD_SHORT[payment.method]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-semibold">{formatCurrency(payment.amount, true)}</p>
                    <p className="text-[9.5px] text-warning">Pending</p>
                  </div>
                </Link>
              );
            })}
            {pending.length === 0 && (
              <p className="px-5 py-10 text-center text-xs text-muted-foreground">
                Queue is clear. Everything has been verified.
              </p>
            )}
          </div>
          <div className="border-t border-border px-5 py-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Total awaiting</span>
              <span className="font-semibold text-warning">{formatCurrency(awaitingAmount)}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <SectionCard
          className="xl:col-span-4"
          title="Channel monitoring"
          description="Confirmed collections by payment method"
        >
          <div className="px-5 pb-5">
            <div className="space-y-3.5">
              {methods.map((item) => {
                const count = db.payments.filter(
                  (payment) =>
                    payment.method === item.method &&
                    payment.status === "completed" &&
                    payment.date.startsWith(month),
                ).length;
                return (
                  <div key={item.method} className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      {item.method === "bank_transfer" ? (
                        <Landmark className="size-3.5" />
                      ) : item.method === "cash" ? (
                        <CircleDollarSign className="size-3.5" />
                      ) : (
                        <Smartphone className="size-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11.5px] font-medium">{PAYMENT_METHOD_SHORT[item.method]}</span>
                        <span className="text-[11.5px] font-semibold">{formatCurrency(item.total, true)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{count} confirmed payments</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-lg border border-border bg-muted/35 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium">
                <GitCompareArrows className="size-3.5 text-muted-foreground" />
                Reconciliation status
              </div>
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
                {pending.length === 0
                  ? "All channels are reconciled for this month."
                  : `${pending.length} transactions remain unreconciled. Proof of payment is required for bank transfers.`}
              </p>
              <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-[11px]" asChild>
                <Link href="/accountant/reconciliation">
                  Open reconciliation <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          className="xl:col-span-4"
          title="Expense mix"
          description="Recorded operating costs by category"
        >
          <div className="px-5 pb-5">
            <ExpenseDonut data={expenses} />
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px]">
              <span className="text-muted-foreground">Total recorded</span>
              <span className="font-semibold">
                {formatCurrency(expenses.reduce((sum, item) => sum + item.total, 0))}
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          className="xl:col-span-4"
          title="Largest outstanding"
          description="Balances that need follow-up"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/accountant/invoices">
                Invoices <ArrowRight className="size-3.5" />
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
                  href={`/accountant/invoices/${invoice.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/40"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="text-[9px]">{initials(tenant?.name ?? "??")}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">{tenant?.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {invoice.number} · {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-semibold">{formatCurrency(invoiceBalance(invoice), true)}</p>
                    <StatusBadge status={invoice.status} className="mt-0.5 h-4 px-1.5 text-[9px]" />
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: ReceiptText,
            title: "Receipts & EBM",
            description: "Attach fiscal references manually. Genzura never fabricates an EBM invoice.",
            href: "/accountant/receipts",
          },
          {
            icon: TrendingDown,
            title: "Operating expenses",
            description: "Record costs separately from rental income with supporting receipts.",
            href: "/accountant/expenses",
          },
          {
            icon: Wallet,
            title: "Payment history",
            description: "Every verified, pending, failed and reversed transaction in one trail.",
            href: "/accountant/payments",
          },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/20 hover:shadow-card"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
                <item.icon className="size-4" />
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground/50 transition group-hover:text-foreground" />
            </div>
            <p className="mt-3 text-[12.5px] font-semibold">{item.title}</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
