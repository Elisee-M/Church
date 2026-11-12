import type { Metadata } from "next";
import { ReportsWorkspace } from "@/features/reports/reports-workspace";

export const metadata: Metadata = {
  title: "Reports",
  description: "Financial reports, arrears and operating costs.",
};

export default function AccountantReportsPage() {
  return <ReportsWorkspace mode="accountant" />;
}
