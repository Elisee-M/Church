"use client";

import * as React from "react";
import {
  Ban,
  Check,
  Clock3,
  Mail,
  MailPlus,
  MoreHorizontal,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserRound,
  UserRoundX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { SystemUser, SystemUserRole } from "@/types";
import { formatDateTime, initials } from "@/lib/utils";
import { updateUser } from "@/lib/services";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingPanel } from "@/components/shared/states";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { InviteUserDialog } from "./invite-user-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLES: SystemUserRole[] = [
  "Administrator",
  "Accountant",
  "Property Manager",
  "Tenant",
  "Viewer",
];

const ROLE_DESCRIPTION: Record<SystemUserRole, string> = {
  Administrator: "Full system access, financial approvals and user management.",
  Accountant: "Payments, verification, expenses, invoices and reports.",
  "Property Manager": "Buildings, spaces, agreements and tenant records.",
  Tenant: "Own rentals, invoices and payment history only.",
  Viewer: "Read-only access to dashboards and reports.",
};

export function UsersWorkspace() {
  const db = useDatabase();
  const ready = usePageReady();
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const selected = db.users.find((user) => user.id === selectedId);
  const filtered = db.users.filter(
    (user) =>
      (roleFilter === "all" || user.role === roleFilter) &&
      (statusFilter === "all" || user.status === statusFilter),
  );
  const active = db.users.filter((user) => user.status === "active");
  const invited = db.users.filter((user) => user.status === "invited");
  const staff = db.users.filter((user) => user.role !== "Tenant");

  const toggleStatus = async (user: SystemUser) => {
    const next = user.status === "active" ? "suspended" : "active";
    try {
      await updateUser(user.id, { status: next });
      toast.success(next === "active" ? "Access restored" : "Access suspended", {
        description: `${user.name} is now ${next}.`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update user.");
    }
  };

  const columns: DataTableColumn<SystemUser>[] = [
    {
      id: "user",
      header: "User",
      sortValue: (user) => user.name,
      cell: (user) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="text-[10px]">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[11.5px] font-medium">{user.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      sortValue: (user) => user.role,
      cell: (user) => (
        <Badge variant={user.role === "Administrator" ? "navy" : "neutral"}>{user.role}</Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (user) => user.status,
      cell: (user) => <StatusBadge status={user.status} />,
    },
    {
      id: "phone",
      header: "Phone",
      cell: (user) => <span className="text-[10.5px] text-muted-foreground">{user.phone}</span>,
    },
    {
      id: "lastActive",
      header: "Last active",
      sortValue: (user) => user.lastActive,
      cell: (user) => (
        <span className="text-[10.5px] text-muted-foreground">
          {user.lastActive === "—" ? "Never" : formatDateTime(user.lastActive)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (user) => (
        <div onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">User actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedId(user.id)}>
                <UserRound /> View details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast.message(user.status === "invited" ? "Invitation re-sent" : "Email sent", {
                    description: `${user.email} · email delivery is simulated in this prototype.`,
                  })
                }
              >
                <RefreshCw /> {user.status === "invited" ? "Resend invitation" : "Send email"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.status === "active" ? (
                <DropdownMenuItem variant="destructive" onClick={() => toggleStatus(user)}>
                  <Ban /> Suspend access
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => toggleStatus(user)}>
                  <Check /> Activate access
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (!ready) {
    return (
      <>
        <PageHeader title="Users" description="Loading team accounts…" />
        <LoadingPanel />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Users & access"
        description="Team accounts, roles and permissions. Invitations and access changes are audited."
        actions={
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <MailPlus className="size-3.5" /> Invite user
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total accounts"
          value={db.users.length}
          hint={`${staff.length} internal · ${db.users.length - staff.length} tenant`}
          icon={Users}
          tone="navy"
        />
        <StatCard
          label="Active accounts"
          value={active.length}
          hint="Signed in at least once"
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard
          label="Pending invitations"
          value={invited.length}
          hint="Awaiting first sign-in"
          icon={Clock3}
          tone="warning"
        />
        <StatCard
          label="Suspended accounts"
          value={db.users.filter((user) => user.status === "suspended").length}
          hint="Access currently blocked"
          icon={UserRoundX}
          tone="danger"
        />
      </div>

      <div className="mt-5">
        <div className="mb-2.5">
          <h2 className="text-[13px] font-semibold">Team directory</h2>
          <p className="text-[10.5px] text-muted-foreground">
            Manage roles, invitations, and access for administrators, accountants, and staff.
          </p>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(user) => user.id}
          getSearchText={(user) => `${user.name} ${user.email} ${user.phone} ${user.role}`}
          searchPlaceholder="Search users by name, email or role…"
          onRowClick={(user) => setSelectedId(user.id)}
          emptyTitle="No users match"
          emptyDescription="Adjust the role or status filter, or invite a new team member."
          emptyAction={
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              <MailPlus className="size-3.5" /> Invite user
            </Button>
          }
          toolbar={
            <>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger size="sm" className="h-8.5 w-[150px] bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger size="sm" className="h-8.5 w-[130px] bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              {(roleFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8.5 text-[11px]"
                  onClick={() => {
                    setRoleFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Clear
                </Button>
              )}
            </>
          }
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Shield className="size-3.5" /> Demo accounts are isolated from future authentication.
        </span>
        <span>{db.users.length} accounts on this workspace</span>
      </div>

      {inviteOpen && <InviteUserDialog onClose={() => setInviteOpen(false)} />}

      {selected && (
        <Sheet open onOpenChange={(open) => !open && setSelectedId(null)}>
          <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-md">
            <div className="border-b border-border p-5">
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="size-11">
                    <AvatarFallback className="text-xs">{initials(selected.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-[15px]">{selected.name}</SheetTitle>
                    <SheetDescription className="truncate">
                      {selected.email} · {selected.phone}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="mt-3 flex items-center gap-2">
                <StatusBadge status={selected.status} />
                <Badge variant={selected.role === "Administrator" ? "navy" : "neutral"}>
                  {selected.role}
                </Badge>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Role & access
                </p>
                <Select
                  value={selected.role}
                  onValueChange={async (value) => {
                    try {
                      await updateUser(selected.id, { role: value as SystemUserRole });
                      toast.success("Role updated", {
                        description: `${selected.name} is now ${value}.`,
                      });
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Could not update role.");
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  {ROLE_DESCRIPTION[selected.role]}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Permissions
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {selected.permissions.map((permission) => (
                    <li key={permission} className="flex items-center gap-2 text-[11px]">
                      <span className="flex size-4 items-center justify-center rounded-full bg-success/10 text-success">
                        <Check className="size-2.5" />
                      </span>
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Last active</span>
                  <span>
                    {selected.lastActive === "—" ? "Never" : formatDateTime(selected.lastActive)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Account ID</span>
                  <span className="font-mono text-[10px]">{selected.id}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() =>
                    toast.message("Invitation sent", {
                      description: `${selected.email} · email delivery is simulated in this prototype.`,
                    })
                  }
                >
                  <Mail className="size-3.5" /> Send account email
                </Button>
                {selected.status === "active" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-destructive"
                    onClick={() => toggleStatus(selected)}
                  >
                    <Ban className="size-3.5" /> Suspend access
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => toggleStatus(selected)}
                  >
                    <Check className="size-3.5" /> Activate access
                  </Button>
                )}
              </div>

              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Access changes are recorded in the activity log. User accounts are part of the demo
                data and reset when the demo database is reset.
              </p>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
