import type { Metadata } from "next";
import { TenantInvoices } from "@/features/tenant/tenant-invoices";

export const metadata: Metadata = {
  title: "My invoices",
  description: "Rent invoices, balances and due dates.",
};

export default function TenantInvoicesPage() {
  return <TenantInvoices />;
}
