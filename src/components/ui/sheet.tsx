"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetContent({
  className,
  children,
  side = "left",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "left" | "right" | "top" | "bottom";
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-slate-950/55 backdrop-blur-[2px]" />
      <SheetPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-sidebar shadow-2xl transition ease-in-out",
          side === "left" && "inset-y-0 left-0 h-full w-[290px] animate-in border-r border-sidebar-border",
          side === "right" && "inset-y-0 right-0 h-full w-[320px] border-l border-sidebar-border",
          side === "top" && "inset-x-0 top-0 h-auto border-b border-sidebar-border",
          side === "bottom" && "inset-x-0 bottom-0 h-auto border-t border-sidebar-border",
          className,
        )}
        style={{ animationDuration: "240ms" }}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-80 transition hover:bg-muted hover:opacity-100">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-5", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      className={cn("font-display text-base font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
};
