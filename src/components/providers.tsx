"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { LocaleProvider } from "@/lib/providers/locale-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LocaleProvider>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "!rounded-xl !border-border !bg-card !text-card-foreground !shadow-card !font-sans",
              description: "!text-muted-foreground",
            },
          }}
        />
      </LocaleProvider>
    </ThemeProvider>
  );
}
