import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
  optional,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  optional?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {optional && <span className="text-[10px] text-muted-foreground">Optional</span>}
      </div>
      {children}
      {error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[10.5px] leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
