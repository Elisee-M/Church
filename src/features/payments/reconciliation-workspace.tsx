"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Check,
  Download,
  GitCompareArrows,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { PAYMENT_METHOD_SHORT } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { currentMonthKey } from "@/lib/mock-data/analytics";
import { verifyPayment } from "@/lib/services";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LoadingPanel } from "@/components/shared/states";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
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

type MatchState = "matched" | "awaiting" | "missing" | "adjustment";

type ReconciliationRow = {
  id: string;
  paymentId: string;
  invoiceId: string;
  date: string;
  reference: string;
  tenantName: string;
  method: string;
  amount: number;
  state: MatchState;
  proofName?: string;
  channel: "bank" | "mtn" | "airtel";
};

const STATE_LABEL: Record<MatchState, string> = {
  matched: "Matched",
  awaiting: "Awaiting match",
  missing: "No statement credit",
  adjustment: "Adjustment",
};

const STATE_BADGE: Record<MatchState, string> = {
  matched: "verified",
  awaiting: "pending",
  missing: "rejected",
  adjustment: "reserved",
};

export function ReconciliationWorkspace() {
  const db = useDatabase();
  const ready = usePageReady();
  const [channel, setChannel] = React.useState("all");
  const [stateFilter, setStateFilter] = React.useState("all");
  const [lastSync, setLastSync] = React.useState<Date | null>(null);
  const [matchTarget, setMatchTarget] = React.useState<ReconciliationRow | null>(null);

  const month = currentMonthKey();
  const settings = db.settings.payments;

  const rows: ReconciliationRow[] = db.payments
    .filter((payment) =>
      ["bank_transfer", "mtn_momo", "airtel_money"].includes(payment.method),
    )
    .map((payment) => {
      const state: MatchState =
        payment.verification === "pending"
          ? "awaiting"
          : payment.status === "failed" || payment.verification === "rejected"
            ? "missing"
            : payment.amount < 0
              ? "adjustment"
              : "matched";
      return {
        id: payment.id,
        paymentId: payment.id,
        invoiceId: payment.invoiceId,
        date: payment.date,
        reference: payment.reference,
        tenantName:
          db.tenants.find((tenant) => tenant.id === payment.tenantId)?.name ?? "Tenant",
        method: PAYMENT_METHOD_SHORT[payment.method],
        amount: payment.amount,
        state,
        proofName: payment.proofName,
        channel: (
          payment.method === "bank_transfer"
            ? "bank"
            : payment.method === "mtn_momo"
              ? "mtn"
              : "airtel"
        ) as ReconciliationRow["channel"],
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const filtered = rows.filter(
    (row) =>
      (channel === "all" || row.channel === channel) &&
      (stateFilter === "all" || row.state === stateFilter),
  );

  const awaiting = rows.filter((row) => row.state === "awaiting");
  const matched = rows.filter((row) => row.state === "matched");
  const missing = rows.filter((row) => row.state === "missing");
  const awaitingAmount = awaiting.reduce((sum, row) => sum + row.amount, 0);
  const matchedAmount = matched.reduce((sum, row) => sum + row.amount, 0);
  const missingAmount = missing.reduce((sum, row) => sum + row.amount, 0);

  const channels = [
    {
      id: "mtn",
      name: "MTN Mobile Money",
      detail: settings.momoMerchantCode,
      icon: Smartphone,
      method: "mtn_momo" as const,
    },
    {
      id: "airtel",
      name: "Airtel Money",
      detail: "Merchant collections",
      icon: Smartphone,
      method: "airtel_money" as const,
    },
    {
      id: "bank",
      name: settings.bankName,
      detail: `${settings.bankAccountName} · ${settings.bankAccount}`,
      icon: Landmark,
      method: "bank_transfer" as const,
    },
  ].map((item) => {
    const channelPayments = db.payments.filter(
      (payment) => payment.method === item.method && payment.date.startsWith(month),
    );
    const confirmed = channelPayments
      .filter((payment) => payment.status === "completed")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const pending = channelPayments
      .filter((payment) => payment.verification === "pending")
      .reduce((sum, payment) => sum + payment.amount, 0);
    return { ...item, confirmed, pending, count: channelPayments.length };
  });
  const maxChannel = Math.max(...channels.map((item) => item.confirmed), 1);

  const columns: DataTableColumn<ReconciliationRow>[] = [
    {
      id: "date",
      header: "Date",
      sortValue: (row) => row.date,
      cell: (row) => (
        <div>
          <p className="text-[11px]">{formatDate(row.date)}</p>
          <p className="text-[9.5px] text-muted-foreground">{row.method}</p>
        </div>
      ),
    },
    {
      id: "reference",
      header: "Reference",
      sortValue: (row) => row.reference,
      cell: (row) => (
        <div>
          <p className="font-mono text-[10.5px] font-medium">{row.reference}</p>
          <p className="truncate text-[10px] text-muted-foreground">{row.tenantName}</p>
        </div>
      ),
    },
    {
      id: "statement",
      header: "Statement line",
      cell: (row) => (
        <span className="font-mono text-[10px] text-muted-foreground">
          {row.state === "missing" ? "—" : row.reference.slice(-12)}
        </span>
      ),
    },
    {
      id: "amount",
      header: "System amount",
      align: "right",
      sortValue: (row) => row.amount,
      cell: (row) => (
        <span
          className={`text-[11.5px] font-semibold ${row.amount < 0 ? "text-destructive" : ""}`}
        >
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      id: "state",
      header: "Match",
      sortValue: (row) => row.state,
      cell: (row) => (
        <StatusBadge
          status={STATE_BADGE[row.state]}
          label={STATE_LABEL[row.state]}
          className="h-5 px-1.5 text-[9.5px]"
        />
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          {row.state === "awaiting" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px]"
              onClick={() => setMatchTarget(row)}
            >
              <Check className="size-3" /> Match
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-[10px]" asChild>
            <Link href={`/accountant/invoices/${row.invoiceId}`}>
              Invoice <ArrowUpRight className="size-3" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  const exportReconciliation = () => {
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      ["Date", "Reference", "Tenant", "Channel", "System amount", "Match state"],
      ...filtered.map((row) => [
        row.date,
        row.reference,
        row.tenantName,
        row.method,
        row.amount,
        STATE_LABEL[row.state],
      ]),
    ]
      .map((line) => line.map(escape).join(","))
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "genzura-reconciliation.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Reconciliation exported", {
      description: `${filtered.length} statement lines written to CSV.`,
    });
  };

  if (!ready) {
    return (
      <>
        <PageHeader title="Reconciliation" description="Loading statement matching…" />
        <LoadingPanel />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reconciliation"
        description="Match bank and mobile money statement lines against the rent ledger before confirming collections."
        badge={<Badge variant="navy">Accountant</Badge>}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLastSync(new Date());
                toast.success("Statements refreshed", {
                  description:
                    "Simulated bank and mobile money feeds were refreshed. No live connection is used in this prototype.",
                });
              }}
            >
              <RefreshCw className="size-3.5" /> Refresh statements
            </Button>
            <Button size="sm" onClick={exportReconciliation}>
              <Download className="size-3.5" /> Export
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Matched statement lines"
          value={formatCurrency(matchedAmount, true)}
          hint={`${matched.length} confirmed transactions`}
          icon={BadgeCheck}
          tone="success"
        />
        <StatCard
          label="Awaiting match"
          value={formatCurrency(awaitingAmount, true)}
          hint={`${awaiting.length} proofs to reconcile`}
          icon={GitCompareArrows}
          tone="warning"
        />
        <StatCard
          label="Unmatched credits"
          value={formatCurrency(missingAmount, true)}
          hint={`${missing.length} failed or rejected`}
          icon={TriangleAlert}
          tone="danger"
        />
        <StatCard
          label="Last statement sync"
          value={lastSync ? formatDateTime(lastSync.toISOString()) : "Earlier today"}
          hint={lastSync ? "Simulated refresh just now" : "Demo feed · no live bank connection"}
          icon={RefreshCw}
          tone="info"
        />
      </div>

      <div className="mt-5">
        <h2 className="text-[13px] font-semibold">Channel overview</h2>
        <p className="text-[10.5px] text-muted-foreground">
          Compare confirmed collections and pending amounts for each payment channel.
        </p>
      </div>

      <div className="mt-2.5 grid gap-4 md:grid-cols-3">
        {channels.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
                <item.icon className="size-4" />
              </span>
              {item.pending > 0 ? (
                <Badge variant="warning">{formatCurrency(item.pending, true)} pending</Badge>
              ) : (
                <Badge variant="success">Balanced</Badge>
              )}
            </div>
            <p className="mt-3 text-[12px] font-semibold">{item.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{item.detail}</p>
            <p className="mt-2.5 font-display text-[22px] font-semibold">
              {formatCurrency(item.confirmed, true)}
            </p>
            <p className="text-[9.5px] text-muted-foreground">
              Confirmed this month · {item.count} statement lines
            </p>
            <Progress
              value={(item.confirmed / maxChannel) * 100}
              className="mt-2.5 h-1.5"
            />
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-2.5">
          <h2 className="text-[13px] font-semibold">Statement lines</h2>
          <p className="text-[10.5px] text-muted-foreground">
            Match pending proofs to statement references and review unmatched or adjusted items.
          </p>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(row) => row.id}
          getSearchText={(row) => `${row.reference} ${row.tenantName} ${row.method}`}
          searchPlaceholder="Search statement reference or tenant…"
          emptyTitle="No statement lines match"
          emptyDescription="Adjust the channel or match filter, or refresh the statement feed."
          toolbar={
            <>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger size="sm" className="h-8.5 w-[140px] bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All channels</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                  <SelectItem value="mtn">MTN MoMo</SelectItem>
                  <SelectItem value="airtel">Airtel Money</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger size="sm" className="h-8.5 w-[150px] bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All match states</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="awaiting">Awaiting match</SelectItem>
                  <SelectItem value="missing">Missing credit</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
              {(channel !== "all" || stateFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8.5 text-[11px]"
                  onClick={() => {
                    setChannel("all");
                    setStateFilter("all");
                  }}
                >
                  Clear
                </Button>
              )}
            </>
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Channel configuration"
          description="Used by tenants on the payment screen"
        >
          <div className="divide-y divide-border/70">
            {[
              {
                label: "MTN Mobile Money",
                value: settings.momoEnabled ? settings.momoMerchantCode : "Disabled",
                enabled: settings.momoEnabled,
              },
              {
                label: "Airtel Money",
                value: settings.airtelEnabled ? "Enabled" : "Disabled",
                enabled: settings.airtelEnabled,
              },
              {
                label: "Bank transfer",
                value: `${settings.bankName} · ${settings.bankAccount}`,
                enabled: settings.bankTransferEnabled,
              },
              {
                label: "Bank verification",
                value: settings.requireVerificationForBank
                  ? "Required before collection"
                  : "Not required",
                enabled: settings.requireVerificationForBank,
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 px-5 py-3">
                <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {item.enabled ? <ShieldCheck className="size-3.5" /> : <Banknote className="size-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium">{item.label}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{item.value}</p>
                </div>
                <Badge variant={item.enabled ? "success" : "neutral"}>
                  {item.enabled ? "On" : "Off"}
                </Badge>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Recently verified"
          description="Approved statement matches, newest first"
        >
          <div className="divide-y divide-border/70">
            {db.payments
              .filter((payment) => payment.verifiedAt)
              .sort((a, b) => (b.verifiedAt ?? "").localeCompare(a.verifiedAt ?? ""))
              .slice(0, 5)
              .map((payment) => (
                <div key={payment.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-success/10 text-success">
                    <Check className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[10.5px] font-medium">
                      {payment.reference}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {payment.verifiedBy ?? "Accountant"} ·{" "}
                      {payment.verifiedAt ? formatDateTime(payment.verifiedAt) : "—"}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold">{formatCurrency(payment.amount, true)}</span>
                </div>
              ))}
            {db.payments.filter((payment) => payment.verifiedAt).length === 0 && (
              <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">
                No verified payments yet.
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <TriangleAlert className="size-3.5" />
          Approving a match applies the payment to the invoice and adds it to collected rent.
        </span>
        <span>
          {formatCurrency(matchedAmount + awaitingAmount)} across {rows.length} digital statement
          lines
        </span>
      </div>

      <ConfirmDialog
        open={Boolean(matchTarget)}
        onOpenChange={(open) => !open && setMatchTarget(null)}
        title="Match and approve this statement line?"
        description={
          matchTarget
            ? `${formatCurrency(matchTarget.amount)} from ${matchTarget.tenantName} will be matched to the statement reference and counted as collected.`
            : ""
        }
        confirmLabel="Match payment"
        onConfirm={async () => {
          if (!matchTarget) return;
          try {
            await verifyPayment(matchTarget.paymentId, "approve");
            toast.success("Statement line matched", {
              description: `${formatCurrency(matchTarget.amount)} is now confirmed for ${matchTarget.tenantName}.`,
            });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not match the payment.");
          }
          setMatchTarget(null);
        }}
      />
    </div>
  );
}
