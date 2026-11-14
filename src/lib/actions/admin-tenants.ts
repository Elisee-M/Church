"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/auth/roles";

export type CreateTenantWithAccountInput = {
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
  roomNumbers?: string[];
  monthlyRent?: number;
  notes?: string;
  loginPassword: string;
};

async function requireAdminAndOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const actorRole = await getUserRole(supabase, user.id);
  if (actorRole !== "admin") throw new Error("Only administrators can create tenant accounts.");

  const { data: org } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
  if (!org?.id) throw new Error("No organization found. Create an organization before adding tenants.");

  return { actorId: user.id, orgId: org.id as string };
}

export async function createTenantWithAccountAction(input: CreateTenantWithAccountInput) {
  const { actorId, orgId } = await requireAdminAndOrg();
  const admin = createAdminClient();

  // 1) Create auth user for tenant (auto-confirmed)
  const { data: createdUser, error: userError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.loginPassword,
    email_confirm: true,
    user_metadata: { full_name: input.name, phone: input.phone ?? null, managed_role: "Tenant" },
  });
  if (userError || !createdUser.user) {
    throw new Error(userError?.message ?? "Could not create tenant login account.");
  }
  const userId = createdUser.user.id;

  try {
    // 2) Ensure profile
    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      full_name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      is_active: true,
      managed_role: "Tenant",
    });
    if (profileError) throw new Error(profileError.message);

    // 3) Assign tenant role in organization
    const { error: roleError } = await admin.from("user_roles").upsert(
      { user_id: userId, organization_id: orgId, role: "tenant", created_by: actorId },
      { onConflict: "user_id,organization_id,role" },
    );
    if (roleError) throw new Error(roleError.message);

    // 4) Create tenant record linked to auth user
    const { error: tenantError } = await admin.from("tenants").insert({
      organization_id: orgId,
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
      room_number: (input.roomNumbers && input.roomNumbers.length ? input.roomNumbers : input.roomNumber ? [input.roomNumber] : []).filter(Boolean).join(", ") || null,
      monthly_rent: input.monthlyRent ?? null,
      emergency_contact_phone: input.altPhone || null,
      linked_user_id: userId,
    });
    if (tenantError) throw new Error(tenantError.message);

    return { userId, tenantCreated: true };
  } catch (err) {
    // Best-effort cleanup: remove auth user if tenant/profile/role setup failed
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch {
      // ignore cleanup errors
    }
    throw err;
  }
}
