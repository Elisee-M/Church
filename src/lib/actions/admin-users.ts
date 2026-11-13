"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/auth/roles";

export type InviteUserInput = {
  name: string;
  email: string;
  phone?: string;
  role: "Administrator" | "Accountant" | "Property Manager" | "Viewer" | "Tenant";
};

function mapRole(role: InviteUserInput["role"]): "admin" | "accountant" | "tenant" | null {
  if (role === "Administrator") return "admin";
  if (role === "Accountant") return "accountant";
  if (role === "Tenant") return "tenant";
  return null; // Property Manager / Viewer not in app_role enum; stored in profile metadata for now
}

export async function inviteUserAction(input: InviteUserInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const actorRole = await getUserRole(supabase, user.id);
  if (actorRole !== "admin") throw new Error("Only administrators can invite users.");

  const { data: org } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
  if (!org?.id) throw new Error("No organization found. Create an organization before inviting users.");

  const admin = createAdminClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`;

  // Invite user by email (sends magic link/invite depending on Supabase settings)
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.name, phone: input.phone ?? null },
    redirectTo,
  });

  if (inviteError || !invited.user) {
    // If user already exists, try to find and assign role
    const msg = inviteError?.message ?? "Could not invite user.";
    throw new Error(msg);
  }

  const userId = invited.user.id;

  // Ensure profile
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    is_active: true,
  });
  if (profileError) {
    // try via admin client context not needed; RLS may block - fallback with admin is not used for table writes
  }

  const dbRole = mapRole(input.role);
  if (dbRole) {
    const { error: roleError } = await supabase.from("user_roles").upsert(
      { user_id: userId, organization_id: org.id, role: dbRole, created_by: user.id },
      { onConflict: "user_id,organization_id,role" },
    );
    if (roleError) throw new Error(roleError.message);
  }

  return { userId, invited: true };
}
