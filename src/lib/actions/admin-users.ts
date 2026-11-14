"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/auth/roles";

type ManagedUserRole = "Administrator" | "Accountant" | "Property Manager" | "Viewer" | "Tenant";

export type InviteUserInput = {
  name: string;
  email: string;
  phone?: string;
  role: ManagedUserRole;
};

export type CreateUserInput = InviteUserInput & {
  password: string;
};

function mapRole(role: ManagedUserRole): "admin" | "accountant" | "tenant" | null {
  if (role === "Administrator") return "admin";
  if (role === "Accountant") return "accountant";
  if (role === "Tenant") return "tenant";
  return null; // Property Manager / Viewer not in app_role enum
}

async function requireAdminAndOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const actorRole = await getUserRole(supabase, user.id);
  if (actorRole !== "admin") throw new Error("Only administrators can manage users.");

  const { data: org } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
  if (!org?.id) throw new Error("No organization found. Create an organization before managing users.");

  return { actorId: user.id, orgId: org.id as string };
}

async function ensureProfileAndRole(opts: {
  userId: string;
  orgId: string;
  actorId: string;
  input: { name: string; email: string; phone?: string; role: ManagedUserRole };
}) {
  const admin = createAdminClient();
  const { error: profileError } = await admin.from("profiles").upsert({
    id: opts.userId,
    full_name: opts.input.name,
    email: opts.input.email,
    phone: opts.input.phone ?? null,
    is_active: true,
  });
  if (profileError) throw new Error(profileError.message);

  const dbRole = mapRole(opts.input.role);
  if (dbRole) {
    const { error: roleError } = await admin.from("user_roles").upsert(
      { user_id: opts.userId, organization_id: opts.orgId, role: dbRole, created_by: opts.actorId },
      { onConflict: "user_id,organization_id,role" },
    );
    if (roleError) throw new Error(roleError.message);
  }
}

export async function inviteUserAction(input: InviteUserInput) {
  const { actorId, orgId } = await requireAdminAndOrg();
  const admin = createAdminClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`;

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.name, phone: input.phone ?? null },
    redirectTo,
  });

  if (inviteError || !invited.user) {
    throw new Error(inviteError?.message ?? "Could not invite user.");
  }

  await ensureProfileAndRole({ userId: invited.user.id, orgId, actorId, input });
  return { userId: invited.user.id, invited: true };
}

export async function createUserAction(input: CreateUserInput) {
  const { actorId, orgId } = await requireAdminAndOrg();
  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.name, phone: input.phone ?? null },
  });

  if (createError || !created.user) {
    throw new Error(createError?.message ?? "Could not create user.");
  }

  await ensureProfileAndRole({ userId: created.user.id, orgId, actorId, input });
  return { userId: created.user.id, created: true };
}
