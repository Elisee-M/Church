import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const TONES = {
  default: "bg-secondary text-primary dark:bg-white/[0.06] dark:text-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  navy: "bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  trendLabel,
  tone = "default",
  className,
  loading,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  tone?: keyof typeof TONES;
  className?: string;
  loading?: boolean;
}) {
  const positive = (trend ?? 0) >= 0;

  return (
    <Card className={cn("group relative overflow-hidden p-5 shadow-soft transition-shadow hover:shadow-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.075em] text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <div className="mt-2.5 h-7 w-28 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="mt-2 font-display text-[26px] font-semibold leading-none tracking-tight">
              {value}
            </p>
          )}
        </div>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
          <Icon className="size-[18px]" strokeWidth={1.9} />
        </span>
      </div>
      <div className="mt-3 flex min-h-4 flex-wrap items-center gap-x-2 gap-y-1">
        {typeof trend === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold",
              positive ? "text-success" : "text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {(hint || trendLabel) && (
          <span className="text-[11px] text-muted-foreground">{hint ?? trendLabel}</span>
        )}
      </div>
    </Card>
  );
}
