import type { Metadata } from "next";
import { PaymentsWorkspace } from "@/features/payments/payments-workspace";

export const metadata: Metadata = {
  title: "Payments",
  description: "Payment ledger, verification and corrections.",
};

export default function AdminPaymentsPage() {
  return <PaymentsWorkspace basePath="/admin" mode="admin" />;
}
