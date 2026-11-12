import { PortalShell } from "@/components/layout/portal-shell";

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell role="accountant">{children}</PortalShell>;
}
