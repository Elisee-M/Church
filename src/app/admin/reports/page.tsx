import type { Metadata } from "next";
import { ReportsWorkspace } from "@/features/reports/reports-workspace";

export const metadata: Metadata = {
  title: "Reports",
  description: "Rent roll, collection and expense reports.",
};

export default function AdminReportsPage() {
  return <ReportsWorkspace mode="admin" />;
}
