import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";
import { LoadingPanel } from "@/components/shared/states";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Genzura church property and rental management.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingPanel />}>
      <LoginForm />
    </Suspense>
  );
}
