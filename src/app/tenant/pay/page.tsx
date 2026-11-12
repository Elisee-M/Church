import type { Metadata } from "next";
import { Suspense } from "react";
import { TenantPay } from "@/features/tenant/tenant-pay";
import { LoadingPanel } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "Make a payment",
  description: "Pay rent with mobile money or submit bank transfer proof.",
};

export default function TenantPayPage() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Make a payment" description="Loading your payment options…" />
          <LoadingPanel />
        </>
      }
    >
      <TenantPay />
    </Suspense>
  );
}
