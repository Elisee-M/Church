"use client";

import { createClient } from "@/lib/supabase/client";
import { refreshDatabase } from "./store";
import { createTenantWithAccountAction } from "@/lib/actions/admin-tenants";

export async function createTenant(input: {
  type: "individual" | "company";
  name: string;
  contactName?: string;
  email: string;
  phone: string;
  altPhone?: string;
  nationalId?: string;
  tin?: string;
  companyReg?: string;
  address: string;
  buildingId?: string;
  floorId?: string;
  roomNumber?: string;
  monthlyRent?: number;
  roomsNeeded?: number;
  notes?: string;
}) {
  const supabase = createClient();
  const { data: org } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
  if (!org?.id) throw new Error("No organization found.");
  const { error } = await supabase.from("tenants").insert({
    organization_id: org.id,
    tenant_type: input.type,
    full_name: input.name,
    company_name: input.type === "company" ? input.contactName || input.name : null,
    email: input.email || null,
    phone: input.phone || null,
    national_id: input.nationalId || null,
    company_tin: input.tin || null,
    address: input.address || null,
    building_id: input.buildingId || null,
    floor_id: input.floorId || null,
    room_number: input.roomNumber || null,
    monthly_rent: input.monthlyRent ?? null,
    rooms_needed: input.roomsNeeded ?? null,
    emergency_contact_phone: input.altPhone || null,
  });
  if (error) throw new Error(error.message);
  await refreshDatabase();
}

export async function updateTenant(
  id: string,
  input: Partial<{
    type: "individual" | "company";
    name: string;
    contactName?: string;
    email: string;
    phone: string;
    altPhone?: string;
    nationalId?: string;
    tin?: string;
    companyReg?: string;
    address: string;
    buildingId?: string;
    floorId?: string;
    roomNumber?: string;
    monthlyRent?: number;
    roomsNeeded?: number;
    notes?: string;
  }>,
) {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.type !== undefined) patch.tenant_type = input.type;
  if (input.name !== undefined) patch.full_name = input.name;
  if (input.email !== undefined) patch.email = input.email;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.nationalId !== undefined) patch.national_id = input.nationalId;
  if (input.tin !== undefined) patch.company_tin = input.tin;
  if (input.address !== undefined) patch.address = input.address;
  if (input.buildingId !== undefined) patch.building_id = input.buildingId || null;
  if (input.floorId !== undefined) patch.floor_id = input.floorId || null;
  if (input.roomNumber !== undefined) patch.room_number = input.roomNumber || null;
  if (input.altPhone !== undefined) patch.emergency_contact_phone = input.altPhone;
  if (input.contactName !== undefined) patch.company_name = input.contactName;
  if (input.monthlyRent !== undefined) patch.monthly_rent = input.monthlyRent ?? null;
  if (input.roomsNeeded !== undefined) patch.rooms_needed = input.roomsNeeded ?? null;
  const { error } = await supabase.from("tenants").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  await refreshDatabase();
}

export async function createTenantWithAccount(input: {
  type: "individual" | "company";
  name: string;
  contactName?: string;
  email: string;
  phone: string;
  altPhone?: string;
  nationalId?: string;
  tin?: string;
  companyReg?: string;
  address: string;
  buildingId?: string;
  floorId?: string;
  roomNumber?: string;
  monthlyRent?: number;
  notes?: string;
  loginPassword: string;
}) {
  await createTenantWithAccountAction(input);
  await refreshDatabase();
}

export async function setTenantStatus(id: string, status: "active" | "inactive") {
  void id; void status;
  // No status column in tenants schema; could be modeled via linked profile/is_active later.
  await refreshDatabase();
}

export async function deleteTenant(id: string) {
  const supabase = createClient();

  await supabase.from("ebm_records").delete().eq("tenant_id", id);

  const { data: payments } = await supabase.from("payments").select("id").eq("tenant_id", id);
  const paymentIds = (payments ?? []).map((payment: { id: string }) => payment.id);
  if (paymentIds.length) {
    await supabase.from("receipts").delete().in("payment_id", paymentIds);
  }
  await supabase.from("payments").delete().eq("tenant_id", id);

  const { data: invoices } = await supabase.from("invoices").select("id").eq("tenant_id", id);
  const invoiceIds = (invoices ?? []).map((invoice: { id: string }) => invoice.id);
  if (invoiceIds.length) {
    await supabase.from("invoice_items").delete().in("invoice_id", invoiceIds);
  }
  await supabase.from("invoices").delete().eq("tenant_id", id);

  const { data: agreements } = await supabase.from("rental_agreements").select("id").eq("tenant_id", id);
  const agreementIds = (agreements ?? []).map((agreement: { id: string }) => agreement.id);
  if (agreementIds.length) {
    const { data: lines } = await supabase.from("agreement_spaces").select("space_id").in("agreement_id", agreementIds);
    const spaceIds = [...new Set((lines ?? []).map((line: { space_id: string }) => line.space_id).filter(Boolean))];
    if (spaceIds.length) {
      await supabase.from("spaces").update({ occupancy_status: "vacant" }).in("id", spaceIds);
    }
    await supabase.from("agreement_spaces").delete().in("agreement_id", agreementIds);
  }
  await supabase.from("rental_agreements").delete().eq("tenant_id", id);

  const { error } = await supabase.from("tenants").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await refreshDatabase();
}
