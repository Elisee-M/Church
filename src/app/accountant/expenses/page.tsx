import type { Metadata } from "next";
import { ExpensesWorkspace } from "@/features/expenses/expenses-workspace";

export const metadata: Metadata = {
  title: "Expenses",
  description: "Operating costs and expense records.",
};

export default function AccountantExpensesPage() {
  return <ExpensesWorkspace mode="accountant" />;
}
