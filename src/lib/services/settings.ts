"use client";

import type { AppSettings } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { refreshDatabase } from "./store";

export async function updateSettings(patch: Partial<AppSettings>) {
  const supabase = createClient();
  const { data: org } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
  if (!org?.id) throw new Error("No organization found.");

  // Upsert organization profile fields
  const orgPatch: Record<string, unknown> = {};
  if (patch.organization?.name !== undefined) orgPatch.name = patch.organization.name;
  if (patch.organization?.legalName !== undefined) orgPatch.legal_name = patch.organization.legalName;
  if (patch.organization?.tin !== undefined) orgPatch.tin = patch.organization.tin;
  if (patch.organization?.email !== undefined) orgPatch.email = patch.organization.email;
  if (patch.organization?.phone !== undefined) orgPatch.phone = patch.organization.phone;
  if (patch.organization?.address !== undefined) orgPatch.address = patch.organization.address;
  if (patch.organization?.logoUrl !== undefined) orgPatch.logo_url = patch.organization.logoUrl;
  if (Object.keys(orgPatch).length) {
    const { error } = await supabase.from("organizations").update(orgPatch).eq("id", org.id);
    if (error) throw new Error(error.message);
  }

  // Upsert organization settings
  const settingsPatch: Record<string, unknown> = { organization_id: org.id };
  if (patch.invoices?.prefix !== undefined) settingsPatch.invoice_prefix = patch.invoices.prefix;
  if (patch.invoices?.dueDay !== undefined) settingsPatch.default_due_day = patch.invoices.dueDay;
  if (patch.invoices?.gracePeriodDays !== undefined) settingsPatch.grace_period_days = patch.invoices.gracePeriodDays;
  if (patch.invoices?.autoGenerateMonthly !== undefined) settingsPatch.auto_generate_monthly = patch.invoices.autoGenerateMonthly;
  if (patch.penalties?.enabled !== undefined) settingsPatch.penalty_enabled = patch.penalties.enabled;
  if (patch.penalties?.ratePercent !== undefined) settingsPatch.penalty_rate_percent = patch.penalties.ratePercent;
  if (patch.penalties?.gracePeriodDays !== undefined) settingsPatch.penalty_grace_period_days = patch.penalties.gracePeriodDays;
  if (patch.payments?.momoEnabled !== undefined) settingsPatch.momo_enabled = patch.payments.momoEnabled;
  if (patch.payments?.airtelEnabled !== undefined) settingsPatch.airtel_enabled = patch.payments.airtelEnabled;
  if (patch.payments?.bankTransferEnabled !== undefined) settingsPatch.bank_transfer_enabled = patch.payments.bankTransferEnabled;
  if (patch.payments?.cashEnabled !== undefined) settingsPatch.cash_enabled = patch.payments.cashEnabled;
  if (patch.payments?.requireVerificationForBank !== undefined) settingsPatch.require_verification_for_bank = patch.payments.requireVerificationForBank;
  if (patch.ebm?.enabled !== undefined) settingsPatch.ebm_enabled = patch.ebm.enabled;
  if (patch.ebm?.note !== undefined) settingsPatch.ebm_note = patch.ebm.note;

  if (Object.keys(settingsPatch).length > 1) {
    const { error } = await supabase
      .from("organization_settings")
      .upsert(settingsPatch, { onConflict: "organization_id" });
    if (error) throw new Error(error.message);
  }

  await refreshDatabase();
}
