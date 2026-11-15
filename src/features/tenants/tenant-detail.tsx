"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Download,
  FileText,
  Mail,
  MapPin,
  Phone,
  Pencil,
  Plus,
  ReceiptText,
  ScrollText,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  AGREEMENT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_SHORT,
  SPACE_CATEGORY_LABELS,
  TENANT_TYPE_LABELS,
} from "@/lib/constants";
import { formatCurrency, formatDate, formatPercent, initials } from "@/lib/utils";
import { getTenantStatement, getTenantSummary, invoiceBalance } from "@/lib/mock-data/analytics";
import { setTenantStatus } from "@/lib/services";
import { useDatabase } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/states";
import { TenantFormDialog } from "./tenant-form-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export function TenantDetail({ tenantId }: { tenantId: string }) {
  const db = useDatabase();
  const [editing, setEditing] = React.useState(false);
  const [confirmStatus, setConfirmStatus] = React.useState(false);
  const tenant = db.tenants.find((item) => item.id === tenantId);
  const summary = getTenantSummary(db, tenantId);
  const statement = getTenantStatement(db, tenantId);
  const agreements = db.agreements
    .filter((agreement) => agreement.tenantId === tenantId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const invoices = db.invoices
    .filter((invoice) => invoice.tenantId === tenantId)
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const payments = db.payments
    .filter((payment) => payment.tenantId === tenantId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const documents = db.documents.filter((document) => document.tenantId === tenantId);
  const activeSpaces = summary.spaces;

  if (!tenant) {
    return (
      <div>
        <PageHeader title="Tenant not found" backHref="/admin/tenants" />
        <div className="rounded-xl border border-border bg-card shadow-soft">
          <EmptyState
            icon={UserRound}
            title="This tenant record does not exist"
            description="It may have been removed or the link is incorrect."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/tenants">Back to tenants</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        backHref="/admin/tenants"
        breadcrumbs={[
          { label: "Tenants", href: "/admin/tenants" },
          { label: tenant.name },
        ]}
        title={tenant.name}
        badge={
          <div className="flex items-center gap-1.5">
            <StatusBadge status={tenant.status} />
            <Badge variant="neutral">{TENANT_TYPE_LABELS[tenant.type]}</Badge>
          </div>
        }
        description={`Tenant since ${formatDate(tenant.since)} Â· ${tenant.address}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setConfirmStatus(true)}>
              {tenant.status === "active" ? <UserRound className="size-3.5" /> : <UserRound className="size-3.5" />}
              {tenant.status === "active" ? "Deactivate" : "Reactivate"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" /> Edit
            </Button>
            <Button size="sm" asChild>
              <Link href={`/admin/agreements?tenant=${tenant.id}`}>
                <Plus className="size-3.5" /> New agreement
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monthly rent" value={formatCurrency(summary.monthlyRent)} hint={`${activeSpaces.length} rented spaces`} icon={Building2} tone="navy" />
        <StatCard label="Outstanding" value={formatCurrency(summary.balance)} hint={`${summary.pendingInvoices.length} open invoices`} icon={ReceiptText} tone={summary.balance > 0 ? "warning" : "success"} />
        <StatCard label="Total paid" value={formatCurrency(statement.paid, true)} hint="Verified and completed" icon={Wallet} tone="success" />
        <StatCard label="Agreements" value={agreements.length} hint={`${agreements.filter((agreement) => agreement.status === "active" || agreement.status === "expiring").length} active`} icon={ScrollText} tone="default" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-4">
          <SectionCard
            title="Contact details"
            action={<Avatar className="size-10"><AvatarFallback>{initials(tenant.name)}</AvatarFallback></Avatar>}
          >
            <div className="space-y-3.5 px-5 pb-5">
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Email</p>
                  <p className="truncate text-[12px]">{tenant.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Phone</p>
                  <p className="text-[12px]">{tenant.phone}</p>
                  {tenant.altPhone && <p className="text-[11px] text-muted-foreground">{tenant.altPhone}</p>}
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Address</p>
                  <p className="text-[12px]">{tenant.address}</p>
                </div>
              </div>
              {(tenant.buildingId || tenant.rooms?.length) && (
                <div className="flex items-start gap-2.5">
                  <Building2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Location</p>
                    <p className="text-[12px]">
                      {db.buildings.find((b) => b.id === tenant.buildingId)?.name ?? "Building"}
                    </p>
                    <div className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                      {(tenant.rooms?.length
                        ? tenant.rooms
                        : Array.from({ length: tenant.roomsNeeded ?? 1 }, (_, index) => ({
                            floorId: tenant.floorId,
                            roomNumber: (tenant.roomNumbers?.length ? tenant.roomNumbers : tenant.roomNumber ? [tenant.roomNumber] : [])[index],
                            monthlyRent: undefined as number | undefined,
                          }))).map((room, index) => (
                        <p key={index}>
                          {db.floors.find((floor) => floor.id === room.floorId)?.name ?? "Floor"} · Room {room.roomNumber || index + 1}
                          {typeof room.monthlyRent === "number" && room.monthlyRent > 0
                            ? ` · ${formatCurrency(room.monthlyRent, true)}`
                            : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tenant since</p>
                  <p className="text-[12px]">{formatDate(tenant.since, "long")}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">National ID</p>
                  <p className="mt-0.5 font-mono text-[11px]">{tenant.nationalId ?? "â€”"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">TIN</p>
                  <p className="mt-0.5 font-mono text-[11px]">{tenant.tin ?? "â€”"}</p>
                </div>
              </div>
              {tenant.contactName && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Contact person</p>
                  <p className="mt-0.5 text-[12px]">{tenant.contactName}</p>
                </div>
              )}
              {tenant.notes && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="mt-1 text-[11px] leading-relaxed">{tenant.notes}</p>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Rented spaces"
            description={`${activeSpaces.length} spaces on record`}
            action={
              <Button variant="ghost" size="icon-sm" asChild>
                <Link href="/admin/properties">
                  <ArrowRight className="size-4" />
                  <span className="sr-only">Open properties</span>
                </Link>
              </Button>
            }
          >
            <div className="divide-y divide-border/70">
              {activeSpaces.map((space) => (
                <div key={space.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium">{space.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {space.code} Â· {SPACE_CATEGORY_LABELS[space.category]} Â· {space.sizeSqm} mÂ²
                    </p>
                  </div>
                  <p className="shrink-0 text-[11.5px] font-semibold">{formatCurrency(space.monthlyRent, true)}</p>
                </div>
              ))}
              {activeSpaces.length === 0 && (
                <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">No spaces assigned.</p>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4 xl:col-span-8">
          <SectionCard title="Account statement" description="Billed rent versus payments received">
            <div className="px-5 pb-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total billed</p>
                  <p className="mt-1 font-display text-[18px] font-semibold">{formatCurrency(statement.billed)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Paid</p>
                  <p className="mt-1 font-display text-[18px] font-semibold text-success">{formatCurrency(statement.paid)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Balance</p>
                  <p className={`mt-1 font-display text-[18px] font-semibold ${statement.balance > 0 ? "text-warning" : "text-success"}`}>
                    {formatCurrency(statement.balance)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[10.5px]">
                  <span className="text-muted-foreground">Collection rate</span>
                  <span className="font-medium">
                    {formatPercent(statement.billed ? (statement.paid / statement.billed) * 100 : 0)}
                  </span>
                </div>
                <Progress value={statement.billed ? (statement.paid / statement.billed) * 100 : 0} className="h-2" />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Agreements"
            description="Rental terms, spaces and renewal status"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/agreements">
                  All agreements <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            <div className="divide-y divide-border/70">
              {agreements.map((agreement) => (
                <div key={agreement.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ScrollText className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium">{agreement.reference}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(agreement.startDate)} â†’ {formatDate(agreement.endDate)} Â·
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11.5px] font-semibold">
                      {formatCurrency(agreement.lineItems.reduce((sum, line) => sum + line.monthlyRent, 0))}
                    </p>
                    <StatusBadge
                      status={agreement.status}
                      label={AGREEMENT_STATUS_LABELS[agreement.status]}
                      className="mt-0.5 h-4 px-1.5 text-[9px]"
                    />
                  </div>
                </div>
              ))}
              {agreements.length === 0 && (
                <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">No agreements yet.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Invoice history"
            description="All invoices issued to this tenant"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/invoices">
                  All invoices <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            <div className="divide-y divide-border/70">
              {invoices.slice(0, 6).map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/admin/invoices/${invoice.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium">{invoice.number}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(invoice.issueDate, "month")} Â· due {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11.5px] font-semibold">{formatCurrency(invoiceBalance(invoice))}</p>
                    <StatusBadge
                      status={invoice.status}
                      label={INVOICE_STATUS_LABELS[invoice.status]}
                      className="mt-0.5 h-4 px-1.5 text-[9px]"
                    />
                  </div>
                </Link>
              ))}
              {invoices.length === 0 && (
                <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">No invoices yet.</p>
              )}
            </div>
          </SectionCard>

          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard title="Recent payments" description="Latest rent payments">
              <div className="divide-y divide-border/70">
                {payments.slice(0, 4).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-medium">{PAYMENT_METHOD_SHORT[payment.method]}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {formatDate(payment.date)} Â· {payment.reference}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11.5px] font-semibold">{formatCurrency(payment.amount)}</p>
                      <StatusBadge status={payment.status} className="mt-0.5 h-4 px-1.5 text-[9px]" />
                    </div>
                  </div>
                ))}
                {payments.length === 0 && (
                  <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">No payments yet.</p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Documents" description={`${documents.length} files on record`}>
              <div className="divide-y divide-border/70">
                {documents.slice(0, 4).map((document) => (
                  <div key={document.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <FileText className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium">{document.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(document.date)} Â· {document.fileSize}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-xs" aria-label="Download document">
                      <Download className="size-3.5" />
                    </Button>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">No documents yet.</p>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      {editing && <TenantFormDialog tenant={tenant} onClose={() => setEditing(false)} />}

      <ConfirmDialog
        open={confirmStatus}
        onOpenChange={setConfirmStatus}
        title={tenant.status === "active" ? "Deactivate tenant?" : "Reactivate tenant?"}
        description={
          tenant.status === "active"
            ? `${tenant.name} will be marked inactive. Agreements, invoices and payments remain in the historical record.`
            : `${tenant.name} will regain access to the tenant portal.`
        }
        confirmLabel={tenant.status === "active" ? "Deactivate" : "Reactivate"}
        variant={tenant.status === "active" ? "destructive" : "default"}
        onConfirm={async () => {
          const next = tenant.status === "active" ? "inactive" : "active";
          try {
            await setTenantStatus(tenant.id, next);
            toast.success(next === "active" ? "Tenant reactivated" : "Tenant deactivated");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not update tenant status.");
          }
          setConfirmStatus(false);
        }}
      />
    </div>
  );
}
