"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyFinancialPoint } from "@/types";
import { ChartTooltip } from "./chart-tooltip";

const NAMES = { expected: "Expected", collected: "Collected", expenses: "Expenses" };

export function FinancialChart({ data, height = 280 }: { data: MonthlyFinancialPoint[]; height?: number }) {
  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 px-5">
        {[
          { label: "Expected", color: "var(--border)" },
          { label: "Collected", color: "var(--chart-1)" },
          { label: "Expenses", color: "var(--chart-4)" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <span
              className="size-2 rounded-[3px]"
              style={{
                backgroundColor: item.color,
                outline: item.label === "Expected" ? "1px solid var(--input)" : undefined,
              }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: -14, bottom: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10.5 }}
            dy={8}
          />
          <YAxis
            tickFormatter={(value: number) => `${(value / 1_000_000).toFixed(0)}M`}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10.5 }}
            width={46}
          />
          <Tooltip
            content={<ChartTooltip nameMap={NAMES} />}
            cursor={{ fill: "var(--muted)", opacity: 0.45 }}
          />
          <Bar dataKey="expected" fill="var(--border)" radius={[4, 4, 0, 0]} barSize={13} />
          <Bar dataKey="collected" fill="var(--chart-1)" radius={[4, 4, 0, 0]} barSize={13} />
          <Line
            type="monotone"
            dataKey="expenses"
            stroke="var(--chart-4)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
