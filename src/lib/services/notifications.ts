"use client";

import { createClient } from "@/lib/supabase/client";
import { refreshDatabase } from "./store";

export async function markNotificationsRead(tenantId?: string) {
  const supabase = createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;
  const query = supabase.from("notifications").update({ is_read: true }).eq("user_id", user.user.id);
  if (tenantId) {
    // tenant-scoped notifications not modeled directly; best-effort no-op filter
  }
  const { error } = await query;
  if (error) throw new Error(error.message);
  await refreshDatabase();
}

export async function markNotificationRead(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw new Error(error.message);
  await refreshDatabase();
}
