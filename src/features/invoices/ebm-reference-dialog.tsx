"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileBadge, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Invoice } from "@/types";
import { recordEbmReference } from "@/lib/services";
import { ebmSchema, type EbmFormValues } from "@/lib/validations/schemas";
import { Field } from "@/components/shared/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function EbmReferenceDialog({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const form = useForm<EbmFormValues>({
    resolver: zodResolver(ebmSchema),
    defaultValues: {
      reference: invoice.ebmReference ?? "",
      attachDocument: invoice.ebmStatus === "document_attached",
      documentName: "",
    },
  });
  const attachDocument = useWatch({ control: form.control, name: "attachDocument" });

  const onSubmit = form.handleSubmit((values) => {
    recordEbmReference(invoice.id, values.reference, values.attachDocument, values.documentName);
    toast.success("EBM reference saved", {
      description:
        "Only the reference to the externally issued fiscal invoice is stored — Genzura never generates an EBM invoice.",
    });
    onClose();
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <FileBadge className="size-4" />
            </span>
            <div>
              <DialogTitle>Record EBM reference</DialogTitle>
              <DialogDescription>
                {invoice.number} · store the fiscal reference issued outside Genzura.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field
            label="EBM reference"
            htmlFor="ebm-reference"
            error={form.formState.errors.reference?.message}
            hint="Copy the reference exactly as it appears on the fiscal invoice."
          >
            <Input
              id="ebm-reference"
              placeholder="e.g. EBM-2026-0114-88213"
              className="font-mono"
              {...form.register("reference")}
            />
          </Field>

          <div className="rounded-lg border border-border p-3.5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11.5px] font-medium">Attach the fiscal invoice PDF</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Optional. The PDF is stored as a document on this invoice.
                </p>
              </div>
              <Switch
                checked={attachDocument}
                onCheckedChange={(checked) => form.setValue("attachDocument", checked)}
              />
            </div>
            {attachDocument && (
              <div className="mt-3 space-y-1.5">
                <Input
                  placeholder="e.g. EBM-invoice-88213.pdf"
                  className="h-8 text-[11px]"
                  {...form.register("documentName")}
                />
                <p className="text-[9.5px] text-muted-foreground">
                  Demo only: the file name is stored with a simulated attachment.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[10.5px] leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Genzura does not generate fiscal invoices. This record only links the rental invoice to
            an EBM document issued externally.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Save reference
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
