"use client";

import type { AgreementLine, AgreementStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { refreshDatabase } from "./store";

export type AgreementInput = {
  tenantId: string;
  lineItems: AgreementLine[];
  startDate: string;
  endDate: string;
  deposit: number;
  notes?: string;
  penaltyEnabled?: boolean;
  penaltyRate?: number;
};

export function statusForEndDate(endDate: string): AgreementStatus {
  const today = new Date();
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) return "active";
  if (end < today) return "expired";
  const days = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
  return days <= 90 ? "expiring" : "active";
}

async function getOrgId() {
  const supabase = createClient();
  const { data } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
  if (!data?.id) throw new Error("No organization found.");
  return data.id as string;
}

function nextAgreementNumber(startDate: string) {
  const year = (startDate || new Date().toISOString()).slice(0, 4);
  return `AGR-${year}-${Date.now().toString().slice(-6)}`;
}

export async function createAgreement(input: AgreementInput) {
  const supabase = createClient();
  const orgId = await getOrgId();
  const status = statusForEndDate(input.endDate);
  const { data: agreement, error } = await supabase
    .from("rental_agreements")
    .insert({
      organization_id: orgId,
      tenant_id: input.tenantId,
      agreement_number: nextAgreementNumber(input.startDate),
      start_date: input.startDate,
      end_date: input.endDate,
      billing_day: 5,
      payment_due_day: 5,
      status: status === "terminated" ? "terminated" : status,
      terms: input.notes || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (input.lineItems.length) {
    const rows = input.lineItems.map((line) => ({
      agreement_id: agreement.id,
      space_id: line.spaceId || null,
      label: line.label || null,
      monthly_rent_amount: line.monthlyRent,
      start_date: input.startDate,
      end_date: input.endDate,
    }));
    const { error: sErr } = await supabase.from("agreement_spaces").insert(rows);
    if (sErr) throw new Error(sErr.message);
    // mark spaces occupied
    const spaceIds = input.lineItems.map((l) => l.spaceId).filter(Boolean) as string[];
    if (spaceIds.length) {
      await supabase.from("spaces").update({ occupancy_status: "occupied" }).in("id", spaceIds);
    }
  }
  await refreshDatabase();
  return agreement.id as string;
}

export async function updateAgreement(id: string, patch: Partial<AgreementInput>) {
  const supabase = createClient();
  const update: Record<string, unknown> = {};
  if (patch.startDate) update.start_date = patch.startDate;
  if (patch.endDate) {
    update.end_date = patch.endDate;
    update.status = statusForEndDate(patch.endDate);
  }
  if (patch.notes !== undefined) update.terms = patch.notes;
  if (Object.keys(update).length) {
    const { error } = await supabase.from("rental_agreements").update(update).eq("id", id);
    if (error) throw new Error(error.message);
  }
  if (patch.lineItems) {
    const { data: existing } = await supabase
      .from("agreement_spaces")
      .select("space_id")
      .eq("agreement_id", id);
    const prevSpaceIds = (existing ?? [])
      .map((row: { space_id: string | null }) => row.space_id)
      .filter(Boolean) as string[];
    const nextSpaceIds = patch.lineItems.map((line) => line.spaceId).filter(Boolean) as string[];

    const { error: delError } = await supabase.from("agreement_spaces").delete().eq("agreement_id", id);
    if (delError) throw new Error(delError.message);

    const removedSpaceIds = prevSpaceIds.filter((spaceId) => !nextSpaceIds.includes(spaceId));
    if (removedSpaceIds.length) {
      await supabase.from("spaces").update({ occupancy_status: "vacant" }).in("id", removedSpaceIds);
    }

    const rows = patch.lineItems.map((line) => ({
      agreement_id: id,
      space_id: line.spaceId || null,
      label: line.label || null,
      monthly_rent_amount: line.monthlyRent,
      start_date: patch.startDate ?? new Date().toISOString().slice(0, 10),
      end_date: patch.endDate ?? null,
    }));
    const { error: insError } = await supabase.from("agreement_spaces").insert(rows);
    if (insError) throw new Error(insError.message);

    if (nextSpaceIds.length) {
      await supabase.from("spaces").update({ occupancy_status: "occupied" }).in("id", nextSpaceIds);
    }
  }
  await refreshDatabase();
}

export async function terminateAgreement(id: string, reason: string) {
  void reason;
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("rental_agreements")
    .update({ status: "terminated", end_date: today })
    .eq("id", id);
  if (error) throw new Error(error.message);
  const { data: lines } = await supabase.from("agreement_spaces").select("space_id").eq("agreement_id", id);
  const ids = (lines ?? []).map((l: { space_id: string | null }) => l.space_id).filter(Boolean) as string[];
  if (ids.length) await supabase.from("spaces").update({ occupancy_status: "vacant" }).in("id", ids);
  await refreshDatabase();
}

export async function renewAgreement(id: string, newEndDate: string) {
  await updateAgreement(id, { endDate: newEndDate });
}
