"use client";

import * as React from "react";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

const STORAGE_KEY = "genzura-sidebar-collapsed";

export function PortalShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    // Hydration-safe read: localStorage is only available after mount.
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="min-h-dvh bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border transition-[width] duration-200 lg:block",
          collapsed ? "w-[76px]" : "w-[256px]",
        )}
      >
        <Sidebar role={role} collapsed={collapsed} onToggle={toggle} />
      </aside>

      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[256px]",
        )}
      >
        <Topbar role={role} onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1560px] flex-1 px-4 py-5 md:px-6 lg:px-8 lg:py-7">
          {children}
        </main>
        <footer className="mx-auto flex w-full max-w-[1560px] flex-wrap items-center justify-between gap-2 px-4 pb-6 pt-2 text-[10px] text-muted-foreground/70 md:px-6 lg:px-8">
          <span>Genzura · Property Management Made Simple.</span>
          <span>Frontend prototype · Mock data · No real transactions</span>
        </footer>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0">
          <SheetTitle className="sr-only">Genzura navigation</SheetTitle>
          <Sidebar
            role={role}
            collapsed={false}
            mobile
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
