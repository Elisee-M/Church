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

export type UpdateManagedUserInput = {
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: ManagedUserRole;
  status?: "active" | "suspended";
};

export async function updateManagedUserAction(input: UpdateManagedUserInput) {
  const { actorId, orgId } = await requireAdminAndOrg();
  if (!input.userId) throw new Error("User is required.");
  const admin = createAdminClient();

  // Prevent admin from suspending/removing their own admin access in risky ways? allow normal edits except maybe not critical here.
  const profilePatch: Record<string, any> = {};
  if (input.name !== undefined) profilePatch.full_name = input.name;
  if (input.email !== undefined) profilePatch.email = input.email;
  if (input.phone !== undefined) profilePatch.phone = input.phone ?? null;
  if (input.status !== undefined) profilePatch.is_active = input.status === "active";

  const authPatch: Record<string, any> = {};
  if (input.email !== undefined) {
    authPatch.email = input.email;
    authPatch.email_confirm = true;
  }
  if (input.name !== undefined || input.phone !== undefined) {
    authPatch.user_metadata = {
      ...(input.name !== undefined ? { full_name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
    };
  }

  if (Object.keys(authPatch).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(input.userId, authPatch);
    if (error) throw new Error(error.message);
  }

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await admin.from("profiles").update(profilePatch).eq("id", input.userId);
    if (error) throw new Error(error.message);
  }

  if (input.role !== undefined) {
    // Replace roles for this org with selected mapped role (if mapped)
    const dbRole = mapRole(input.role);
    await admin.from("user_roles").delete().eq("user_id", input.userId).eq("organization_id", orgId);
    if (dbRole) {
      const { error } = await admin.from("user_roles").insert({
        user_id: input.userId,
        organization_id: orgId,
        role: dbRole,
        created_by: actorId,
      });
      if (error) throw new Error(error.message);
    }
    // If role not mapped (Property Manager/Viewer), we clear app_role rows; UI-level role still shown from selection context not stored.
  }

  return { updated: true };
}

export async function deleteUserAction(userId: string) {
  const { actorId } = await requireAdminAndOrg();
  if (!userId) throw new Error("User is required.");
  if (userId === actorId) throw new Error("You cannot delete your own account.");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  return { deleted: true };
}
