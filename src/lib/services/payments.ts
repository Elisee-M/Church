"use client";

import type { PaymentMethod, PaymentStatus, VerificationStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { refreshDatabase } from "./store";

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

function dbMethod(method: PaymentMethod): "mtn_mobile_money" | "airtel_money" | "bank_transfer" | "cash" | "other" {
  if (method === "mtn_momo") return "mtn_mobile_money";
  if (method === "airtel_money") return "airtel_money";
  if (method === "bank_transfer") return "bank_transfer";
  if (method === "cash") return "cash";
  return "other";
}

function dbStatus(status: PaymentStatus): "pending" | "successful" | "failed" | "cancelled" | "under_review" {
  if (status === "completed") return "successful";
  if (status === "reversed") return "cancelled";
  if (status === "pending") return "pending";
  return "failed";
}

export async function recordPayment(input: RecordPaymentInput) {
  const supabase = createClient();
  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, organization_id, tenant_id")
    .eq("id", input.invoiceId)
    .single();
  if (invErr || !inv) throw new Error(invErr?.message || "Invoice not found.");

  const status = dbStatus(input.status ?? "completed");
  const ref = `PAY-${Date.now().toString().slice(-8)}`;
  const { data, error } = await supabase
    .from("payments")
    .insert({
      organization_id: (inv as { organization_id: string }).organization_id,
      tenant_id: (inv as { tenant_id: string }).tenant_id,
      invoice_id: input.invoiceId,
      amount: Math.round(input.amount),
      payment_method: dbMethod(input.method),
      provider: input.method,
      transaction_reference: ref,
      phone_number: input.phone || null,
      payment_status: status,
      payment_date: input.date ? new Date(input.date).toISOString() : new Date().toISOString(),
      notes: input.notes || null,
      verified_by: status === "successful" ? (await supabase.auth.getUser()).data.user?.id ?? null : null,
      verified_at: status === "successful" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await refreshDatabase();
  return data.id as string;
}

export async function verifyPayment(paymentId: string, decision: "approve" | "reject", reason?: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("verify_payment", {
    p_payment_id: paymentId,
    p_approve: decision === "approve",
    p_reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
  await refreshDatabase();
}

export async function reversePayment(paymentId: string, reason: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("correct_payment", {
    p_payment_id: paymentId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  await refreshDatabase();
}

export async function simulateMobileMoneyPayment(input: {
  invoiceId: string;
  amount: number;
  method: "mtn_momo" | "airtel_money";
  phone: string;
  outcome: "success" | "failed";
}) {
  const supabase = createClient();
  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, organization_id, tenant_id")
    .eq("id", input.invoiceId)
    .single();
  if (invErr || !inv) throw new Error(invErr?.message || "Invoice not found.");
  const ref = `SIM-${Date.now().toString().slice(-8)}`;
  const succeeded = input.outcome === "success";
  const { error } = await supabase.from("payments").insert({
    organization_id: (inv as { organization_id: string }).organization_id,
    tenant_id: (inv as { tenant_id: string }).tenant_id,
    invoice_id: input.invoiceId,
    amount: Math.round(input.amount),
    payment_method: input.method === "mtn_momo" ? "mtn_mobile_money" : "airtel_money",
    provider: "simulated",
    transaction_reference: ref,
    phone_number: input.phone,
    payment_status: succeeded ? "successful" : "failed",
    payment_date: new Date().toISOString(),
    notes: succeeded
      ? "Simulated Mobile Money payment. No real transaction was made."
      : "Simulated transaction declined. No invoice balance was changed.",
    verified_by: succeeded ? (await supabase.auth.getUser()).data.user?.id ?? null : null,
    verified_at: succeeded ? new Date().toISOString() : null,
  });
  if (error) throw new Error(error.message);
  await refreshDatabase();
  return ref;
}

export async function submitBankTransferProof(input: {
  invoiceId: string;
  amount: number;
  bankName: string;
  reference: string;
  proofName?: string;
  proofPath?: string;
}) {
  const supabase = createClient();
  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, organization_id, tenant_id")
    .eq("id", input.invoiceId)
    .single();
  if (invErr || !inv) throw new Error(invErr?.message || "Invoice not found.");
  const { error } = await supabase.from("payments").insert({
    organization_id: (inv as { organization_id: string }).organization_id,
    tenant_id: (inv as { tenant_id: string }).tenant_id,
    invoice_id: input.invoiceId,
    amount: Math.round(input.amount),
    payment_method: "bank_transfer",
    provider: input.bankName || "bank",
    transaction_reference: input.reference.trim() || `BNK-${Date.now().toString().slice(-8)}`,
    payment_status: "under_review",
    payment_date: new Date().toISOString(),
    notes: [
      "Bank transfer submitted. Awaiting verification.",
      input.proofPath ? `Proof path: ${input.proofPath}` : input.proofName ? `Proof: ${input.proofName}` : null,
    ].filter(Boolean).join(" "),
  });
  if (error) throw new Error(error.message);
  await refreshDatabase();
}
