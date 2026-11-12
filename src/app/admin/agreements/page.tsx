import type { Metadata } from "next";
import { Suspense } from "react";
import { AgreementsWorkspace } from "@/features/agreements/agreements-workspace";
import { LoadingPanel } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "Agreements",
  description: "Rental agreements and space assignments.",
};

export default function AgreementsPage() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Agreements" description="Loading rental agreements…" />
          <LoadingPanel />
        </>
      }
    >
      <AgreementsWorkspace />
    </Suspense>
  );
}
