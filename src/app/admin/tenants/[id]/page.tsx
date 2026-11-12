import type { Metadata } from "next";
import { TenantDetail } from "@/features/tenants/tenant-detail";

export const metadata: Metadata = {
  title: "Tenant profile",
  description: "Tenant details, statement and rental history.",
};

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TenantDetail tenantId={id} />;
}
