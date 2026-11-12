"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, RotateCcw, Settings, UserRound } from "lucide-react";
import { toast } from "sonner";
import { DEMO_USER, ROLE_HOME } from "@/lib/constants";
import { initials } from "@/lib/utils";
import { resetDatabase } from "@/lib/services";
import { currentRole } from "./role-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const role = currentRole(pathname);
  const user = DEMO_USER[role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border border-border bg-card p-0.5 pr-2 shadow-sm transition hover:bg-accent">
          <Avatar className="size-7">
            <AvatarFallback className="text-[10px]">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[100px] truncate text-xs font-medium md:block">
            {user.name.split(" ")[0]}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <p className="text-[13px] font-semibold text-foreground">{user.name}</p>
          <p className="mt-0.5 truncate text-[11px] font-normal text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push(role === "tenant" ? "/tenant/profile" : role === "admin" ? "/admin/settings" : "/accountant/dashboard")}
        >
          {role === "tenant" ? <UserRound /> : <Settings />}
          {role === "tenant" ? "My profile" : "Settings"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(ROLE_HOME[role])}>
          <UserRound />
          {user.title}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            resetDatabase();
            toast.success("Demo data reset", {
              description: "All mock invoices, payments and records are back to the seeded state.",
            });
          }}
        >
          <RotateCcw />
          Reset demo data
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            router.push("/login");
            toast.message("Signed out of the demo");
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
