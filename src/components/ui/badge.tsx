import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-5 tracking-wide whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        success:
          "border-success/20 bg-success/10 text-success dark:border-success/25 dark:bg-success/15",
        warning:
          "border-warning/25 bg-warning/10 text-warning dark:border-warning/30 dark:bg-warning/15",
        danger:
          "border-destructive/20 bg-destructive/10 text-destructive dark:border-destructive/30 dark:bg-destructive/15",
        info: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:border-blue-400/25 dark:bg-blue-400/15 dark:text-blue-300",
        navy: "border-primary/15 bg-accent text-primary dark:border-border dark:bg-secondary dark:text-foreground",
        neutral:
          "border-border bg-muted text-muted-foreground dark:border-border dark:bg-secondary",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
