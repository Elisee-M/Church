"use client";

import type { Activity, ActivityType, Database } from "@/types";

export function addActivity(
  db: Database,
  input: {
    type: ActivityType;
    title: string;
    description: string;
    actor: string;
    date?: string;
  },
) {
  const activity: Activity = {
    id: `act-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
    type: input.type,
    title: input.title,
    description: input.description,
    actor: input.actor,
    date: input.date ?? new Date().toISOString(),
  };
  db.activities.unshift(activity);
  return activity;
}

export function notify(
  db: Database,
  input: {
    title: string;
    body: string;
    type: "payment" | "invoice" | "agreement" | "system";
    tenantId?: string;
  },
) {
  db.notifications.unshift({
    id: `n-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
    title: input.title,
    body: input.body,
    type: input.type,
    tenantId: input.tenantId,
    date: new Date().toISOString(),
    read: false,
  });
}
