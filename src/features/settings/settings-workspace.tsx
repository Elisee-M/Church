"use client";

import * as React from "react";
import Image from "next/image";
import {
  Building2,
  Check,
  FileBadge,
  ImagePlus,
  Info,
  Landmark,
  Percent,
  ReceiptText,
  Save,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import type {
  EbmSettings,
  InvoiceSettings,
  OrganizationSettings,
  PaymentSettings,
  PenaltySettings,
} from "@/types";
import { updateSettings } from "@/lib/services";
import { formatCurrency } from "@/lib/utils";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { LoadingPanel } from "@/components/shared/states";
import { Field } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SettingsWorkspace() {
  const db = useDatabase();
  const ready = usePageReady();
  const [organization, setOrganization] = React.useState<OrganizationSettings>(
    db.settings.organization,
  );
  const [payments, setPayments] = React.useState<PaymentSettings>(db.settings.payments);
  const [invoices, setInvoices] = React.useState<InvoiceSettings>(db.settings.invoices);
  const [penalties, setPenalties] = React.useState<PenaltySettings>(db.settings.penalties);
  const [ebm, setEbm] = React.useState<EbmSettings>(db.settings.ebm);

  const saveOrganization = async () => {
    try { await updateSettings({ organization });
    toast.success("Organization settings saved"); } catch(e){ toast.error(e instanceof Error?e.message:"Could not save settings."); }
  };

  const savePayments = async () => {
    try { await updateSettings({ payments });
    toast.success("Payment settings saved"); } catch(e){ toast.error(e instanceof Error?e.message:"Could not save settings."); }
  };

  const saveInvoices = async () => {
    try { await updateSettings({ invoices, penalties });
    toast.success("Invoice and penalty settings saved"); } catch(e){ toast.error(e instanceof Error?e.message:"Could not save settings."); }
  };

  const saveEbm = async () => {
    try { await updateSettings({ ebm });
    toast.success("EBM settings saved"); } catch(e){ toast.error(e instanceof Error?e.message:"Could not save settings."); }
  };

  if (!ready) {
    return (
      <>
        <PageHeader title="Settings" description="Loading workspace settings…" />
        <LoadingPanel />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Settings"
        description="Organization profile, invoice rules, payment channels and fiscal references."
        badge={<Badge variant="neutral">Demo configuration</Badge>}
      />

      <Tabs defaultValue="organization">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-0.5 p-1">
          <TabsTrigger value="organization">
            <Building2 /> Organization
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <ReceiptText /> Invoices & penalties
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Wallet /> Payments
          </TabsTrigger>
          <TabsTrigger value="ebm">
            <FileBadge /> EBM
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="space-y-4">
          <SectionCard
            title="Organization profile"
            description="Appears on rental invoices, receipts and tenant-facing screens"
            action={<Badge variant="navy">Genzura</Badge>}
          >
            <div className="space-y-4 px-5 pb-5">
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/25 p-3.5">
                <div className="flex h-12 items-center rounded-md bg-[#142B4A] px-3">
                  <Image
                    src="/assets/genzura-logo.png"
                    alt="Genzura"
                    width={160}
                    height={44}
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[11.5px] font-medium">Workspace logo</p>
                  <p className="text-[10px] text-muted-foreground">
                    The workspace logo used across the application.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast.message("Logo replacement unavailable", {
                      description:
                        "Uploading a new logo is not available yet. The current brand asset is preserved.",
                    })
                  }
                >
                  <ImagePlus className="size-3.5" /> Replace logo
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Workspace name" htmlFor="org-name">
                  <Input
                    id="org-name"
                    value={organization.name}
                    onChange={(event) => setOrganization({ ...organization, name: event.target.value })}
                  />
                </Field>
                <Field label="Legal name" htmlFor="org-legal">
                  <Input
                    id="org-legal"
                    value={organization.legalName}
                    onChange={(event) =>
                      setOrganization({ ...organization, legalName: event.target.value })
                    }
                  />
                </Field>
                <Field label="Church name" htmlFor="org-church">
                  <Input
                    id="org-church"
                    value={organization.churchName}
                    onChange={(event) =>
                      setOrganization({ ...organization, churchName: event.target.value })
                    }
                  />
                </Field>
                <Field label="TIN" htmlFor="org-tin">
                  <Input
                    id="org-tin"
                    value={organization.tin}
                    onChange={(event) => setOrganization({ ...organization, tin: event.target.value })}
                  />
                </Field>
                <Field label="Contact email" htmlFor="org-email">
                  <Input
                    id="org-email"
                    type="email"
                    value={organization.email}
                    onChange={(event) =>
                      setOrganization({ ...organization, email: event.target.value })
                    }
                  />
                </Field>
                <Field label="Contact phone" htmlFor="org-phone">
                  <Input
                    id="org-phone"
                    value={organization.phone}
                    onChange={(event) =>
                      setOrganization({ ...organization, phone: event.target.value })
                    }
                  />
                </Field>
                <Field label="Address" htmlFor="org-address">
                  <Input
                    id="org-address"
                    value={organization.address}
                    onChange={(event) =>
                      setOrganization({ ...organization, address: event.target.value })
                    }
                  />
                </Field>
                <Field label="City" htmlFor="org-city">
                  <Input
                    id="org-city"
                    value={organization.city}
                    onChange={(event) => setOrganization({ ...organization, city: event.target.value })}
                  />
                </Field>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={saveOrganization}>
                  <Save className="size-3.5" /> Save organization
                </Button>
              </div>
            </div>
          </SectionCard>

          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
                <Info className="size-4" />
              </span>
              <div>
                <p className="text-[11.5px] font-semibold">Frontend demonstration</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                  Settings are stored in memory for this demo. A future Supabase integration will
                  persist changes and enforce role-based access. No email, SMS or payment rail is
                  contacted from this prototype.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <SectionCard
            title="Invoice rules"
            description="Default billing behaviour for monthly rent invoices"
            action={<Badge variant="navy">RWF</Badge>}
          >
            <div className="space-y-4 px-5 pb-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Invoice prefix" htmlFor="invoice-prefix">
                  <Input
                    id="invoice-prefix"
                    className="font-mono"
                    value={invoices.prefix}
                    onChange={(event) =>
                      setInvoices({ ...invoices, prefix: event.target.value.toUpperCase() })
                    }
                  />
                </Field>

                <Field label="Grace period (days)" htmlFor="invoice-grace">
                  <Input
                    id="invoice-grace"
                    type="number"
                    min={0}
                    value={invoices.gracePeriodDays}
                    onChange={(event) =>
                      setInvoices({ ...invoices, gracePeriodDays: Number(event.target.value) })
                    }
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3.5">
                <div>
                  <p className="text-[11.5px] font-medium">Auto-generate monthly invoices</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    When enabled, the admin dashboard shows a reminder at the start of each month.
                    Generation is always confirmed manually in this demo.
                  </p>
                </div>
                <Switch
                  checked={invoices.autoGenerateMonthly}
                  onCheckedChange={(checked) =>
                    setInvoices({ ...invoices, autoGenerateMonthly: checked })
                  }
                />
              </div>

              <Field label="Invoice footer note" htmlFor="invoice-footer">
                <Textarea
                  id="invoice-footer"
                  value={invoices.footerNote}
                  onChange={(event) =>
                    setInvoices({ ...invoices, footerNote: event.target.value })
                  }
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Late payment penalties"
            description="Applied to overdue invoices after the grace period"
            action={<Badge variant={penalties.enabled ? "warning" : "neutral"}>{penalties.enabled ? "Enabled" : "Disabled"}</Badge>}
          >
            <div className="space-y-4 px-5 pb-5">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3.5">
                <div>
                  <p className="text-[11.5px] font-medium">Enable penalties</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Penalties are shown as a separate line on overdue invoices, not baked into rent.
                  </p>
                </div>
                <Switch
                  checked={penalties.enabled}
                  onCheckedChange={(checked) => setPenalties({ ...penalties, enabled: checked })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Penalty rate" htmlFor="penalty-rate" hint="Percentage of the invoice amount.">
                  <div className="relative">
                    <Percent className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="penalty-rate"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      className="pl-8"
                      disabled={!penalties.enabled}
                      value={penalties.ratePercent}
                      onChange={(event) =>
                        setPenalties({ ...penalties, ratePercent: Number(event.target.value) })
                      }
                    />
                  </div>
                </Field>
                <Field label="Penalty grace period (days)" htmlFor="penalty-grace">
                  <Input
                    id="penalty-grace"
                    type="number"
                    min={0}
                    disabled={!penalties.enabled}
                    value={penalties.gracePeriodDays}
                    onChange={(event) =>
                      setPenalties({ ...penalties, gracePeriodDays: Number(event.target.value) })
                    }
                  />
                </Field>
              </div>

              <div className="rounded-lg bg-accent/70 p-3.5 text-[10.5px] leading-relaxed text-muted-foreground dark:bg-white/[0.04]">
                Example: a {formatCurrency(500_000)} invoice that remains unpaid after the grace
                period incurs a penalty of{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(
                    penalties.enabled ? (500_000 * penalties.ratePercent) / 100 : 0,
                  )}
                </span>
                . Penalty settings can always be overridden per agreement.
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={saveInvoices}>
                  <Save className="size-3.5" /> Save invoice rules
                </Button>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <SectionCard
            title="Payment channels"
            description="Channels shown to tenants on the simulated payment screen"
            action={<ShieldCheck className="size-4 text-success" />}
          >
            <div className="space-y-4 px-5 pb-5">
              {[
                {
                  key: "momoEnabled" as const,
                  label: "MTN Mobile Money",
                  description: "Tenant-initiated simulated MoMo payment. Genzura never asks for a PIN.",
                },
                {
                  key: "airtelEnabled" as const,
                  label: "Airtel Money",
                  description: "Simulated Airtel Money collection with a manual confirmation step.",
                },
                {
                  key: "bankTransferEnabled" as const,
                  label: "Bank transfer",
                  description: "Tenant uploads proof; the accountant verifies before collection.",
                },
                {
                  key: "cashEnabled" as const,
                  label: "Cash",
                  description: "Staff-recorded cash payment with an internal receipt.",
                },
              ].map((channel) => (
                <div
                  key={channel.key}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border p-3.5"
                >
                  <div>
                    <p className="text-[11.5px] font-medium">{channel.label}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                      {channel.description}
                    </p>
                  </div>
                  <Switch
                    checked={payments[channel.key]}
                    onCheckedChange={(checked) =>
                      setPayments({ ...payments, [channel.key]: checked })
                    }
                  />
                </div>
              ))}

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="MoMo merchant code" htmlFor="momo-code">
                  <Input
                    id="momo-code"
                    className="font-mono"
                    value={payments.momoMerchantCode}
                    onChange={(event) =>
                      setPayments({ ...payments, momoMerchantCode: event.target.value })
                    }
                  />
                </Field>
                <Field label="Bank name" htmlFor="bank-name">
                  <Input
                    id="bank-name"
                    value={payments.bankName}
                    onChange={(event) => setPayments({ ...payments, bankName: event.target.value })}
                  />
                </Field>
                <Field label="Bank account name" htmlFor="bank-account-name">
                  <Input
                    id="bank-account-name"
                    value={payments.bankAccountName}
                    onChange={(event) =>
                      setPayments({ ...payments, bankAccountName: event.target.value })
                    }
                  />
                </Field>
                <Field label="Bank account number" htmlFor="bank-account">
                  <Input
                    id="bank-account"
                    className="font-mono"
                    value={payments.bankAccount}
                    onChange={(event) =>
                      setPayments({ ...payments, bankAccount: event.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3.5">
                <div>
                  <p className="text-[11.5px] font-medium">Require bank transfer verification</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Pending bank transfers are excluded from collected rent until approved by the
                    accountant.
                  </p>
                </div>
                <Switch
                  checked={payments.requireVerificationForBank}
                  onCheckedChange={(checked) =>
                    setPayments({ ...payments, requireVerificationForBank: checked })
                  }
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-accent/70 px-3 py-2.5 text-[10.5px] leading-relaxed text-muted-foreground dark:bg-white/[0.04]">
                <Landmark className="mt-0.5 size-3.5 shrink-0" />
                No live payment rail is connected. Mobile money flows and bank proofs are simulated
                for demonstration, and Genzura never requests a mobile money PIN.
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={savePayments}>
                  <Save className="size-3.5" /> Save payment settings
                </Button>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="ebm" className="space-y-4">
          <SectionCard
            title="EBM fiscal integration"
            description="Reference-only integration with Rwanda's EBM fiscal system"
            action={<FileBadge className="size-4 text-amber-600 dark:text-amber-400" />}
          >
            <div className="space-y-4 px-5 pb-5">
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10.5px] leading-relaxed text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/[0.07] dark:text-amber-200">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                Genzura does not issue EBM fiscal invoices. Rental invoices and payment receipts are
                separate documents. The fields below only configure how external references are
                stored.
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3.5">
                <div>
                  <p className="text-[11.5px] font-medium">Enable EBM reference tracking</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Show the EBM panel on invoices so accountants can record references.
                  </p>
                </div>
                <Switch
                  checked={ebm.enabled}
                  onCheckedChange={(checked) => setEbm({ ...ebm, enabled: checked })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="EBM client ID" htmlFor="ebm-client">
                  <Input
                    id="ebm-client"
                    className="font-mono"
                    disabled={!ebm.enabled}
                    value={ebm.ebmClientId}
                    onChange={(event) => setEbm({ ...ebm, ebmClientId: event.target.value })}
                  />
                </Field>
                <Field label="Branch ID" htmlFor="ebm-branch">
                  <Input
                    id="ebm-branch"
                    className="font-mono"
                    disabled={!ebm.enabled}
                    value={ebm.branchId}
                    onChange={(event) => setEbm({ ...ebm, branchId: event.target.value })}
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3.5">
                <div>
                  <p className="text-[11.5px] font-medium">Auto-attach reference to receipts</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    When an EBM reference is recorded, show it on the related payment receipts.
                  </p>
                </div>
                <Switch
                  checked={ebm.autoAttachReference}
                  onCheckedChange={(checked) => setEbm({ ...ebm, autoAttachReference: checked })}
                />
              </div>

              <Field label="Internal note" htmlFor="ebm-note">
                <Textarea
                  id="ebm-note"
                  value={ebm.note}
                  onChange={(event) => setEbm({ ...ebm, note: event.target.value })}
                />
              </Field>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-[10.5px]">
                  <Check className="size-3.5 text-success" /> Fiscal documents remain external
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {db.invoices.filter((invoice) => invoice.ebmReference).length} references on record
                </span>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={saveEbm}>
                  <Save className="size-3.5" /> Save EBM settings
                </Button>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
