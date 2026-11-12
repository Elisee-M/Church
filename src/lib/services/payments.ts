"use client";

import type { Payment, PaymentMethod, PaymentStatus, VerificationStatus } from "@/types";
import { getDatabase, mutateDatabase, newId } from "./store";
import { addActivity, notify } from "./activity";
import { recalculateInvoice } from "@/lib/mock-data/analytics";

export type RecordPaymentInput = {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  date?: string;
  phone?: string;
  bankName?: string;
  proofName?: string;
  notes?: string;
  status?: Extract<PaymentStatus, "completed" | "pending">;
  verification?: VerificationStatus;
  ebmReference?: string;
  actor?: string;
};

const REFERENCE_PREFIX: Record<PaymentMethod, string> = {
  mtn_momo: "MOMO",
  airtel_money: "AIRTEL",
  bank_transfer: "BNK",
  cash: "CASH",
  cheque: "CHQ",
};

function makeReference(method: PaymentMethod) {
  return `${REFERENCE_PREFIX[method]}-${Date.now().toString().slice(-6)}${Math.floor(
    Math.random() * 90 + 10,
  )}`;
}

function validateAmount(invoiceId: string, amount: number) {
  const db = getDatabase();
  const invoice = db.invoices.find((item) => item.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  const balance = invoice.amount - invoice.amountPaid;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid payment amount.");
  if (amount > balance) {
    throw new Error("Payment amount cannot exceed the outstanding invoice balance.");
  }
  return invoice;
}

export function recordPayment(input: RecordPaymentInput) {
  const invoice = validateAmount(input.invoiceId, input.amount);
  const paymentId = newId("p");
  const date = input.date ?? new Date().toISOString();
  mutateDatabase((db) => {
    const status = input.status ?? "completed";
    const payment: Payment = {
      id: paymentId,
      reference: makeReference(input.method),
      invoiceId: input.invoiceId,
      tenantId: invoice.tenantId,
      amount: Math.round(input.amount),
      method: input.method,
      status,
      verification:
        input.verification ?? (status === "completed" ? "verified" : "pending"),
      date,
      phone: input.phone,
      bankName: input.bankName,
      proofName: input.proofName,
      notes: input.notes,
      ebmReference: input.ebmReference,
      verifiedBy: status === "completed" ? (input.actor ?? "Accountant") : undefined,
      verifiedAt: status === "completed" ? date : undefined,
      createdAt: new Date().toISOString(),
    };
    db.payments.unshift(payment);
    if (status === "completed") recalculateInvoice(db, input.invoiceId);
    const tenant = db.tenants.find((item) => item.id === invoice.tenantId);
    addActivity(db, {
      type: "payment",
      title: status === "completed" ? "Payment recorded" : "Payment awaiting verification",
      description: `${tenant?.name ?? "Tenant"} · RWF ${Math.round(input.amount).toLocaleString("en-RW")} via ${input.method.replaceAll("_", " ")}.`,
      actor: input.actor ?? "Accountant",
    });
    notify(db, {
      title: status === "completed" ? "Payment recorded" : "Payment submitted for verification",
      body: `RWF ${Math.round(input.amount).toLocaleString("en-RW")} was recorded against ${invoice.number}.`,
      type: "payment",
      tenantId: invoice.tenantId,
    });
  });
  return paymentId;
}

export function verifyPayment(
  paymentId: string,
  decision: "approve" | "reject",
  reason?: string,
) {
  mutateDatabase((db) => {
    const payment = db.payments.find((item) => item.id === paymentId);
    if (!payment || payment.verification !== "pending") return;
    const invoice = db.invoices.find((item) => item.id === payment.invoiceId);
    const tenant = db.tenants.find((item) => item.id === payment.tenantId);
    const timestamp = new Date().toISOString();

    if (decision === "approve") {
      payment.verification = "verified";
      payment.status = "completed";
      payment.verifiedBy = "Accountant";
      payment.verifiedAt = timestamp;
      recalculateInvoice(db, payment.invoiceId);
      notify(db, {
        title: "Bank transfer verified",
        body: `Your payment of RWF ${payment.amount.toLocaleString("en-RW")} for ${invoice?.number ?? "your invoice"} has been confirmed.`,
        type: "payment",
        tenantId: payment.tenantId,
      });
      addActivity(db, {
        type: "payment",
        title: "Bank transfer verified",
        description: `${tenant?.name ?? "Tenant"} · ${payment.reference} approved for RWF ${payment.amount.toLocaleString("en-RW")}.`,
        actor: "Accountant",
      });
    } else {
      payment.verification = "rejected";
      payment.status = "failed";
      payment.notes = [payment.notes, reason].filter(Boolean).join(" — ");
      notify(db, {
        title: "Payment verification declined",
        body: `We could not verify your transfer for ${invoice?.number ?? "your invoice"}. ${reason ?? ""}`.trim(),
        type: "payment",
        tenantId: payment.tenantId,
      });
      addActivity(db, {
        type: "payment",
        title: "Bank transfer rejected",
        description: `${payment.reference} was rejected. Reason: ${reason || "not supplied"}.`,
        actor: "Accountant",
      });
    }
    if (payment.invoiceId) recalculateInvoice(db, payment.invoiceId);
  });
}

export function reversePayment(paymentId: string, reason: string) {
  const original = getDatabase().payments.find((item) => item.id === paymentId);
  if (!original) throw new Error("Payment not found.");
  if (!reason.trim()) throw new Error("A reason is required for a correction.");
  mutateDatabase((db) => {
    const source = db.payments.find((item) => item.id === paymentId);
    if (!source) return;
    db.payments.unshift({
      id: newId("p"),
      reference: `REV-${source.reference}`,
      invoiceId: source.invoiceId,
      tenantId: source.tenantId,
      amount: -Math.abs(source.amount),
      method: source.method,
      status: "completed",
      verification: "verified",
      date: new Date().toISOString(),
      verifiedBy: "Accountant",
      verifiedAt: new Date().toISOString(),
      notes: `Reversal of ${source.reference}. Reason: ${reason}`,
      createdAt: new Date().toISOString(),
    });
    recalculateInvoice(db, source.invoiceId);
    addActivity(db, {
      type: "payment",
      title: "Payment correction recorded",
      description: `Reversal of ${source.reference}. Reason: ${reason}`,
      actor: "Accountant",
    });
  });
}

export function simulateMobileMoneyPayment(input: {
  invoiceId: string;
  amount: number;
  method: "mtn_momo" | "airtel_money";
  phone: string;
  outcome: "success" | "failed";
}) {
  const invoice = validateAmount(input.invoiceId, input.amount);
  const reference = makeReference(input.method);
  mutateDatabase((db) => {
    const succeeded = input.outcome === "success";
    db.payments.unshift({
      id: newId("p"),
      reference,
      invoiceId: input.invoiceId,
      tenantId: invoice.tenantId,
      amount: Math.round(input.amount),
      method: input.method,
      status: succeeded ? "completed" : "failed",
      verification: "not_required",
      date: new Date().toISOString(),
      phone: input.phone,
      notes: succeeded
        ? "Simulated Mobile Money payment. No real transaction was made."
        : "Simulated transaction declined. No invoice balance was changed.",
      createdAt: new Date().toISOString(),
    });
    if (succeeded) recalculateInvoice(db, input.invoiceId);
    notify(db, {
      title: succeeded ? "Payment received — thank you" : "Mobile Money payment failed",
      body: succeeded
        ? `We received RWF ${Math.round(input.amount).toLocaleString("en-RW")} for ${invoice.number}. A receipt is available.`
        : `Your simulated payment of RWF ${Math.round(input.amount).toLocaleString("en-RW")} failed. No balance was changed.`,
      type: "payment",
      tenantId: invoice.tenantId,
    });
    addActivity(db, {
      type: "payment",
      title: succeeded ? "Mobile Money payment received" : "Mobile Money payment failed",
      description: `${invoice.number} · RWF ${Math.round(input.amount).toLocaleString("en-RW")} via ${input.method === "mtn_momo" ? "MTN MoMo" : "Airtel Money"} (simulated).`,
      actor: "Tenant portal",
    });
  });
  return reference;
}

export function submitBankTransferProof(input: {
  invoiceId: string;
  amount: number;
  bankName: string;
  reference: string;
  proofName?: string;
}) {
  const invoice = validateAmount(input.invoiceId, input.amount);
  mutateDatabase((db) => {
    db.payments.unshift({
      id: newId("p"),
      reference: input.reference.trim() || makeReference("bank_transfer"),
      invoiceId: input.invoiceId,
      tenantId: invoice.tenantId,
      amount: Math.round(input.amount),
      method: "bank_transfer",
      status: "pending",
      verification: "pending",
      date: new Date().toISOString(),
      bankName: input.bankName,
      proofName: input.proofName,
      notes: "Bank transfer submitted by tenant. Awaiting accountant verification.",
      createdAt: new Date().toISOString(),
    });
    notify(db, {
      title: "Bank transfer submitted",
      body: `A transfer of RWF ${Math.round(input.amount).toLocaleString("en-RW")} for ${invoice.number} is awaiting verification.`,
      type: "payment",
      tenantId: invoice.tenantId,
    });
    notify(db, {
      title: "Bank transfer needs verification",
      body: `A tenant submitted proof of payment for ${invoice.number}.`,
      type: "payment",
    });
    addActivity(db, {
      type: "payment",
      title: "Bank transfer submitted",
      description: `${invoice.number} · proof uploaded, awaiting accountant verification.`,
      actor: "Tenant portal",
    });
  });
}
