"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { Agreement } from "@/types";
import { AGREEMENT_STATUS_LABELS, SPACE_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { renewAgreement, terminateAgreement } from "@/lib/services";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ReasonDialog } from "@/components/shared/confirm-dialog";
import { LoadingPanel } from "@/components/shared/states";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { AgreementFormDialog } from "./agreement-form-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Separator } from "@/components/ui/separator";

export function AgreementsWorkspace() {
  const db = useDatabase();
  const ready = usePageReady();
  const searchParams = useSearchParams();
  const initialTenant = searchParams.get("tenant") ?? undefined;
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [dialog, setDialog] = React.useState<{ agreement?: Agreement; tenantId?: string } | null>(
    initialTenant ? { tenantId: initialTenant } : null,
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [renewTarget, setRenewTarget] = React.useState<Agreement | null>(null);
  const [renewDate, setRenewDate] = React.useState("");
  const [terminateTarget, setTerminateTarget] = React.useState<Agreement | null>(null);

  const selected = db.agreements.find((agreement) => agreement.id === selectedId);

  const rows = React.useMemo(
    () =>
      [...db.agreements].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [db.agreements],
  );

  const filtered = rows.filter((agreement) => statusFilter === "all" || agreement.status === statusFilter);
  const active = rows.filter((agreement) => agreement.status === "active" || agreement.status === "expiring");
  const expiring = rows.filter((agreement) => agreement.status === "expiring");
  const monthly = active.reduce(
    (sum, agreement) => sum + agreement.lineItems.reduce((lineSum, line) => lineSum + line.monthlyRent, 0),
    0,
  );

  const columns: DataTableColumn<Agreement>[] = [
    {
      id: "reference",
      header: "Agreement",
      sortValue: (agreement) => agreement.reference,
      cell: (agreement) => {
        const tenant = db.tenants.find((item) => item.id === agreement.tenantId);
        return (
          <div className="flex items-center gap-2.5">
            <Avatar className="size-7">
              <AvatarFallback className="text-[9px]">{initials(tenant?.name ?? "??")}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium">{agreement.reference}</p>
              <p className="truncate text-[10px] text-muted-foreground">{tenant?.name}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "spaces",
      header: "Spaces",
      sortValue: (agreement) => agreement.lineItems.length,
      cell: (agreement) => (
        <div>
          <p className="text-[11.5px] font-medium">
            {agreement.lineItems.length} space{agreement.lineItems.length === 1 ? "" : "s"}
          </p>
          <p className="max-w-[130px] truncate text-[10px] text-muted-foreground">
            {agreement.lineItems
              .map((line) => db.spaces.find((space) => space.id === line.spaceId)?.code)
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      ),
    },
    {
      id: "period",
      header: "Term",
      sortValue: (agreement) => agreement.endDate,
      cell: (agreement) => (
        <div>
          <p className="text-[11px]">{formatDate(agreement.startDate)} → {formatDate(agreement.endDate)}</p>
          <p className="text-[10px] text-muted-foreground">Due day {agreement.dueDay}</p>
        </div>
      ),
    },
    {
      id: "rent",
      header: "Monthly rent",
      align: "right",
      sortValue: (agreement) =>
        agreement.lineItems.reduce((sum, line) => sum + line.monthlyRent, 0),
      cell: (agreement) => (
        <span className="text-[12px] font-semibold">
          {formatCurrency(
            agreement.lineItems.reduce((sum, line) => sum + line.monthlyRent, 0),
          )}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (agreement) => agreement.status,
      cell: (agreement) => (
        <StatusBadge status={agreement.status} label={AGREEMENT_STATUS_LABELS[agreement.status]} />
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (agreement) => (
        <div onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Agreement actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedId(agreement.id)}>
                <ArrowRight /> View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialog({ agreement })}>
                <Pencil /> Edit agreement
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setRenewTarget(agreement);
                  setRenewDate(agreement.endDate);
                }}
              >
                <RefreshCw /> Renew
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={agreement.status === "terminated"}
                onClick={() => setTerminateTarget(agreement)}
              >
                <ShieldAlert /> Terminate
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
        <PageHeader title="Agreements" description="Loading rental agreements…" />
        <LoadingPanel />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Agreements"
        description="Multi-space rental terms, rent due dates and agreement lifecycle."
        actions={
          <Button size="sm" onClick={() => setDialog({})}>
            <Plus className="size-3.5" /> New agreement
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active agreements" value={active.length} hint={`${rows.length} total on record`} icon={ScrollText} tone="navy" />
        <StatCard label="Expiring soon" value={expiring.length} hint="Within 90 days" icon={CalendarClock} tone="warning" />
        <StatCard label="Contracted rent" value={formatCurrency(monthly, true)} hint="Monthly, active agreements" icon={ScrollText} tone="success" />
        <StatCard label="Tenants under agreement" value={new Set(active.map((agreement) => agreement.tenantId)).size} hint="Excludes terminated and draft" icon={Users} tone="default" />
      </div>

      <div className="mt-4">
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(agreement) => agreement.id}
          getSearchText={(agreement) => {
            const tenant = db.tenants.find((item) => item.id === agreement.tenantId);
            const spaces = agreement.lineItems
              .map((line) => db.spaces.find((space) => space.id === line.spaceId)?.code ?? "")
              .join(" ");
            return `${agreement.reference} ${tenant?.name ?? ""} ${spaces}`;
          }}
          searchPlaceholder="Search by reference, tenant or space code…"
          onRowClick={(agreement) => setSelectedId(agreement.id)}
          emptyTitle="No agreements match"
          emptyDescription="Create an agreement to assign vacant spaces to a tenant."
          emptyAction={
            <Button variant="outline" size="sm" onClick={() => setDialog({})}>
              <Plus className="size-3.5" /> New agreement
            </Button>
          }
          toolbar={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger size="sm" className="h-8.5 w-[150px] bg-background text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(AGREEMENT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </div>

      {dialog && (
        <AgreementFormDialog
          agreement={dialog.agreement}
          defaultTenantId={dialog.tenantId}
          onClose={() => setDialog(null)}
        />
      )}

      {selected && (
        <Sheet open onOpenChange={(open) => !open && setSelectedId(null)}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Rental agreement
                  </p>
                  <SheetTitle className="mt-1">{selected.reference}</SheetTitle>
                  <SheetDescription>
                    {db.tenants.find((item) => item.id === selected.tenantId)?.name}
                  </SheetDescription>
                </div>
                <StatusBadge status={selected.status} label={AGREEMENT_STATUS_LABELS[selected.status]} />
              </div>
            </SheetHeader>

            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Monthly rent</p>
                  <p className="mt-0.5 text-[16px] font-semibold">
                    {formatCurrency(selected.lineItems.reduce((sum, line) => sum + line.monthlyRent, 0))}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Deposit</p>
                  <p className="mt-0.5 text-[16px] font-semibold">{formatCurrency(selected.deposit)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Start date</p>
                  <p className="mt-0.5 text-[12px] font-medium">{formatDate(selected.startDate, "long")}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">End date</p>
                  <p className="mt-0.5 text-[12px] font-medium">{formatDate(selected.endDate, "long")}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Covered spaces
                </p>
                <div className="space-y-1.5">
                  {selected.lineItems.map((line) => {
                    const space = db.spaces.find((item) => item.id === line.spaceId);
                    const building = db.buildings.find((item) => item.id === space?.buildingId);
                    return (
                      <div
                        key={line.spaceId}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[11.5px] font-medium">
                            {space?.code} · {space?.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {building?.name} · {space ? SPACE_CATEGORY_LABELS[space.category] : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11.5px] font-semibold">{formatCurrency(line.monthlyRent)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Rent due day</p>
                  <p className="mt-0.5 font-medium">Day {selected.dueDay} of each month</p>
                </div>
                <div className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Late penalty</p>
                  <p className="mt-0.5 font-medium">
                    {selected.penaltyEnabled ? `${selected.penaltyRate}% after grace period` : "Not enabled"}
                  </p>
                </div>
              </div>

              {selected.notes && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Notes
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{selected.notes}</p>
                </div>
              )}

              {selected.documentName && (
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileText className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium">{selected.documentName}</p>
                    <p className="text-[10px] text-muted-foreground">Signed agreement · PDF</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      toast.message("Document preview", {
                        description: "This frontend prototype does not include the real signed PDF.",
                      })
                    }
                  >
                    <Download className="size-3.5" />
                    <span className="sr-only">Download agreement</span>
                  </Button>
                </div>
              )}

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedId(null)}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setRenewTarget(selected);
                    setRenewDate(selected.endDate);
                  }}
                >
                  <RefreshCw className="size-3.5" /> Renew
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setDialog({ agreement: selected });
                    setSelectedId(null);
                  }}
                >
                  <Pencil className="size-3.5" /> Edit
                </Button>
              </div>

              <div className="rounded-lg bg-accent/70 px-3 py-2.5 text-[10.5px] leading-relaxed text-muted-foreground dark:bg-white/[0.04]">
                Confirmed invoices and payments remain in history even after an agreement is terminated or
                renewed.
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      <Dialog open={Boolean(renewTarget)} onOpenChange={(open) => !open && setRenewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renew agreement</DialogTitle>
            <DialogDescription>
              Extend {renewTarget?.reference} to a new end date. This keeps the same spaces and rent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="renew-date">New end date</Label>
            <Input
              id="renew-date"
              type="date"
              value={renewDate}
              onChange={(event) => setRenewDate(event.target.value)}
            />
            {renewTarget && (
              <p className="text-[10.5px] text-muted-foreground">
                Current end date: {formatDate(renewTarget.endDate, "long")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!renewTarget || !renewDate) return;
                if (renewDate <= renewTarget.startDate) {
                  toast.error("The new end date must be after the start date.");
                  return;
                }
                renewAgreement(renewTarget.id, renewDate);
                toast.success("Agreement renewed", {
                  description: `${renewTarget.reference} now ends on ${formatDate(renewDate, "long")}.`,
                });
                setRenewTarget(null);
              }}
            >
              Renew agreement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {terminateTarget && (
        <ReasonDialog
          open
          onOpenChange={(open) => !open && setTerminateTarget(null)}
          title="Terminate agreement"
          description={`${terminateTarget.reference} will end today and its spaces will be released. Existing invoices and payments remain in history.`}
          label="Termination reason"
          placeholder="e.g. Tenant relocated to a larger space…"
          confirmLabel="Terminate agreement"
          variant="destructive"
          onSubmit={(reason) => {
            terminateAgreement(terminateTarget.id, reason);
            toast.success("Agreement terminated", {
              description: `${terminateTarget.reference} was terminated and its spaces are now vacant.`,
            });
            setTerminateTarget(null);
          }}
        />
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ScrollText className="size-3.5" />
          One agreement may cover multiple spaces, each with an individual rent.
        </span>
        <Button variant="link" size="sm" asChild className="h-auto p-0 text-[11px]">
          <Link href="/admin/invoices">
            View invoices <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
