"use client";

import * as React from "react";
import {
  Banknote,
  Building2,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import type { Expense } from "@/types";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getExpenseBreakdown, currentMonthKey } from "@/lib/mock-data/analytics";
import { deleteExpense } from "@/lib/services";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LoadingPanel } from "@/components/shared/states";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { ExpenseDonut } from "@/components/charts/expense-donut";
import { ExpenseFormDialog } from "./expense-form-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ExpensesWorkspace({ mode = "admin" }: { mode?: "admin" | "accountant" }) {
  const db = useDatabase();
  const ready = usePageReady();
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [buildingFilter, setBuildingFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [dialog, setDialog] = React.useState<{ expense?: Expense } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Expense | null>(null);

  const rows = [...db.expenses].sort((a, b) => b.date.localeCompare(a.date));
  const filtered = rows.filter(
    (expense) =>
      (categoryFilter === "all" || expense.category === categoryFilter) &&
      (buildingFilter === "all" || expense.buildingId === buildingFilter) &&
      (statusFilter === "all" || expense.status === statusFilter),
  );
  const month = currentMonthKey();
  const monthExpenses = rows.filter((expense) => expense.date.startsWith(month));
  const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const paid = monthExpenses
    .filter((expense) => expense.status === "paid")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const pending = monthExpenses
    .filter((expense) => expense.status === "pending")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const breakdown = getExpenseBreakdown(db);
  const buildings = db.buildings
    .map((building) => ({
      building,
      total: rows
        .filter((expense) => expense.buildingId === building.id)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .sort((a, b) => b.total - a.total);
  const maxBuilding = Math.max(...buildings.map((item) => item.total), 1);

  const columns: DataTableColumn<Expense>[] = [
    {
      id: "expense",
      header: "Expense",
      sortValue: (expense) => expense.title,
      cell: (expense) => (
        <div>
          <p className="text-[12px] font-medium">{expense.title}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{expense.reference}</p>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      sortValue: (expense) => expense.category,
      cell: (expense) => (
        <Badge variant="neutral">{EXPENSE_CATEGORY_LABELS[expense.category]}</Badge>
      ),
    },
    {
      id: "building",
      header: "Building",
      sortValue: (expense) =>
        db.buildings.find((building) => building.id === expense.buildingId)?.name ?? "",
      cell: (expense) => (
        <span className="text-[11px]">
          {db.buildings.find((building) => building.id === expense.buildingId)?.name}
        </span>
      ),
    },
    {
      id: "vendor",
      header: "Vendor",
      cell: (expense) => (
        <div>
          <p className="text-[11px]">{expense.vendor}</p>
          <p className="text-[10px] text-muted-foreground">{formatDate(expense.date)}</p>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      sortValue: (expense) => expense.amount,
      cell: (expense) => (
        <span className="text-[12px] font-semibold">{formatCurrency(expense.amount)}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (expense) => expense.status,
      cell: (expense) => <StatusBadge status={expense.status} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (expense) => (
        <div onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Expense actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDialog({ expense })}>
                <Pencil /> Edit expense
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast.message("Receipt preview", {
                    description: expense.receiptName
                      ? `${expense.receiptName} would open in a document viewer. File preview is simulated.`
                      : "No receipt was attached to this expense.",
                  })
                }
              >
                <Download /> View receipt
              </DropdownMenuItem>
              {mode === "admin" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(expense)}>
                    <Trash2 /> Delete expense
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
        <PageHeader title="Expenses" description="Loading operating expenses…" />
        <LoadingPanel />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Expenses"
        description="Operating costs, repairs and utilities — tracked separately from rental income."
        badge={mode === "accountant" ? <Badge variant="navy">Finance</Badge> : undefined}
        actions={
          <Button size="sm" onClick={() => setDialog({})}>
            <Plus className="size-3.5" /> Record expense
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Expenses this month"
          value={formatCurrency(monthTotal, true)}
          hint={`${monthExpenses.length} records`}
          icon={TrendingDown}
          tone="navy"
        />
        <StatCard
          label="Paid"
          value={formatCurrency(paid, true)}
          hint="Settled this month"
          icon={Banknote}
          tone="success"
        />
        <StatCard
          label="Pending payment"
          value={formatCurrency(pending, true)}
          hint="Recorded but not yet paid"
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label="All recorded expenses"
          value={formatCurrency(rows.reduce((sum, expense) => sum + expense.amount, 0), true)}
          hint={`${rows.length} records across ${db.buildings.length} buildings`}
          icon={ReceiptText}
          tone="default"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <SectionCard
          className="xl:col-span-5"
          title="Expense mix"
          description="Share of recorded operating costs"
        >
          <div className="px-5 pb-5">
            <ExpenseDonut data={breakdown} />
            <div className="mt-3 rounded-lg bg-accent/60 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground dark:bg-white/[0.04]">
              Expenses never reduce the rent collected figure. Reports present income and costs side by
              side.
            </div>
          </div>
        </SectionCard>

        <SectionCard
          className="xl:col-span-7"
          title="Spend by building"
          description="All recorded expenses, grouped by property"
        >
          <div className="space-y-3.5 px-5 pb-5">
            {buildings.map((item) => (
              <div key={item.building.id}>
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-muted-foreground" />
                    {item.building.name}
                  </span>
                  <span className="font-medium">{formatCurrency(item.total, true)}</span>
                </div>
                <Progress value={(item.total / maxBuilding) * 100} className="h-1.5" />
              </div>
            ))}
            <p className="border-t border-border pt-3 text-[10px] text-muted-foreground">
              Total operating spend:{" "}
              {formatCurrency(rows.reduce((sum, expense) => sum + expense.amount, 0))}
            </p>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4">
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(expense) => expense.id}
          getSearchText={(expense) =>
            `${expense.title} ${expense.vendor} ${expense.reference} ${expense.notes ?? ""}`
          }
          searchPlaceholder="Search expenses by title, vendor or reference…"
          emptyTitle="No expenses match"
          emptyDescription="Adjust your filters or record a new operating cost."
          emptyAction={
            <Button variant="outline" size="sm" onClick={() => setDialog({})}>
              <Plus className="size-3.5" /> Record expense
            </Button>
          }
          toolbar={
            <>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger size="sm" className="h-8.5 w-[140px] bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger size="sm" className="h-8.5 w-[140px] bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All buildings</SelectItem>
                  {db.buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger size="sm" className="h-8.5 w-[120px] bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              {(categoryFilter !== "all" || buildingFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8.5 text-[11px]"
                  onClick={() => {
                    setCategoryFilter("all");
                    setBuildingFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Clear
                </Button>
              )}
            </>
          }
        />
      </div>

      {dialog && <ExpenseFormDialog expense={dialog.expense} onClose={() => setDialog(null)} />}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this expense?"
        description={
          deleteTarget
            ? `${deleteTarget.title} (${formatCurrency(deleteTarget.amount)}) will be removed from the expense ledger. This does not affect rent invoices or payments.`
            : ""
        }
        confirmLabel="Delete expense"
        variant="destructive"
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteExpense(deleteTarget.id);
          toast.success("Expense deleted", { description: `${deleteTarget.title} was removed.` });
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
