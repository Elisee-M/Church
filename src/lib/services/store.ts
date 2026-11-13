"use client";

import type { Database } from "@/types";
import { emptyDatabase, fetchDatabaseFromSupabase } from "@/lib/data/supabase-db";

let database: Database = emptyDatabase();
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getDatabase(): Database {
  return database;
}

export function getServerDatabase(): Database {
  return emptyDatabase();
}

export function subscribeToDatabase(listener: () => void) {
  listeners.add(listener);
  // kick off initial load on first subscription (client-side)
  if (typeof window !== "undefined" && !loaded && !loading) {
    void refreshDatabase();
  }
  return () => {
    listeners.delete(listener);
  };
}

export async function refreshDatabase() {
  if (typeof window === "undefined") return;
  if (loading) return loading;
  loading = (async () => {
    try {
      database = await fetchDatabaseFromSupabase();
      loaded = true;
    } catch {
      // keep previous/empty database on error; UI can show empty states
    } finally {
      loading = null;
      notify();
    }
  })();
  return loading;
}

/** Compatibility shim: no-op. Data is re-fetched from Supabase. */
export function mutateDatabase(mutator: (draft: Database) => void) {
  void mutator;
  // Legacy in-memory mutations are no longer the source of truth.
  // Call refreshDatabase() after performing real Supabase mutations.
  void refreshDatabase();
}

/** Compatibility: triggers a refetch from Supabase. */
export function resetDatabase() {
  void refreshDatabase();
}

export function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}

export function isDatabaseLoaded() {
  return loaded;
}
