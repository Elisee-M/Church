"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/providers/locale-provider";
import { createClient } from "@/lib/supabase/client";
import { getUserRole, ROLE_HOME } from "@/lib/auth/roles";

const loginSchema = z.object({
  email: z.string().min(1, "Enter your email").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    const err = searchParams.get("error");
    if (err === "no_role") {
      toast.error("No role assigned", {
        description: "Your account does not have an assigned role yet. Contact an administrator.",
      });
    } else if (err === "auth_callback") {
      toast.error("Authentication failed", {
        description: "The sign-in or recovery link is invalid or expired. Please try again.",
      });
    }
  }, [searchParams]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
        toast.error("Supabase is not configured", {
          description: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
        });
        return;
      }
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        toast.error("Sign in failed", { description: error.message });
        return;
      }
      const role = data.user ? await getUserRole(supabase, data.user.id) : null;
      if (!role) {
        await supabase.auth.signOut();
        toast.error("No role assigned", {
          description: "Your account is authenticated but has no role. Contact an administrator.",
        });
        return;
      }
      const next = searchParams.get("next");
      toast.success("Welcome to Genzura");
      router.replace(next && next.startsWith("/") ? next : ROLE_HOME[role]);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to sign in.";
      toast.error("Sign in failed", { description: message });
    }
  });

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-7 flex flex-col items-start">
        <Logo priority className="h-16 md:h-20" />
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Property Management Made Simple.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-7">
        <div className="mb-5">
          <h1 className="font-display text-xl font-semibold tracking-tight">{t("auth.welcomeBack")}</h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {t("auth.signInSubtitle")}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-medium text-primary hover:underline dark:text-foreground"
              >
                {t("auth.forgot")}
              </Link>
            </div>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="pl-9 pr-9"
                aria-invalid={Boolean(form.formState.errors.password)}
                {...form.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-[11px] text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[11.5px] text-muted-foreground">
            <input
              type="checkbox"
              className="size-3.5 rounded border-input accent-[#142B4A]"
              {...form.register("remember")}
            />
            {t("auth.remember")}
          </label>

          <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> {t("auth.signingIn")}
              </>
            ) : (
              t("auth.signIn")
            )}
          </Button>
        </form>
      </div>

      <div className="mt-6 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>© {new Date().getFullYear()} Genzura — {t("common.allRightsReserved")}</span>
        <span className="flex items-center gap-1">
          <LockKeyhole className="size-3" /> {t("auth.secureAccess")}
        </span>
      </div>
    </div>
  );
}
