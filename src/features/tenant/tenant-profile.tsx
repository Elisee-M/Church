"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  CalendarClock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { tenantSchema, type TenantFormValues } from "@/lib/validations/schemas";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { getTenantSummary } from "@/lib/mock-data/analytics";
import { updateTenant } from "@/lib/services";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { useCurrentTenantId } from "@/hooks/use-current-tenant";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingPanel } from "@/components/shared/states";
import { Field } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function TenantProfile() {
  const db = useDatabase();
  const ready = usePageReady();
  const tenantId = useCurrentTenantId();
  const summary = getTenantSummary(db, tenantId);
  const tenant = summary.tenant;

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    values: tenant
      ? {
          type: tenant.type,
          name: tenant.name,
          contactName: tenant.contactName ?? "",
          email: tenant.email,
          phone: tenant.phone,
          altPhone: tenant.altPhone ?? "",
          nationalId: tenant.nationalId ?? "",
          tin: tenant.tin ?? "",
          companyReg: tenant.companyReg ?? "",
          address: tenant.address,
          notes: tenant.notes ?? "",
        }
      : {
          type: "individual",
          name: "",
          email: "",
          phone: "",
          address: "",
        },
  });

  if (!ready) {
    return (
      <>
        <PageHeader title="My profile" description="Loading your profile…" />
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

  const onSubmit = form.handleSubmit((values) => {
    updateTenant(tenant.id, values);
    toast.success("Profile updated", {
      description: "Your contact details were saved for this demo session.",
    });
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My profile"
        description="Your contact information and rental account summary."
        actions={<StatusBadge status={tenant.status} />}
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-4">
          <SectionCard title="Account summary">
            <div className="px-5 pb-5">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarFallback className="text-sm">{initials(tenant.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[14px] font-semibold">{tenant.name}</p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {tenant.type === "company" ? "Company tenant" : "Individual tenant"} · since{" "}
                    {formatDate(tenant.since)}
                  </p>
                </div>
              </div>

              <dl className="mt-4 space-y-2.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5 text-muted-foreground" />
                  <span className="truncate">{tenant.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 text-muted-foreground" />
                  <span>{tenant.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  <span>{tenant.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  <span>
                    {summary.spaces.length} rented space{summary.spaces.length === 1 ? "" : "s"}
                  </span>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-muted/30 p-2.5">
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Monthly rent</p>
                  <p className="mt-0.5 text-[12px] font-semibold">{formatCurrency(summary.monthlyRent)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2.5">
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Balance</p>
                  <p
                    className={`mt-0.5 text-[12px] font-semibold ${
                      summary.balance > 0 ? "text-warning" : "text-success"
                    }`}
                  >
                    {formatCurrency(summary.balance)}
                  </p>
                </div>
              </div>

              {summary.nextDueDate && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent/60 px-3 py-2 text-[10.5px] dark:bg-white/[0.04]">
                  <CalendarClock className="size-3.5 text-muted-foreground" />
                  <span>Next payment due {formatDate(summary.nextDueDate, "long")}</span>
                </div>
              )}
            </div>
          </SectionCard>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <p className="text-[11.5px] font-semibold">Your data</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                  You can update your contact details here. Rental terms, invoices and payment records
                  are managed by the property team. Changes apply to this demo session only.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-8">
          <SectionCard
            title="Contact details"
            description="Keep your phone and email up to date so we can reach you about your rental"
            action={
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <UserRound className="size-3.5" /> Tenant profile
              </span>
            }
          >
            <form onSubmit={onSubmit} className="space-y-4 px-5 pb-5" noValidate>
              <Field label="Display name" htmlFor="profile-name" error={form.formState.errors.name?.message}>
                <Input id="profile-name" {...form.register("name")} />
              </Field>

              {tenant.type === "company" && (
                <Field label="Contact person" htmlFor="profile-contact">
                  <Input id="profile-contact" {...form.register("contactName")} />
                </Field>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" htmlFor="profile-email" error={form.formState.errors.email?.message}>
                  <Input id="profile-email" type="email" {...form.register("email")} />
                </Field>
                <Field label="Phone" htmlFor="profile-phone" error={form.formState.errors.phone?.message}>
                  <Input id="profile-phone" {...form.register("phone")} />
                </Field>
                <Field label="Alternative phone" htmlFor="profile-alt" optional>
                  <Input id="profile-alt" {...form.register("altPhone")} />
                </Field>
                <Field label="Address" htmlFor="profile-address" error={form.formState.errors.address?.message}>
                  <Input id="profile-address" {...form.register("address")} />
                </Field>
              </div>

              {tenant.type === "individual" ? (
                <Field label="National ID" htmlFor="profile-nid" optional>
                  <Input id="profile-nid" {...form.register("nationalId")} />
                </Field>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="TIN" htmlFor="profile-tin" optional>
                    <Input id="profile-tin" {...form.register("tin")} />
                  </Field>
                  <Field label="Company registration" htmlFor="profile-reg" optional>
                    <Input id="profile-reg" {...form.register("companyReg")} />
                  </Field>
                </div>
              )}

              <Field label="Notes for the property team" htmlFor="profile-notes" optional>
                <Textarea
                  id="profile-notes"
                  placeholder="Anything the property team should know…"
                  {...form.register("notes")}
                />
              </Field>

              <div className="flex justify-end border-t border-border pt-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  <Save className="size-3.5" /> Save profile
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
