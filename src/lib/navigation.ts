import {
  BarChart3,
  Building2,
  CreditCard,
  FileBadge,
  FileText,
  FolderOpen,
  GitCompareArrows,
  Home,
  LayoutDashboard,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  TrendingDown,
  UserCog,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/types";

export type NavItem = {
  titleKey: string;
  href: string;
  icon: LucideIcon;
  badge?: "overdueInvoices" | "pendingVerifications" | "tenantInvoices";
};

export type NavGroup = {
  labelKey: string;
  items: NavItem[];
};

export const NAVIGATION: Record<Role, NavGroup[]> = {
  admin: [
    {
      labelKey: "nav.overview",
      items: [{ titleKey: "nav.dashboard", href: "/admin/dashboard", icon: LayoutDashboard }],
    },
    {
      labelKey: "nav.management",
      items: [
        { titleKey: "nav.properties", href: "/admin/properties", icon: Building2 },
        { titleKey: "nav.tenants", href: "/admin/tenants", icon: Users },
        { titleKey: "nav.agreements", href: "/admin/agreements", icon: ScrollText },
      ],
    },
    {
      labelKey: "nav.account",
      items: [
        { titleKey: "nav.users", href: "/admin/users", icon: UserCog },
        { titleKey: "nav.settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ],
  accountant: [
    {
      labelKey: "nav.overview",
      items: [{ titleKey: "nav.dashboard", href: "/accountant/dashboard", icon: LayoutDashboard }],
    },
    {
      labelKey: "nav.finance",
      items: [
        { titleKey: "nav.invoices", href: "/accountant/invoices", icon: ReceiptText, badge: "overdueInvoices" },
        { titleKey: "nav.payments", href: "/accountant/payments", icon: Wallet },
        {
          titleKey: "nav.verification",
          href: "/accountant/verify",
          icon: ShieldCheck,
          badge: "pendingVerifications",
        },
        { titleKey: "nav.reconciliation", href: "/accountant/reconciliation", icon: GitCompareArrows },
        { titleKey: "nav.expenses", href: "/accountant/expenses", icon: TrendingDown },
        { titleKey: "nav.receipts", href: "/accountant/receipts", icon: FileBadge },
      ],
    },
    {
      labelKey: "nav.insights",
      items: [{ titleKey: "nav.reports", href: "/accountant/reports", icon: BarChart3 }],
    },
  ],
  tenant: [
    {
      labelKey: "nav.overview",
      items: [{ titleKey: "nav.dashboard", href: "/tenant/dashboard", icon: LayoutDashboard }],
    },
    {
      labelKey: "nav.management",
      items: [
        { titleKey: "nav.myRentals", href: "/tenant/rentals", icon: Home },
        {
          titleKey: "nav.myInvoices",
          href: "/tenant/invoices",
          icon: FileText,
          badge: "tenantInvoices",
        },
        { titleKey: "nav.makePayment", href: "/tenant/pay", icon: CreditCard },
        { titleKey: "nav.myPayments", href: "/tenant/payments", icon: Wallet },
        { titleKey: "nav.documents", href: "/tenant/documents", icon: FolderOpen },
      ],
    },
    {
      labelKey: "nav.account",
      items: [{ titleKey: "nav.profile", href: "/tenant/profile", icon: UserRound }],
    },
  ],
};

export function navForRole(role: Role) {
  return NAVIGATION[role];
}

export function findActiveItem(pathname: string, role: Role): NavItem | undefined {
  const items = NAVIGATION[role].flatMap((group) => group.items);
  return items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
