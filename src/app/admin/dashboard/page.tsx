import type { Metadata } from "next";
import { AdminDashboard } from "@/features/dashboard/admin-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Church property, tenant and rent overview.",
};

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
