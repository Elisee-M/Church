import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  priority?: boolean;
  variant?: "full" | "compact";
};

/**
 * The official Genzura lockup lives at /assets/genzura-logo.png (copied from the
 * repository root). It is never recreated or recoloured — only scaled with
 * object-contain so the original aspect ratio and transparency are preserved.
 */
export function Logo({ className, priority = false, variant = "full" }: LogoProps) {
  return (
    <Image
      src="/assets/genzura-logo.png"
      alt="Genzura — Property Management Made Simple"
      width={1536}
      height={1024}
      priority={priority}
      className={cn(
        "w-auto object-contain select-none",
        variant === "full" ? "h-11" : "h-8",
        className,
      )}
    />
  );
}
