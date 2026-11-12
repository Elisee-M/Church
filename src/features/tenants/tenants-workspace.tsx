"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  UserCheck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import type { Tenant } from "@/types";
import { TENANT_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency, initials } from "@/lib/utils";
import { getTenantSummary } from "@/lib/mock-data/analytics";
import { setTenantStatus } from "@/lib/services";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LoadingPanel } from "@/components/shared/states";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { TenantFormDialog } from "./tenant-form-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TenantRow = {
  tenant: Tenant;
  spacesCount: number;
  monthlyRent: number;
  balance: number;
  agreementCount: number;
};

export function TenantsWorkspace() {
  const db = useDatabase();
  const ready = usePageReady();
  const router = useRouter();
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [dialog, setDialog] = React.useState<{ tenant?: Tenant } | null>(null);
  const [statusTarget, setStatusTarget] = React.useState<Tenant | null>(null);

  const rows: TenantRow[] = React.useMemo(
    () =>
      db.tenants.map((tenant) => {
        const summary = getTenantSummary(db, tenant.id);
        return {
          tenant,
          spacesCount: summary.spaces.length,
          monthlyRent: summary.monthlyRent,
          balance: summary.balance,
          agreementCount: db.agreements.filter((agreement) => agreement.tenantId === tenant.id).length,
        };
      }),
    [db],
  );

  const filtered = rows.filter(
    (row) =>
      (typeFilter === "all" || row.tenant.type === typeFilter) &&
      (statusFilter === "all" || row.tenant.status === statusFilter),
  );

  const metrics = {
    active: rows.filter((row) => row.tenant.status === "active").length,
    companies: rows.filter((row) => row.tenant.type === "company").length,
    rent: rows.reduce((sum, row) => sum + row.monthlyRent, 0),
    outstanding: rows.reduce((sum, row) => sum + row.balance, 0),
  };

  const columns: DataTableColumn<TenantRow>[] = [
    {
      id: "tenant",
      header: "Tenant",
      sortValue: (row) => row.tenant.name,
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="text-[10px]">{initials(row.tenant.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium">{row.tenant.name}</p>
            <p className="text-[10px] capitalize text-muted-foreground">
              {TENANT_TYPE_LABELS[row.tenant.type]}
              {row.tenant.contactName ? ` · ${row.tenant.contactName}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      cell: (row) => (
        <div>
          <p className="text-[11.5px]">{row.tenant.email}</p>
          <p className="text-[10px] text-muted-foreground">{row.tenant.phone}</p>
        </div>
      ),
    },
    {
      id: "spaces",
      header: "Spaces",
      sortValue: (row) => row.spacesCount,
      cell: (row) => (
        <div>
          <span className="text-[11.5px] font-medium">{row.spacesCount}</span>
          <p className="text-[10px] text-muted-foreground">
            {row.agreementCount} agreement{row.agreementCount === 1 ? "" : "s"}
          </p>
        </div>
      ),
    },
    {
      id: "rent",
      header: "Monthly rent",
      align: "right",
      sortValue: (row) => row.monthlyRent,
      cell: (row) => <span className="text-[12px] font-medium">{formatCurrency(row.monthlyRent)}</span>,
    },
    {
      id: "balance",
      header: "Balance",
      align: "right",
      sortValue: (row) => row.balance,
      cell: (row) => (
        <span className={row.balance > 0 ? "text-[12px] font-semibold text-warning" : "text-[12px] font-medium text-success"}>
          {formatCurrency(row.balance)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.tenant.status,
      cell: (row) => <StatusBadge status={row.tenant.status} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Tenant actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/admin/tenants/${row.tenant.id}`)}>
                <UserRound /> View profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialog({ tenant: row.tenant })}>
                <Pencil /> Edit tenant
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/admin/agreements")}>
                <Building2 /> Agreements
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant={row.tenant.status === "active" ? "destructive" : "default"}
                onClick={() => setStatusTarget(row.tenant)}
              >
                {row.tenant.status === "active" ? <UserRound /> : <UserCheck />}
                {row.tenant.status === "active" ? "Deactivate tenant" : "Reactivate tenant"}
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
        <PageHeader title="Tenants" description="Loading the tenant directory…" />
        <LoadingPanel />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tenants"
        description="People and companies renting church property. Each tenant can hold multiple spaces."
        actions={
          <Button size="sm" onClick={() => setDialog({})}>
            <Plus className="size-3.5" /> Add tenant
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active tenants" value={metrics.active} hint={`${rows.length} total records`} icon={Users} tone="navy" />
        <StatCard label="Company tenants" value={metrics.companies} hint={`${metrics.active - metrics.companies} individuals`} icon={Building2} tone="info" />
        <StatCard label="Monthly rent" value={formatCurrency(metrics.rent, true)} hint="Across active agreements" icon={Wallet} tone="success" />
        <StatCard label="Outstanding balances" value={formatCurrency(metrics.outstanding, true)} hint="Unpaid invoice balances" icon={Search} tone="warning" />
      </div>

      <div className="mt-5">
        <div className="mb-2.5">
          <h2 className="text-[13px] font-semibold">Tenant directory</h2>
          <p className="text-[10.5px] text-muted-foreground">
            Search, filter, and open a profile to review agreements, invoices, and payments.
          </p>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(row) => row.tenant.id}
          getSearchText={(row) =>
            `${row.tenant.name} ${row.tenant.email} ${row.tenant.phone} ${row.tenant.contactName ?? ""}`
          }
          searchPlaceholder="Search tenants by name, email or phone…"
          onRowClick={(row) => router.push(`/admin/tenants/${row.tenant.id}`)}
          emptyTitle="No tenants match"
          emptyDescription="Try another search term or adjust your filters."
          emptyAction={
            <Button variant="outline" size="sm" onClick={() => setDialog({})}>
              <Plus className="size-3.5" /> Add tenant
            </Button>
          }
          toolbar={
            <>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger size="sm" className="h-8.5 w-[140px] bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="individual">Individuals</SelectItem>
                  <SelectItem value="company">Companies</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger size="sm" className="h-8.5 w-[140px] bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {(typeFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8.5 text-[11px]"
                  onClick={() => {
                    setTypeFilter("all");
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

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10.5px] text-muted-foreground">
        <Badge variant="neutral">{rows.filter((row) => row.balance > 0).length} tenants with balances</Badge>
        <span>Tenants only ever see their own rentals, invoices and payments.</span>
      </div>

      {dialog && <TenantFormDialog tenant={dialog.tenant} onClose={() => setDialog(null)} />}

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTarget?.status === "active" ? "Deactivate tenant?" : "Reactivate tenant?"}
        description={
          statusTarget?.status === "active"
            ? `${statusTarget.name} will be marked inactive. Existing agreements and invoices are kept for the historical record.`
            : `${statusTarget?.name} will be able to access their tenant portal again.`
        }
        confirmLabel={statusTarget?.status === "active" ? "Deactivate" : "Reactivate"}
        variant={statusTarget?.status === "active" ? "destructive" : "default"}
        onConfirm={() => {
          if (!statusTarget) return;
          const next = statusTarget.status === "active" ? "inactive" : "active";
          setTenantStatus(statusTarget.id, next);
          toast.success(next === "active" ? "Tenant reactivated" : "Tenant deactivated", {
            description: `${statusTarget.name} is now ${next}.`,
          });
          setStatusTarget(null);
        }}
      />
    </div>
  );
}
