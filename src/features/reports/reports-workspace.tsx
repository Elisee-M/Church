"use client";

import * as React from "react";
import {
  ArrowDownToLine,
  Building2,
  CalendarRange,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  Landmark,
  ReceiptText,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  EXPENSE_CATEGORY_LABELS,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_SHORT,
  PAYMENT_STATUS_LABELS,
  SPACE_CATEGORY_LABELS,
  TENANT_TYPE_LABELS,
} from "@/lib/constants";
import { formatCurrency, formatDate, formatNumber, formatPercent, monthLabel } from "@/lib/utils";
import {
  currentMonthKey,
  getBuildingPerformance,
  getDashboardMetrics,
  getExpenseBreakdown,
  getMonthlyFinancials,
  getOccupancyBreakdown,
  getPaymentMethodBreakdown,
  invoiceBalance,
} from "@/lib/mock-data/analytics";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { LoadingPanel } from "@/components/shared/states";
import { FinancialChart } from "@/components/charts/financial-chart";
import { ExpenseDonut } from "@/components/charts/expense-donut";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
  description: string,
) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  toast.success("Report exported", { description });
}

export function ReportsWorkspace({ mode = "admin" }: { mode?: "admin" | "accountant" }) {
  const db = useDatabase();
  const ready = usePageReady();
  const [range, setRange] = React.useState("6");

  const month = currentMonthKey();
  const financials = getMonthlyFinancials(db);
  const visibleFinancials = financials.slice(-Number(range));
  const metrics = getDashboardMetrics(db);
  const buildings = getBuildingPerformance(db);
  const channels = getPaymentMethodBreakdown(db);
  const expenses = getExpenseBreakdown(db);
  const occupancy = getOccupancyBreakdown(db);

  const periodExpected = visibleFinancials.reduce((sum, point) => sum + point.expected, 0);
  const periodCollected = visibleFinancials.reduce((sum, point) => sum + point.collected, 0);
  const periodExpenses = visibleFinancials.reduce((sum, point) => sum + point.expenses, 0);
  const periodNet = periodCollected - periodExpenses;
  const collectionRate = periodExpected ? (periodCollected / periodExpected) * 100 : 0;
  const rangeLabel =
    visibleFinancials.length > 0
      ? `${monthLabel(visibleFinancials[0].month)} – ${monthLabel(visibleFinancials[visibleFinancials.length - 1].month)}`
      : "—";

  const outstanding = db.invoices
    .filter((invoice) => invoice.status !== "draft" && invoiceBalance(invoice) > 0)
    .sort((a, b) => invoiceBalance(b) - invoiceBalance(a));
  const maxChannel = Math.max(...channels.map((item) => item.total), 1);
  const paidThisMonth = db.payments
    .filter((payment) => payment.status === "completed" && payment.date.startsWith(month))
    .reduce((sum, payment) => sum + payment.amount, 0);

  const exportRentRoll = () => {
    const rows = db.tenants
      .filter((tenant) => tenant.status === "active")
      .map((tenant) => {
        const agreements = db.agreements.filter(
          (agreement) =>
            agreement.tenantId === tenant.id &&
            (agreement.status === "active" || agreement.status === "expiring"),
        );
        const rent = agreements.reduce(
          (sum, agreement) =>
            sum + agreement.lineItems.reduce((lineSum, line) => lineSum + line.monthlyRent, 0),
          0,
        );
        const spaceCodes = agreements
          .flatMap((agreement) => agreement.lineItems)
          .map((line) => db.spaces.find((space) => space.id === line.spaceId)?.code ?? line.spaceId)
          .join(" | ");
        return [tenant.name, tenant.phone, TENANT_TYPE_LABELS[tenant.type], spaceCodes, rent, "active"];
      });
    downloadCsv(
      "genzura-rent-roll.csv",
      ["Tenant", "Phone", "Business", "Spaces", "Monthly rent (RWF)", "Status"],
      rows,
      `${rows.length} active tenants exported to genzura-rent-roll.csv.`,
    );
  };

  const exportCollections = () => {
    downloadCsv(
      "genzura-collection-summary.csv",
      ["Month", "Expected (RWF)", "Collected (RWF)", "Expenses (RWF)", "Net (RWF)"],
      visibleFinancials.map((point) => [
        point.month,
        point.expected,
        point.collected,
        point.expenses,
        point.collected - point.expenses,
      ]),
      `${visibleFinancials.length} months of collections exported.`,
    );
  };

  const exportOutstanding = () => {
    downloadCsv(
      "genzura-outstanding-balances.csv",
      ["Invoice", "Tenant", "Period", "Due date", "Invoice amount", "Paid", "Balance", "Status"],
      outstanding.map((invoice) => [
        invoice.number,
        db.tenants.find((tenant) => tenant.id === invoice.tenantId)?.name ?? "",
        invoice.period,
        invoice.dueDate,
        invoice.amount,
        invoice.amountPaid,
        invoiceBalance(invoice),
        invoice.status,
      ]),
      `${outstanding.length} outstanding invoices exported.`,
    );
  };

  const exportPayments = () => {
    downloadCsv(
      "genzura-payment-register.csv",
      ["Reference", "Tenant", "Invoice", "Amount", "Method", "Status", "Verification", "Date"],
      [...db.payments]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((payment) => [
          payment.reference,
          db.tenants.find((tenant) => tenant.id === payment.tenantId)?.name ?? "",
          db.invoices.find((invoice) => invoice.id === payment.invoiceId)?.number ?? "",
          payment.amount,
          PAYMENT_METHOD_SHORT[payment.method],
          PAYMENT_STATUS_LABELS[payment.status],
          payment.verification,
          payment.date,
        ]),
      `${db.payments.length} payment records exported.`,
    );
  };

  const exportExpenses = () => {
    downloadCsv(
      "genzura-expense-register.csv",
      ["Reference", "Title", "Category", "Building", "Vendor", "Amount", "Date", "Status"],
      [...db.expenses]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((expense) => [
          expense.reference,
          expense.title,
          EXPENSE_CATEGORY_LABELS[expense.category],
          db.buildings.find((building) => building.id === expense.buildingId)?.name ?? "",
          expense.vendor,
          expense.amount,
          expense.date,
          expense.status,
        ]),
      `${db.expenses.length} expense records exported.`,
    );
  };

  const reportCards = [
    {
      title: "Rent roll",
      description: "Active tenants, assigned spaces and contracted monthly rent.",
      meta: `${db.tenants.filter((tenant) => tenant.status === "active").length} tenants`,
      icon: ReceiptText,
      onExport: exportRentRoll,
    },
    {
      title: "Collection summary",
      description: "Expected versus collected rent and expenses by month.",
      meta: `${visibleFinancials.length} months`,
      icon: TrendingUp,
      onExport: exportCollections,
    },
    {
      title: "Outstanding balances",
      description: "Every unpaid invoice with balance and days past due.",
      meta: `${outstanding.length} invoices`,
      icon: CircleDollarSign,
      onExport: exportOutstanding,
    },
    {
      title: "Payment register",
      description: "All confirmed, pending, failed and reversed transactions.",
      meta: `${db.payments.length} records`,
      icon: Wallet,
      onExport: exportPayments,
    },
    {
      title: "Expense register",
      description: "Operating costs grouped by building, vendor and category.",
      meta: `${db.expenses.length} records`,
      icon: TrendingDown,
      onExport: exportExpenses,
    },
  ];

  if (!ready) {
    return (
      <>
        <PageHeader title="Reports" description="Loading financial reporting…" />
        <LoadingPanel />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reports"
        description="Rent roll, collections, arrears and operating costs — exported without mixing income with expenses."
        badge={mode === "accountant" ? <Badge variant="navy">Finance</Badge> : undefined}
        actions={
          <>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger size="sm" className="h-9 w-[150px] bg-card text-xs">
                <CalendarRange className="mr-1 size-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={exportCollections}>
              <Download className="size-3.5" /> Export summary
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Expected rent"
          value={formatCurrency(periodExpected, true)}
          hint={rangeLabel}
          icon={CircleDollarSign}
          tone="navy"
        />
        <StatCard
          label="Collected rent"
          value={formatCurrency(periodCollected, true)}
          hint={`${formatPercent(collectionRate)} collection rate`}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Operating expenses"
          value={formatCurrency(periodExpenses, true)}
          hint="Tracked separately from rent"
          icon={TrendingDown}
          tone="warning"
        />
        <StatCard
          label="Net operating position"
          value={formatCurrency(periodNet, true)}
          hint={`Collected − expenses · ${rangeLabel}`}
          icon={periodNet >= 0 ? TrendingUp : TrendingDown}
          tone={periodNet >= 0 ? "info" : "danger"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <SectionCard
          className="xl:col-span-8"
          title="Income and costs"
          description={`Expected rent, confirmed collections and expenses · ${rangeLabel}`}
          action={<Badge variant="neutral">RWF</Badge>}
        >
          <FinancialChart data={visibleFinancials} height={300} />
        </SectionCard>

        <SectionCard
          className="xl:col-span-4"
          title="Expense composition"
          description="Recorded operating cost by category"
          action={<TrendingDown className="size-4 text-muted-foreground" />}
        >
          <div className="px-5 pb-5">
            <ExpenseDonut data={expenses} />
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="text-muted-foreground">This month</span>
                <span className="font-medium">{formatCurrency(periodExpenses, true)}</span>
              </div>
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="text-muted-foreground">Collected this month</span>
                <span className="font-medium text-success">{formatCurrency(paidThisMonth, true)}</span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <SectionCard
          className="xl:col-span-7"
          title="Building performance"
          description="Occupancy and collections by property"
          action={
            <Button variant="ghost" size="sm" className="h-7 text-[10.5px]" onClick={exportRentRoll}>
              <FileSpreadsheet className="size-3.5" /> Export rent roll
            </Button>
          }
        >
          <div className="divide-y divide-border/70">
            {buildings.map((item) => {
              const collection = item.expected ? (item.collected / item.expected) * 100 : 0;
              return (
                <div key={item.building.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
                        <Building2 className="size-3.5" />
                      </span>
                      <div>
                        <p className="text-[11.5px] font-medium">{item.building.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.occupied}/{item.spaces} occupied · {item.building.district}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11.5px] font-semibold">{formatCurrency(item.collected, true)}</p>
                      <p className="text-[9.5px] text-muted-foreground">
                        of {formatCurrency(item.expected, true)} expected
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1 flex justify-between text-[9.5px] text-muted-foreground">
                        <span>Occupancy</span>
                        <span>{formatPercent(item.occupancyRate)}</span>
                      </div>
                      <Progress value={item.occupancyRate} className="h-1.5" />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-[9.5px] text-muted-foreground">
                        <span>Collection</span>
                        <span>{formatPercent(collection)}</span>
                      </div>
                      <Progress value={Math.min(collection, 100)} className="h-1.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <div className="space-y-4 xl:col-span-5">
          <SectionCard title="Payment channels" description={`Confirmed collections · ${monthLabel(month)}`}>
            <div className="space-y-3 px-5 pb-5">
              {channels.map((channel) => (
                <div key={channel.method}>
                  <div className="mb-1 flex items-center justify-between text-[10.5px]">
                    <span className="flex items-center gap-1.5">
                      {channel.method === "bank_transfer" ? (
                        <Landmark className="size-3.5 text-muted-foreground" />
                      ) : (
                        <ShieldCheck className="size-3.5 text-muted-foreground" />
                      )}
                      {PAYMENT_METHOD_SHORT[channel.method]}
                    </span>
                    <span className="font-medium">{formatCurrency(channel.total, true)}</span>
                  </div>
                  <Progress value={(channel.total / maxChannel) * 100} className="h-1.5" />
                </div>
              ))}
              <p className="border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
                Pending bank transfers are excluded until verified. Only completed payments appear in
                this breakdown.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Occupancy by category" description="Rented versus available spaces">
            <div className="space-y-2.5 px-5 pb-5">
              {occupancy.map((item) => (
                <div key={item.category} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[10.5px]">
                    {SPACE_CATEGORY_LABELS[item.category]}
                  </span>
                  <Progress value={item.rate} className="h-1.5 flex-1" />
                  <span className="w-14 text-right text-[10px] text-muted-foreground">
                    {item.occupied}/{item.total}
                  </span>
                  <span className="w-10 text-right text-[10px] font-medium">
                    {formatPercent(item.rate)}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="mt-4">
        <SectionCard
          title="Generated reports"
          description="Client-side CSV exports from the live demo data — no email is sent"
          action={
            <Button variant="outline" size="sm" className="h-8 text-[10.5px]" onClick={exportOutstanding}>
              <ArrowDownToLine className="size-3.5" /> Export arrears
            </Button>
          }
        >
          <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
            {reportCards.map((report) => (
              <div key={report.title} className="bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
                    <report.icon className="size-3.5" />
                  </span>
                  <Badge variant="neutral">{report.meta}</Badge>
                </div>
                <p className="mt-2.5 text-[12px] font-semibold">{report.title}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                  {report.description}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 px-0 text-[10.5px]"
                  onClick={report.onExport}
                >
                  <Download className="size-3" /> Download CSV
                </Button>
              </div>
            ))}
            <div className="bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
                  <TrendingUp className="size-3.5" />
                </span>
                <Badge variant="success">{formatPercent(collectionRate)}</Badge>
              </div>
              <p className="mt-2.5 text-[12px] font-semibold">Collection health</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                {formatCurrency(metrics.outstanding, true)} outstanding across{" "}
                {outstanding.length} invoices, {metrics.overdueInvoices} past due.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 px-0 text-[10.5px]"
                onClick={exportOutstanding}
              >
                <Download className="size-3" /> Download arrears
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
        <span>
          {formatNumber(outstanding.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0))} RWF
          outstanding · {INVOICE_STATUS_LABELS.overdue} invoices are excluded from collected rent.
        </span>
        <span>Reports generated {formatDate(new Date())}</span>
      </div>
    </div>
  );
}
