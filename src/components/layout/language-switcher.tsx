"use client";

import { Check, Languages } from "lucide-react";
import { useTranslation } from "@/lib/providers/locale-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon-sm" : "sm"} className="gap-2 text-muted-foreground">
          <Languages className="size-4" />
          {!compact && <span className="text-xs font-semibold uppercase">{locale}</span>}
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Language · Ururimi</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLocale("en")}>
          <span className="flex-1">English</span>
          {locale === "en" && <Check className="size-4 text-primary dark:text-foreground" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale("rw")}>
          <span className="flex-1">Kinyarwanda</span>
          {locale === "rw" && <Check className="size-4 text-primary dark:text-foreground" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
