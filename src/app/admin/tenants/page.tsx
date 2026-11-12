import type { Metadata } from "next";
import { TenantsWorkspace } from "@/features/tenants/tenants-workspace";

export const metadata: Metadata = {
  title: "Tenants",
  description: "Tenant directory and account balances.",
};

export default function TenantsPage() {
  return <TenantsWorkspace />;
}
