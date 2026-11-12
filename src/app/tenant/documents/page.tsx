import type { Metadata } from "next";
import { TenantDocuments } from "@/features/tenant/tenant-documents";

export const metadata: Metadata = {
  title: "My documents",
  description: "Invoices, receipts and agreement documents.",
};

export default function TenantDocumentsPage() {
  return <TenantDocuments />;
}
