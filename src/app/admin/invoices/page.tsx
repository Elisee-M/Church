import type { Metadata } from "next";
import { InvoicesWorkspace } from "@/features/invoices/invoices-workspace";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Monthly rent invoices, balances and EBM references.",
};

export default function AdminInvoicesPage() {
  return <InvoicesWorkspace basePath="/admin" mode="admin" />;
}
