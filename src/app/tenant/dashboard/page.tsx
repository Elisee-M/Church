import type { Metadata } from "next";
import { TenantDashboard } from "@/features/dashboard/tenant-dashboard";

export const metadata: Metadata = {
  title: "My home",
  description: "Your rentals, invoices and payments.",
};

export default function TenantDashboardPage() {
  return <TenantDashboard />;
}
