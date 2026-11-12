"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, FileText, Search, Users } from "lucide-react";

import { useDatabase } from "@/hooks/use-database";
import { navForRole } from "@/lib/navigation";
import { useTranslation } from "@/lib/providers/locale-provider";
import { formatCurrency } from "@/lib/utils";
import { currentRole } from "./role-switcher";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function CommandSearch() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const pathname = usePathname();
  const router = useRouter();
  const db = useDatabase();
  const { t } = useTranslation();
  const role = currentRole(pathname);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  };

  const normalized = query.trim().toLowerCase();
  const pages = navForRole(role)
    .flatMap((group) => group.items)
    .filter((item) => t(item.titleKey).toLowerCase().includes(normalized));

  const tenants =
    role === "tenant"
      ? []
      : db.tenants
          .filter(
            (tenant) =>
              tenant.name.toLowerCase().includes(normalized) ||
              tenant.email.toLowerCase().includes(normalized),
          )
          .slice(0, 4);

  const invoices = db.invoices
    .filter((invoice) => (role === "tenant" ? invoice.tenantId === (db.tenants[0]?.id ?? "") : true))
    .filter(
      (invoice) =>
        invoice.number.toLowerCase().includes(normalized) ||
        (db.tenants.find((tenant) => tenant.id === invoice.tenantId)?.name ?? "")
          .toLowerCase()
          .includes(normalized),
    )
    .slice(0, 4);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const hasResults = pages.length + tenants.length + invoices.length > 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs text-muted-foreground shadow-sm transition hover:bg-accent sm:w-44 md:w-56"
      >
        <Search className="size-3.5" />
        <span className="hidden flex-1 text-left sm:block">Search anything…</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:block">
          ⌘K
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showClose={false} className="top-[20%] max-w-xl translate-y-0 gap-3 p-3">
          <DialogTitle className="sr-only">Search Genzura</DialogTitle>
          <DialogDescription className="sr-only">
            Search pages, tenants and invoices.
          </DialogDescription>
          <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3">
            <Search className="size-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages, tenants, invoices…"
              className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>
          <div className="max-h-[420px] overflow-y-auto thin-scrollbar">
            {!hasResults && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No matches for “{query}”.
              </p>
            )}
            {pages.length > 0 && (
              <ResultGroup label="Pages">
                {pages.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => go(item.href)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-accent"
                  >
                    <item.icon className="size-4 text-muted-foreground" />
                    <span className="flex-1">{t(item.titleKey)}</span>
                    <span className="text-[10px] text-muted-foreground">{item.href}</span>
                  </button>
                ))}
              </ResultGroup>
            )}
            {tenants.length > 0 && (
              <ResultGroup label="Tenants">
                {tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => go(`/admin/tenants/${tenant.id}`)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-accent"
                  >
                    <Users className="size-4 text-muted-foreground" />
                    <span className="flex-1">{tenant.name}</span>
                    <Badge variant="neutral">{tenant.type}</Badge>
                  </button>
                ))}
              </ResultGroup>
            )}
            {invoices.length > 0 && (
              <ResultGroup label="Invoices">
                {invoices.map((invoice) => (
                  <button
                    key={invoice.id}
                    onClick={() =>
                      go(
                        role === "tenant"
                          ? `/tenant/invoices/${invoice.id}`
                          : role === "accountant"
                            ? `/accountant/invoices/${invoice.id}`
                            : `/admin/invoices/${invoice.id}`,
                      )
                    }
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-accent"
                  >
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="flex-1">{invoice.number}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(invoice.amount)}
                    </span>
                  </button>
                ))}
              </ResultGroup>
            )}
            {!query && (
              <div className="mt-1 flex items-center gap-2 border-t border-border px-2.5 pt-3 text-[11px] text-muted-foreground">
                <Building2 className="size-3.5" />
                {db.spaces.length} spaces · {db.tenants.length} tenants · {db.invoices.length} invoices
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
