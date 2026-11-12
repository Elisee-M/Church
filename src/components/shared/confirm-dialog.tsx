"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
  children?: React.ReactNode;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div
            className={cn(
              "mb-1 flex size-9 items-center justify-center rounded-lg",
              variant === "destructive" ? "bg-destructive/10 text-destructive" : "bg-accent text-primary dark:bg-secondary dark:text-foreground",
            )}
          >
            <AlertTriangle className="size-4" />
          </div>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          {children}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <Button variant={variant === "destructive" ? "destructive" : "default"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  label = "Reason",
  placeholder = "Explain why this action is needed…",
  confirmLabel = "Confirm",
  variant = "default",
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  onSubmit: (reason: string) => void;
  children?: React.ReactNode;
}) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason("");
      setError("");
    }
    onOpenChange(next);
  };

  const submit = () => {
    if (reason.trim().length < 4) {
      setError("Please provide a clear reason (at least 4 characters).");
      return;
    }
    onSubmit(reason.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <div className="space-y-2">
          <Label htmlFor="reason-dialog">{label}</Label>
          <Textarea
            id="reason-dialog"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setError("");
            }}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
          />
          {error && <p className="text-[11px] text-destructive">{error}</p>}
          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            The original record stays in history. This reason is stored with the correction.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={variant === "destructive" ? "destructive" : "default"} onClick={submit}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
