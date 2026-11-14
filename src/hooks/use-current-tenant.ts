"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { useDatabase } from "./use-database";

export function useCurrentUserId() {
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  return userId;
}

export function useCurrentTenantId() {
  const db = useDatabase();
  const userId = useCurrentUserId();

  return React.useMemo(() => {
    if (userId) {
      const tenant = db.tenants.find((item) => item.linkedUserId === userId);
      if (tenant) return tenant.id;
    }
    return db.tenants[0]?.id ?? "";
  }, [db, userId]);
}
