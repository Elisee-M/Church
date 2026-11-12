import type { Metadata } from "next";
import { TenantProfile } from "@/features/tenant/tenant-profile";

export const metadata: Metadata = {
  title: "My profile",
  description: "Your contact details and account summary.",
};

export default function TenantProfilePage() {
  return <TenantProfile />;
}
