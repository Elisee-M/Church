"use client";

import type { SystemUserRole } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { refreshDatabase } from "./store";

export type UserInput = {
  name: string;
  email: string;
  phone: string;
  role: SystemUserRole;
};

function dbRole(role: SystemUserRole): "admin" | "accountant" | "tenant" | null {
  if (role === "Administrator") return "admin";
  if (role === "Accountant") return "accountant";
  if (role === "Tenant") return "tenant";
  return null; // Property Manager / Viewer not modeled in DB roles enum; skip role assignment
}

export async function inviteUser(_input: UserInput) { void _input;
  // Provisioning/invites require admin API and server-side workflow (service role) per security rules.
  // Not performed from client. UI should call a secure server action/route when implemented.
  throw new Error(
    "User provisioning must be performed via a secure server-side admin workflow. (Not available from the client.)",
  );
}

export async function updateUser(id: string, patch: Partial<Pick<{ role: SystemUserRole; status: string }, "role" | "status">>) {
  const supabase = createClient();
  if (patch.status !== undefined) {
    const isActive = patch.status === "active";
    const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", id);
    if (error) throw new Error(error.message);
  }
  if (patch.role !== undefined) {
    const role = dbRole(patch.role);
    if (role) {
      const { data: org } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
      if (org?.id) {
        // replace roles in org for simplicity
        await supabase.from("user_roles").delete().eq("user_id", id).eq("organization_id", org.id);
        const { error } = await supabase.from("user_roles").insert({ user_id: id, organization_id: org.id, role });
        if (error) throw new Error(error.message);
      }
    }
  }
  await refreshDatabase();
}
