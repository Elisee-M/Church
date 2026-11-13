"use client";

import * as React from "react";
import type { Database } from "@/types";
import {
  getDatabase,
  getServerDatabase,
  subscribeToDatabase,
  isDatabaseLoaded,
  refreshDatabase,
} from "@/lib/services/store";

export function useDatabase(): Database {
  const db = React.useSyncExternalStore(
    subscribeToDatabase,
    getDatabase,
    getServerDatabase,
  );
  React.useEffect(() => {
    if (!isDatabaseLoaded()) void refreshDatabase();
  }, []);
  return db;
}

/** Ready when initial data load has completed (or a short delay), to drive skeleton states. */
export function usePageReady(delay = 320) {
  const [ready, setReady] = React.useState(() => isDatabaseLoaded());
  React.useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => {
      if (isDatabaseLoaded()) setReady(true);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [delay, ready]);
  // become ready when store notifies after load
  React.useEffect(() => {
    const unsubscribe = subscribeToDatabase(() => {
      if (isDatabaseLoaded()) setReady(true);
    });
    return () => unsubscribe();
  }, []);
  return ready;
}

export function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (callback: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    [query],
  );
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useCopyToClipboard() {
  const [copied, setCopied] = React.useState<string | null>(null);

  const copy = React.useCallback(async (value: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label ?? value);
      window.setTimeout(() => setCopied(null), 1800);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { copied, copy };
}
