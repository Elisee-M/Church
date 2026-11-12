import type { Metadata } from "next";
import { TenantPayments } from "@/features/tenant/tenant-payments";

export const metadata: Metadata = {
  title: "My payments",
  description: "Payment history, receipts and verification status.",
};

export default function TenantPaymentsPage() {
  return <TenantPayments />;
}
