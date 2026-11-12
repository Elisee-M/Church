import type { Metadata } from "next";
import { ReconciliationWorkspace } from "@/features/payments/reconciliation-workspace";

export const metadata: Metadata = {
  title: "Reconciliation",
  description: "Match bank and mobile money statements against the rent ledger.",
};

export default function AccountantReconciliationPage() {
  return <ReconciliationWorkspace />;
}
