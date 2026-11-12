import type { Metadata } from "next";
import { InvoicesWorkspace } from "@/features/invoices/invoices-workspace";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Rent invoices, balances and fiscal references.",
};

export default function AccountantInvoicesPage() {
  return <InvoicesWorkspace basePath="/accountant" mode="accountant" />;
}
