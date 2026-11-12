"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  CalendarPlus,
  FileBadge,
  MoreHorizontal,
  ReceiptText,
  Send,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { Invoice } from "@/types";
import { INVOICE_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatPercent, monthLabel } from "@/lib/utils";
import { getDashboardMetrics, invoiceBalance, invoiceIsPastDue, currentMonthKey } from "@/lib/mock-data/analytics";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingPanel } from "@/components/shared/states";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { GenerateInvoicesDialog } from "./generate-invoices-dialog";
import { EbmReferenceDialog } from "./ebm-reference-dialog";
import { RecordPaymentDialog } from "@/features/payments/record-payment-dialog";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function InvoicesWorkspace({
  basePath,
  mode = "admin",
}: {
  basePath: "/admin" | "/accountant";
  mode?: "admin" | "accountant";
}) {
  const db = useDatabase();
  const ready = usePageReady();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [periodFilter, setPeriodFilter] = React.useState("all");
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [paymentInvoice, setPaymentInvoice] = React.useState<string | null>(null);
  const [ebmInvoice, setEbmInvoice] = React.useState<Invoice | null>(null);

  const periods = Array.from(new Set(db.invoices.map((invoice) => invoice.period))).sort((a, b) =>
    b.localeCompare(a),
  );
  const rows = [...db.invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const filtered = rows.filter(
    (invoice) =>
      (statusFilter === "all" || invoice.status === statusFilter) &&
      (periodFilter === "all" || invoice.period === periodFilter) &&
      (tenantFilter === "all" || invoice.tenantId === tenantFilter),
  );
  const metrics = getDashboardMetrics(db);
  const month = currentMonthKey();
  const monthlyInvoices = db.invoices.filter((invoice) => invoice.period === month);
  const billedThisMonth = monthlyInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

  const columns: DataTableColumn<Invoice>[] = [
    {
      id: "invoice",
      header: "Invoice",
      sortValue: (invoice) => invoice.number,
      cell: (invoice) => {
        const tenant = db.tenants.find((item) => item.id === invoice.tenantId);
        return (
          <div>
            <p className="font-mono text-[11.5px] font-medium">{invoice.number}</p>
            <p className="truncate text-[10px] text-muted-foreground">{tenant?.name}</p>
          </div>
        );
      },
    },
    {
      id: "period",
      header: "Billing period",
      sortValue: (invoice) => invoice.period,
      cell: (invoice) => (
        <div>
          <p className="text-[11.5px]">{monthLabel(invoice.period)}</p>
          <p className={`text-[10px] ${invoiceIsPastDue(invoice) ? "text-destructive" : "text-muted-foreground"}`}>
            Due {invoice.dueDate}
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
          <p className={`text-[12px] font-semibold ${invoiceBalance(invoice) > 0 ? "text-warning" : "text-success"}`}>
            {formatCurrency(invoiceBalance(invoice))}
          </p>
          <p className="text-[9.5px] text-muted-foreground">
            {formatPercent(invoice.amount ? (invoice.amountPaid / invoice.amount) * 100 : 0)} paid
          </p>
        </div>
      ),
    },
    {
      id: "ebm",
      header: "EBM",
      cell: (invoice) => (
        <span
          className={
            invoice.ebmStatus === "not_issued"
              ? "flex items-center gap-1 text-[10px] text-muted-foreground"
              : "flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300"
          }
        >
          <FileBadge className="size-3" />
          {invoice.ebmStatus === "not_issued"
            ? "None"
            : invoice.ebmStatus === "document_attached"
              ? "PDF"
              : "Reference"}
        </span>
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
              <DropdownMenuItem onClick={() => router.push(`${basePath}/invoices/${invoice.id}`)}>
                <ArrowRight /> View invoice
              </DropdownMenuItem>
              {invoiceBalance(invoice) > 0 && (
                <DropdownMenuItem onClick={() => setPaymentInvoice(invoice.id)}>
                  <Wallet /> Record payment
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setEbmInvoice(invoice)}>
                <FileBadge /> EBM reference
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  toast.message("Reminder queued", {
                    description: `A rent reminder for ${invoice.number} was queued. Email delivery is simulated in this prototype.`,
                  })
                }
              >
                <BellRing /> Send reminder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (!ready) {
    return (
      <>
        <PageHeader title="Invoices" description="Loading the rent ledger…" />
        <LoadingPanel />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Invoices"
        description="Monthly rent invoices with multiple line items, partial payments and separate EBM references."
        badge={mode === "accountant" ? <Badge variant="navy">Finance</Badge> : undefined}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setGenerateOpen(true)}>
              <CalendarPlus className="size-3.5" /> Generate invoices
            </Button>
            <Button size="sm" onClick={() => setPaymentInvoice("")}>
              <Wallet className="size-3.5" /> Record payment
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Billed this month"
          value={formatCurrency(billedThisMonth, true)}
          hint={`${monthlyInvoices.length} invoices for ${monthLabel(month)}`}
          icon={ReceiptText}
          tone="navy"
        />
        <StatCard
          label="Collected this month"
          value={formatCurrency(metrics.collectedThisMonth, true)}
          hint={`${formatPercent(metrics.collectionRate)} of expected`}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Outstanding balances"
          value={formatCurrency(metrics.outstanding, true)}
          hint={`${db.invoices.filter((invoice) => invoiceBalance(invoice) > 0).length} invoices with a balance`}
          icon={ArrowRight}
          tone="warning"
        />
        <StatCard
          label="Overdue invoices"
          value={metrics.overdueInvoices}
          hint="Past the due date"
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <div className="mt-5">
        <div className="mb-2.5">
          <h2 className="text-[13px] font-semibold">Invoice register</h2>
          <p className="text-[10.5px] text-muted-foreground">
            Review each invoice, record payments, and keep EBM references separate from rental documents.
          </p>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(invoice) => invoice.id}
          getSearchText={(invoice) => {
            const tenant = db.tenants.find((item) => item.id === invoice.tenantId);
            return `${invoice.number} ${tenant?.name ?? ""} ${invoice.period}`;
          }}
          searchPlaceholder="Search by invoice number, tenant or period…"
          onRowClick={(invoice) => router.push(`${basePath}/invoices/${invoice.id}`)}
          emptyTitle="No invoices match"
          emptyDescription="Adjust the filters or generate a new month of rent invoices."
          emptyAction={
            <Button variant="outline" size="sm" onClick={() => setGenerateOpen(true)}>
              <CalendarPlus className="size-3.5" /> Generate invoices
            </Button>
          }
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
                <SelectTrigger size="sm" className="h-8.5 w-[130px] bg-background text-xs">
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
              <Select value={tenantFilter} onValueChange={setTenantFilter}>
                <SelectTrigger size="sm" className="h-8.5 w-[150px] bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tenants</SelectItem>
                  {db.tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(statusFilter !== "all" || periodFilter !== "all" || tenantFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8.5 text-[11px]"
                  onClick={() => {
                    setStatusFilter("all");
                    setPeriodFilter("all");
                    setTenantFilter("all");
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
          <Send className="size-3.5" />
          Rental invoices, payment receipts and EBM fiscal invoices are separate documents.
        </span>
        <span>{rows.length} invoices on record</span>
      </div>

      {generateOpen && <GenerateInvoicesDialog onClose={() => setGenerateOpen(false)} />}
      {paymentInvoice !== null && (
        <RecordPaymentDialog
          defaultInvoiceId={paymentInvoice || undefined}
          actor={mode === "accountant" ? "Accountant" : "Administrator"}
          onClose={() => setPaymentInvoice(null)}
        />
      )}
      {ebmInvoice && <EbmReferenceDialog invoice={ebmInvoice} onClose={() => setEbmInvoice(null)} />}
    </div>
  );
}
