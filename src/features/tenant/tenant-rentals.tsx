"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CreditCard,
  FileText,
  Home,
  Info,
  Mail,
  MapPin,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { SPACE_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getTenantSummary } from "@/lib/mock-data/analytics";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, LoadingPanel } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function TenantRentals() {
  const db = useDatabase();
  const ready = usePageReady();
  const tenantId = db.tenants[0]?.id ?? "";
  const summary = getTenantSummary(db, tenantId);
  const tenant = summary.tenant;
  const activeAgreement = summary.agreement;
  const allAgreements = db.agreements
    .filter((agreement) => agreement.tenantId === tenantId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  if (!ready) {
    return (
      <>
        <PageHeader title="My rentals" description="Loading your rented spaces…" />
        <LoadingPanel />
      </>
    );
  }

  if (!tenant) {
    return (
      <PageHeader
        title="Tenant profile not found"
        description="No tenant account is available yet."
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My rentals"
        description="The spaces you rent, your agreement terms and how rent is calculated."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/tenant/invoices">
                <FileText className="size-3.5" /> My invoices
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

      {activeAgreement ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-accent/45 px-5 py-4 dark:bg-white/[0.03]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Active agreement
                </p>
                <StatusBadge status={activeAgreement.status} />
              </div>
              <p className="mt-1 font-display text-[20px] font-semibold">
                {activeAgreement.reference}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatDate(activeAgreement.startDate, "long")} –{" "}
                {formatDate(activeAgreement.endDate, "long")}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Monthly rent</p>
                <p className="mt-0.5 font-display text-[22px] font-semibold">
                  {formatCurrency(summary.monthlyRent)}
                </p>
              </div>
              <div className="hidden h-10 w-px bg-border sm:block" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Due day</p>
                <p className="mt-0.5 text-[15px] font-medium">Day {activeAgreement.dueDay}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-border/70 border-b border-border sm:grid-cols-4">
            {[
              { label: "Spaces rented", value: `${summary.spaces.length}` },
              {
                label: "Outstanding balance",
                value: formatCurrency(summary.balance),
                tone: summary.balance > 0 ? "text-warning" : "text-success",
              },
              { label: "Deposit on file", value: formatCurrency(activeAgreement.deposit) },
              {
                label: "Penalty",
                value: activeAgreement.penaltyEnabled
                  ? `${activeAgreement.penaltyRate}% after grace`
                  : "Not applied",
              },
            ].map((item) => (
              <div key={item.label} className="px-4 py-3">
                <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className={`mt-1 text-[12.5px] font-semibold ${item.tone ?? ""}`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-[10.5px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5" /> Next payment due{" "}
              {summary.nextDueDate ? formatDate(summary.nextDueDate, "long") : "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Rent is billed monthly with one invoice per
              agreement.
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-soft">
          <EmptyState
            icon={Home}
            title="No active agreement"
            description="You do not currently have an active rental agreement."
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <SectionCard
            title="Rented spaces"
            description={`${summary.spaces.length} space${summary.spaces.length === 1 ? "" : "s"} on your current agreement`}
            action={<Badge variant="navy">RWF / month</Badge>}
          >
            <div className="grid gap-px bg-border sm:grid-cols-2">
              {summary.spaces.map((space) => {
                const building = db.buildings.find((item) => item.id === space.buildingId);
                const floor = db.floors.find((item) => item.id === space.floorId);
                const line = activeAgreement?.lineItems.find((item) => item.spaceId === space.id);
                return (
                  <div key={space.id} className="bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
                        <Home className="size-4" />
                      </span>
                      <Badge variant="neutral">{SPACE_CATEGORY_LABELS[space.category]}</Badge>
                    </div>
                    <p className="mt-2.5 font-mono text-[10.5px] text-muted-foreground">{space.code}</p>
                    <p className="text-[12.5px] font-semibold">{space.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Building2 className="size-3" /> {building?.name} · {floor?.name}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" /> {building?.district}
                      </span>
                      <span className="flex items-center gap-1">
                        <Ruler className="size-3" /> {space.sizeSqm} m²
                      </span>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Monthly rent</span>
                      <span className="text-[13px] font-semibold">
                        {formatCurrency(line?.monthlyRent ?? space.monthlyRent)}
                      </span>
                    </div>
                    {space.features.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {space.features.slice(0, 3).map((feature) => (
                          <span
                            key={feature}
                            className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {summary.spaces.length === 0 && (
              <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">
                No spaces are linked to your agreement.
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Agreement history"
            description="Current and past rental agreements"
          >
            <div className="divide-y divide-border/70">
              {allAgreements.map((agreement) => {
                const rent = agreement.lineItems.reduce((sum, line) => sum + line.monthlyRent, 0);
                return (
                  <div key={agreement.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <FileText className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10.5px] font-medium">{agreement.reference}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(agreement.startDate)} – {formatDate(agreement.endDate)} ·{" "}
                        {agreement.lineItems.length} space
                        {agreement.lineItems.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11.5px] font-semibold">{formatCurrency(rent, true)}</p>
                      <StatusBadge
                        status={agreement.status}
                        className="mt-0.5 h-4 px-1.5 text-[9px]"
                      />
                    </div>
                  </div>
                );
              })}
              {allAgreements.length === 0 && (
                <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">
                  No agreement records yet.
                </p>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4 xl:col-span-4">
          <SectionCard title="How your rent works" description="Plain-language terms">
            <div className="space-y-3 px-5 pb-5 text-[11px] leading-relaxed text-muted-foreground">
              <div className="flex gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary dark:text-foreground" />
                <p>
                  Each space has its own monthly price. Your invoice combines every space on the
                  agreement into one amount.
                </p>
              </div>
              <div className="flex gap-2">
                <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-primary dark:text-foreground" />
                <p>
                  Rent is due by day {activeAgreement?.dueDay ?? 5} of each month. You can pay in
                  full or in parts.
                </p>
              </div>
              <div className="flex gap-2">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary dark:text-foreground" />
                <p>
                  Bank transfers count as paid only after the finance team verifies the transfer.
                  You will see the status on My payments.
                </p>
              </div>
              {activeAgreement?.penaltyEnabled && (
                <div className="flex gap-2">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-warning" />
                  <p>
                    A late penalty of {activeAgreement.penaltyRate}% may apply after the grace
                    period. Penalties are shown separately on the invoice.
                  </p>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Property contact" description="Questions about your rental">
            <div className="space-y-2.5 px-5 pb-5 text-[11px]">
              <p className="flex items-center gap-2">
                <Building2 className="size-3.5 text-muted-foreground" />
                {db.settings.organization.churchName}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-3.5 text-muted-foreground" />
                {db.settings.organization.email}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-3.5" />
                {db.settings.organization.address}, {db.settings.organization.city}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() =>
                  toast.message("Message prepared", {
                    description:
                      "Contacting the property team is simulated in this frontend prototype.",
                  })
                }
              >
                <Mail className="size-3.5" /> Contact property team
              </Button>
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href="/tenant/profile">
                  View my profile <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
