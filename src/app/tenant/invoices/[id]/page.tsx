import type { Metadata } from "next";
import { InvoiceDetail } from "@/features/invoices/invoice-detail";

export const metadata: Metadata = {
  title: "Invoice detail",
  description: "Rental invoice, payment history and receipt.",
};

export default async function TenantInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoiceDetail invoiceId={id} basePath="/tenant" mode="tenant" />;
}
