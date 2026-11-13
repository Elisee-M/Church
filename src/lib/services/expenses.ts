"use client";

import type { Expense } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { refreshDatabase } from "./store";

export type ExpenseInput = {
  title: string;
  category: Expense["category"];
  buildingId: string;
  amount: number;
  date: string;
  vendor: string;
  status: Expense["status"];
  notes?: string;
  receiptName?: string;
};

async function getOrgId() {
  const supabase = createClient();
  const { data } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
  if (!data?.id) throw new Error("No organization found.");
  return data.id as string;
}

export async function createExpense(input: ExpenseInput) {
  const supabase = createClient();
  const orgId = await getOrgId();
  const { error } = await supabase.from("expenses").insert({
    organization_id: orgId,
    building_id: input.buildingId || null,
    amount: input.amount,
    description: input.title || input.notes || null,
    expense_date: input.date,
    receipt_document_path: input.receiptName || null,
  });
  if (error) throw new Error(error.message);
  await refreshDatabase();
}

export async function updateExpense(id: string, patch: Partial<ExpenseInput>) {
  const supabase = createClient();
  const update: Record<string, unknown> = {};
  if (patch.amount !== undefined) update.amount = patch.amount;
  if (patch.date !== undefined) update.expense_date = patch.date;
  if (patch.title !== undefined) update.description = patch.title;
  if (patch.buildingId !== undefined) update.building_id = patch.buildingId || null;
  if (patch.receiptName !== undefined) update.receipt_document_path = patch.receiptName;
  if (Object.keys(update).length) {
    const { error } = await supabase.from("expenses").update(update).eq("id", id);
    if (error) throw new Error(error.message);
  }
  await refreshDatabase();
}

export async function deleteExpense(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await refreshDatabase();
}
