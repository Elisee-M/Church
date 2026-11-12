import { PortalShell } from "@/components/layout/portal-shell";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell role="tenant">{children}</PortalShell>;
}
