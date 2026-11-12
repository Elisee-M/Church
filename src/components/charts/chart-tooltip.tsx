import type { TooltipContentProps } from "recharts";
import { formatCurrency } from "@/lib/utils";

export function ChartTooltip({
  active,
  payload,
  label,
  nameMap,
}: Partial<TooltipContentProps<number, string>> & { nameMap?: Record<string, string> }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[180px] rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-card">
      {label !== undefined && (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={`${entry.dataKey ?? index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className="size-2 rounded-[3px]"
                style={{ backgroundColor: entry.color ?? "var(--chart-1)" }}
              />
              {nameMap?.[String(entry.dataKey)] ?? entry.name}
            </span>
            <span className="text-[11.5px] font-semibold">
              {formatCurrency(Number(entry.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
