import type { Metadata } from "next";
import { VerificationQueue } from "@/features/payments/verification-queue";

export const metadata: Metadata = {
  title: "Verification queue",
  description: "Review pending bank transfers and mobile money payments.",
};

export default function AccountantVerifyPage() {
  return <VerificationQueue />;
}
