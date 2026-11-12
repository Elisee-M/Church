import type { Metadata } from "next";
import { SettingsWorkspace } from "@/features/settings/settings-workspace";

export const metadata: Metadata = {
  title: "Settings",
  description: "Organization, invoice, payment and EBM configuration.",
};

export default function AdminSettingsPage() {
  return <SettingsWorkspace />;
}
