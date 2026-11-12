import type { Metadata } from "next";
import { ReceiptsWorkspace } from "@/features/payments/receipts-workspace";

export const metadata: Metadata = {
  title: "Receipts & EBM",
  description: "Payment receipts and external EBM fiscal references.",
};

export default function AccountantReceiptsPage() {
  return <ReceiptsWorkspace />;
}
