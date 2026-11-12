"use client";

import type { AppSettings } from "@/types";
import { mutateDatabase } from "./store";
import { addActivity } from "./activity";

export function updateSettings(patch: Partial<AppSettings>) {
  mutateDatabase((db) => {
    db.settings = {
      ...db.settings,
      ...patch,
      organization: { ...db.settings.organization, ...(patch.organization ?? {}) },
      payments: { ...db.settings.payments, ...(patch.payments ?? {}) },
      ebm: { ...db.settings.ebm, ...(patch.ebm ?? {}) },
      invoices: { ...db.settings.invoices, ...(patch.invoices ?? {}) },
      penalties: { ...db.settings.penalties, ...(patch.penalties ?? {}) },
    };
    addActivity(db, {
      type: "system",
      title: "Settings updated",
      description: "Organization or financial configuration was updated.",
      actor: "Administrator",
    });
  });
}
