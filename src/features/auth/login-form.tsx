"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import { ROLE_HOME } from "@/lib/constants";
import type { Role } from "@/types";

const loginSchema = z.object({
  email: z.string().min(1, "Enter your email").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

const PORTALS: { role: Role; label: string }[] = [
  { role: "admin", label: "Administrator" },
  { role: "accountant", label: "Accountant" },
  { role: "tenant", label: "Tenant" },
];

export function LoginForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = React.useState(false);
  const [pendingRole, setPendingRole] = React.useState<Role | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = form.handleSubmit(async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
    toast.success("Signed in", {
      description: "Authentication will be connected when the backend is added.",
    });
    router.push("/admin/dashboard");
  });

  const enterAs = (role: Role) => {
    setPendingRole(role);
    window.setTimeout(() => {
      toast.success(`Entering the ${role} portal`);
      router.push(ROLE_HOME[role]);
    }, 450);
  };

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
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-semibold tracking-tight">{t("auth.welcomeBack")}</h1>
          </div>
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
                placeholder="you@genzura.rw"
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

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {t("auth.continueAs")}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {PORTALS.map((portal) => (
            <button
              key={portal.role}
              type="button"
              disabled={pendingRole !== null}
              onClick={() => enterAs(portal.role)}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-3 text-center transition hover:border-primary/30 hover:bg-accent disabled:opacity-60"
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-[10px] font-bold uppercase text-primary dark:text-foreground">
                {portal.role.slice(0, 2)}
              </span>
              <span className="text-[10.5px] font-medium">{portal.label}</span>
              {pendingRole === portal.role && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>© {new Date().getFullYear()} Genzura · {t("common.allRightsReserved")}</span>
        <span className="flex items-center gap-1">
          <LockKeyhole className="size-3" /> {t("auth.secureAccess")}
        </span>
      </div>
    </div>
  );
}
