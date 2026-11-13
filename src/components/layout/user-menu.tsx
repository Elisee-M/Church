"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, Settings, UserRound } from "lucide-react";
import { toast } from "sonner";
import { initials } from "@/lib/utils";
import { ROLE_HOME, type AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  accountant: "Accountant",
  tenant: "Tenant",
};

function currentRole(pathname: string): AppRole {
  if (pathname.startsWith("/accountant")) return "accountant";
  if (pathname.startsWith("/tenant")) return "tenant";
  return "admin";
}

export function UserMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const role = currentRole(pathname);
  const user = { name: ROLE_LABEL[role] ?? "User", email: "", title: ROLE_LABEL[role] ?? "User" };

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
          <p className="mt-0.5 truncate text-[11px] font-normal text-muted-foreground">
            {user.email || "Signed in"}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            router.push(
              role === "tenant"
                ? "/tenant/profile"
                : role === "admin"
                  ? "/admin/settings"
                  : "/accountant/dashboard",
            )
          }
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
          variant="destructive"
          onClick={async () => {
            try {
              if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
                const supabase = createClient();
                await supabase.auth.signOut();
              }
              toast.message("Signed out");
              router.push("/login");
              router.refresh();
            } catch {
              router.push("/login");
            }
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
