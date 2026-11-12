"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Check, FlaskConical } from "lucide-react";
import type { Role } from "@/types";
import { DEMO_USER, ROLE_HOME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/providers/locale-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const ROLES: { role: Role; labelKey: string; description: string }[] = [
  { role: "admin", labelKey: "roles.adminPortal", description: "Full property & finance access" },
  { role: "accountant", labelKey: "roles.accountantPortal", description: "Verification & financial control" },
  { role: "tenant", labelKey: "roles.tenantPortal", description: "Self-service for Aline Uwase" },
];

export function currentRole(pathname: string): Role {
  if (pathname.startsWith("/accountant")) return "accountant";
  if (pathname.startsWith("/tenant")) return "tenant";
  return "admin";
}

export function RoleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const role = currentRole(pathname);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="hidden items-center gap-2 rounded-full border border-border bg-card py-1 pl-2 pr-2.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:bg-accent sm:flex">
          <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
            <FlaskConical className="size-3" />
            Demo
          </span>
          <span className="text-foreground">{t(ROLES.find((item) => item.role === role)?.labelKey ?? "roles.admin")}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Demo role switcher</DropdownMenuLabel>
        <p className="px-2.5 pb-2 text-xs leading-relaxed text-muted-foreground">
          Test every portal without authentication. This switch is development-only and is isolated
          from future Supabase auth.
        </p>
        <DropdownMenuSeparator />
        {ROLES.map((item) => (
          <DropdownMenuItem
            key={item.role}
            className={cn("items-start py-2.5", role === item.role && "bg-accent/70")}
            onClick={() => router.push(ROLE_HOME[item.role])}
          >
            <div className="flex w-full items-start gap-2.5">
              <div className="mt-0.5 flex size-7 items-center justify-center rounded-md bg-secondary text-[10px] font-bold uppercase text-primary dark:text-foreground">
                {item.role.slice(0, 2)}
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-foreground">{t(item.labelKey)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{item.description}</p>
              </div>
              {role === item.role ? (
                <Check className="mt-1 size-4 text-success" />
              ) : (
                <ArrowUpRight className="mt-1 size-3.5 text-muted-foreground/60" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <Badge variant="warning">Frontend only</Badge>
          <span className="text-[11px] text-muted-foreground">{DEMO_USER[role].email}</span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
