"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export function OccupancyDonut({
  occupied,
  vacant,
  maintenance = 0,
  rate,
  className,
}: {
  occupied: number;
  vacant: number;
  maintenance?: number;
  rate: number;
  className?: string;
}) {
  const data = [
    { name: "Occupied", value: occupied, color: "var(--success)" },
    { name: "Vacant", value: vacant, color: "var(--chart-2)" },
    { name: "Maintenance", value: maintenance, color: "var(--warning)" },
  ].filter((item) => item.value > 0);

  return (
    <div className={cn("flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7", className)}>
      <div className="relative h-[168px] w-[168px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={58}
              outerRadius={80}
              paddingAngle={3}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-2xl font-semibold leading-none">{Math.round(rate)}%</p>
          <p className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
            Occupied
          </p>
        </div>
      </div>
      <div className="w-full space-y-2.5">
        {[
          { name: "Occupied", value: occupied, color: "var(--success)" },
          { name: "Vacant", value: vacant, color: "var(--chart-2)" },
          ...(maintenance ? [{ name: "Maintenance", value: maintenance, color: "var(--warning)" }] : []),
        ].map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 text-[11.5px]">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
            <span className="font-semibold">{item.value}</span>
          </div>
        ))}
        <div className="!mt-3 border-t border-border pt-2.5">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-muted-foreground">Total spaces</span>
            <span className="font-semibold">{occupied + vacant + maintenance}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
