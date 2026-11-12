"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, cn } from "@/lib/utils";
import type { ExpenseCategory } from "@/types";
import { ChartTooltip } from "./chart-tooltip";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "#94a3b8", "#cbd5e1"];

export function ExpenseDonut({
  data,
  className,
}: {
  data: { category: ExpenseCategory; total: number }[];
  className?: string;
}) {
  const chartData = data.map((item, index) => ({
    name: EXPENSE_CATEGORY_LABELS[item.category],
    value: item.total,
    color: COLORS[index % COLORS.length],
  }));
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-xs text-muted-foreground">No expenses recorded yet.</p>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-5 sm:flex-row", className)}>
      <div className="relative h-[158px] w-[158px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={3}
              stroke="none"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Total</p>
          <p className="mt-0.5 font-display text-[15px] font-semibold leading-tight">
            {formatCurrency(total, true)}
          </p>
        </div>
      </div>
      <div className="w-full space-y-2">
        {chartData.slice(0, 5).map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="shrink-0 font-medium">{formatCurrency(item.value, true)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
