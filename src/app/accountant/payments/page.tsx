import type { Metadata } from "next";
import { PaymentsWorkspace } from "@/features/payments/payments-workspace";

export const metadata: Metadata = {
  title: "Payment history",
  description: "All payment transactions, verification and corrections.",
};

export default function AccountantPaymentsPage() {
  return <PaymentsWorkspace basePath="/accountant" mode="accountant" />;
}
