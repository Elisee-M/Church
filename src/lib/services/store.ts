"use client";

import type { Database } from "@/types";
import { createSeedDatabase } from "@/lib/mock-data";

let database: Database = createSeedDatabase();
const serverSnapshot: Database = database;
const listeners = new Set<() => void>();

export function getDatabase(): Database {
  return database;
}

export function getServerDatabase(): Database {
  return serverSnapshot;
}

export function subscribeToDatabase(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * All mutations are applied to a cloned database before being published, so
 * React sees a new immutable snapshot and service code stays separate from UI.
 * This in-memory layer is the seam that will be replaced by Supabase services.
 */
export function mutateDatabase(mutator: (draft: Database) => void) {
  const draft = structuredClone(database);
  mutator(draft);
  database = draft;
  notify();
}

export function resetDatabase() {
  database = createSeedDatabase();
  notify();
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}
