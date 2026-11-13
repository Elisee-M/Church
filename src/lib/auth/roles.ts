import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "admin" | "accountant" | "tenant";

export const ROLE_HOME: Record<AppRole, string> = {
  admin: "/admin/dashboard",
  accountant: "/accountant/dashboard",
  tenant: "/tenant/dashboard",
};

export function roleFromPath(pathname: string): AppRole | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/accountant")) return "accountant";
  if (pathname.startsWith("/tenant")) return "tenant";
  return null;
}

export function isPortalPath(pathname: string) {
  return Boolean(roleFromPath(pathname));
}

const PRIORITY: Record<AppRole, number> = { admin: 3, accountant: 2, tenant: 1 };

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error || !data?.length) return null;

  const roles = data.map((r) => r.role as AppRole).filter(Boolean);
  if (!roles.length) return null;
  return roles.sort((a, b) => PRIORITY[b] - PRIORITY[a])[0] ?? null;
}
