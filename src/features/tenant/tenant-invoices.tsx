"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  FileText,
  MoreHorizontal,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { Invoice } from "@/types";
import { DEMO_TENANT_ID, INVOICE_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, formatPercent, monthLabel } from "@/lib/utils";
import {
  getTenantSummary,
  invoiceBalance,
  invoiceIsPastDue,
} from "@/lib/mock-data/analytics";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, LoadingPanel } from "@/components/shared/states";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TenantInvoices() {
  const db = useDatabase();
  const ready = usePageReady();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [periodFilter, setPeriodFilter] = React.useState("all");
  const summary = getTenantSummary(db, DEMO_TENANT_ID);
  const tenant = summary.tenant;

  const periods = Array.from(new Set(summary.invoices.map((invoice) => invoice.period))).sort((a, b) =>
    b.localeCompare(a),
  );
  const filtered = summary.invoices.filter(
    (invoice) =>
      (statusFilter === "all" || invoice.status === statusFilter) &&
      (periodFilter === "all" || invoice.period === periodFilter),
  );
  const totalBilled = summary.invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const totalPaid = summary.invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
  const overdue = summary.invoices.filter((invoice) => invoiceIsPastDue(invoice));
  const paidInFull = summary.invoices.filter((invoice) => invoice.status === "paid");

  const columns: DataTableColumn<Invoice>[] = [
    {
      id: "invoice",
      header: "Invoice",
      sortValue: (invoice) => invoice.number,
      cell: (invoice) => (
        <div>
          <p className="font-mono text-[11.5px] font-medium">{invoice.number}</p>
          <p className="text-[10px] text-muted-foreground">{monthLabel(invoice.period)} rent</p>
        </div>
      ),
    },
    {
      id: "period",
      header: "Due date",
      sortValue: (invoice) => invoice.dueDate,
      cell: (invoice) => (
        <div>
          <p className={`text-[11px] ${invoiceIsPastDue(invoice) ? "text-destructive" : ""}`}>
            {formatDate(invoice.dueDate)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {invoice.lineItems.length} line item{invoice.lineItems.length === 1 ? "" : "s"}
          </p>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      sortValue: (invoice) => invoice.amount,
      cell: (invoice) => (
        <span className="text-[11.5px] font-medium">{formatCurrency(invoice.amount)}</span>
      ),
    },
    {
      id: "balance",
      header: "Balance",
      align: "right",
      sortValue: (invoice) => invoiceBalance(invoice),
      cell: (invoice) => (
        <div>
          <p
            className={`text-[11.5px] font-semibold ${
              invoiceBalance(invoice) > 0 ? "text-warning" : "text-success"
            }`}
          >
            {formatCurrency(invoiceBalance(invoice))}
          </p>
          <p className="text-[9.5px] text-muted-foreground">
            {formatPercent(invoice.amount ? (invoice.amountPaid / invoice.amount) * 100 : 0)} paid
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (invoice) => invoice.status,
      cell: (invoice) => (
        <StatusBadge status={invoice.status} label={INVOICE_STATUS_LABELS[invoice.status]} />
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (invoice) => (
        <div onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Invoice actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/tenant/invoices/${invoice.id}`)}>
                <ArrowRight /> View invoice
              </DropdownMenuItem>
              {invoiceBalance(invoice) > 0 && (
                <DropdownMenuItem onClick={() => router.push(`/tenant/pay?invoice=${invoice.id}`)}>
                  <CreditCard /> Pay this invoice
                </DropdownMenuItem>
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
        <PageHeader title="My invoices" description="Loading your rent invoices…" />
        <LoadingPanel />
      </>
    );
  }

  if (!tenant) {
    return (
      <PageHeader
        title="Tenant profile not found"
        description="The demo tenant record is missing. Reset the demo data from the profile menu."
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My invoices"
        description="Every rent invoice issued to you, including partial payments and balances."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/tenant/payments">
                <Wallet className="size-3.5" /> My payments
              </Link>
            </Button>
            {summary.balance > 0 && (
              <Button size="sm" asChild>
                <Link href="/tenant/pay">
                  <CreditCard className="size-3.5" /> Pay rent
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Outstanding balance"
          value={formatCurrency(summary.balance, true)}
          hint={`${summary.pendingInvoices.length} invoice${summary.pendingInvoices.length === 1 ? "" : "s"} with a balance`}
          icon={Wallet}
          tone={summary.balance > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Paid to date"
          value={formatCurrency(totalPaid, true)}
          hint={`of ${formatCurrency(totalBilled, true)} billed`}
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          hint={
            overdue[0]
              ? `${overdue[0].number} · ${formatCurrency(invoiceBalance(overdue[0]))}`
              : "Nothing past due"
          }
          icon={CalendarClock}
          tone={overdue.length > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Paid in full"
          value={paidInFull.length}
          hint={`${summary.invoices.length} invoices issued to you`}
          icon={ReceiptText}
          tone="info"
        />
      </div>

      <div className="mt-4">
        {summary.invoices.length === 0 ? (
          <div className="rounded-xl border border-border bg-card shadow-soft">
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Your rent invoices will appear here once the property team generates them."
            />
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(invoice) => invoice.id}
            getSearchText={(invoice) => `${invoice.number} ${invoice.period}`}
            searchPlaceholder="Search your invoices by number or month…"
            onRowClick={(invoice) => router.push(`/tenant/invoices/${invoice.id}`)}
            emptyTitle="No invoices match"
            emptyDescription="Adjust the status or month filter to see other invoices."
            toolbar={
              <>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger size="sm" className="h-8.5 w-[140px] bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger size="sm" className="h-8.5 w-[140px] bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All months</SelectItem>
                    {periods.map((period) => (
                      <SelectItem key={period} value={period}>
                        {monthLabel(period)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(statusFilter !== "all" || periodFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8.5 text-[11px]"
                    onClick={() => {
                      setStatusFilter("all");
                      setPeriodFilter("all");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </>
            }
          />
        )}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
            <ReceiptText className="size-4" />
          </span>
          <div className="flex-1">
            <p className="text-[11.5px] font-semibold">Need a receipt?</p>
            <p className="text-[10.5px] leading-relaxed text-muted-foreground">
              Receipts are available for every confirmed payment under My payments. Rental invoices
              and EBM fiscal invoices are separate documents.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/tenant/payments">
              View receipts <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Badge variant="neutral">{summary.invoices.length} invoices</Badge>
          Showing only your own rental records.
        </span>
        <span>
          {formatCurrency(totalPaid)} paid · {formatCurrency(totalBilled - totalPaid)} balance
        </span>
      </div>
    </div>
  );
}
