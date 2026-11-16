"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Landmark,
  Loader2,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { formatCurrency, formatDate, monthLabel } from "@/lib/utils";
import { getTenantSummary, invoiceBalance } from "@/lib/mock-data/analytics";
import { randomSimulationOutcome, simulateMobileMoneyPayment, submitBankTransferProof } from "@/lib/services";
import { buildDocumentPath, uploadDocument } from "@/lib/storage/documents";
import {
  bankProofSchema,
  momoPaymentSchema,
  type BankProofFormValues,
  type MomoPaymentFormValues,
} from "@/lib/validations/schemas";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { useCurrentTenantId } from "@/hooks/use-current-tenant";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, LoadingPanel } from "@/components/shared/states";
import { Field } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MomoPhase = "form" | "processing" | "success" | "failed";

export function TenantPay() {
  const db = useDatabase();
  const ready = usePageReady();
  const searchParams = useSearchParams();
  const requestedInvoice = searchParams.get("invoice");
  const tenantId = useCurrentTenantId();
  const summary = React.useMemo(() => getTenantSummary(db, tenantId), [db, tenantId]);
  const openInvoices = React.useMemo(
    () => summary.invoices.filter((item) => invoiceBalance(item) > 0),
    [summary.invoices],
  );
  const [invoiceId, setInvoiceId] = React.useState("");
  const [method, setMethod] = React.useState<"mtn_momo" | "airtel_money" | "bank_transfer">(
    "bank_transfer",
  );
  const [momoPhase, setMomoPhase] = React.useState<MomoPhase>("form");
  const [momoReference, setMomoReference] = React.useState<string | null>(null);
  const [lastMomoOutcome, setLastMomoOutcome] = React.useState<"success" | "failed" | null>(null);
  const [bankSubmitted, setBankSubmitted] = React.useState(false);
  const [proofFile, setProofFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    if (openInvoices.length === 0) return;
    setInvoiceId((current) => {
      if (current && openInvoices.some((item) => item.id === current)) return current;
      if (requestedInvoice && openInvoices.some((item) => item.id === requestedInvoice)) return requestedInvoice;
      return openInvoices[0].id;
    });
  }, [openInvoices, requestedInvoice]);

  const invoice = openInvoices.find((item) => item.id === invoiceId) ?? openInvoices[0];
  const balance = invoice ? invoiceBalance(invoice) : 0;

  const momoForm = useForm<MomoPaymentFormValues>({
    resolver: zodResolver(momoPaymentSchema),
    defaultValues: {
      amount: 0,
      method: "mtn_momo",
      phone: "",
    },
  });
  const momoMethod = useWatch({ control: momoForm.control, name: "method" });
  const momoAmount = useWatch({ control: momoForm.control, name: "amount" });

  const bankForm = useForm<BankProofFormValues>({
    resolver: zodResolver(bankProofSchema),
    defaultValues: {
      method: "bank_transfer",
      bankName: "",
      reference: "",
      amount: 0,
      proofName: "",
    },
  });
  const bankMethod = useWatch({ control: bankForm.control, name: "method" });

  React.useEffect(() => {
    if (!invoice) return;
    momoForm.reset({
      amount: balance,
      method: method === "airtel_money" ? "airtel_money" : "mtn_momo",
      phone: summary.tenant?.phone ?? "",
    });
  }, [invoice?.id, balance, method, summary.tenant?.phone, momoForm]);

  React.useEffect(() => {
    if (!invoice) return;
    bankForm.reset({
      method: "bank_transfer",
      bankName: db.settings.payments.bankName ?? "",
      reference: "",
      amount: balance,
      proofName: "",
    });
    setProofFile(null);
  }, [invoice?.id, balance, db.settings.payments.bankName, bankForm]);

  if (!ready) {
    return (
      <>
        <PageHeader title="Make a payment" description="Loading your payment optionsâ€¦" />
        <LoadingPanel />
      </>
    );
  }

  if (openInvoices.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Make a payment"
          description="Settle an invoice using mobile money or submit a bank transfer proof."
        />
        <div className="rounded-xl border border-border bg-card shadow-soft">
          <EmptyState
            icon={CheckCircle2}
            title="You're all caught up"
            description="There are no invoices with an outstanding balance. Receipts are available under My payments."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/tenant/payments">
                  View payments <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const submitMomo = momoForm.handleSubmit(async (values) => {
    if (!invoice) return;
    setMomoPhase("processing");
    setLastMomoOutcome(null);
    // Simulated mobile money confirmation flow. No real payment rail and never asks for a PIN.
    await new Promise((r) => setTimeout(r, 1800));
    try {
      const outcome = randomSimulationOutcome();
      const succeeded = outcome === "success";
      const ref = await simulateMobileMoneyPayment({
        invoiceId: invoice.id,
        amount: values.amount,
        method: values.method,
        phone: values.phone,
        outcome,
      });
      setMomoReference(ref);
      setLastMomoOutcome(succeeded ? "success" : "failed");
      setMomoPhase(succeeded ? "success" : "failed");
      if (succeeded) {
        toast.success("Payment received â€” thank you", {
          description: `${formatCurrency(values.amount)} for ${invoice.number} was confirmed. No real transaction was made.`,
        });
      } else {
        toast.error("Payment not completed", {
          description: "The simulated mobile money request failed. No invoice balance was changed.",
        });
      }
    } catch (error) {
      setMomoPhase("form");
      toast.error(error instanceof Error ? error.message : "Payment failed.");
    }
  });

  const submitBank = bankForm.handleSubmit(async (values) => {
    if (!invoice) return;
    try {
      let proofPath: string | undefined;
      if (values.method !== "cash" && proofFile) {
        const path = buildDocumentPath(
          ["tenants", invoice.tenantId, "payment-proofs", invoice.id],
          proofFile.name,
        );
        const uploaded = await uploadDocument({ bucket: "payment-proofs", path, file: proofFile });
        proofPath = uploaded.path;
      }
      await submitBankTransferProof({
        invoiceId: invoice.id,
        amount: values.amount,
        method: values.method,
        bankName: values.method === "bank_transfer" ? values.bankName : undefined,
        reference: values.method === "cash" ? "" : (values.reference ?? ""),
        proofName: values.method === "cash" ? undefined : (proofFile?.name || values.proofName || undefined),
        proofPath,
      });
      setBankSubmitted(true);
      toast.success(values.method === "cash" ? "Cash payment submitted" : "Proof submitted", {
        description:
          values.method === "cash"
            ? "Your cash payment has been submitted and is awaiting verification."
            : "Your payment proof is awaiting accountant verification and is not counted as collected yet.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit payment.");
    }
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Make a payment"
        description="Pay your rent using mobile money or submit bank transfer proof. All amounts are in Rwandan Francs."
        badge={<Badge variant="navy">Secure demo</Badge>}
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <SectionCard title="1. Choose an invoice" description="Select the invoice and amount to pay">
            <div className="space-y-4 px-5 pb-5">
              <Field label="Invoice">
                <Select
                  value={invoice?.id}
                  onValueChange={(value) => {
                    setInvoiceId(value);
                    const next = summary.invoices.find((item) => item.id === value);
                    if (next) {
                      const nextBalance = invoiceBalance(next);
                      momoForm.setValue("amount", nextBalance);
                      bankForm.setValue("amount", nextBalance);
                    }
                    setMomoPhase("form");
                    setBankSubmitted(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {openInvoices.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.number} Â· {monthLabel(item.period)} Â· {formatCurrency(invoiceBalance(item))}
                      </SelectItem>
                    ))}
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
            </div>
          </SectionCard>

          {false && <SectionCard title="2. Payment method" description="Choose how you want to pay">
            <div className="grid gap-2 px-5 pb-5 sm:grid-cols-3">
              {[
                {
                  id: "mtn_momo" as const,
                  label: "MTN MoMo",
                  description: "Mobile Money",
                  icon: Smartphone,
                  enabled: db.settings.payments.momoEnabled,
                },
                {
                  id: "airtel_money" as const,
                  label: "Airtel Money",
                  description: "Mobile Money",
                  icon: Smartphone,
                  enabled: db.settings.payments.airtelEnabled,
                },
                {
                  id: "bank_transfer" as const,
                  label: "Bank transfer",
                  description: "Upload proof",
                  icon: Landmark,
                  enabled: db.settings.payments.bankTransferEnabled,
                },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={!option.enabled}
                  onClick={() => {
                    setMethod(option.id);
                    if (option.id !== "bank_transfer") momoForm.setValue("method", option.id);
                    setMomoPhase("form");
                    setBankSubmitted(false);
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    method === option.id
                      ? "border-primary bg-accent/60 dark:border-white/20 dark:bg-white/[0.06]"
                      : "border-border bg-card hover:border-border/80 hover:bg-muted/30"
                  } ${!option.enabled ? "opacity-50" : ""}`}
                >
                  <option.icon className="size-4 text-primary dark:text-foreground" />
                  <p className="mt-2 text-[11.5px] font-semibold">{option.label}</p>
                  <p className="text-[10px] text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
          </SectionCard>
          }

          {false ? (
            <SectionCard
              title="3. Confirm mobile money payment"
              description="A confirmation request is simulated on your device â€” no PIN is ever entered here."
              action={<Badge variant="success">Simulated</Badge>}
            >
              <div className="px-5 pb-5">
                {momoPhase === "processing" ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/20 py-10 text-center">
                    <Loader2 className="size-8 animate-spin text-primary dark:text-foreground" />
                    <p className="mt-3 text-[13px] font-semibold">Waiting for confirmationâ€¦</p>
                    <p className="mt-1 max-w-xs text-[10.5px] leading-relaxed text-muted-foreground">
                      Check your phone and confirm the request on your{" "}
                      {momoMethod === "mtn_momo" ? "MTN MoMo" : "Airtel Money"} device. Genzura never
                      asks for your PIN.
                    </p>
                  </div>
                ) : momoPhase === "success" ? (
                  <div className="rounded-xl border border-success/25 bg-success/[0.05] p-5 text-center">
                    <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-success/10 text-success">
                      <CheckCircle2 className="size-5" />
                    </span>
                    <p className="mt-3 text-[14px] font-semibold">Payment received</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatCurrency(momoForm.getValues("amount"))} for {invoice?.number} was confirmed.
                      <br />
                      Reference <span className="font-mono">{momoReference}</span>
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Button size="sm" asChild>
                        <Link href="/tenant/payments">
                          <ReceiptText className="size-3.5" /> View receipt
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMomoPhase("form");
                          setMomoReference(null);
                        }}
                      >
                        Make another payment
                      </Button>
                    </div>
                  </div>
                ) : momoPhase === "failed" ? (
                  <div className="rounded-xl border border-destructive/25 bg-destructive/[0.04] p-5 text-center">
                    <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                      <CircleAlert className="size-5" />
                    </span>
                    <p className="mt-3 text-[14px] font-semibold">Payment not completed</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      The simulated request was declined. No invoice balance was changed.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Button size="sm" onClick={() => setMomoPhase("form")}>
                        Try again
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setMethod("bank_transfer")}>
                        Use bank transfer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submitMomo} className="space-y-4" noValidate>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Amount" htmlFor="momo-amount" error={momoForm.formState.errors.amount?.message}>
                        <Input
                          id="momo-amount"
                          type="number"
                          min={1}
                          max={balance}
                          step={1000}
                          {...momoForm.register("amount", { valueAsNumber: true })}
                        />
                        <button
                          type="button"
                          className="text-[10px] font-medium text-primary hover:underline dark:text-foreground"
                          onClick={() => momoForm.setValue("amount", balance, { shouldValidate: true })}
                        >
                          Pay full balance
                        </button>
                      </Field>
                      <Field label="Mobile number" htmlFor="momo-phone" error={momoForm.formState.errors.phone?.message}>
                        <Input id="momo-phone" placeholder="078 000 0000" {...momoForm.register("phone")} />
                      </Field>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg bg-accent/70 px-3 py-2.5 text-[10.5px] leading-relaxed text-muted-foreground dark:bg-white/[0.04]">
                      <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                      This is a simulated payment flow. You will never be asked for your mobile money PIN
                      inside Genzura, and no real money is moved.
                    </div>

                    <Button type="submit" className="w-full" disabled={momoForm.formState.isSubmitting}>
                      <Smartphone className="size-4" />
                      Pay {formatCurrency(momoAmount || 0)} with{" "}
                      {momoMethod === "mtn_momo" ? "MTN MoMo" : "Airtel Money"}
                    </Button>
                  </form>
                )}
              </div>
            </SectionCard>
          ) : (
            <SectionCard
              title="3. Submit bank transfer proof"
              description={bankMethod === "cash" ? "Submit your cash payment amount. No proof or extra details required." : "Transfers and payments are reviewed by the finance team before they count as paid."}
              action={<Badge variant="warning">Verification required</Badge>}
            >
              <div className="px-5 pb-5">
                {bankSubmitted ? (
                  <div className="rounded-xl border border-warning/25 bg-warning/[0.05] p-5 text-center">
                    <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-warning/10 text-warning">
                      <Landmark className="size-5" />
                    </span>
                    <p className="mt-3 text-[14px] font-semibold">Proof submitted for verification</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      The accountant will match your transfer against the bank statement. You can track
                      the status under My payments.
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                      <Button size="sm" asChild>
                        <Link href="/tenant/payments">
                          Track payment <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submitBank} className="space-y-4" noValidate>
                    <div className="rounded-lg border border-border bg-muted/30 p-3.5 text-[11px]">
                      <p className="font-medium">Transfer to</p>
                      <p className="mt-1 font-mono text-[11px]">{db.settings.payments.bankAccountName}</p>
                      <p className="text-muted-foreground">
                        {db.settings.payments.bankName} Â· {db.settings.payments.bankAccount}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Use your invoice number as the transfer narration where possible.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={bankMethod === "cash" ? "Amount" : "Amount transferred"} htmlFor="bank-amount" error={bankForm.formState.errors.amount?.message}>
                        <Input
                          id="bank-amount"
                          type="number"
                          min={1}
                          step={1000}
                          {...bankForm.register("amount", { valueAsNumber: true })}
                        />
                      </Field>
                      <Field label="Payment method" htmlFor="bank-method" error={bankForm.formState.errors.method?.message}>
                        <Select
                          value={bankMethod}
                          onValueChange={(value) => {
                            const v = value as BankProofFormValues["method"];
                            bankForm.setValue("method", v, { shouldValidate: true });
                            if (v === "cash") {
                              setProofFile(null);
                              bankForm.setValue("reference", "");
                              bankForm.setValue("proofName", "");
                              bankForm.setValue("bankName", "");
                            }
                          }}
                        >
                          <SelectTrigger id="bank-method">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                            <SelectItem value="airtel_money">Airtel Money</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    {bankMethod === "bank_transfer" && (
                      <Field label="Bank name" htmlFor="bank-name" error={bankForm.formState.errors.bankName?.message}>
                        <Input id="bank-name" {...bankForm.register("bankName")} />
                      </Field>
                    )}

                    {bankMethod !== "cash" && (
                      <>
                        <Field label="Transfer reference" htmlFor="bank-ref" error={bankForm.formState.errors.reference?.message}>
                          <Input id="bank-ref" placeholder="e.g. BK-TRF-008821" {...bankForm.register("reference")} />
                        </Field>

                        <Field label="Proof of payment" htmlFor="bank-proof" error={bankForm.formState.errors.proofName?.message} hint="Upload a screenshot or PDF of the transfer confirmation.">
                          <div className="relative">
                            <Upload className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="bank-proof"
                              type="file"
                              accept=".pdf,image/*"
                              className="pl-8 file:mr-2 file:border-0 file:bg-transparent file:text-[11px]"
                              onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;
                                setProofFile(file);
                                bankForm.setValue("proofName", file?.name ?? "", { shouldValidate: true });
                              }}
                            />
                          </div>
                        </Field>
                      </>
                    )}

                    <div className="flex items-start gap-2 rounded-lg bg-warning/[0.07] px-3 py-2.5 text-[10.5px] leading-relaxed text-muted-foreground">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                      {bankMethod === "cash"
                        ? "Cash payments are recorded as pending until a finance team member verifies them."
                        : "Payments are marked as pending and excluded from your balance until a finance team member verifies them."}
                    </div>

                    <Button type="submit" className="w-full" disabled={bankForm.formState.isSubmitting}>
                      <Landmark className="size-4" /> {bankMethod === "cash" ? "Submit cash payment" : "Submit proof for verification"}
                    </Button>
                  </form>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        <div className="space-y-4 xl:col-span-5">
          <SectionCard title="Payment summary" description="What you are paying now">
            <div className="space-y-3 px-5 pb-5">
              {invoice ? (
                <>
                  <div className="rounded-lg border border-border p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-medium">{invoice.number}</span>
                      <StatusBadge status={invoice.status} className="h-4 px-1.5 text-[9px]" />
                    </div>
                    <p className="mt-1 text-[10.5px] text-muted-foreground">
                      {monthLabel(invoice.period)} Â· due {formatDate(invoice.dueDate)}
                    </p>
                    <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                      {invoice.lineItems.map((line) => (
                        <div key={line.id} className="flex justify-between text-[10.5px]">
                          <span className="text-muted-foreground">{line.description}</span>
                          <span>{formatCurrency(line.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-border pt-1.5 text-[11px] font-semibold">
                        <span>Balance due</span>
                        <span>{formatCurrency(balance)}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/tenant/invoices/${invoice.id}`}>
                      View full invoice <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground">Select an invoice to continue.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Payment guidance" description="What to expect">
            <div className="space-y-3 px-5 pb-5 text-[11px] leading-relaxed text-muted-foreground">
              <div className="flex gap-2">
                <Smartphone className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  <span className="font-medium text-foreground">Mobile money:</span> confirm the request
                  on your phone. Payments are recorded immediately in this demo. Genzura never asks for
                  your PIN.
                </p>
              </div>
              <div className="flex gap-2">
                <Landmark className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  <span className="font-medium text-foreground">Bank transfer:</span> upload proof and
                  the finance team will verify it. Your balance updates after verification.
                </p>
              </div>
              <div className="flex gap-2">
                <ReceiptText className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  <span className="font-medium text-foreground">Receipts:</span> every confirmed
                  payment gets a receipt. Rental invoices and EBM fiscal invoices are separate.
                </p>
              </div>
              {lastMomoOutcome && (
                <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2 text-[10px]">
                  Last simulated attempt:{" "}
                  <span className={lastMomoOutcome === "success" ? "text-success" : "text-destructive"}>
                    {lastMomoOutcome === "success" ? "successful" : "failed"}
                  </span>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
