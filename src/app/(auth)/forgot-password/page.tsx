"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/providers/locale-provider";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().min(1, "Enter your email").email("Enter a valid email address"),
});

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [sent, setSent] = React.useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
        toast.error("Supabase is not configured", {
          description: "Set Supabase environment variables before requesting a password reset.",
        });
        return;
      }
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
      });
      if (error) {
        toast.error("Could not send reset email", { description: error.message });
        return;
      }
      setSent(true);
    } catch (e) {
      toast.error("Could not send reset email", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  });

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-7">
        <Logo className="h-16" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-7">
        {sent ? (
          <div className="py-3 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-6" />
            </div>
            <h1 className="mt-4 font-display text-xl font-semibold">Check your inbox</h1>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              If an account exists for that email, a password reset link has been sent.
            </p>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link href="/login">
                <ArrowLeft className="size-4" /> {t("auth.backToSignIn")}
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-xl font-semibold tracking-tight">{t("auth.forgotTitle")}</h1>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {t("auth.forgotSubtitle")}
            </p>
            <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">{t("auth.email")}</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    aria-invalid={Boolean(form.formState.errors.email)}
                    {...form.register("email")}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-[11px] text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {t("auth.sendReset")}
              </Button>
            </form>
            <Link
              href="/login"
              className="mt-5 flex items-center justify-center gap-1.5 text-[11.5px] font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> {t("auth.backToSignIn")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
