"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

import { navForRole } from "@/lib/navigation";
import { useTranslation } from "@/lib/providers/locale-provider";
import { useDatabase } from "@/hooks/use-database";
import { useCurrentTenantId } from "@/hooks/use-current-tenant";
import { invoiceBalance } from "@/lib/mock-data/analytics";
import { Logo } from "./logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SidebarProps = {
  role: Role;
  collapsed: boolean;
  mobile?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
};

export function Sidebar({ role, collapsed, mobile, onToggle, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const db = useDatabase();
  const { t } = useTranslation();
  const groups = navForRole(role);

  const currentTenantId = useCurrentTenantId();
  const badgeCounts = {
    overdueInvoices: db.invoices.filter(
      (invoice) =>
        (role === "tenant" ? invoice.tenantId === currentTenantId : true) &&
        invoice.status === "overdue" &&
        invoiceBalance(invoice) > 0,
    ).length,
    pendingVerifications: db.payments.filter((payment) => payment.verification === "pending").length,
    tenantInvoices: db.invoices.filter(
      (invoice) =>
        invoice.tenantId === currentTenantId &&
        invoiceBalance(invoice) > 0,
    ).length,
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex h-[68px] shrink-0 items-center border-b border-sidebar-border",
          collapsed && !mobile ? "justify-center px-2" : "px-5",
        )}
      >
        <Link
          href={`/${role}/dashboard`}
          onClick={onNavigate}
          className="flex min-w-0 items-center"
          aria-label="Genzura home"
        >
          <Logo variant={collapsed && !mobile ? "compact" : "full"} className={cn(collapsed && !mobile ? "h-8" : "h-10")} />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 thin-scrollbar">
        {groups.map((group, groupIndex) => (
          <div key={group.labelKey} className={cn(groupIndex > 0 && "mt-5")}>
            {!collapsed || mobile ? (
              <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted/80">
                {t(group.labelKey)}
              </p>
            ) : (
              groupIndex > 0 && <div className="mx-auto mb-3 h-px w-6 bg-sidebar-border" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const badge = item.badge ? badgeCounts[item.badge] : 0;
                const content = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg py-2 text-[13px] font-medium transition-colors",
                      collapsed && !mobile ? "justify-center px-2" : "px-2.5",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/75 hover:bg-black/[0.045] hover:text-sidebar-foreground dark:hover:bg-white/[0.05]",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-[17px] shrink-0",
                        active ? "text-primary-foreground" : "text-sidebar-muted group-hover:text-sidebar-foreground",
                      )}
                      strokeWidth={active ? 2.2 : 1.9}
                    />
                    {(!collapsed || mobile) && (
                      <>
                        <span className="flex-1 truncate">{t(item.titleKey)}</span>
                        {badge > 0 && (
                          <span
                            className={cn(
                              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                              active
                                ? "bg-white/20 text-primary-foreground"
                                : "bg-destructive/10 text-destructive",
                            )}
                          >
                            {badge}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && !mobile && badge > 0 && (
                      <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-destructive ring-2 ring-sidebar" />
                    )}
                  </Link>
                );

                return (
                  <li key={item.href}>
                    {collapsed && !mobile ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{content}</TooltipTrigger>
                        <TooltipContent side="right">{t(item.titleKey)}</TooltipContent>
                      </Tooltip>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        {!mobile && onToggle && (
          <button
            onClick={onToggle}
            className={cn(
              "flex h-8 w-full items-center gap-2 rounded-md px-2 text-[11px] font-medium text-sidebar-muted transition hover:bg-black/[0.045] hover:text-sidebar-foreground dark:hover:bg-white/[0.05]",
              collapsed && "justify-center",
            )}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {!collapsed && <span>Collapse sidebar</span>}
            <span className="sr-only">Toggle sidebar</span>
          </button>
        )}
      </div>
    </div>
  );
}
