import Image from "next/image";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.02fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#142B4A] text-white lg:flex lg:flex-col lg:justify-between">
        <div className="surface-grid absolute inset-0 opacity-[0.07]" />
        <div className="absolute -right-28 -top-28 size-[420px] rounded-full border border-white/10" />
        <div className="absolute -bottom-40 -left-24 size-[380px] rounded-full border border-white/10" />
        <div className="absolute bottom-[22%] left-0 h-px w-24 bg-[#FE8E00]" />

        <div className="relative z-10 p-10 xl:p-14">
          <div className="max-w-sm rounded-xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45">Genzura</p>
            <p className="mt-1 font-display text-xl font-semibold">Property Management</p>
            <p className="mt-1 text-[11px] text-white/50">Buildings, tenants, agreements, and rent in one clear workspace.</p>
          </div>
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
