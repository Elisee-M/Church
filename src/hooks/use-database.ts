"use client";

import * as React from "react";
import type { Database } from "@/types";
import {
  getDatabase,
  getServerDatabase,
  subscribeToDatabase,
} from "@/lib/services/store";

export function useDatabase(): Database {
  return React.useSyncExternalStore(
    subscribeToDatabase,
    getDatabase,
    getServerDatabase,
  );
}

/** Small, deliberate skeleton delay so loading states are part of the prototype. */
export function usePageReady(delay = 320) {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);
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
