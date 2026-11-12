import type { Metadata } from "next";
import { AccountantDashboard } from "@/features/dashboard/accountant-dashboard";

export const metadata: Metadata = {
  title: "Financial dashboard",
  description: "Collections, verification and reconciliation overview.",
};

export default function AccountantDashboardPage() {
  return <AccountantDashboard />;
}
