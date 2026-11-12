import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.02fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#142B4A] text-white lg:flex lg:flex-col lg:justify-between">
        <div className="surface-grid absolute inset-0 opacity-[0.07]" />
        <div className="absolute -right-28 -top-28 size-[420px] rounded-full border border-white/10" />
        <div className="absolute -bottom-40 -left-24 size-[380px] rounded-full border border-white/10" />
        <div className="absolute bottom-[22%] left-0 h-px w-24 bg-[#FE8E00]" />

        <div className="relative z-10 p-10 xl:p-14">
          <div className="inline-flex rounded-xl bg-white p-2.5 shadow-lg">
            <Logo priority className="h-12" />
          </div>
          <h1 className="mt-14 max-w-md font-display text-[34px] font-semibold leading-[1.15] tracking-tight xl:text-[40px]">
            Property management, built for stewardship.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65">
            One calm workspace for the church&apos;s buildings, tenants, agreements and rent — with
            a financial trail you can trust.
          </p>

          <ul className="mt-9 space-y-3.5 text-[13px] text-white/80">
            {[
              "Every building, space and tenant in one place.",
              "Rent, invoices and payments with a clear audit trail.",
              "Tenant self-service with Mobile Money simulation.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#4ADE80]" strokeWidth={2} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 p-10 xl:p-14">
          <div className="max-w-sm rounded-xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45">
                  Genzura Plaza · November
                </p>
                <p className="mt-1 font-display text-xl font-semibold">RWF 8,850,000</p>
                <p className="text-[11px] text-white/50">Expected monthly rent</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2 text-right">
                <p className="font-display text-lg font-semibold text-[#4ADE80]">74%</p>
                <p className="text-[9px] uppercase tracking-wide text-white/45">Occupied</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full ${index < 7 ? "bg-[#4ADE80]/70" : "bg-white/15"}`}
                />
              ))}
            </div>
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-white/30">
            ADEPR Kigali Central · Genzura Property Management
          </p>
        </div>
      </aside>

      <main className="relative flex min-h-dvh items-center justify-center px-5 py-12 sm:px-8">
        <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
          <LanguageSwitcher compact />
          <ThemeToggle />
        </div>
        <div className="absolute left-4 top-5 flex items-center gap-2 lg:hidden">
          <Image
            src="/assets/genzura-logo.png"
            alt="Genzura"
            width={1536}
            height={1024}
            priority
            className="h-9 w-auto object-contain"
          />
        </div>
        {children}
      </main>
    </div>
  );
}
