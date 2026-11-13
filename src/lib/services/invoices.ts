"use client";

import { createClient } from "@/lib/supabase/client";
import { refreshDatabase } from "./store";

export async function generateMonthlyInvoices(period: string) {
  const supabase = createClient();
  const { data: org } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
  if (!org?.id) throw new Error("No organization found.");
  const [y, m] = period.split("-").map(Number);
  const start = `${period}-01`;
  const endDate = new Date(y, m, 0).toISOString().slice(0, 10);
  const { data, error } = await supabase.rpc("generate_monthly_invoices", {
    p_organization_id: org.id,
    p_period_start: start,
    p_period_end: endDate,
    p_issue_date: new Date().toISOString().slice(0, 10),
    p_due_day: null,
  });
  if (error) throw new Error(error.message);
  await refreshDatabase();
  return Number(data ?? 0);
}

export async function recordEbmReference(
  invoiceId: string,
  reference: string,
  attachDocument: boolean,
  documentName?: string,
) {
  const supabase = createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, organization_id, tenant_id")
    .eq("id", invoiceId)
    .single();
  if (!inv) throw new Error("Invoice not found.");
  const { error } = await supabase.from("ebm_records").upsert(
    {
      organization_id: (inv as { organization_id: string }).organization_id,
      invoice_id: invoiceId,
      tenant_id: (inv as { tenant_id: string }).tenant_id,
      ebm_reference: reference.trim(),
      document_path: attachDocument ? (documentName || null) : null,
      issued_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  // upsert without unique on invoice may create duplicates; try insert
  if (error) {
    const { error: e2 } = await supabase.from("ebm_records").insert({
      organization_id: (inv as { organization_id: string }).organization_id,
      invoice_id: invoiceId,
      tenant_id: (inv as { tenant_id: string }).tenant_id,
      ebm_reference: reference.trim(),
      document_path: attachDocument ? (documentName || null) : null,
      issued_at: new Date().toISOString(),
    });
    if (e2) throw new Error(e2.message);
  }
  await refreshDatabase();
}

export async function updateInvoiceNotes(invoiceId: string, notes: string) {
  const supabase = createClient();
  const { error } = await supabase.from("invoices").update({ notes }).eq("id", invoiceId);
  if (error) throw new Error(error.message);
  await refreshDatabase();
}
