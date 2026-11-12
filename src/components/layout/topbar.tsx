"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { Role } from "@/types";
import { DEMO_USER } from "@/lib/constants";
import { findActiveItem } from "@/lib/navigation";
import { useTranslation } from "@/lib/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CommandSearch } from "./command-search";
import { LanguageSwitcher } from "./language-switcher";
import { NotificationsMenu } from "./notifications-menu";
import { RoleSwitcher } from "./role-switcher";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function Topbar({ role, onMenu }: { role: Role; onMenu: () => void }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const active = findActiveItem(pathname, role);
  const roleLabel =
    role === "admin" ? t("roles.adminPortal") : role === "accountant" ? t("roles.accountantPortal") : t("roles.tenantPortal");

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="flex h-[60px] items-center gap-3 px-4 md:px-6">
        <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onMenu}>
          <Menu className="size-5" />
          <span className="sr-only">Open navigation</span>
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            <span className="hidden sm:inline">{roleLabel}</span>
            <span className="hidden text-muted-foreground/40 sm:inline">/</span>
            <span className="truncate text-muted-foreground">{active ? t(active.titleKey) : "Genzura"}</span>
          </div>
          <h1 className="truncate font-display text-[15px] font-semibold leading-tight sm:text-base">
            {active ? t(active.titleKey) : DEMO_USER[role].title}
          </h1>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1.5">
          <div className="hidden md:block">
            <CommandSearch />
          </div>
          <RoleSwitcher />
          <NotificationsMenu />
          <ThemeToggle />
          <div className="hidden sm:block">
            <LanguageSwitcher compact />
          </div>
          <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <UserMenu />
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-border/60 px-4 py-1.5 md:hidden">
        <Badge variant="warning" className="text-[9px]">Demo</Badge>
        <span className="text-[10px] text-muted-foreground">{DEMO_USER[role].email}</span>
        <div className="ml-auto md:hidden">
          <CommandSearch />
        </div>
      </div>
    </header>
  );
}
