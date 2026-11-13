"use client";

import { createClient } from "@/lib/supabase/client";
import { refreshDatabase } from "./store";

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
  if (input.altPhone !== undefined) patch.emergency_contact_phone = input.altPhone;
  if (input.contactName !== undefined) patch.company_name = input.contactName;
  const { error } = await supabase.from("tenants").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  await refreshDatabase();
}

export async function setTenantStatus(id: string, status: "active" | "inactive") {
  void id; void status;
  // No status column in tenants schema; could be modeled via linked profile/is_active later.
  await refreshDatabase();
}
