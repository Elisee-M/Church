import type { Metadata } from "next";
import { ExpensesWorkspace } from "@/features/expenses/expenses-workspace";

export const metadata: Metadata = {
  title: "Expenses",
  description: "Operating costs and expense management.",
};

export default function AdminExpensesPage() {
  return <ExpensesWorkspace mode="admin" />;
}
