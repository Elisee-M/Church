"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CircleDollarSign,
  FileText,
  ScrollText,
  Settings2,
} from "lucide-react";
import type { NotificationType } from "@/types";

import { formatDateTime, cn } from "@/lib/utils";
import { useDatabase } from "@/hooks/use-database";
import { markNotificationRead, markNotificationsRead } from "@/lib/services";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const iconForType: Record<NotificationType, React.ElementType> = {
  payment: CircleDollarSign,
  invoice: FileText,
  agreement: ScrollText,
  system: Settings2,
};

export function NotificationsMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const db = useDatabase();
  const isTenant = pathname.startsWith("/tenant");
  const notifications = db.notifications
    .filter((notification) => (isTenant ? notification.tenantId === (db.tenants[0]?.id ?? "") : !notification.tenantId))
    .slice(0, 8);
  const unread = notifications.filter((notification) => !notification.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative text-muted-foreground">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-warning" />
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-[11px] text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "You're up to date"}
            </p>
          </div>
          {unread > 0 && (
            <button
              onClick={async () => { try { await markNotificationsRead(isTenant ? db.tenants[0]?.id : undefined); } catch {} }}
              className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline dark:text-foreground"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto thin-scrollbar">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = iconForType[notification.type];
              return (
                <button
                  key={notification.id}
                  onClick={() => {
                    void markNotificationRead(notification.id).catch(() => {});
                    router.push(
                      isTenant
                        ? notification.type === "invoice"
                          ? "/tenant/invoices"
                          : notification.type === "payment"
                            ? "/tenant/payments"
                            : "/tenant/documents"
                        : notification.type === "payment"
                          ? "/admin/payments"
                          : notification.type === "invoice"
                            ? "/admin/invoices"
                            : "/admin/agreements",
                    );
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition hover:bg-muted/50",
                    !notification.read && "bg-accent/40",
                  )}
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary dark:text-foreground">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-semibold">{notification.title}</span>
                      {!notification.read && <span className="size-1.5 shrink-0 rounded-full bg-primary dark:bg-foreground" />}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                      {notification.body}
                    </span>
                    <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      {formatDateTime(notification.date)}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem
          className="justify-center rounded-none py-2.5 text-xs text-muted-foreground"
          onClick={() =>
            router.push(isTenant ? "/tenant/dashboard" : "/admin/dashboard")
          }
        >
          Open dashboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
