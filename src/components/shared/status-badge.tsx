import { Badge } from "@/components/ui/badge";
import { STATUS_TONE } from "@/lib/constants";
import { cn, titleCase } from "@/lib/utils";

export function StatusBadge({
  status,
  label,
  className,
  dot = true,
}: {
  status: string;
  label?: string;
  className?: string;
  dot?: boolean;
}) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <Badge variant={tone} className={cn("capitalize tracking-normal", className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {label ?? titleCase(status)}
    </Badge>
  );
}
