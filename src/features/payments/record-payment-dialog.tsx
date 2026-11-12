"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, Info, Landmark, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { recordPayment } from "@/lib/services";
import { paymentSchema, type PaymentFormValues } from "@/lib/validations/schemas";
import { useDatabase } from "@/hooks/use-database";
import { invoiceBalance, todayISO } from "@/lib/mock-data/analytics";
import { formatCurrency, formatDate } from "@/lib/utils";
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
import { Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RecordPaymentDialog({
  defaultInvoiceId,
  actor = "Claudine Uwimana",
  onClose,
}: {
  defaultInvoiceId?: string;
  actor?: string;
  onClose: () => void;
}) {
  const db = useDatabase();
  const openInvoices = db.invoices
    .filter((invoice) => invoice.status !== "draft" && invoiceBalance(invoice) > 0)
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const initialInvoice =
    openInvoices.find((invoice) => invoice.id === defaultInvoiceId) ?? openInvoices[0];
  const initialBalance = initialInvoice ? invoiceBalance(initialInvoice) : 0;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId: initialInvoice?.id ?? "",
      amount: initialBalance,
      method: "mtn_momo",
      date: todayISO(),
      phone: "",
      bankName: db.settings.payments.bankName,
      reference: "",
      notes: "",
    },
  });
  const invoiceId = useWatch({ control: form.control, name: "invoiceId" });
  const method = useWatch({ control: form.control, name: "method" });
  const amount = useWatch({ control: form.control, name: "amount" });
  const invoice = db.invoices.find((item) => item.id === invoiceId);
  const balance = invoice ? invoiceBalance(invoice) : 0;
  const remaining = Math.max(balance - (Number(amount) || 0), 0);
  const overpaying = (Number(amount) || 0) > balance;

  const onSubmit = form.handleSubmit((values) => {
    const isBank = values.method === "bank_transfer";
    if (isBank && !values.bankName?.trim()) {
      toast.error("Enter the bank name for a bank transfer.");
      return;
    }
    try {
      recordPayment({
        invoiceId: values.invoiceId,
        amount: values.amount,
        method: values.method,
        date: values.date ? `${values.date}T12:00:00` : new Date().toISOString(),
        phone: values.phone || undefined,
        bankName: values.bankName || undefined,
        proofName: isBank ? "Proof recorded by staff" : undefined,
        notes: values.notes || undefined,
        status: isBank ? "pending" : "completed",
        verification: isBank ? "pending" : "verified",
        actor,
      });
      toast.success(isBank ? "Bank transfer recorded — awaiting verification" : "Payment recorded", {
        description: isBank
          ? `${formatCurrency(values.amount)} is pending verification and does not count as collected yet.`
          : `${formatCurrency(values.amount)} was applied to the invoice balance.`,
      });
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record the payment.");
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-success/10 text-success">
              <Banknote className="size-4" />
            </span>
            <div>
              <DialogTitle>Record a payment</DialogTitle>
              <DialogDescription>
                Apply a full or partial payment to an existing rent invoice.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Invoice" error={form.formState.errors.invoiceId?.message}>
            <Select
              value={invoiceId}
              onValueChange={(value) => {
                const next = db.invoices.find((item) => item.id === value);
                form.setValue("invoiceId", value, { shouldValidate: true });
                form.setValue("amount", next ? invoiceBalance(next) : 0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an invoice" />
              </SelectTrigger>
              <SelectContent>
                {openInvoices.map((item) => {
                  const tenant = db.tenants.find((entry) => entry.id === item.tenantId);
                  return (
                    <SelectItem key={item.id} value={item.id}>
                      {item.number} · {tenant?.name} · {formatCurrency(invoiceBalance(item))}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </Field>

          {invoice && (
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Invoice</p>
                <p className="mt-0.5 text-[11px] font-medium">{formatCurrency(invoice.amount)}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Paid</p>
                <p className="mt-0.5 text-[11px] font-medium text-success">
                  {formatCurrency(invoice.amountPaid)}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Balance</p>
                <p className="mt-0.5 text-[11px] font-semibold text-warning">
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount" htmlFor="payment-amount" error={form.formState.errors.amount?.message}>
              <Input
                id="payment-amount"
                type="number"
                min={1}
                step={1000}
                {...form.register("amount", { valueAsNumber: true })}
              />
              <button
                type="button"
                className="text-[10px] font-medium text-primary hover:underline dark:text-foreground"
                onClick={() => form.setValue("amount", balance, { shouldValidate: true })}
              >
                Use full balance
              </button>
            </Field>
            <Field label="Payment date" htmlFor="payment-date" error={form.formState.errors.date?.message}>
              <Input id="payment-date" type="date" {...form.register("date")} />
            </Field>
          </div>

          <Field label="Payment method" error={form.formState.errors.method?.message}>
            <Select
              value={method}
              onValueChange={(value) =>
                form.setValue("method", value as PaymentFormValues["method"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mtn_momo">MTN Mobile Money</SelectItem>
                <SelectItem value="airtel_money">Airtel Money</SelectItem>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {(method === "mtn_momo" || method === "airtel_money") && (
            <Field label="Mobile number" htmlFor="payment-phone" optional>
              <Input
                id="payment-phone"
                placeholder="078 000 0000"
                {...form.register("phone")}
              />
            </Field>
          )}

          {method === "bank_transfer" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bank" htmlFor="payment-bank" error={form.formState.errors.bankName?.message}>
                <Input id="payment-bank" {...form.register("bankName")} />
              </Field>
              <Field label="Bank reference" htmlFor="payment-reference" optional>
                <Input id="payment-reference" placeholder="Transfer reference" {...form.register("reference")} />
              </Field>
            </div>
          )}

          <Field label="Internal notes" htmlFor="payment-notes" optional>
            <Textarea
              id="payment-notes"
              placeholder="Optional notes for the finance team…"
              {...form.register("notes")}
            />
          </Field>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[11px]">
            <span className="text-muted-foreground">Balance after this payment</span>
            <span className={overpaying ? "font-semibold text-destructive" : "font-semibold"}>
              {formatCurrency(Math.max(remaining, 0))}
            </span>
          </div>

          {overpaying && (
            <p className="text-[11px] text-destructive">
              The amount exceeds the outstanding balance of {formatCurrency(balance)}.
            </p>
          )}

          {method === "bank_transfer" && (
            <div className="flex items-start gap-2 rounded-lg bg-warning/[0.07] px-3 py-2.5 text-[10.5px] leading-relaxed text-muted-foreground">
              <Landmark className="mt-0.5 size-3.5 shrink-0 text-warning" />
              Bank transfers are recorded as pending and excluded from collected rent until the
              accountant verifies proof of payment.
            </div>
          )}

          {(method === "mtn_momo" || method === "airtel_money") && (
            <div className="flex items-start gap-2 rounded-lg bg-accent/70 px-3 py-2.5 text-[10.5px] leading-relaxed text-muted-foreground dark:bg-white/[0.04]">
              <Smartphone className="mt-0.5 size-3.5 shrink-0" />
              Record a mobile money payment only after the transaction is confirmed on the merchant
              device. Genzura never asks for a PIN.
            </div>
          )}

          {invoice && (
            <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Info className="size-3" /> Payment will be applied immediately on the{" "}
              {formatDate(invoice.issueDate, "month")} invoice.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || overpaying || openInvoices.length === 0}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
