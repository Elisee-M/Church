"use client";

import * as React from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateMonthlyInvoices } from "@/lib/services";
import { useDatabase } from "@/hooks/use-database";
import { currentMonthKey, invoiceBalance } from "@/lib/mock-data/analytics";
import { formatCurrency, monthLabel } from "@/lib/utils";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function GenerateInvoicesDialog({ onClose }: { onClose: () => void }) {
  const db = useDatabase();
  const [period, setPeriod] = React.useState(currentMonthKey());
  const [submitting, setSubmitting] = React.useState(false);

  const activeAgreements = db.agreements.filter(
    (agreement) => agreement.status === "active" || agreement.status === "expiring",
  );
  const alreadyInvoiced = activeAgreements.filter((agreement) =>
    db.invoices.some(
      (invoice) => invoice.agreementId === agreement.id && invoice.period === period,
    ),
  ).length;
  const pending = activeAgreements.length - alreadyInvoiced;
  const projected = activeAgreements.reduce((sum, agreement) => {
    const already = db.invoices.some(
      (invoice) => invoice.agreementId === agreement.id && invoice.period === period,
    );
    if (already) return sum;
    return sum + agreement.lineItems.reduce((lineSum, line) => lineSum + line.monthlyRent, 0);
  }, 0);
  const openBalances = db.invoices.filter(
    (invoice) => invoice.status !== "draft" && invoiceBalance(invoice) > 0,
  ).length;

  const submit = () => {
    if (!period) {
      toast.error("Select the billing month.");
      return;
    }
    setSubmitting(true);
    try {
      const generated = generateMonthlyInvoices(period);
      if (generated === 0) {
        toast.message("No new invoices generated", {
          description: `Every active agreement already has an invoice for ${monthLabel(period)}.`,
        });
      } else {
        toast.success(`${generated} invoices generated`, {
          description: `${monthLabel(period)} rent invoices are now available for ${formatCurrency(projected)}.`,
        });
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate invoices.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
              <CalendarPlus className="size-4" />
            </span>
            <div>
              <DialogTitle>Generate monthly invoices</DialogTitle>
              <DialogDescription>
                One invoice per active agreement, combining every rented space.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invoice-period">Billing month</Label>
            <Input
              id="invoice-period"
              type="month"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            />
            <p className="text-[10.5px] text-muted-foreground">
              Existing invoices for the same agreement and month are never duplicated.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Active agreements
              </p>
              <p className="mt-1 font-display text-xl font-semibold">{activeAgreements.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Invoices to create
              </p>
              <p className="mt-1 font-display text-xl font-semibold">{pending}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium">Projected rent</p>
              <Badge variant="navy">{monthLabel(period)}</Badge>
            </div>
            <p className="mt-1 font-display text-[22px] font-semibold">{formatCurrency(projected)}</p>
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              {alreadyInvoiced} agreement{alreadyInvoiced === 1 ? "" : "s"} already invoiced for this
              month · {openBalances} invoices currently carry a balance.
            </p>
          </div>

          <div className="rounded-lg bg-accent/70 px-3 py-2.5 text-[10.5px] leading-relaxed text-muted-foreground dark:bg-white/[0.04]">
            Invoices are due on each agreement&apos;s configured due day. Generating an invoice does
            not create an EBM fiscal document — the accountant records that reference separately.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || pending === 0}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Generate {pending > 0 ? `${pending} invoices` : "invoices"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
